# 图灵绘境 - 开发环境配置

## 配置说明

此目录包含开发环境的配置文件。

### 文件说明

- `.env` - 环境变量配置文件
- `application-dev.yml` - Spring Boot 配置文件
- `docker-compose.override.yml` - Docker Compose 覆盖配置

### 使用说明

1. 修改 `.env` 文件中的配置值
2. 根据需要调整 `application-dev.yml` 中的配置
3. 使用 Docker Compose 启动:
   ```bash
   docker compose -f docker-compose.yml -f config/environments/dev/docker-compose.override.yml up -d
   ```

### 开发特性

- 启用调试模式
- 详细的SQL日志
- 热重载支持
- 调试端口开放 (5005)

### 注意事项

- 请确保所有敏感信息都已正确配置
- 开发环境使用较宽松的CORS策略
- 建议使用本地MySQL实例

生成时间: 2026-05-19 10:30:00