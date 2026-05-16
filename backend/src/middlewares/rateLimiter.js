/**
 * IP 速率限制中间件
 * 基于内存的滑动窗口限流
 *
 * IP 获取仅依赖 req.ip（由 Express trust proxy 控制），
 * 不手动解析 X-Forwarded-For，防止客户端伪造绕过限流。
 */
import { RateLimitError } from './responseHandler.js'

export class RateLimiter {
  constructor() {
    this.windows = new Map()
    this.rules = {
      '/api/analyze': { windowMs: 60_000, max: 5 },
      '/api/generate': { windowMs: 30_000, max: 10 },
      '/api/edit': { windowMs: 30_000, max: 8 },
      default: { windowMs: 10_000, max: 20 },
    }
  }

  middleware(path) {
    const rule = this.rules[path] || this.rules.default
    return (req, res, next) => {
      // 仅使用 req.ip，由 Express trust proxy 设置，不手动解析 X-Forwarded-For
      const ip = req.ip || req.socket?.remoteAddress || 'unknown'
      const now = Date.now()

      let entry = this.windows.get(ip)
      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + rule.windowMs }
        this.windows.set(ip, entry)
      }

      entry.count++

      if (entry.count > rule.max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
        return next(new RateLimitError('操作过于频繁，请稍后再试', undefined, {
          retryAfter,
          limit: rule.max,
          windowSec: rule.windowMs / 1000,
        }))
      }

      res.setHeader('X-RateLimit-Limit', rule.max)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, rule.max - entry.count))
      res.setHeader('X-RateLimit-Reset', entry.resetAt)

      next()
    }
  }

  cleanup() {
    const now = Date.now()
    for (const [ip, entry] of this.windows) {
      if (now > entry.resetAt) this.windows.delete(ip)
    }
  }
}
