# 图灵绘境 - 新版部署指南 (v2.0)

> 最后更新: 2026-05-19 | 架构: Spring Boot 3 + MySQL 8

## 🎯 快速开始

### 一键部署 (推荐)
```bash
# 使用新版部署脚本
./deploy/scripts/deploy.sh -m docker -e prod
```

### Windows系统
```cmd
deploy\scripts\deploy.bat -m docker -e prod
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

## 🔧 环境准备

### 系统要求
- Java 17+
- Maven 3.6+
- Node.js 18+
- Docker & Docker Compose (可选)
- MySQL 8.0+

### 依赖安装
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-17-jdk maven nodejs npm docker.io

# CentOS/RHEL
sudo yum install java-17-openjdk-devel maven nodejs npm docker

# 或使用SDKMAN安装Java
curl -s "https://get.sdkman.io" | bash
sdk install java 17.0.8-tem
```

## ⚙️ 环境配置

### 1. 生成环境配置
```bash
# 生成生产环境配置
./config/scripts/setup-env.sh prod

# 生成开发环境配置
./config/scripts/setup-env.sh dev
```

### 2. 手动配置
创建 `.env` 文件并配置以下参数：

```env
# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_NAME=turing_drawing
DB_USERNAME=root
DB_PASSWORD=your_secure_password

# JWT配置
JWT_SECRET=your_64_char_jwt_secret_here_min_32_chars

# 腾讯云COS
COS_SECRET_ID=your_cos_secret_id
COS_SECRET_KEY=your_cos_secret_key
COS_REGION=ap-guangzhou
COS_BUCKET=your-bucket-name

# AI服务
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# 微信配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret

# CORS配置
CORS_ALLOWED_ORIGINS=https://your-domain.com
```

## 🐳 Docker部署 (推荐)

### 1. 构建并启动
```bash
# 启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f backend

# 查看状态
docker compose ps
```

### 2. 服务说明
- **mysql**: MySQL 8.0 数据库
- **backend**: Spring Boot 应用 (端口 8080)
- **nginx**: 前端静态文件 + API代理 (端口 80/443)

### 3. 常用命令
```bash
# 停止服务
docker compose down

# 重新构建
docker compose build --no-cache

# 查看日志
docker compose logs -f [service]

# 进入容器
docker compose exec backend bash
```

## 🚀 原生部署

### 1. 构建应用
```bash
cd backend
./mvnw clean package -DskipTests
```

### 2. 配置systemd服务
```bash
# 复制服务配置
sudo cp deploy/configs/turing-drawing.service /etc/systemd/system/

# 创建用户和目录
sudo useradd -r -s /bin/false spring
sudo mkdir -p /opt/turing-drawing/{backend,frontend,uploads,logs}
sudo chown -R spring:spring /opt/turing-drawing

# 复制文件
cp backend/target/*.jar /opt/turing-drawing/backend/app.jar
cp -r frontend/dist/build/h5/* /opt/turing-drawing/frontend/
cp .env /opt/turing-drawing/

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable turing-drawing
sudo systemctl start turing-drawing

# 查看状态
sudo systemctl status turing-drawing
```

## 📊 监控与健康检查

### 健康检查端点
```bash
# 基础健康检查
curl http://localhost:8080/actuator/health

# 详细健康信息
curl http://localhost:8080/actuator/health/details

# Prometheus指标
curl http://localhost:8080/actuator/prometheus
```

### 自定义健康指标
- **数据库连接**: `/actuator/health/database`
- **外部服务**: `/actuator/health/externalServices`
- **磁盘空间**: `/actuator/health/diskSpace`

## 📝 日志管理

### 日志位置
- **Docker**: `docker compose logs -f backend`
- **原生**: `/opt/turing-drawing/backend/logs/`
- **系统日志**: `journalctl -u turing-drawing`

### 日志轮转
```bash
# 设置日志轮转
sudo ./config/scripts/setup-logrotate.sh
```

## 🔒 安全加固

### 1. 文件权限
```bash
# 设置敏感文件权限
chmod 600 .env
chmod 600 backend/src/main/resources/application-prod.yml
```

### 2. 网络安全
- 使用防火墙限制端口访问
- 配置SSL/TLS证书
- 定期更新依赖包

### 3. 数据库安全
- 使用强密码
- 限制数据库访问IP
- 定期备份数据

## 📦 数据备份

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

## 🔄 更新部署

### 1. 代码更新
```bash
# 拉取最新代码
git pull

# 重新部署
./deploy/scripts/deploy.sh -m docker -e prod --skip-build
```

### 2. 数据库迁移
```bash
# Docker环境会自动执行Flyway迁移
# 原生部署需手动执行:
java -jar app.jar --spring.profiles.active=prod
```

## 🛠️ 故障排除

### 常见问题

#### 1. 服务启动失败
```bash
# 检查日志
docker compose logs backend

# 检查端口占用
netstat -tlnp | grep :8080
```

#### 2. 数据库连接失败
```bash
# 检查数据库状态
docker compose exec mysql mysql -u root -p -e "SHOW DATABASES;"

# 检查网络连接
telnet localhost 3306
```

#### 3. 前端404错误
```bash
# 检查Nginx配置
docker compose exec nginx cat /etc/nginx/conf.d/default.conf

# 检查前端文件
ls -la frontend/dist/build/h5/
```

### 调试工具
```bash
# 进入容器调试
docker compose exec backend bash

# 检查环境变量
docker compose exec backend env | grep -E "(DB_|JWT_|COS_)"

# 测试API
curl -X GET http://localhost:8080/api/auth/status
```

## 📞 支持

### 获取帮助
- 查看日志: `docker compose logs -f backend`
- 健康检查: `curl http://localhost:8080/actuator/health`
- API文档: `http://localhost:8080/swagger-ui.html`

### 联系支持
- GitHub Issues: [项目地址]/issues
- 邮箱: support@your-domain.com