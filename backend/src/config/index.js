/**
 * 后端配置中心
 * 统一管理所有环境变量和配置项
 */
import 'dotenv/config'

const config = {
  // 服务配置
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // OpenRouter AI 配置
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || '',
    baseUrl: 'https://openrouter.ai/api/v1',
    analysisModel: process.env.ANALYSIS_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free',
    timeout: 90000,
  },

  // CORS 配置
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://43.138.156.217'],
  },

  // 文件上传配置
  upload: {
    maxFileSize: (process.env.MAX_FILE_SIZE || 10) * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
    maxFiles: 1,
    dest: 'uploads/',
  },

  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // 微信小程序配置
  wechat: {
    appid: process.env.WX_APPID || '',
    secret: process.env.WX_SECRET || '',
  },

  // 限流配置
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  },

  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    dir: process.env.LOG_DIR || 'logs/',
  },

  // 数据目录
  dataDir: process.env.DATA_DIR || '',
}

/**
 * 启动时校验必要配置
 * 生产环境必须配置的关键项
 */
export function validateConfig() {
  const errors = []

  if (config.isProduction) {
    if (!config.openrouter.apiKey) {
      errors.push('OPENROUTER_API_KEY 未配置，AI 功能不可用')
    }
    if (!config.jwt.secret) {
      errors.push('JWT_SECRET 未配置，认证功能不可用')
    }
    if (config.cors.allowedOrigins.some(o => o.includes('localhost'))) {
      errors.push('CORS ALLOWED_ORIGINS 包含 localhost，生产环境不安全')
    }
  }

  if (!config.openrouter.apiKey) {
    console.warn('⚠️  未配置 OPENROUTER_API_KEY，图片分析功能不可用')
  }

  if (errors.length > 0) {
    console.error('❌ 生产环境配置校验失败:')
    errors.forEach(e => console.error(`   - ${e}`))
    process.exit(1)
  }
}

export default config