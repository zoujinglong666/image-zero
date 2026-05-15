/**
 * JWT 认证中间件
 */
import jwt from 'jsonwebtoken'
import config from '../config/index.js'

/**
 * 验证 JWT Token
 * 生产环境必须启用认证
 */
export function authMiddleware(req, res, next) {
  // 开发环境且未配置 JWT_SECRET 时跳过认证
  if (!config.jwt.secret && !config.isProduction) {
    return next()
  }

  if (!config.jwt.secret) {
    return res.status(500).json({ error: '认证服务未配置' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: '未提供认证令牌',
      code: 'NO_TOKEN',
    })
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, config.jwt.secret)
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '认证令牌已过期', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: '认证令牌无效', code: 'INVALID_TOKEN' })
  }
}

/**
 * 可选认证 — 有 token 则解析，无 token 则跳过
 */
export function optionalAuth(req, res, next) {
  if (!config.jwt.secret) return next()

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next()

  const token = authHeader.substring(7)
  try {
    req.user = jwt.verify(token, config.jwt.secret)
  } catch {
    // 忽略无效 token
  }
  next()
}