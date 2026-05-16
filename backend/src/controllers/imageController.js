/**
 * 图片分析 / 生成 / 编辑 控制器
 */
import fs from 'fs'
import axios from 'axios'
import { analyzeImage, generatePollinationsURL, editImageWithAI, analyzeCircuitBreaker } from '../services/aiService.js'
import { validateImageUrl, validatePrompt, validateMagicBytes, sanitizeFilename, safeUnlink, isPathSafe } from '../utils/validator.js'
import { findOrCreateUserFromToken, addHistory } from '../services/dbService.js'
import config from '../config/index.js'
import logger from '../utils/logger.js'
import jwt from 'jsonwebtoken'
import {
  BadRequestError,
  RateLimitError,
  ServiceUnavailableError,
  GatewayTimeoutError,
  InternalError,
} from '../middlewares/responseHandler.js'

/**
 * 从请求中解析用户 ID（可选）
 */
function resolveUserId(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ') || !config.jwt.secret) return 0
  try {
    const payload = jwt.verify(authHeader.substring(7), config.jwt.secret)
    const user = findOrCreateUserFromToken(payload)
    return user.id || 0
  } catch {
    return 0
  }
}

/**
 * POST /api/analyze — AI 图片分析
 */
export async function analyze(req, res, next) {
  const startTime = Date.now()

  try {
    let imageBase64 = ''

    if (req.file) {
      // 路径安全检查 — 防止路径穿越
      if (!isPathSafe(req.file.path, config.upload.dest)) {
        safeUnlink(req.file.path)
        throw new BadRequestError('文件路径异常', 'INVALID_PATH')
      }

      // 魔术字节校验
      const imageBuffer = fs.readFileSync(req.file.path)
      if (!validateMagicBytes(imageBuffer, req.file.mimetype)) {
        safeUnlink(req.file.path)
        throw new BadRequestError('文件内容与声明类型不匹配', 'INVALID_FILE_CONTENT')
      }
      imageBase64 = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`
      safeUnlink(req.file.path)
    } else if (req.body.imageUrl) {
      const imageUrl = req.body.imageUrl
      if (!validateImageUrl(imageUrl)) {
        throw new BadRequestError('图片格式无效', 'INVALID_IMAGE', {
          hint: '支持 JPG/PNG/WebP/GIF/BMP，或合法的图片 URL',
        })
      }
      if (imageUrl.startsWith('http')) {
        // SSRF 防护：禁止请求内网地址
        try {
          const parsed = new URL(imageUrl)
          const hostname = parsed.hostname
          if (
            hostname === 'localhost' || hostname === '127.0.0.1' ||
            hostname === '0.0.0.0' || hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') || hostname.startsWith('172.') ||
            hostname === '169.254.169.254' ||
            hostname.endsWith('.internal') || hostname.endsWith('.local')
          ) {
            throw new BadRequestError('不允许请求内网地址', 'SSRF_BLOCKED')
          }
        } catch (e) {
          if (e instanceof BadRequestError) throw e
          throw new BadRequestError('图片 URL 格式无效', 'INVALID_URL')
        }
        const imgResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 15000,
        })
        const ct = imgResponse.headers['content-type'] || 'image/png'
        imageBase64 = `data:${ct};base64,${Buffer.from(imgResponse.data).toString('base64')}`
      } else {
        imageBase64 = imageUrl
      }
    } else {
      throw new BadRequestError('请提供图片文件或图片URL', 'MISSING_IMAGE')
    }

    logger.info(`开始分析图片... (${(imageBase64.length / 1024 / 1024).toFixed(1)}MB)`)

    const { data, cached } = await analyzeImage(imageBase64)
    const elapsed = Date.now() - startTime

    logger.info(`分析完成! 耗时 ${elapsed}ms | 风格: ${data.style}`)

    // 自动写入历史记录（已登录用户）
    const userId = resolveUserId(req)
    if (userId > 0) {
      try {
        // 缩略图：只保留 base64 前100字符或 URL
        const thumb = imageBase64.length > 200 ? imageBase64.substring(0, 100) + '...' : imageBase64
        addHistory(userId, {
          type: 'analyze',
          imageUrl: thumb,
          promptCn: data.prompt?.chinese || '',
          promptEn: data.prompt?.english || '',
          style: data.style || '',
          resultJson: data,
        })
        logger.info(`[DB] 历史记录已写入: userId=${userId} style=${data.style}`)
      } catch (dbErr) {
        logger.warn(`[DB] 写入历史失败（不影响响应）: ${dbErr.message}`)
      }
    }

    res.success({
      source: cached ? '缓存' : 'OpenRouter',
      elapsed,
      data,
      cached,
    })
  } catch (err) {
    const elapsed = Date.now() - startTime
    logger.error(`分析失败 (${elapsed}ms): ${err.message}`)

    // AppError 直接交给全局处理器
    if (err instanceof BadRequestError) {
      return next(err)
    }

    // 根据错误特征映射为结构化异常
    if (err.message.includes('服务暂时不可用') || err.message.includes('熔断')) {
      return next(new ServiceUnavailableError('AI 服务繁忙', 'AI_CIRCUIT_OPEN', {
        circuitBreaker: analyzeCircuitBreaker.getStatus(),
        retryHint: '请等待片刻后重试',
      }))
    }

    if (err.message.includes('未初始化') || err.message.includes('API Key')) {
      return next(new ServiceUnavailableError('AI 服务未配置', 'AI_NOT_CONFIGURED', {
        hint: '请在后端 .env 文件中配置 OPENROUTER_API_KEY',
        setupUrl: 'https://openrouter.ai/keys',
      }))
    }

    if (err.message.includes('quota') || err.message.includes('429')) {
      return next(new RateLimitError('API 配额不足', 'AI_QUOTA_EXCEEDED', {
        hint: '免费额度已用完，请稍后重试或在 OpenRouter 充值',
      }))
    }

    if (err.message.includes('超时')) {
      return next(new GatewayTimeoutError('图片分析耗时过长', 'AI_TIMEOUT', {
        hint: '尝试压缩图片后重新上传',
      }))
    }

    next(new InternalError('分析失败', 'ANALYZE_FAILED'))
  }
}

/**
 * POST /api/generate — AI 图片生成
 */
export async function generate(req, res, next) {
  try {
    const { prompt, width = 1024, height = 1024, seed, model = 'flux' } = req.body

    if (!validatePrompt(prompt)) {
      throw new BadRequestError('提示词无效', 'INVALID_PROMPT', {
        hint: '提示词长度应在 1-5000 字符之间',
      })
    }

    logger.info('生成图片...')

    const imageUrl = generatePollinationsURL(prompt, { width, height, seed, model })

    // 自动写入生成记录
    const userId = resolveUserId(req)
    if (userId > 0) {
      try {
        addHistory(userId, {
          type: 'generate',
          promptCn: prompt,
          promptEn: prompt,
          generatedUrl: imageUrl,
        })
      } catch (dbErr) {
        logger.warn(`[DB] 写入生成记录失败: ${dbErr.message}`)
      }
    }

    res.success({
      source: 'Pollinations.AI (免费)',
      images: [{ url: imageUrl, revised_prompt: prompt }],
      prompt,
      size: `${width}x${height}`,
      model,
    })
  } catch (err) {
    if (err instanceof BadRequestError) {
      return next(err)
    }
    logger.error(`生成失败: ${err.message}`)
    next(new InternalError('生成失败', 'GENERATE_FAILED'))
  }
}

/**
 * POST /api/edit — 编辑图片
 */
export async function edit(req, res, next) {
  try {
    const { originalPrompt, originalImage, modifications } = req.body

    if (!originalPrompt && !originalImage) {
      throw new BadRequestError('请提供原始提示词或原始图片', 'MISSING_INPUT')
    }

    logger.info('编辑图片...')

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

    // 有原图 + AI 可用时：通过 AI 编辑
    if (originalImage) {
      try {
        const aiPrompt = await editImageWithAI(originalImage, modifications)
        if (aiPrompt) newPrompt = aiPrompt

        // 自动写入编辑记录
        const editUserId = resolveUserId(req)
        if (editUserId > 0) {
          try {
            addHistory(editUserId, {
              type: 'edit',
              promptCn: newPrompt,
              promptEn: newPrompt,
              generatedUrl: generatePollinationsURL(newPrompt, { width: 1024, height: 1024 }),
            })
          } catch (dbErr) {
            logger.warn(`[DB] 写入编辑记录失败: ${dbErr.message}`)
          }
        }

        res.success({
          source: 'OpenRouter + Pollinations.AI',
          imageUrl: generatePollinationsURL(newPrompt, { width: 1024, height: 1024 }),
          prompt: newPrompt,
        })
        return
      } catch (e) {
        if (e.message.includes('熔断') || e.message.includes('暂时不可用')) {
          return next(new ServiceUnavailableError('AI 服务繁忙', 'AI_CIRCUIT_OPEN', {
            circuitBreaker: analyzeCircuitBreaker.getStatus(),
            retryHint: '请等待片刻后重试',
          }))
        }
        logger.warn(`AI 编辑分析失败，使用基础方案: ${e.message}`)
      }
    }

    // 基础方案（无 AI 时降级）
    res.success({
      source: 'Pollinations.AI',
      imageUrl: generatePollinationsURL(newPrompt, { width: 1024, height: 1024 }),
      prompt: newPrompt,
    })
  } catch (err) {
    if (err instanceof BadRequestError) {
      return next(err)
    }
    logger.error(`编辑失败: ${err.message}`)
    next(new InternalError('编辑失败', 'EDIT_FAILED'))
  }
}
