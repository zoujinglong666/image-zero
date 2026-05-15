/**
 * 请求超时中间件
 */
export function createTimeoutMiddleware(timeoutMs = 120_000) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: '请求超时',
          message: `服务器处理超时 (${timeoutMs / 1000}秒)，请稍后重试`,
          code: 'REQUEST_TIMEOUT',
        })
      }
    }, timeoutMs)

    res.on('finish', () => clearTimeout(timer))
    res.on('close', () => clearTimeout(timer))

    next()
  }
}