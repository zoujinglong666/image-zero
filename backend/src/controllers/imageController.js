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
export async function analyze(req, res) {
  const startTime = Date.now()

  try {
    let imageBase64 = ''

    if (req.file) {
      // 路径安全检查 — 防止路径穿越
      if (!isPathSafe(req.file.path, config.upload.dest)) {
        safeUnlink(req.file.path)
        return res.status(400).json({
          error: '文件路径异常',
          code: 'INVALID_PATH',
        })
      }

      // 魔术字节校验
      const imageBuffer = fs.readFileSync(req.file.path)
      if (!validateMagicBytes(imageBuffer, req.file.mimetype)) {
        safeUnlink(req.file.path)
        return res.status(400).json({
          error: '文件内容与声明类型不匹配',
          code: 'INVALID_FILE_CONTENT',
        })
      }
      imageBase64 = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`
      safeUnlink(req.file.path)
    } else if (req.body.imageUrl) {
      const imageUrl = req.body.imageUrl
      if (!validateImageUrl(imageUrl)) {
        return res.status(400).json({
          error: '图片格式无效',
          code: 'INVALID_IMAGE',
          hint: '支持 JPG/PNG/WebP/GIF/BMP，或合法的图片 URL',
        })
      }
      if (imageUrl.startsWith('http')) {
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
      return res.status(400).json({ error: '请提供图片文件或图片URL' })
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

    res.json({
      success: true,
      source: cached ? '缓存' : `OpenRouter`,
      elapsed,
      data,
      cached,
    })
  } catch (error) {
    const elapsed = Date.now() - startTime
    logger.error(`分析失败 (${elapsed}ms): ${error.message}`)

    if (error.message.includes('服务暂时不可用') || error.message.includes('熔断')) {
      return res.status(503).json({
        error: 'AI 服务繁忙',
        message: error.message,
        circuitBreaker: analyzeCircuitBreaker.getStatus(),
        retryHint: '请等待片刻后重试',
      })
    }

    if (error.message.includes('未初始化') || error.message.includes('API Key')) {
      return res.status(503).json({
        error: 'AI 服务未配置',
        message: '请在后端 .env 文件中配置 OPENROUTER_API_KEY',
        hint: '免费申请: https://openrouter.ai/keys',
      })
    }

    if (error.message.includes('quota') || error.message.includes('429')) {
      return res.status(429).json({
        error: 'API 配额不足',
        message: '免费额度已用完，请稍后重试或在 OpenRouter 充值',
      })
    }

    if (error.message.includes('超时')) {
      return res.status(504).json({
        error: '处理超时',
        message: '图片分析耗时过长，可能是图片过大或网络拥堵',
        hint: '尝试压缩图片后重新上传',
      })
    }

    res.status(500).json({ error: '分析失败', message: error.message })
  }
}

/**
 * POST /api/generate — AI 图片生成
 */
export async function generate(req, res) {
  try {
    const { prompt, width = 1024, height = 1024, seed, model = 'flux' } = req.body

    if (!validatePrompt(prompt)) {
      return res.status(400).json({
        error: '提示词无效',
        code: 'INVALID_PROMPT',
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

    res.json({
      success: true,
      source: 'Pollinations.AI (免费)',
      data: {
        images: [{ url: imageUrl, revised_prompt: prompt }],
        prompt,
        size: `${width}x${height}`,
        model,
      },
    })
  } catch (error) {
    logger.error(`生成失败: ${error.message}`)
    res.status(500).json({ error: '生成失败', message: error.message })
  }
}

/**
 * POST /api/edit — 编辑图片
 */
export async function edit(req, res) {
  try {
    const { originalPrompt, originalImage, modifications } = req.body

    if (!originalPrompt && !originalImage) {
      return res.status(400).json({ error: '请提供原始提示词或原始图片' })
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

        res.json({
          success: true,
          source: 'OpenRouter + Pollinations.AI',
          data: {
            imageUrl: generatePollinationsURL(newPrompt, { width: 1024, height: 1024 }),
            prompt: newPrompt,
          },
        })
        return
      } catch (e) {
        if (e.message.includes('熔断') || e.message.includes('暂时不可用')) {
          return res.status(503).json({
            error: 'AI 服务繁忙',
            message: e.message,
            circuitBreaker: analyzeCircuitBreaker.getStatus(),
            retryHint: '请等待片刻后重试',
          })
        }
        logger.warn(`AI 编辑分析失败，使用基础方案: ${e.message}`)
      }
    }

    // 基础方案（无 AI 时降级）
    res.json({
      success: true,
      source: 'Pollinations.AI',
      data: {
        imageUrl: generatePollinationsURL(newPrompt, { width: 1024, height: 1024 }),
        prompt: newPrompt,
      },
    })
  } catch (error) {
    logger.error(`编辑失败: ${error.message}`)
    res.status(500).json({ error: '编辑失败', message: error.message })
  }
}