/**
 * ══════════════════════════════════════════
 *  图灵绘境 - 后端服务 v4.0 (分层架构)
 *  routes / controllers / services / middlewares
 * ══════════════════════════════════════════
 */
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import config, { validateConfig } from './config/index.js'
import { requestLogger } from './middlewares/requestLogger.js'
import { RateLimiter } from './middlewares/rateLimiter.js'
import { successResponse, globalErrorHandler, notFoundHandler } from './middlewares/responseHandler.js'
import imageRoutes from './routes/image.js'
import authRoutes from './routes/auth.js'
import dataRoutes from './routes/data.js'
import promptRoutes from './routes/prompt.js'
import { initAIClient, getAIServiceStatus } from './services/aiService.js'
import logger from './utils/logger.js'

// 启动前校验配置
validateConfig()

const app = express()

// ═══════════════════════════════════════
//  全局中间件
// ═══════════════════════════════════════

// CORS 配置（严格限制允许的域名）
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (config.cors.allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      logger.warn(`CORS 拒绝来源: ${origin}`)
      callback(new Error('CORS policy: Origin not allowed'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 信任代理以获取真实 IP
app.set('trust proxy', 1)

// 请求日志
app.use(requestLogger)

// 统一结果返回器（在路由之前挂载 res.success / res.successPage）
app.use(successResponse)

// 确保 uploads 目录存在
if (!fs.existsSync(config.upload.dest)) {
  fs.mkdirSync(config.upload.dest, { recursive: true })
}

// ═══════════════════════════════════════
//  路由注册
// ═══════════════════════════════════════

app.use('/api', imageRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/prompt', promptRoutes)

// ═══════════════════════════════════════
//  健康检查
// ═══════════════════════════════════════

app.get('/health', (req, res) => {
  const aiStatus = getAIServiceStatus()
  res.json({
    status: 'ok',
    service: '图灵绘境后端',
    version: '4.0.0',
    mode: config.openrouter.apiKey ? 'production (真实AI)' : 'development (需配置Key)',
    apis: {
      analyze: config.openrouter.apiKey ? `${aiStatus.openrouter} ✅` : 'OpenRouter (❌ 缺少 API Key)',
      generate: 'Pollinations.AI (免费 ✅)',
      edit: config.openrouter.apiKey ? 'OpenRouter + Pollinations ✅' : 'Pollinations only (部分)',
    },
    protection: {
      rateLimiter: true,
      circuitBreaker: aiStatus.circuitBreaker,
    },
    cache: aiStatus.cache,
  })
})

// ═══════════════════════════════════════
//  全局异常处理
// ═══════════════════════════════════════

// 404 兜底（在所有路由之后）
app.use(notFoundHandler)

// 全局异常处理器（必须在最后）
app.use(globalErrorHandler)

// ═══════════════════════════════════════
//  初始化 AI 客户端
// ═══════════════════════════════════════

initAIClient()

// 限流器定期清理
const globalRateLimiter = new RateLimiter()
setInterval(() => globalRateLimiter.cleanup(), 120_000)

export default app