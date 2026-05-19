/**
 * PM2 进程管理配置
 * 使用: pm2 start ecosystem.config.cjs
 *
 * 生产环境建议:
 * - 单实例模式 (instances: 1)，因为 SQLite 不支持多进程写入
 * - 如需多实例，请迁移到 PostgreSQL 并设置 instances: 'max'
 */
module.exports = {
  apps: [
    {
      name: 'turing-paint',
      script: 'src/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
      // 日志配置
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 优雅关闭
      kill_timeout: 10000,
      listen_timeout: 30000,
      shutdown_with_message: true,
    },
  ],
}
