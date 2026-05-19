# 图灵绘境 (Turing Drawing Realm)

> AI驱动的智能绘图平台，结合Spring Boot 3和现代化前端技术栈

## 🎯 项目简介

图灵绘境是一个基于AI技术的智能绘图平台，提供文本到图像生成、图像编辑、风格转换等功能。项目采用现代化的微服务架构，支持高并发和可扩展的部署方案。

## 🏗️ 技术架构

### 后端技术栈
- **框架**: Spring Boot 3.x
- **数据库**: MySQL 8.0
- **ORM**: Spring Data JPA + Hibernate
- **安全**: Spring Security + JWT
- **缓存**: Caffeine
- **AI服务**: OpenAI GPT-4, Google Gemini
- **文件存储**: 腾讯云COS
- **监控**: Spring Boot Actuator + Prometheus

### 前端技术栈
- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **UI组件**: Element Plus
- **状态管理**: Pinia
- **构建目标**: H5 + 微信小程序

## 🚀 快速开始

### 环境要求
- Java 17+
- Maven 3.6+
- Node.js 18+
- MySQL 8.0+
- Docker & Docker Compose (可选)

### 一键部署

```bash
# 使用部署脚本
./deploy/scripts/deploy.sh -m docker -e prod

# Windows系统
deploy\scripts\deploy.bat -m docker -e prod
```

### 手动部署

#### 1. 环境配置
```bash
# 生成环境配置
./config/scripts/setup-env.sh prod
```

#### 2. Docker部署
```bash
# 启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f backend
```

#### 3. 原生部署
```bash
# 构建后端
cd backend && ./mvnw clean package -DskipTests

# 构建前端
cd frontend && npm run build

# 启动服务
java -jar backend/target/*.jar --spring.profiles.active=prod
```

## 📁 项目结构

```
turing-drawing/
├── backend/                  # Spring Boot后端
│   ├── src/                  # 源代码
│   ├── Dockerfile            # 生产Dockerfile
│   ├── Dockerfile.optimized  # 优化版Dockerfile
│   └── pom.xml              # Maven配置
├── frontend/                 # 前端代码
│   ├── src/                  # 源代码
│   ├── dist/                 # 构建产物
│   └── package.json         # 依赖配置
├── deploy/                   # 部署相关
│   ├── scripts/              # 部署脚本
│   ├── configs/              # 配置文件模板
│   └── docs/                 # 部署文档
├── config/                   # 环境配置管理
│   ├── environments/         # 环境配置模板
│   ├── templates/            # 配置模板
│   └── scripts/              # 配置生成脚本
├── legacy-nodejs-backend/    # 已废弃的Node.js后端
└── docker-compose.yml        # Docker部署配置
```

## ⚙️ 环境配置

### 支持的部署环境
- **开发环境** (`dev`): 本地开发，调试模式
- **测试环境** (`test`): 测试验证，模拟生产
- **生产环境** (`prod`): 生产部署，性能优化

### 配置管理
所有环境配置统一存储在 `config/environments/` 目录下：
- `.env` - 环境变量配置
- `application-{env}.yml` - Spring Boot配置
- `docker-compose.override.yml` - Docker覆盖配置

## 🔧 运维工具

### 部署脚本
- `./deploy/scripts/deploy.sh` - 主部署脚本
- `./deploy/scripts/backup.sh` - 自动备份脚本

### 配置工具
- `./config/scripts/setup-env.sh` - 环境配置生成
- `./config/scripts/setup-logrotate.sh` - 日志轮转配置

### 监控与健康检查
- 健康检查端点: `http://localhost:8080/actuator/health`
- Prometheus指标: `http://localhost:8080/actuator/prometheus`
- API文档: `http://localhost:8080/swagger-ui.html`

## 📊 性能优化

### 后端优化
- **连接池**: HikariCP高性能连接池
- **缓存**: Caffeine本地缓存
- **压缩**: 启用GZIP压缩
- **批处理**: JDBC批处理优化

### Docker优化
- **多阶段构建**: 减少镜像体积
- **构建缓存**: 加速构建过程
- **资源限制**: 容器资源控制
- **安全加固**: 非root用户运行

### 数据库优化
- **连接池**: 合理配置连接数
- **索引优化**: 关键字段索引
- **查询优化**: 避免N+1查询
- **批处理**: 批量操作优化

## 🔒 安全特性

### 应用安全
- JWT令牌认证
- CORS跨域控制
- 输入验证和过滤
- SQL注入防护

### 部署安全
- 非root用户运行
- 文件权限控制
- 环境变量加密
- 网络安全策略

## 📦 备份与恢复

### 自动备份
```bash
# 运行备份脚本
./deploy/scripts/backup.sh

# 设置定时任务
crontab -e
# 添加: 0 2 * * * /path/to/deploy/scripts/backup.sh
```

### 备份内容
- 数据库完整备份
- 上传文件备份
- 配置文件备份
- 日志文件轮转

## 🛠️ 开发指南

### 代码规范
- 遵循Spring Boot最佳实践
- 使用统一的代码风格
- 编写单元测试和集成测试
- 文档注释完整

### 分支策略
- `main`: 生产分支
- `develop`: 开发分支
- `feature/*`: 功能分支
- `hotfix/*`: 紧急修复

## 📞 支持

### 获取帮助
- 查看日志: `docker compose logs -f backend`
- 健康检查: `curl http://localhost:8080/actuator/health`
- API文档: `http://localhost:8080/swagger-ui.html`

### 联系支持
- GitHub Issues: [项目地址]/issues
- 邮箱: support@your-domain.com

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

感谢所有为项目贡献代码和提出建议的开发者们！