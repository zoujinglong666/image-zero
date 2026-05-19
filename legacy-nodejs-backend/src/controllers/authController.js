/**
 * 认证控制器
 * 微信登录 + 匿名登录 + Token 验证
 */
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import config from '../config/index.js'
import { code2Session, isWechatConfigured } from '../services/wechatService.js'
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ServiceUnavailableError,
  InternalError,
} from '../middlewares/responseHandler.js'
import logger from '../utils/logger.js'

/**
 * 生成 JWT Token
 * 复用 config.jwt 统一配置
 */
function generateToken(payload) {
  if (!config.jwt.secret) {
    throw new InternalError('认证服务未配置')
  }
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn })
}

/**
 * POST /api/auth/wechat — 微信小程序登录
 * 前端调用 wx.login() 获取 code，发送到此处换取 JWT
 *
 * 请求体: { code: string }
 *  响应:   { code: 0, data: { token, expiresIn, user }, message: '...' }
 */
export async function wechatLogin(req, res, next) {
  try {
    const { code } = req.body

    if (!code) {
      throw new BadRequestError('缺少 code 参数')
    }

    if (!isWechatConfigured()) {
      throw new ServiceUnavailableError('微信登录暂未开通')
    }

    // 微信 code2Session
    const { openid, unionid } = await code2Session(code)

    // 生成 JWT — 仅携带 uid（hash 后），不存储原始 openid
    // JWT 可被 Base64 解码，原始 openid 不可暴露
    const payload = {
      type: 'wechat',
      uid: hashOpenid(openid),
    }

    const token = generateToken(payload)

    logger.info(`微信用户登录: uid=${payload.uid}`)

    res.success({
      token,
      expiresIn: config.jwt.expiresIn,
      user: { type: 'wechat', uid: payload.uid },
    })
  } catch (err) {
    // AppError 直接交给全局处理器
    if (err instanceof ServiceUnavailableError || err instanceof BadRequestError) {
      return next(err)
    }
    logger.error(`微信登录失败: ${err.message}`)
    next(new InternalError('登录失败，请重试'))
  }
}

/**
 * POST /api/auth/token — 匿名令牌（开发/调试用）
 * 生产环境建议关闭此接口，仅使用微信登录
 */
export function anonymousLogin(req, res, next) {
  try {
    if (!config.jwt.secret) {
      throw new InternalError('认证服务未配置')
    }

    // 生产环境限制匿名登录
    if (config.isProduction) {
      throw new ForbiddenError('生产环境不允许匿名登录')
    }

    const token = generateToken({
      type: 'anonymous',
      id: `anon_${Date.now()}`,
    })

    logger.info('颁发匿名令牌')
    res.success({ token, expiresIn: config.jwt.expiresIn })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/auth/verify — 验证令牌有效性
 */
export function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('未提供令牌')
    }

    const token = authHeader.substring(7)
    try {
      const decoded = jwt.verify(token, config.jwt.secret)
      res.success({ valid: true, user: decoded })
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('令牌已过期')
      }
      throw new UnauthorizedError('令牌无效')
    }
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/auth/status — 认证服务状态
 */
export function authStatus(req, res) {
  res.success({
    jwt: !!config.jwt.secret,
    wechat: isWechatConfigured(),
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
