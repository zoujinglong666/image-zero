# 图灵绘境 - 测试环境配置

## 配置说明

此目录包含测试环境的配置文件。

### 文件说明

- `.env` - 环境变量配置文件
- `application-test.yml` - Spring Boot 配置文件
- `docker-compose.override.yml` - Docker Compose 覆盖配置

### 使用说明

1. 修改 `.env` 文件中的配置值
2. 根据需要调整 `application-test.yml` 中的配置
3. 使用 Docker Compose 启动:
   ```bash
   docker compose -f docker-compose.yml -f config/environments/test/docker-compose.override.yml up -d
   ```

### 测试特性

- 中等详细程度的日志
- 启用性能监控
- 测试数据库隔离
- 支持测试域名访问

### 注意事项

- 请确保所有敏感信息都已正确配置
- 测试环境与生产环境配置相似但独立
- 建议定期清理测试数据

生成时间: 2026-05-19 10:30:00