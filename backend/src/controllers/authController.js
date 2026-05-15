/**
 * 认证控制器
 * 微信登录 + 匿名登录 + Token 验证
 */
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import config from '../config/index.js'
import { code2Session, isWechatConfigured } from '../services/wechatService.js'
import logger from '../utils/logger.js'

/**
 * 生成 JWT Token
 * 复用 config.jwt 统一配置
 */
function generateToken(payload) {
  if (!config.jwt.secret) {
    throw new Error('JWT_SECRET 未配置')
  }
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn })
}

/**
 * POST /api/auth/wechat — 微信小程序登录
 * 前端调用 wx.login() 获取 code，发送到此处换取 JWT
 *
 * 请求体: { code: string }
 * 响应:   { success: true, token, expiresIn, user }
 */
export async function wechatLogin(req, res) {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ error: '缺少 code 参数', code: 'MISSING_CODE' })
    }

    if (!isWechatConfigured()) {
      return res.status(503).json({
        error: '微信登录未配置',
        message: '请在 .env 中配置 WX_APPID 和 WX_SECRET',
        code: 'WECHAT_NOT_CONFIGURED',
      })
    }

    // 微信 code2Session
    const { openid, unionid } = await code2Session(code)

    // 生成 JWT — 携带 openid 作为用户标识
    const payload = {
      type: 'wechat',
      openid,
      uid: hashOpenid(openid), // 脱敏后的用户 ID，用于日志和展示
    }
    if (unionid) payload.unionid = unionid

    const token = generateToken(payload)

    logger.info(`微信用户登录: uid=${payload.uid}`)

    res.json({
      success: true,
      token,
      expiresIn: config.jwt.expiresIn,
      user: { type: 'wechat', uid: payload.uid },
    })
  } catch (err) {
    logger.error(`微信登录失败: ${err.message}`)
    res.status(500).json({
      error: '登录失败，请重试',
      message: err.message,
    })
  }
}

/**
 * POST /api/auth/token — 匿名令牌（开发/调试用）
 * 生产环境建议关闭此接口，仅使用微信登录
 */
export function anonymousLogin(req, res) {
  if (!config.jwt.secret) {
    return res.status(500).json({ error: '认证服务未配置' })
  }

  // 生产环境限制匿名登录
  if (config.isProduction) {
    return res.status(403).json({
      error: '生产环境不允许匿名登录',
      code: 'ANONYMOUS_DISABLED',
    })
  }

  const token = generateToken({
    type: 'anonymous',
    id: `anon_${Date.now()}`,
  })

  logger.info('颁发匿名令牌')
  res.json({ success: true, token, expiresIn: config.jwt.expiresIn })
}

/**
 * GET /api/auth/verify — 验证令牌有效性
 */
export function verifyToken(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, error: '未提供令牌' })
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, config.jwt.secret)
    res.json({ valid: true, user: decoded })
  } catch (err) {
    res.status(401).json({ valid: false, error: '令牌无效或已过期' })
  }
}

/**
 * GET /api/auth/status — 认证服务状态
 */
export function authStatus(req, res) {
  res.json({
    jwt: !!config.jwt.secret,
    wechat: isWechatConfigured(),
    wechatAppid: isWechatConfigured() ? config.wechat.appid : null,
    anonymousAllowed: !config.isProduction,
  })
}

/**
 * 对 openid 做单向 hash，用于日志脱敏
 * 不存储原始 openid，仅用于 JWT 内部标识
 */
function hashOpenid(openid) {
  return crypto.createHash('sha256').update(openid).digest('hex').substring(0, 12)
}