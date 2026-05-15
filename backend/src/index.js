/**
 * 图灵绘境 - 服务启动入口
 */
import app from './app.js'
import config from './config/index.js'
import logger from './utils/logger.js'

app.listen(config.port, () => {
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