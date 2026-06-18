/**
 * 请求超时中间件
 */
import { GatewayTimeoutError } from './responseHandler.js'

export function createTimeoutMiddleware(timeoutMs = 120_000) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        next(new GatewayTimeoutError(
          `服务器处理超时 (${timeoutMs / 1000}秒)，请稍后重试`,
          'REQUEST_TIMEOUT',
          { timeoutSec: timeoutMs / 1000 }
        ))
      }
    }, timeoutMs)

    res.on('finish', () => clearTimeout(timer))
    res.on('close', () => clearTimeout(timer))

    next()
  }
}
