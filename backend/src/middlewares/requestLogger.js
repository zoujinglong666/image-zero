/**
 * 请求日志中间件
 */
import logger from '../utils/logger.js'

export function requestLogger(req, res, next) {
  const start = Date.now()
  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || '-'

  res.on('finish', () => {
    const elapsed = Date.now() - start
    if (req.path.startsWith('/api/') || req.path === '/health') {
      const level = res.statusCode >= 400 ? 'warn' : 'info'
      logger.log(level, `${req.method} ${req.path} → ${res.statusCode} (${elapsed}ms) [IP:${ip}]`)
    }
  })

  next()
}