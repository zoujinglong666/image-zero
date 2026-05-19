# 图灵绘境 - 生产环境配置

## 配置说明

此目录包含生产环境的配置文件。

### 文件说明

- `.env` - 环境变量配置文件
- `application-prod.yml` - Spring Boot 配置文件
- `docker-compose.override.yml` - Docker Compose 覆盖配置

### 使用说明

1. 修改 `.env` 文件中的配置值
2. 根据需要调整 `application-prod.yml` 中的配置
3. 使用 Docker Compose 启动:
   ```bash
   docker compose -f docker-compose.yml -f config/environments/prod/docker-compose.override.yml up -d
   ```

### 生产特性

- 严格的安全配置
- 资源限制和监控
- 高性能优化
- SSL/TLS支持
- 日志轮转配置

### 安全要求

- 使用强密码和密钥
- 启用SSL证书
- 限制网络访问
- 定期更新依赖
- 启用防火墙

### 注意事项

- 生产环境配置需要严格审查
- 建议使用专业的密钥管理服务
- 配置备份和恢复策略
- 监控和告警设置

生成时间: 2026-05-19 10:30:00