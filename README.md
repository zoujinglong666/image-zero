# 🎨 画风提取器 (Style Extractor)

> 上传一张图 → AI 3秒识别画风 → 可视化编辑 → 一键出图

**小程序 AppID**: `wx844c572f78370d68` | **架构**: Spring Boot 3.4 + uni-app Vue3 + MySQL 8

## 🎯 核心功能

- 🔍 **AI 风格反推** — 上传图片自动识别画风、构图、配色、提取英文提示词
- ✏️ **可视化编辑器** — 调整色彩/元素/布局/风格强度，所见即所得
- 🎭 **四大垂直场景** — 🛒电商主图 / 📱社交头像 / 📊PPT配图 / 🎭风格迁移
- 📚 **热门词库模板** — 50+ 精选 Prompt，一键「生成同款」
- 🛡️ **内容审核系统** — AI + 人工双层风控

## 🏗️ 技术栈

| 层 | 技术 |
|----|------|
| **后端** | Java Spring Boot 3.4 + MyBatis-Plus 3.5.9 |
| **数据库** | MySQL 8 (Flyway 自动迁移 V22) |
| **AI 引擎** | 小米 MiMo (首选) → 智谱 GLM-4.6V-Flash (降级) |
| **前端** | uni-app Vue3 + uView Pro + TypeScript + Pinia |
| **文件存储** | 腾讯云 COS |
| **安全** | Spring Security + JWT + 敏感词过滤 |

## 🚀 快速开始

详细部署指南 → [**DEPLOYMENT.md**](./DEPLOYMENT.md)

### 环境要求
- Java 22+ / JDK 21+
- Maven 3.8+
- Node.js 20+ (pnpm 或 npm)
- MySQL 8.0+
- 微信开发者工具（仅小程序开发）

### 本地开发

```bash
# 1. 启动后端
cd backend
cp .env.example .env   # 首次：编辑填入 API Key
mvn spring-boot:run -DskipTests   # → http://localhost:8080

# 2. 启动前端 H5（另一个终端）
cd frontend
pnpm install          # 首次安装依赖
pnpm dev:h5           # → http://localhost:5173

# 3. 微信小程序模式
pnpm dev:mp-weixin    # → 用微信开发者工具导入 dist/dev/mp-weixin
```

## 📁 项目结构

```
img-prompt-starter/
├── backend/                  # Spring Boot 后端 (Java)
│   ├── src/main/java/...     # Controller / Service / Mapper / Config
│   ├── src/main/resources/
│   │   ├── application.yml   # Spring Boot 配置
│   │   └── db/migration/     # Flyway 迁移 (V1~V22)
│   ├── .env                  # 🔑 环境变量（不提交 Git）
│   └── pom.xml
├── frontend/                 # uni-app 前端 (Vue3)
│   ├── src/pages/            # index / edit / prompt / history / mine
│   ├── manifest.json         # ⚙️ uni-app + 微信 AppID 配置
│   └── pages.json            # 路由 & TabBar
├── deploy/                   # Docker 部署配置
├── DEPLOYMENT.md             # 📖 完整部署指南
└── README.md                 # 你在这里
```
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