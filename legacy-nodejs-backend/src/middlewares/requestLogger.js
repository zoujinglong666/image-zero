/**
 * 请求日志中间件
 *
 * 日志中的 IP 仅供参考，不用于安全判断。
 * 安全相关 IP（限流等）应仅使用 req.ip。
 */
import logger from '../utils/logger.js'

export function requestLogger(req, res, next) {
  const start = Date.now()
  const ip = req.ip || req.socket?.remoteAddress || '-'

  res.on('finish', () => {
    const elapsed = Date.now() - start
    if (req.path.startsWith('/api/') || req.path === '/health') {
      const level = res.statusCode >= 400 ? 'warn' : 'info'
      logger.log(level, `${req.method} ${req.path} → ${res.statusCode} (${elapsed}ms) [IP:${ip}]`)
    }
  })

  next()
}