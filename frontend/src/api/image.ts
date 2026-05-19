import { http } from 'uview-pro'
import type { ImageAnalysisResult, ImageGenerationParams, EditParams } from '@/types'

/**
 * ════════════════════════════════════════════
 *  图灵绘境 - 图片 AI API 层
 *  分析 / 生成 / 编辑
 *  附带跨平台图片压缩 + 自动重试
 * ════════════════════════════════════════════
 */

// ─── 重试配置 ──────────────────────────────
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const RETRYABLE_STATUS = [408, 429, 500, 502, 503, 504]

/**
 * 带重试的请求封装
 * AI 接口响应慢、易超时，指数退避重试
 */
async function retryRequest<T>(
  method: () => Promise<T>,
  path: string,
): Promise<T> {
  let lastError: any
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await method()
    } catch (err: any) {
      lastError = err
      const status = err.status || 0
      const code = err.code || ''
      const isRetryable = RETRYABLE_STATUS.includes(status)
        || code === 'REQUEST_TIMEOUT'
        || code === 'NETWORK_ERROR'
      if (!isRetryable || attempt >= MAX_RETRIES) break

      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      console.warn(`⚠️ [请求] ${path} 第${attempt}次失败 (${status})，${delay}ms 后重试...`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastError
}

// ══════════════════════════════════════════
//  图片压缩（跨平台）
// ══════════════════════════════════════════

interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  maxSizeMB?: number
}

interface CompressResult {
  dataUrl: string
  width: number
  height: number
  sizeKB: number
  originalSizeKB: number
  ratio: number
}

/** 小程序端压缩 */
function compressImageMP(filePath: string, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.compressImage({
      src: filePath,
      quality,
      success: (res) => resolve(res.tempFilePath),
      fail: (err) => reject(new Error(err.errMsg || '小程序图片压缩失败')),
    })
  })
}

/** H5 端压缩 */
function compressImageH5(dataUrl: string, options: CompressOptions = {}): Promise<CompressResult> {
  const { maxWidth = 1500, maxHeight = 1500, quality = 80 } = options
  const jpegQuality = quality / 100

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      const scale = Math.min(maxWidth / width, maxHeight / height, 1)
      width = Math.round(width * scale)
      height = Math.round(height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 不支持')); return }

      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      const compressed = canvas.toDataURL('image/jpeg', jpegQuality)
      const sizeKB = Math.round(compressed.length * 0.75 / 1024)
      const origSizeKB = Math.round(dataUrl.length * 0.75 / 1024)

      resolve({
        dataUrl: compressed,
        width,
        height,
        sizeKB,
        originalSizeKB: origSizeKB,
        ratio: +(sizeKB / origSizeKB).toFixed(2),
      })
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = dataUrl
  })
}

/** 跨平台图片压缩 */
export async function compressImage(source: string, options: CompressOptions = {}): Promise<CompressResult> {
  const { quality = 80 } = options
  const originalSizeKB = Math.round(source.length * 0.75 / 1024)

  // #ifdef H5
  try {
    return await compressImageH5(source, options)
  } catch (e) {
    console.warn('[压缩] H5 Canvas 压缩失败:', e)
    return { dataUrl: source, width: 0, height: 0, sizeKB: originalSizeKB, originalSizeKB, ratio: 1 }
  }
  // #endif

  // #ifndef H5
  try {
    const compressedPath = await compressImageMP(source, quality)
    const estimatedSizeKB = Math.round(originalSizeKB * quality / 100)
    return { dataUrl: compressedPath, width: 0, height: 0, sizeKB: estimatedSizeKB, originalSizeKB, ratio: +(estimatedSizeKB / originalSizeKB).toFixed(2) }
  } catch (e) {
    console.warn('[压缩] 小程序压缩失败:', e)
    return { dataUrl: source, width: 0, height: 0, sizeKB: originalSizeKB, originalSizeKB, ratio: 1 }
  }
  // #endif
}

// ══════════════════════════════════════════
//  网络状态检测
// ══════════════════════════════════════════

let _isOnline = true
let _lastCheck = 0

/** 检查网络是否可用（5 秒缓存） */
export async function checkNetwork(): Promise<boolean> {
  const now = Date.now()
  if (now - _lastCheck < 5000) return _isOnline
  _lastCheck = now
  try {
    const res = await uni.getNetworkType()
    _isOnline = res.networkType !== 'none'
  } catch {
    _isOnline = true
  }
  return _isOnline
}

/** 同步获取上次网络状态 */
export function isOnlineSync(): boolean {
  return _isOnline
}

let _networkWatching = false

/** 监听网络变化 */
export function watchNetworkChange(callback: (online: boolean) => void): () => void {
  if (_networkWatching) return () => {}
  _networkWatching = true
  uni.onNetworkStatusChange((res: any) => {
    _isOnline = res.isConnected
    callback(res.isConnected)
  })
  return () => { _networkWatching = false }
}

// ══════════════════════════════════════════
//  导出的 API 函数
// ══════════════════════════════════════════

/**
 * 分析图片 - 调用后端 AI 服务
 * 自动压缩大图后再上传，支持重试
 */
export async function analyzeImage(imageUrl: string): Promise<ImageAnalysisResult> {
  // 网络预检
  const online = await checkNetwork()
  if (!online) {
    throw { code: 'NETWORK_ERROR', message: '网络连接失败，请检查网络后重试', status: 0 }
  }

  // 自动压缩
  let processedUrl = imageUrl
  try {
    const compressed = await compressImage(imageUrl, { maxWidth: 1500, quality: 82 })
    console.log(`📦 [压缩] ${compressed.originalSizeKB}KB → ${compressed.sizeKB}KB (${compressed.ratio}x)`)
    processedUrl = compressed.dataUrl
  } catch (e) {
    console.warn('[压缩] 失败，使用原图:', e)
  }

  console.log(`🔍 [API] 开始分析图片...`)

  const response = await retryRequest<{ elapsed: number; result: ImageAnalysisResult; cached: boolean }>(
    () => http.post<{ elapsed: number; result: ImageAnalysisResult; cached: boolean }>('/analyze', { imageUrl: processedUrl }, { timeout: 120_000 }),
    '/analyze',
  )

  // 后端返回 { elapsed, result, cached }，提取分析结果
  const analysisResult = response.result
  console.log(`✅ [API] 分析完成 | 风格: ${analysisResult.style}`)
  return analysisResult
}

/**
 * 生成图片 - 调用后端 AI 服务
 */
export async function generateImage(params: ImageGenerationParams): Promise<string> {
  console.log(`🎨 [API] 开始生成图片...`)

  const data = await retryRequest<{ images: Array<{ url: string; revised_prompt: string }> }>(
    () => http.post('/generate', {
      prompt: params.prompt,
      width: params.width || 1024,
      height: params.height || 1024,
      model: params.model || 'flux',
    }, { timeout: 30_000 }),
    '/generate',
  )

  const imageResultUrl = data.images[0].url
  console.log('✅ [API] 生成完成:', imageResultUrl.substring(0, 80))
  return imageResultUrl
}

/**
 * 编辑图片 - 调用后端 AI 服务
 */
export async function editImage(params: EditParams): Promise<{ imageUrl: string; prompt: string }> {
  console.log(`✏️ [API] 开始编辑图片...`)

  const data = await retryRequest<{ imageUrl: string; prompt: string }>(
    () => http.post('/edit', {
      originalPrompt: params.originalPrompt,
      originalImage: params.originalImage,
      modifications: {
        colorScheme: params.colorScheme,
        elementStyle: params.elementStyle,
        layout: params.layout,
        text: params.text,
        style: params.style,
      },
    }, { timeout: 120_000 }),
    '/edit',
  )

  console.log('✅ [API] 编辑完成')
  return data
}
