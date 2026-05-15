import type { ImageAnalysisResult, ImageGenerationParams, EditParams } from '@/types'

/**
 * ════════════════════════════════════════════
 *  图灵绘境 - 前端 API 层 v2.0
 *  全部调用真实后端 · 零模拟
 *  新增: 错误码映射 · 网络检测 · 超时控制
 * ══════════════════════════════════════════
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
const REQUEST_TIMEOUT = 120_000 // 分析/编辑超时 120s

// ══════════════════════════════════════════
//  错误码 → 友好中文映射
// ══════════════════════════════════════════
const ERROR_MAP: Record<number | string, string> = {
  // HTTP 状态码
  400: '请求参数有误，请检查后重试',
  401: '身份验证已过期，请重新登录',
  403: '没有操作权限',
  404: '接口不存在或已下线',
  413: '图片文件太大，请压缩后重试（最大 10MB）',
  422: '数据格式不正确',
  429: '⏰ 操作过于频繁，请稍后再试',
  500: '服务器内部错误，请稍后重试',
  502: '网关异常，AI 服务暂时不可用',
  503: '🔧 服务繁忙中，请等待片刻后重试',
  504: '⏱️ 处理超时，可能是网络拥堵或图片过大',
  // 业务错误码
  'REQUEST_TIMEOUT': '请求超时，请检查网络连接',
  'RATE_LIMITED': '操作太频繁了，休息一下再来吧~',
  'CIRCUIT_OPEN': 'AI 服务正在恢复中，请 45 秒后重试',
  'QUOTA_EXCEEDED': '免费额度已用完，明天再试试吧',
  'IMAGE_TOO_LARGE': '图片太大了，建议压缩到 5MB 以内',
  'INVALID_IMAGE': '无法识别的图片格式，请使用 JPG/PNG/WebP',
  'NETWORK_ERROR': '网络连接失败，请检查网络后重试',
}

/**
 * 解析错误信息 → 返回用户友好的中文提示
 */
export function getFriendlyError(err: any): string {
  // 1. 直接匹配状态码
  if (err.status || err.statusCode) {
    const code = err.status || err.statusCode
    return ERROR_MAP[code] || `请求失败 (${code})`
  }

  // 2. 匹配响应中的 code 字段
  if (err.code && ERROR_MAP[err.code]) {
    return ERROR_MAP[err.code]
  }

  // 3. 匹配消息中的关键词
  const msg = (err.message || err.msg || '').toLowerCase()
  if (msg.includes('timeout') || msg.includes('超时')) return ERROR_MAP['REQUEST_TIMEOUT']
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) return ERROR_MAP['NETWORK_ERROR']
  if (msg.includes('429') || msg.includes('rate') || msg.includes('limit')) return ERROR_MAP[429]
  if (msg.includes('quota') || msg.includes('insufficient')) return ERROR_MAP['QUOTA_EXCEEDED']
  if (msg.includes('circuit') || msg.includes('熔断')) return ERROR_MAP['CIRCUIT_OPEN']

  // 4. 原始消息（截断过长内容）
  const raw = err.message || err.error || '未知错误'
  return raw.length > 60 ? raw.slice(0, 60) + '...' : raw
}

// ══════════════════════════════════════════
//  网络状态检测
// ══════════════════════════════════════════
let _isOnline = true
let _lastCheck = 0

/** 检查网络是否可用（带缓存，5秒内不重复检测） */
export async function checkNetwork(): Promise<boolean> {
  const now = Date.now()
  if (now - _lastCheck < 5000) return _isOnline
  _lastCheck = now

  try {
    const res = await uni.getNetworkType()
    _isOnline = res.networkType !== 'none'
  } catch {
    _isOnline = navigator?.onLine ?? true
  }
  return _isOnline
}

/** 获取当前网络状态（同步，不阻塞） */
export function isOnlineSync(): boolean {
  return _isOnline
}

/** 监听网络变化 */
export function watchNetworkChange(callback: (online: boolean) => void): () => void {
  const handler = () => {
    _isOnline = navigator?.onLine ?? true
    callback(_isOnline)
  }
  window.addEventListener('online', handler)
  window.addEventListener('offline', handler)
  return () => {
    window.removeEventListener('online', handler)
    window.removeEventListener('offline', handler)
  }
}

// ══════════════════════════════════════════
//  图片压缩（H5 Canvas）
// ══════════════════════════════════════════
interface CompressOptions {
  maxWidth?: number   // 最大宽度，默认 1500
  maxHeight?: number  // 最大高度，默认 1500
  quality?: number    // JPEG 质量 0-1，默认 0.8
  maxSizeMB?: number  // 最大文件大小 MB，默认 3
}

interface CompressResult {
  dataUrl: string
  width: number
  height: number
  sizeKB: number
  originalSizeKB: number
  ratio: number  // 压缩比
}

/**
 * 使用 Canvas 压缩图片（仅 H5 端）
 * @returns 压缩后的 base64 dataURL
 */
export async function compressImage(dataUrl: string, options: CompressOptions = {}): Promise<CompressResult> {
  const {
    maxWidth = 1500,
    maxHeight = 1500,
    quality = 0.8,
    maxSizeMB = 3,
  } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img

      // 计算缩放比例
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas 不支持'))
        return
      }

      // 白色背景（处理透明 PNG）
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      // 转为 JPEG（比 PNG 小很多）
      const compressed = canvas.toDataURL('image/jpeg', quality)
      const sizeKB = Math.round(compressed.length * 0.75 / 1024) // base64 → KB
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

// ══════════════════════════════════════════
//  核心请求封装（统一超时 + 错误处理）
// ══════════════════════════════════════════
async function request<T>(path: string, body?: any, timeoutMs = REQUEST_TIMEOUT): Promise<T> {
  // 网络预检
  const online = await checkNetwork()
  if (!online) {
    throw { code: 'NETWORK_ERROR', message: ERROR_MAP['NETWORK_ERROR'], status: 0 }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    const json = await res.json()

    if (!res.ok || !json.success) {
      throw {
        status: res.status,
        code: json.code || res.status,
        message: json?.error || json?.message || `请求失败 (${res.status})`,
        detail: json,
      }
    }

    return json.data as T
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw { code: 'REQUEST_TIMEOUT', message: ERROR_MAP['REQUEST_TIMEOUT'], status: 408 }
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// ══════════════════════════════════════════
//  导出的 API 函数
// ══════════════════════════════════════════

/**
 * 分析图片 - 调用后端真实 AI (OpenRouter/NVIDIA 视觉模型)
 * 自动压缩大图后再上传
 */
export async function analyzeImage(imageUrl: string): Promise<ImageAnalysisResult> {
  console.log(`🔍 [API] 开始分析图片... (API: ${API_BASE})`)

  // H5 端自动压缩
  let processedUrl = imageUrl
  // #ifdef H5
  try {
    const compressed = await compressImage(imageUrl, { maxWidth: 1500, quality: 0.82 })
    console.log(`📦 [压缩] ${compressed.originalSizeKB}KB → ${compressed.sizeKB}KB (${compressed.ratio}x)`)
    processedUrl = compressed.dataUrl
  } catch (e) {
    console.warn('[压缩] 失败，使用原图:', e)
  }
  // #endif

  const result = await request<ImageAnalysisResult>('/api/analyze', { imageUrl: processedUrl })
  console.log(`✅ [API] 分析完成 | 风格: ${result.style}`)
  return result
}

/**
 * 生成图片 - 调用后端 (Pollinations.AI)
 */
export async function generateImage(params: ImageGenerationParams): Promise<string> {
  console.log(`🎨 [API] 开始生成图片... (API: ${API_BASE})`)

  const data = await request<{ images: Array<{ url: string; revised_prompt: string }> }>('/api/generate', {
    prompt: params.prompt,
    width: params.width || 1024,
    height: params.height || 1024,
    model: params.model || 'flux',
  }, 30_000) // 生成超时 30s

  const imageUrl = data.images[0].url
  console.log('✅ [API] 生成完成:', imageUrl.substring(0, 80))
  return imageUrl
}

/**
 * 编辑图片 - 调用后端 (AI 重分析 + Pollinations 重生成)
 */
export async function editImage(params: EditParams): Promise<{ imageUrl: string; prompt: string }> {
  console.log(`✏️ [API] 开始编辑图片... (API: ${API_BASE})`)

  const data = await request<{ imageUrl: string; prompt: string }>('/api/edit', {
    originalPrompt: params.originalPrompt,
    originalImage: params.originalImage,
    modifications: {
      colorScheme: params.colorScheme,
      elementStyle: params.elementStyle,
      layout: params.layout,
      text: params.text,
      style: params.style,
    },
  })

  console.log('✅ [API] 编辑完成')
  return data
}
