/**
 * 图灵绘境 - 服务启动入口
 */
import app from './app.js'
import config from './config/index.js'
import logger from './utils/logger.js'

// ═══════════════════════════════════════
//  进程级异常兜底
// ═══════════════════════════════════════

// 未捕获的同步异常
process.on('uncaughtException', (err) => {
  logger.error(`🔥 uncaughtException: ${err.message}`, { stack: err.stack })
  // 给日志一点时间落盘，然后退出（PM2 会自动重启）
  setTimeout(() => process.exit(1), 1000)
})

// 未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`🔥 unhandledRejection: ${reason}`, { stack: reason?.stack })
  // 不退出进程，但记录日志，避免静默丢失
})

// 进程信号处理（优雅退出）
const shutdown = (signal) => {
  logger.info(`收到 ${signal} 信号，准备优雅退出...`)
  process.exit(0)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// ═══════════════════════════════════════
//  启动服务
// ═══════════════════════════════════════

const server = app.listen(config.port, () => {
  logger.info(`
════════════════════════════════════════
  图灵绘境 后端 v4.0
  分层架构 · 认证 · 日志 · 防护增强
════════════════════════════════════════
  服务地址: http://localhost:${config.port}
  环境: ${config.nodeEnv}
  AI: ${config.openrouter.apiKey ? '✅ 已配置' : '⚠️ 未配置'}
  认证: ${config.jwt.secret ? '✅ 已启用' : '⚠️ 未配置'}
════════════════════════════════════════
  `)
})

// 优雅关闭：停止接收新连接，等待现有请求完成
process.on('SIGTERM', () => {
  logger.info('正在关闭服务器...')
  server.close(() => {
    logger.info('服务器已关闭')
    process.exit(0)
  })
})