import type { ImageAnalysisResult, ImageGenerationParams, EditParams } from '@/types'

/**
 * ═══════════════════════════════════
 *  图灵绘境 - 前端 API 层
 *  全部调用真实后端，零模拟
 *  后端地址: http://localhost:3000
 * ═══════════════════════════════════
 */

const API_BASE = 'http://localhost:3000'

/**
 * 分析图片 - 调用后端真实 AI (OpenRouter/NVIDIA 视觉模型)
 */
export async function analyzeImage(imageUrl: string): Promise<ImageAnalysisResult> {
  console.log('🔍 [API] 开始分析图片...')

  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl })
  })

  const json = await res.json()

  if (!res.ok || !json.success) {
    throw new Error(json?.error || json?.message || `分析失败 (HTTP ${res.status})`)
  }

  // 后端返回 { success, source, elapsed, data: { 真正的分析结果 } }
  const result = json.data as ImageAnalysisResult
  console.log(`✅ [API] 分析完成 | 风格: ${result.style} | 来源: ${json.source}`)
  return result
}

/**
 * 生成图片 - 调用后端 (Pollinations.AI)
 */
export async function generateImage(params: ImageGenerationParams): Promise<string> {
  console.log('🎨 [API] 开始生成图片...')

  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: params.prompt,
      width: 1024,
      height: 1024,
      model: 'flux'
    })
  })

  const json = await res.json()

  if (!res.ok || !json.success) {
    throw new Error(json?.error || '生成失败')
  }

  const imageUrl = json.data.images[0].url
  console.log('✅ [API] 生成完成:', imageUrl)
  return imageUrl
}

/**
 * 编辑图片 - 调用后端 (AI 重分析 + Pollinations 重生成)
 */
export async function editImage(params: EditParams): Promise<{ imageUrl: string; prompt: string }> {
  console.log('✏️ [API] 开始编辑图片...')

  const res = await fetch(`${API_BASE}/api/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalPrompt: params.originalPrompt,
      originalImage: params.originalImage,
      modifications: {
        colorScheme: params.colorScheme,
        elementStyle: params.elementStyle,
        layout: params.layout,
        text: params.text,
        style: params.style
      }
    })
  })

  const json = await res.json()

  if (!res.ok || !json.success) {
    throw new Error(json?.error || '编辑失败')
  }

  console.log('✅ [API] 编辑完成 | 来源:', json.source)
  return {
    imageUrl: json.data.imageUrl,
    prompt: json.data.prompt
  }
}
