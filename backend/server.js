/**
 * ═══════════════════════════════════════
 *  图灵绘境 - 真实 AI 后端服务 v2.1
 *  零模拟 · 全链路真实 API · 国内可达
 * ═══════════════════════════════════════
 *
 *  图片分析 → OpenRouter (Gemini Flash Vision / Qwen-VL)
 *  图片生成 → Pollinations.AI (免费，无需Key)
 *  图片编辑 → 重分析 + Pollinations 重新生成
 *
 *  使用前: 复制 .env.example 为 .env 并填入 OPENROUTER_API_KEY
 *  申请地址: https://openrouter.ai/keys (免费)
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import OpenAI from 'openai'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// ─── 配置 ──────────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || ''
const ANALYSIS_MODEL = process.env.ANALYSIS_MODEL || 'google/gemini-3.1-flash-image-preview' // 专为图片优化的模型
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// ─── 中间件 ────────────────────────────
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// 文件上传配置
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }
})

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true })
}

// ─── OpenRouter 客户端 (OpenAI 兼容) ────
let openrouter = null
if (OPENROUTER_API_KEY) {
  openrouter = new OpenAI({
    apiKey: OPENROUTER_API_KEY,
    baseURL: OPENROUTER_BASE_URL
  })
  console.log(`✅ OpenRouter 已初始化 | 模型: ${ANALYSIS_MODEL}`)
} else {
  console.warn('⚠️  未配置 API Key，图片分析功能不可用')
  console.warn('   请在 .env 文件中填入 OPENROUTER_API_KEY')
  console.warn('   免费申请: https://openrouter.ai/keys')
}

// ═══════════════════════════════════════
//  核心功能: 真实 AI 图片分析 (OpenRouter)
// ═══════════════════════════════════════

/**
 * 使用 OpenRouter 视觉模型分析图片
 * 支持 Gemini / Qwen / Claude 等多模型切换
 */
async function analyzeWithOpenRouter(imageBase64) {
  if (!openrouter) {
    throw new Error('AI 客户端未初始化，请配置 API Key')
  }

  // 提取 mime type 和纯 base64 数据
  const [meta, base64Data] = imageBase64.split(',')
  const mimeType = meta?.match(/data:(.*?);/)?.[1] || 'image/png'

  // 限制 base64 大小避免超限（OpenRouter 限制约 20MB）
  const maxSize = 18 * 1024 * 1024 // 18MB
  let processedBase64 = base64Data
  if (base64Data.length > maxSize) {
    // 如果太大，截断（实际应该压缩，这里简单处理）
    console.warn(`⚠️ 图片较大 (${(base64Data.length/1024/1024).toFixed(1)}MB)，可能影响分析质量`)
  }

  const completion = await openrouter.chat.completions.create({
    model: ANALYSIS_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${processedBase64}`
            }
          },
          {
            type: 'text',
            text: ANALYSIS_PROMPT
          }
        ]
      }
    ],
    max_tokens: 4096,
    temperature: 0.3
  })

  const responseText = completion.choices[0]?.message?.content || ''
  return parseAIResponse(responseText)
}

/**
 * 分析提示词 — 让 AI 返回结构化 JSON
 */
const ANALYSIS_PROMPT = `你是一个专业的 UI/UX 设计分析师和 AI 绘画提示词专家。

请仔细分析这张图片，然后以严格的 JSON 格式返回以下信息：

{
  "style": "设计风格名称（如：现代简约、扁平化、新拟态、玻璃拟态、赛博朋克、复古、极简主义等）",
  "styleConfidence": 0.85,
  "styleDescription": "一段话描述该风格特点",
  "elements": [
    {
      "type": "元素类型（icon/button/card/input/image/text/badge/avatar/nav/sidebar/modal等）",
      "label": "元素中文名称",
      "description": "该元素的详细描述",
      "position": {"x": 50, "y": 30, "width": 20, "height": 15},
      "confidence": 0.9
    }
  ],
  "layout": "布局类型（flex-row/flex-col/grid-2/grid-3/sidebar-main/horizontal-split等）",
  "layoutDescription": "布局的详细描述",
  "colorScheme": [
    {"hex": "#RRGGBB", "name": "颜色名称中文", "ratio": 45}
  ],
  "primaryColor": "#主色十六进制",
  "prompt": {
    "chinese": "详细的中文AI绘画提示词，用于复现此图",
    "english": "详细的英文AI绘画提示词（Midjourney/Stable Diffusion格式），用于复现此图",
    "keywords": [
      {"keyword": "关键词英文", "weight": 1.5, "category": "style"}
    ]
  }
}

要求：
1. 只返回 JSON，不要其他文字
2. elements 数组包含图中所有可见的主要 UI 元素（至少3个）
3. colorScheme 包含图中所有主要颜色（至少3个），按占比排序
4. prompt.chinese 和 prompt.english 要足够详细，能真正用于 AI 生图复现
5. keywords 包含8-12个关键词`

/**
 * 解析 AI 响应（处理 markdown 代码块包裹的情况）
 */
function parseAIResponse(text) {
  let jsonStr = text.trim()

  // 移除可能的 markdown 代码块标记
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  // 找到 JSON 部分
  const braceStart = jsonStr.indexOf('{')
  const braceEnd = jsonStr.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    jsonStr = jsonStr.substring(braceStart, braceEnd + 1)
  }

  try {
    const parsed = JSON.parse(jsonStr)
    if (!parsed.style || !parsed.prompt) {
      throw new Error('缺少必要字段')
    }
    return parsed
  } catch (e) {
    console.error('JSON 解析失败，原始响应:', text.substring(0, 300))
    throw new Error(`AI 返回数据解析失败: ${e.message}`)
  }
}

// ═══════════════════════════════════════
//  图片生成: Pollinations.AI (免费)
// ═══════════════════════════════════════

function generatePollinationsURL(prompt, options = {}) {
  const { width = 1024, height = 1024, seed, model = 'flux' } = options
  const encodedPrompt = encodeURIComponent(prompt)
  let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${model}&nologo=true`
  if (seed) url += `&seed=${seed}`
  return url
}

// ═══════════════════════════════════════
//  API 路由
// ═══════════════════════════════════════

/**
 * POST /api/analyze
 * 真实 AI 图片分析 — OpenRouter 视觉模型
 */
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  const startTime = Date.now()

  try {
    let imageBase64 = ''

    // 1. 获取图片数据
    if (req.file) {
      const imageBuffer = fs.readFileSync(req.file.path)
      imageBase64 = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`
      fs.unlinkSync(req.file.path)
    } else if (req.body.imageUrl) {
      const imageUrl = req.body.imageUrl
      if (imageUrl.startsWith('http')) {
        const imgResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 15000
        })
        const ct = imgResponse.headers['content-type'] || 'image/png'
        imageBase64 = `data:${ct};base64,${Buffer.from(imgResponse.data).toString('base64')}`
      } else {
        imageBase64 = imageUrl
      }
    } else {
      return res.status(400).json({ error: '请提供图片文件或图片URL' })
    }

    console.log(`🔍 [${new Date().toLocaleTimeString()}] 开始分析图片... (${(imageBase64.length / 1024 / 1024).toFixed(1)}MB)`)

    // 2. 调用 OpenRouter 真实分析
    const analysisResult = await analyzeWithOpenRouter(imageBase64)

    const elapsed = Date.now() - startTime
    console.log(`✅ 分析完成! 耗时 ${elapsed}ms | 风格: ${analysisResult.style}`)

    res.json({
      success: true,
      source: `OpenRouter/${ANALYSIS_MODEL}`,
      elapsed,
      data: analysisResult
    })

  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error(`❌ 分析失败 (${elapsed}ms):`, error.message)

    if (error.message.includes('未初始化') || error.message.includes('API Key')) {
      return res.status(503).json({
        error: 'AI 服务未配置',
        message: '请在后端 .env 文件中配置 OPENROUTER_API_KEY',
        hint: '免费申请: https://openrouter.ai/keys'
      })
    }

    if (error.message.includes('quota') || error.message.includes('429') || error.message.includes('insufficient_quota')) {
      return res.status(429).json({
        error: 'API 配额不足',
        message: '免费额度已用完，请稍后重试或在 OpenRouter 充值'
      })
    }

    res.status(500).json({
      error: '分析失败',
      message: error.message,
      detail: error.error || null
    })
  }
})

/**
 * POST /api/generate
 * 真实 AI 图片生成 — Pollinations.AI
 */
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, width = 1024, height = 1024, seed, model = 'flux' } = req.body

    if (!prompt) {
      return res.status(400).json({ error: '请提供提示词' })
    }

    console.log(`🎨 [${new Date().toLocaleTimeString()}] 生成图片...`)

    const imageUrl = generatePollinationsURL(prompt, { width, height, seed, model })

    res.json({
      success: true,
      source: 'Pollinations.AI (免费)',
      data: {
        images: [{ url: imageUrl, revised_prompt: prompt }],
        prompt,
        size: `${width}x${height}`,
        model
      }
    })

  } catch (error) {
    console.error('❌ 生成失败:', error.message)
    res.status(500).json({ error: '生成失败', message: error.message })
  }
})

/**
 * POST /api/edit
 * 编辑图片 — 基于 OpenRouter 重新分析 + Pollinations 重新生成
 */
app.post('/api/edit', async (req, res) => {
  try {
    const { originalPrompt, originalImage, modifications } = req.body

    if (!originalPrompt && !originalImage) {
      return res.status(400).json({ error: '请提供原始提示词或原始图片' })
    }

    console.log(`✏️ [${new Date().toLocaleTimeString()}] 编辑图片...`)

    let newPrompt = originalPrompt || ''

    if (modifications) {
      const parts = []
      if (modifications.colorScheme) parts.push(`${modifications.colorScheme} color scheme`)
      if (modifications.elementStyle) parts.push(`${modifications.elementStyle} style elements`)
      if (modifications.layout) parts.push(`${modifications.layout} layout arrangement`)
      if (modifications.text) parts.push(`text overlay: "${modifications.text}"`)
      if (modifications.style) parts.push(`${modifications.style} art style`)
      if (parts.length > 0) {
        newPrompt += ', modified with: ' + parts.join(', ')
      }
    }

    // 有原图 + AI 可用时：让 AI 重新分析并优化提示词
    if (originalImage && openrouter) {
      try {
        const [meta, base64Data] = originalImage.split(',')
        const mimeType = meta?.match(/data:(.*?);/)?.[1] || 'image/png'

        const editPromptText = modifications
          ? `基于这张图片，按照以下修改要求重新生成AI绘画提示词: ${JSON.stringify(modifications)}。\n只返回JSON格式的prompt对象。`
          : '基于这张图片，生成一个优化版本的AI绘画提示词。只返回JSON格式。'

        const completion = await openrouter.chat.completions.create({
          model: ANALYSIS_MODEL,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
                { type: 'text', text: editPromptText }
              ]
            }
          ],
          max_tokens: 2048,
          temperature: 0.4
        })

        const editedText = completion.choices[0]?.message?.content || ''
        try {
          const editedAnalysis = parseAIResponse(editedText)
          newPrompt = editedAnalysis.prompt?.english || newPrompt
        } catch (e) {
          console.warn('编辑解析失败，使用基础方案:', e.message)
        }

        res.json({
          success: true,
          source: `OpenRouter/${ANALYSIS_MODEL} + Pollinations.AI`,
          data: {
            imageUrl: generatePollinationsURL(newPrompt, { width: 1024, height: 1024 }),
            prompt: newPrompt
          }
        })
        return
      } catch (e) {
        console.warn('AI 编辑分析失败，使用基础方案:', e.message)
      }
    }

    // 基础方案
    res.json({
      success: true,
      source: 'Pollinations.AI',
      data: {
        imageUrl: generatePollinationsURL(newPrompt, { width: 1024, height: 1024 }),
        prompt: newPrompt
      }
    })

  } catch (error) {
    console.error('❌ 编辑失败:', error.message)
    res.status(500).json({ error: '编辑失败', message: error.message })
  }
})

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '图灵绘境后端',
    version: '2.1.0',
    mode: OPENROUTER_API_KEY ? 'production (真实AI)' : 'development (需配置Key)',
    apis: {
      analyze: OPENROUTER_API_KEY
        ? `OpenRouter/${ANALYSIS_MODEL} ✅`
        : `OpenRouter (❌ 缺少 API Key)`,
      generate: 'Pollinations.AI (免费 ✅)',
      edit: OPENROUTER_API_KEY
        ? `OpenRouter + Pollinations ✅`
        : 'Pollinations only (部分)'
    },
    note: OPENROUTER_API_KEY
      ? '全链路真实 AI，国内可达'
      : '⚠️ 请配置 OPENROUTER_API_KEY',
    setup: 'https://openrouter.ai/keys'
  })
})

// ═══════════════════════════════════════
//  启动服务
// ═══════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     🎨 图灵绘境 后端 v2.1              ║
║     真实 AI · 零模拟 · 国内可达         ║
╠════════════════════════════════════════╣
║  📡 服务地址: http://localhost:${PORT}
╠════════════════════════════════════════╣
║  🔍 图片分析: POST /api/analyze         ║
║     └─ ${OPENROUTER_API_KEY ? 'OpenRouter/'+ANALYSIS_MODEL+' ✅' : '❌ 无Key'}
╠════════════════════════════════════════╣
║  🎨 图片生成: POST /api/generate       ║
║     └─ Pollinations.AI ✅             ║
╠════════════════════════════════════════╣
║  ✏️  图片编辑: POST /api/edit           ║
║     └─ OpenRouter + Pollinations       ║
╠════════════════════════════════════════╣
║  💓 健康检查: GET  /health              ║
╚════════════════════════════════════════╝
${OPENROUTER_API_KEY ? '✅ 所有功能就绪！真实AI在线！' : '⚠️  需要配置 API Key'}
   申请地址: https://openrouter.ai/keys
  `)
})
