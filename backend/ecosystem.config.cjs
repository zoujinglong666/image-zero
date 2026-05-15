/**
 * PM2 集群配置
 * 使用方式: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'turing-paint',
      script: 'src/index.js',
      instances: 'max',          // 集群模式，使用所有 CPU 核心
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // 日志配置
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // 自动重启策略
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      // 优雅关闭
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
}