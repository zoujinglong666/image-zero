/**
 * AI 服务层
 * 封装 OpenRouter / Pollinations.AI 调用逻辑
 */
import OpenAI from 'openai'
import axios from 'axios'
import config from '../config/index.js'
import { CircuitBreaker } from '../middlewares/circuitBreaker.js'
import { AnalysisCache } from '../utils/cache.js'
import logger from '../utils/logger.js'

// 分析提示词
const ANALYSIS_PROMPT = `你是一个专业的 UI/UX 设计分析师和 AI 绘画提示词专家。

请仔细分析这张图片，然后以严格的 JSON 格式返回以下信息：

{
  "style": "设计风格名称",
  "styleConfidence": 0.85,
  "styleDescription": "一段话描述该风格特点",
  "elements": [
    {
      "type": "元素类型",
      "label": "元素中文名称",
      "description": "该元素的详细描述",
      "position": {"x": 50, "y": 30, "width": 20, "height": 15},
      "confidence": 0.9
    }
  ],
  "layout": "布局类型",
  "layoutDescription": "布局的详细描述",
  "colorScheme": [
    {"hex": "#RRGGBB", "name": "颜色名称中文", "ratio": 45}
  ],
  "primaryColor": "#主色十六进制",
  "prompt": {
    "chinese": "详细的中文AI绘画提示词",
    "english": "详细的英文AI绘画提示词（Midjourney/Stable Diffusion格式）",
    "keywords": [
      {"keyword": "关键词英文", "weight": 1.5, "category": "style"}
    ]
  }
}

要求：只返回JSON，不要其他文字。elements至少3个，colorScheme至少3个，keywords包含8-12个`

// 单例实例
const analysisCache = new AnalysisCache()
const analyzeCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  recoveryTimeout: 45_000,
  timeoutMs: 90_000,
})

// OpenRouter 客户端
let openrouter = null

export function initAIClient() {
  if (config.openrouter.apiKey) {
    openrouter = new OpenAI({
      apiKey: config.openrouter.apiKey,
      baseURL: config.openrouter.baseUrl,
      timeout: config.openrouter.timeout,
    })
    logger.info(`OpenRouter 已初始化 | 模型: ${config.openrouter.analysisModel}`)
  } else {
    logger.warn('未配置 API Key，图片分析功能不可用')
  }
}

/**
 * 解析 AI 响应为结构化 JSON
 */
function parseAIResponse(text) {
  let jsonStr = text.trim()
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) jsonStr = jsonMatch[1].trim()

  const braceStart = jsonStr.indexOf('{')
  const braceEnd = jsonStr.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    jsonStr = jsonStr.substring(braceStart, braceEnd + 1)
  }

  try {
    const parsed = JSON.parse(jsonStr)
    if (!parsed.style || !parsed.prompt) throw new Error('缺少必要字段')
    return parsed
  } catch (e) {
    logger.error(`JSON 解析失败，原始响应: ${text.substring(0, 300)}`)
    throw new Error(`AI 返回数据解析失败: ${e.message}`)
  }
}

/**
 * 使用 OpenRouter 视觉模型分析图片
 */
export async function analyzeWithOpenRouter(imageBase64) {
  if (!openrouter) {
    throw new Error('AI 客户端未初始化，请配置 API Key')
  }

  const [meta, base64Data] = imageBase64.split(',')
  const mimeType = meta?.match(/data:(.*?);/)?.[1] || 'image/png'

  if (base64Data.length > 18 * 1024 * 1024) {
    logger.warn(`图片较大 (${(base64Data.length / 1024 / 1024).toFixed(1)}MB)，可能影响分析质量`)
  }

  return await analyzeCircuitBreaker.execute(async () => {
    const completion = await openrouter.chat.completions.create({
      model: config.openrouter.analysisModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            { type: 'text', text: ANALYSIS_PROMPT },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    return parseAIResponse(responseText)
  }, 'OpenRouter-Analyze')
}

/**
 * 分析图片（带缓存）
 */
export async function analyzeImage(imageBase64) {
  // 缓存检查
  const cached = analysisCache.get(imageBase64)
  if (cached) {
    logger.info(`分析结果复用 | 风格: ${cached.style}`)
    return { data: cached, cached: true }
  }

  const result = await analyzeWithOpenRouter(imageBase64)
  analysisCache.set(imageBase64, result)

  return { data: result, cached: false }
}

/**
 * 生成图片 URL（Pollinations.AI 免费）
 */
export function generatePollinationsURL(prompt, options = {}) {
  const { width = 1024, height = 1024, seed, model = 'flux' } = options
  const encodedPrompt = encodeURIComponent(prompt)
  let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${model}&nologo=true`
  if (seed) url += `&seed=${seed}`
  return url
}

/**
 * 通过 AI 编辑图片提示词
 */
export async function editImageWithAI(originalImage, modifications) {
  if (!openrouter) {
    throw new Error('AI 客户端未初始化')
  }

  return await analyzeCircuitBreaker.execute(async () => {
    const [meta, base64Data] = originalImage.split(',')
    const mimeType = meta?.match(/data:(.*?);/)?.[1] || 'image/png'

    const editPromptText = modifications
      ? `基于这张图片，按照以下修改要求重新生成AI绘画提示词: ${JSON.stringify(modifications)}。\n只返回JSON格式的prompt对象。`
      : '基于这张图片，生成一个优化版本的AI绘画提示词。只返回JSON格式。'

    const completion = await openrouter.chat.completions.create({
      model: config.openrouter.analysisModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            { type: 'text', text: editPromptText },
          ],
        },
      ],
      max_tokens: 2048,
      temperature: 0.4,
    })

    const editedText = completion.choices[0]?.message?.content || ''
    const editedAnalysis = parseAIResponse(editedText)
    return editedAnalysis.prompt?.english || ''
  }, 'OpenRouter-Edit')
}

/**
 * 获取 AI 服务状态
 */
export function getAIServiceStatus() {
  return {
    openrouter: openrouter
      ? `OpenRouter/${config.openrouter.analysisModel}`
      : 'OpenRouter (未配置 API Key)',
    circuitBreaker: analyzeCircuitBreaker.getStatus(),
    cache: analysisCache.stats(),
  }
}

export { analysisCache, analyzeCircuitBreaker }