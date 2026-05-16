/**
 * 图片 API 路由
 */
import { Router } from 'express'
import multer from 'multer'
import { analyze, generate, edit } from '../controllers/imageController.js'
import { adaptPrompt, enhancePrompt } from '../services/promptAdapter.js'
import { RateLimiter } from '../middlewares/rateLimiter.js'
import { createTimeoutMiddleware } from '../middlewares/timeout.js'
import { optionalAuth } from '../middlewares/auth.js'
import { BadRequestError } from '../middlewares/responseHandler.js'
import { sanitizeFilename } from '../utils/validator.js'
import config from '../config/index.js'

const router = Router()
const rateLimiter = new RateLimiter()

// Multer 上传配置 — 带路径清理
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.dest)
  },
  filename: (req, file, cb) => {
    // 净化文件名，防止路径穿越
    const safeName = sanitizeFilename(file.originalname)
    const ext = safeName.includes('.') ? '.' + safeName.split('.').pop() : '.jpg'
    cb(null, `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles,
  },
  fileFilter: (req, file, cb) => {
    // 净化原始文件名
    file.originalname = sanitizeFilename(file.originalname)

    if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}。仅支持: ${config.upload.allowedMimeTypes.join(', ')}`), false)
    }
  },
})

// POST /api/analyze — AI 图片分析
router.post('/analyze',
  rateLimiter.middleware('/api/analyze'),
  createTimeoutMiddleware(120_000),
  optionalAuth,
  upload.single('image'),
  analyze
)

// POST /api/generate — AI 图片生成
router.post('/generate',
  rateLimiter.middleware('/api/generate'),
  createTimeoutMiddleware(30_000),
  optionalAuth,
  generate
)

// POST /api/edit — 编辑图片
router.post('/edit',
  rateLimiter.middleware('/api/edit'),
  createTimeoutMiddleware(120_000),
  optionalAuth,
  edit
)

// ══════════════════════════════════════════
//  提示词工具（借鉴 ImagePrompt.org）
// ══════════════════════════════════════════

// POST /api/prompt/adapt — 多模型提示词适配
router.post('/prompt/adapt',
  rateLimiter.middleware('/api/prompt/adapt'),
  (req, res, next) => {
    try {
      const { analysis, model = 'general', lang = 'en' } = req.body
      if (!analysis) {
        throw new BadRequestError('缺少 analysis 参数', 'MISSING_ANALYSIS')
      }
      const result = adaptPrompt(analysis, model, lang)
      res.success(result, `${model} 提示词适配完成`)
    } catch (err) {
      next(err)
    }
  }
)

// POST /api/prompt/enhance — 提示词增强
router.post('/prompt/enhance',
  rateLimiter.middleware('/api/prompt/enhance'),
  (req, res, next) => {
    try {
      const { prompt, style, quality = 'high', model = 'general' } = req.body
      if (!prompt) {
        throw new BadRequestError('缺少 prompt 参数', 'MISSING_PROMPT')
      }
      const enhanced = enhancePrompt(prompt, { style, quality, model })
      res.success({ original: prompt, enhanced }, '提示词增强完成')
    } catch (err) {
      next(err)
    }
  }
)

export default router
