/**
 * ═══════════════════════════════════════
 *  图灵绘境 - 真实 AI 后端服务 v3.0
 *  零模拟 · 全链路真实 API · 国内可达
 *
 *  v3.0 新增:
 *  ✅ IP 级别速率限制 (防狂刷)
 *  ✅ 请求超时自动中断 (防挂起)
 *  ✅ 熔断器 (连续失败自动降级)
 * ═══════════════════════════════════════
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
const ANALYSIS_MODEL = process.env.ANALYSIS_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free'
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// ═══════════════════════════════════════
//  🛡️ 防护系统: 节流 + 超时 + 熔断
// ═══════════════════════════════════════

// ── 1. IP 速率限制 (内存存储) ──
class RateLimiter {
  constructor() {
    // Map<ip, { count, resetAt }>
    this.windows = new Map()
    // 每个端点的独立规则
    this.rules = {
      '/api/analyze':   { windowMs: 60_000, max: 5 },    // 分析: 1分钟内最多5次
      '/api/generate':  { windowMs: 30_000, max: 10 },   // 生成: 30秒内最多10次
      '/api/edit':      { windowMs: 30_000, max: 8 },    // 编辑: 30秒内最多8次
      default:          { windowMs: 10_000, max: 20 }     // 其他: 10秒内最多20次
    }
  }

  middleware(path) {
    const rule = this.rules[path] || this.rules.default
    return (req, res, next) => {
      const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown'
      const now = Date.now()

      let entry = this.windows.get(ip)
      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + rule.windowMs }
        this.windows.set(ip, entry)
      }

      entry.count++

      if (entry.count > rule.max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
        console.warn(`⚠️ [节流] IP ${ip} 触发限制 (${path}) | 次数: ${entry.count}/${rule.max} | ${retryAfter}s 后重试`)
        return res.status(429).json({
          error: '操作过于频繁，请稍后再试',
          retryAfter,
          limit: rule.max,
          windowSec: rule.windowMs / 1000
        })
      }

      // 响应头告知剩余额度
      res.setHeader('X-RateLimit-Limit', rule.max)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, rule.max - entry.count))
      res.setHeader('X-RateLimit-Reset', entry.resetAt)

      next()
    }
  }

  // 定期清理过期条目（防止内存泄漏）
  cleanup() {
    const now = Date.now()
    for (const [ip, entry] of this.windows) {
      if (now > entry.resetAt) this.windows.delete(ip)
    }
  }
}

// ── 2. 请求超时控制器 ──
function createTimeoutMiddleware(timeoutMs = 120_000) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`⏰ [超时] ${req.method} ${req.path} 超过 ${timeoutMs}ms 中断`)
        res.status(504).json({
          error: '请求超时',
          message: `服务器处理超时 (${timeoutMs / 1000}秒)，请稍后重试`,
          code: 'REQUEST_TIMEOUT'
        })
      }
    }, timeoutMs)

    // 请求完成/关闭时清除定时器
    res.on('finish', () => clearTimeout(timer))
    res.on('close', () => clearTimeout(timer))

    next()
  }
}

// ── 3. 熔断器 (Circuit Breaker) ──
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5       // 连续失败 N 次触发熔断
    this.recoveryTimeout = options.recoveryTimeout || 30_000    // 熔断持续时间 (30s)
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || 1       // 半开状态允许探测次数
    this.timeoutMs = options.timeoutMs || 15_000                // 单次调用超时

    // 状态: closed(正常) → open(熔断) → half_open(试探)
    this.state = 'closed'
    this.failures = 0
    this.lastFailureTime = 0
    this.halfOpenCalls = 0
  }

  async execute(fn, label = 'API') {
    // 熔断中 → 直接拒绝
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime < this.recoveryTimeout) {
        const remain = Math.ceil((this.recoveryTimeout - (Date.now() - this.lastFailureTime)) / 1000)
        throw new Error(`服务暂时不可用，${remain}秒后自动恢复 (熔断中)`)
      }
      // 过了恢复时间 → 进入半开状态
      console.log(`🔄 [熔断] 进入半开状态，允许探测`)
      this.state = 'half_open'
      this.halfOpenCalls = 0
    }

    // 设置单次超时
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} 调用超时`)), this.timeoutMs)
    )

    try {
      const result = await Promise.race([fn(), timeoutPromise])

      // 成功 → 重置计数
      this._onSuccess()
      return result
    } catch (err) {
      this._onFailure(err, label)
      throw err
    }
  }

  _onSuccess() {
    this.failures = 0
    if (this.state === 'half_open') {
      console.log('✅ [熔断] 探测成功，恢复正常')
      this.state = 'closed'
    }
  }

  _onFailure(err, label) {
    this.failures++
    this.lastFailureTime = Date.now()
    console.warn(`❌ [熔断] ${label} 失败 (${this.failures}/${this.failureThreshold}) | ${err.message}`)

    if (this.failures >= this.failureThreshold && this.state !== 'open') {
      this.state = 'open'
      console.error(`🚫 [熔断] ⚡ 已触发！连续失败 ${this.failures} 次，进入熔断状态 ${this.recoveryTimeout / 1000}秒`)
    }
  }

  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      threshold: this.failureThreshold,
      recoveryIn: this.state === 'open'
        ? Math.max(0, this.recoveryTimeout - (Date.now() - this.lastFailureTime))
        : 0
    }
  }
}

// ─── 实例化防护系统 ────────────────────
const rateLimiter = new RateLimiter()
const analyzeCircuitBreaker = new CircuitBreaker({ failureThreshold: 3, recoveryTimeout: 45_000, timeoutMs: 90_000 })

// 每 2 分钟清理一次节流缓存
setInterval(() => rateLimiter.cleanup(), 120_000)

// ─── 中间件 ────────────────────────────
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// 信任代理以获取真实 IP
app.set('trust proxy', 1)

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
    baseURL: OPENROUTER_BASE_URL,
    timeout: 90000  // 90s 全局超时
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
 */
async function analyzeWithOpenRouter(imageBase64) {
  if (!openrouter) {
    throw new Error('AI 客户端未初始化，请配置 API Key')
  }

  const [meta, base64Data] = imageBase64.split(',')
  const mimeType = meta?.match(/data:(.*?);/)?.[1] || 'image/png'

  const maxSize = 18 * 1024 * 1024
  let processedBase64 = base64Data
  if (base64Data.length > maxSize) {
    console.warn(`⚠️ 图片较大 (${(base64Data.length/1024/1024).toFixed(1)}MB)，可能影响分析质量`)
  }

  // 通过熔断器执行
  return await analyzeCircuitBreaker.execute(async () => {
    const completion = await openrouter.chat.completions.create({
      model: ANALYSIS_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${processedBase64}` } },
            { type: 'text', text: ANALYSIS_PROMPT }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.3
    })

    const responseText = completion.choices[0]?.message?.content || ''
    return parseAIResponse(responseText)
  }, 'OpenRouter-Analyze')
}

/**
 * 分析提示词 — 让 AI 返回结构化 JSON
 */
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

/**
 * 解析 AI 响应
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
//  API 路由 (带完整防护)
// ═══════════════════════════════════════

/**
 * POST /api/analyze
 * 真实 AI 图片分析 — 带: 节流 + 超时 + 熔断
 */
app.post('/api/analyze',
  rateLimiter.middleware('/api/analyze'),
  createTimeoutMiddleware(120_000),
  upload.single('image'),
  async (req, res) => {
    const startTime = Date.now()

    try {
      let imageBase64 = ''

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

      // 熔断中的错误特殊处理
      if (error.message.includes('服务暂时不可用') || error.message.includes('熔断')) {
        return res.status(503).json({
          error: 'AI 服务繁忙',
          message: error.message,
          circuitBreaker: analyzeCircuitBreaker.getStatus(),
          retryHint: '请等待片刻后重试'
        })
      }

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

      if (error.message.includes('超时')) {
        return res.status(504).json({
          error: '处理超时',
          message: '图片分析耗时过长，可能是图片过大或网络拥堵',
          hint: '尝试压缩图片后重新上传'
        })
      }

      res.status(500).json({
        error: '分析失败',
        message: error.message,
        detail: error.error || null
      })
    }
  }
)

/**
 * POST /api/generate
 * 真实 AI 图片生成 — 带: 节流 + 超时
 */
app.post('/api/generate',
  rateLimiter.middleware('/api/generate'),
  createTimeoutMiddleware(30_000),
  async (req, res) => {
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
  }
)

/**
 * POST /api/edit
 * 编辑图片 — 带: 节流 + 超时 + 熔断
 */
app.post('/api/edit',
  rateLimiter.middleware('/api/edit'),
  createTimeoutMiddleware(120_000),
  async (req, res) => {
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

      // 有原图 + AI 可用时：通过熔断器执行
      if (originalImage && openrouter) {
        try {
          const result = await analyzeCircuitBreaker.execute(async () => {
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
            const editedAnalysis = parseAIResponse(editedText)
            return editedAnalysis.prompt?.english || newPrompt
          }, 'OpenRouter-Edit')

          newPrompt = result

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
          if (e.message.includes('熔断') || e.message.includes('暂时不可用')) {
            return res.status(503).json({
              error: 'AI 服务繁忙',
              message: e.message,
              circuitBreaker: analyzeCircuitBreaker.getStatus(),
              retryHint: '请等待片刻后重试'
            })
          }
          console.warn('AI 编辑分析失败，使用基础方案:', e.message)
        }
      }

      // 基础方案 (无 AI 时降级)
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
  }
)

/**
 * GET /health — 含防护系统状态
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '图灵绘境后端',
    version: '3.0.0',
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
    protection: {
      rateLimiter: {
        active: true,
        rules: rateLimiter.rules,
        trackedIPs: rateLimiter.windows.size
      },
      circuitBreaker: analyzeCircuitBreaker.getStatus()
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
║     🎨 图灵绘境 后端 v3.0              ║
║     真实 AI · 防护增强 · 国内可达       ║
╠════════════════════════════════════════╣
║  📡 服务地址: http://localhost:${PORT}
╠════════════════════════════════════════╣
║  🔍 /api/analyze  — 节流 5次/min       ║
║  🎨 /api/generate — 节流 10次/30s      ║
║  ✏️ /api/edit     — 节流 8次/30s       ║
╠════════════════════════════════════════╣
║  🛡️ 超时保护: 分析/编辑 120s           ║
║  🛡️ 熔断器: 连续3次失败→熔断45s        ║
║  🛡️ 节流: IP级别限速                   ║
╠════════════════════════════════════════╣
║  💓 /health — 含防护状态               ║
╚════════════════════════════════════════╝
${OPENROUTER_API_KEY ? '✅ 所有功能就绪！' : '⚠️  需要配置 API Key'}
  `)
})
