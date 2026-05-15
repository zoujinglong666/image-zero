/**
 * Winston 日志系统
 * 替代 console.log，支持分级输出到文件 + 控制台
 */
import winston from 'winston'
import config from '../config/index.js'

const { combine, timestamp, printf, colorize } = winston.format

const logFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
  return `${ts} [${level}] ${message}${metaStr}`
})

const logger = winston.createLogger({
  level: config.log.level,
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  transports: [
    // 控制台输出（带颜色）
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    }),
  ],
})

// 生产环境：额外输出到文件
if (config.isProduction) {
  logger.add(new winston.transports.File({ filename: `${config.log.dir}error.log`, level: 'error' }))
  logger.add(new winston.transports.File({ filename: `${config.log.dir}combined.log` }))
}

export default logger