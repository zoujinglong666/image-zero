# 🚀 画风提取器 — 部署指南

> **最后更新**: 2026-06-03 | **架构**: Spring Boot 3.4 + uni-app Vue3 + MySQL 8
> **小程序 AppID**: `wx844c572f78370d68`

---

## 一、架构总览

```
┌─────────────────┐        HTTPS         ┌──────────────────────┐
│  微信小程序 / H5 │ ──────────────────→ │  Nginx (:443 / :80)   │
│  (uni-app Vue3)  │                     │  反向代理             │
└─────────────────┘                     └──────┬───────────────┘
                                               │
                    ┌────────────────────────────┼────────────────────┐
                    │                            │                     │
              ┌─────▼──────┐              ┌──────▼─────┐       ┌──────▼─────┐
              │ 静态资源    │              │ /api/ 反代  │       │ /upload     │
              │ (H5 dist)  │              │ → :8080    │       │ → :8080     │
              └────────────┘              └──────┬─────┘       └──────┬─────┘
                                               │                     │
                                          ┌────▼─────┐          ┌────▼─────┐
                                          │ Spring   │          │ 腾讯云COS │
                                          │ Boot :8080│          │ 图片存储  │
                                          └────┬─────┘          └──────────┘
                                               │
                          ┌────────────────────┼────────────────────┐
                          │                    │                     │
                    ┌─────▼──────┐      ┌──────▼─────┐      ┌──────▼─────┐
                    │ 小米 MiMo  │      │ 智谱 AI    │      │  MySQL 8   │
                    │ (首选AI)   │      │ (降级AI)   │      │ turing_    │
                    └────────────┘      └────────────┘      │ drawing    │
                                                          └────────────┘
```

### 技术栈

| 层 | 技术 | 版本 | 端口 |
|----|------|------|------|
| **前端** | uni-app (Vue3) + uView Pro | - | 5173 (dev) |
| **后端** | Java Spring Boot 3.4 | 3.4.1 | **8080** |
| **数据库** | MySQL 8 | 8.x | 3306 |
| **ORM** | MyBatis-Plus | 3.5.9 | - |
| **AI（首选）** | 小米 MiMo | mimo-v2.5 | api.xiaomimimo.com |
| **AI（降级）** | 智谱 AI GLM-4.6V-Flash | - | open.bigmodel.cn |
| **文件存储** | 腾讯云 COS | - | - |
| **数据库迁移** | Flyway | - | 当前 V22 |

---

## 二、本地开发环境启动

### 前置条件

```bash
# 必须安装
Java 22+          # java -version
Node.js 20+       # node -v
MySQL 8           # mysql --version
Maven 3.8+        # mvn -v
pnpm 或 npm       # pnpm -v
微信开发者工具     # 仅小程序开发需要
```

### 1️⃣ 启动 MySQL

```bash
# 确认 MySQL 运行中
mysql -u root -p12345678 -e "SELECT 1"

# 创建数据库（首次）
mysql -u root -p12345678 -e "
  CREATE DATABASE IF NOT EXISTS turing_drawing
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"
```

> Flyway 会自动执行全部 22 个迁移脚本，无需手动建表。

### 2️⃣ 启动后端

```bash
cd backend

# 配置环境变量（首次需编辑 .env）
cp .env.example .env
# 编辑 .env：填入 API Key 等（见第三节）

# 编译 + 启动
mvn spring-boot:run -DskipTests

# 看到 "Started TuringDrawingApplication" 即成功
# 默认端口: 8080
# 健康检查: curl http://localhost:8080/api/health
```

### 3️⃣ 启动前端（H5 开发模式）

```bash
cd frontend

# 安装依赖（首次）
pnpm install  # 或 npm install

# H5 开发模式
pnpm dev:h5
# 访问 http://localhost:5173

# 微信小程序开发模式
pnpm dev:mp-weixin
# 然后用微信开发者工具导入 dist/dev/mp-weixin 目录
# AppID: wx844c572f78370d68
```

---

## 三、环境变量配置

### 后端 `backend/.env`

```env
# ═══ 小米 MiMo（多模态视觉模型，首选 Provider）════
MIMO_API_KEY=sk-cedk959ee7qbrwvaph6xn54owm7zhtuqd5nxw8x53ckrqhqc
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_ANALYZE_MODEL=mimo-v2.5

# ═══ 智谱 AI（降级 Provider）════
ZHIPU_API_KEY=your_zhipu_api_key_here
OPENAI_API_KEY=your_zhipu_api_key_here
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
AI_ANALYZE_MODEL=glm-4.6v-flash

# ═══ 数据库 ═══
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/turing_drawing?useSSL=false&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=12345678

# ═══ JWT 认证 ═══
JWT_SECRET=your_random_32_char_secret_key_here
JWT_EXPIRES_IN=7d

# ═══ 腾讯云 COS（图片存储）════
COS_SECRET_ID=your_cos_secret_id
COS_SECRET_KEY=your_cos_secret_key
COS_BUCKET=lq-picture-1307878423
COS_REGION=ap-guangzhou

# ═══ 微信小程序（可选）════
WX_APPID=wx844c572f78370d68
WX_SECRET=your_wx_app_secret
```

### 前端 `.env.dev`（本地开发）

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

### 前端 `.env.production`（生产环境）

```env
VITE_API_BASE_URL=https://your-domain.com/api
```

---

## 四、生产环境部署

### 方案 A：传统服务器部署（推荐新手）

#### 服务器要求

- OS: Ubuntu 22.04+ / CentOS 7+
- RAM: 2GB+
- CPU: 2核+

#### 步骤 1: 安装 JDK 21+

```bash
# Ubuntu
sudo apt update && sudo apt install -y openjdk-21-jdk maven

java -version  # 确认 21+
```

#### 步骤 2: 安装 MySQL 8

```bash
sudo apt install -y mysql-server
sudo mysql_secure_setup

# 创建数据库和用户
mysql -u root -p <<EOF
CREATE DATABASE turing_drawing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'turing'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON turing_drawing.* TO 'turing'@'localhost';
FLUSH PRIVILEGES;
EOF
```

#### 步骤 3: 构建并部署后端

```bash
# 本地或服务器上构建 JAR
cd backend
mvn clean package -DskipTests
# 产物: target/turing-drawing-1.0.0.jar

# 上传到服务器后运行
nohup java -jar turing-drawing-1.0.0.jar \
  --spring.profiles.active=prod \
  > app.log 2>&1 &

# 或使用 systemd 服务（见下方）
```

#### 步骤 4: 构建 H5 前端

```bash
cd frontend
pnpm build:h5
# 产物: dist/build/h5/
```

#### 步骤 5: Nginx 配置

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书（Let's Encrypt 或其他 CA）
    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # H5 前端静态资源
    location / {
        root /var/www/turing-drawing/dist/build/h5;
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理到 Spring Boot
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 文件上传接口
    location /api/upload {
        client_max_body_size 10M;
        proxy_pass http://127.0.0.1:8080;
    }
}

# HTTP → HTTPS 重定向
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

#### 步骤 6: systemd 服务（保持后台运行）

```ini
# /etc/systemd/system/turing-drawing.service
[Unit]
Description=Turing Drawing Backend
After=mysql.service network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/turing-drawing/backend
ExecStart=/usr/bin/java -jar target/turing-drawing-1.0.0.jar
Restart=always
RestartSec=10
Environment=JAVA_OPTS=-Xmx512m

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable turing-drawing
sudo systemctl start turing-drawing
sudo systemctl status turing-drawing
```

### 方案 B: Docker 部署（⭐ 推荐，一键启动全部服务）

> 包含 MySQL + Spring Boot + Nginx 全套，无需手动安装任何依赖

```bash
# 1. 进入项目目录
cd /path/to/img-prompt-starter

# 2. 确认后端配置已就绪（密钥已填好）
cat backend/.env.production | head -5

# 3. 一键构建并启动（首次需下载镜像，约 3-5 分钟）
docker compose up -d --build

# 4. 查看各容器状态
docker compose ps
# 应看到: turing-mysql(healthy) / turing-backend(healthy) / turing-nginx(running)

# 5. 查看日志
docker compose logs -f backend    # 后端日志
docker compose logs -f nginx      # Nginx 日志

# 6. 停止所有服务
docker compose down               # 停止（保留数据）
docker compose down -v            # 停止 + 清除数据库数据 ⚠️
```

**Docker 架构图**：
```
docker compose up -d --build
        │
        ├── mysql:8.0          → 127.0.0.1:3306（不对外暴露）
        │   └── 数据持久化 → volume: mysql-data
        │
        ├── backend (JDK21)     → 127.0.0.1:8080
        │   └── env_file: backend/.env.production
        │   └── depends_on: mysql(healthy)
        │
        └── nginx:alpine        → :80 / :443（对外暴露）
            ├── 静态文件: frontend/dist/build/h5
            ├── API 反代: → backend:8080/api/
            └── SSL证书: ./certbot/conf/
```

**未备案/IP 直连模式**（默认）：
```bash
# docker-compose.yml 默认使用 nginx-no-domain.conf（HTTP 80端口）
# 备案完成后切换到 HTTPS 版本：
NGINX_CONF=./deploy/nginx.conf docker compose up -d
```

** Railway / Render 一键部署**（根目录 Dockerfile）：
```
平台自动读取根目录 Dockerfile → 同时构建前端H5 + 后端JAR → 单容器运行
```

---

## 五、微信小程序发布流程

### 1. 开发阶段

```bash
cd frontend
pnpm dev:mp-weixin
```

打开**微信开发者工具** → 导入项目 → 选择 `dist/dev/mp-weixin` → AppID 填 `wx844c572f78370d68`

### 2. 发布前检查清单

- [ ] `manifest.json` 中 `mp-weixin.appid` 已填入真实 AppID ✅
- [ ] 小程序名称、头像、介绍已填写
- [ ] 所有 API 请求使用 HTTPS 域名（不能有 localhost/IP）
- [ ] 后端域名已加入微信后台「服务器域名」白名单
- [ ] `urlCheck` 在生产环境设为 `true`
- [ ] 测试真机预览通过（iOS + Android）

### 3. 提交审核

微信开发者工具 → 上传代码 → 登录 [mp.weixin.qq.com](https://mp.weixin.qq.com) → 版本管理 → 提交审核

### 4. 域名白名单配置

在微信公众平台 → 开发管理 → 开发设置 → 服务器域名 中添加：

| 类型 | 域名 |
|------|------|
| request 合法域名 | `https://your-domain.com` |
| uploadFile 合法域名 | `https://your-domain.com` |
| downloadFile 合法域名 | `https://your-domain.com` |

---

## 六、核心 API 接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/token` | 获取匿名令牌 | ❌ |
| POST | `/api/auth/wechat` | 微信登录 | ❌ |
| POST | `/api/upload` | 上传图片→COS | ❌ |
| POST | `/api/image/analyze` | AI 分析图片风格 | ✅ Token |
| POST | `/api/image/edit` | 编辑图片 | ✅ Token |
| GET | `/api/prompt/list` | 词库列表 | ❌ |
| GET | `/api/prompt/{id}` | 词库详情 | ❌ |
| GET | `/api/health` | 健康检查 | ✅ |

> 完整 API 文档见代码中的 Controller 层，所有接口遵循 RESTful 规范。

---

## 七、常见问题

### Q: Flyway 迁移失败怎么办？
**A**: 如果迁移脚本报错导致 schema 不一致：
```sql
DROP DATABASE turing_drawing;
CREATE DATABASE turing_drawing ...;
-- 重启 Spring Boot，Flyway 会从头执行全部 22 个迁移
```

### Q: 小米 MiMo 返回 429 限流？
**A**: 这是正常的。系统会自动重试 3 次（指数退避），然后降级到智谱 AI。

### Q: 如何切换 AI Provider？
**A**: 修改 `backend/.env` 中的 `MIMO_API_KEY` 和 `ZHIPU_API_KEY`。
Provider 优先级：小米 MiMo → 智谱 AI → 硅基流动 → OpenAI → Gemini

### Q: 前端编译 TS 报错但实际能跑？
**A**: vue-tsc 对 Vue SFC 的类型检查可能产生误报。只要 `pnpm dev:h5` 能正常启动且页面显示正确，可以忽略这些 TS 错误。

---

## 八、项目目录结构

```
img-prompt-starter/
├── backend/                  # Spring Boot 后端
│   ├── src/main/java/...     # Java 源码
│   ├── src/main/resources/
│   │   ├── application.yml   # Spring Boot 配置
│   │   ├── logback-spring.xml
│   │   └── db/migration/     # Flyway 迁移脚本 (V1~V22)
│   ├── .env                  # 🔑 环境变量（不提交 Git）
│   ├── .env.example          # 环境变量模板
│   ├── pom.xml
│   └── target/               # 编译产物
│
├── frontend/                 # uni-app 前端
│   ├── src/
│   │   ├── pages/            # 页面 (index/edit/prompt/history/mine)
│   │   ├── api/              # API 层
│   │   ├── config/           # 配置中心
│   │   ├── stores/           # Pinia 状态管理
│   │   └── types/            # TypeScript 类型
│   ├── manifest.json         # ⚙️ uni-app 配置（含微信 AppID）
│   ├── pages.json            # 页面路由 & TabBar
│   ├── .env.dev              # 开发环境变量
│   └── dist/                 # 编译产物
│
├── deploy/                   # 部署配置
│   ├── nginx.conf            # Nginx（已备案+HTTPS）
│   ├── nginx-no-domain.conf  # Nginx（未备案/IP直连）
│   └── scripts/
├── docker-compose.yml        # ⚙️ Docker 编排（MySQL + Backend + Nginx）
├── Dockerfile                # 根目录（Railway 一键部署）
├── backend/
│   ├── Dockerfile            # 后端标准版
│   ├── Dockerfile.optimized  # 后端优化版 ⭐ compose 默认使用
│   ├── .env                  # 本地开发变量
│   ├── .env.production       # 🔑 生产变量（Docker 自动读取）
│   └── .env.example          # 变量模板
├── frontend/
│   └── Dockerfile            # 前端 H5 构建
├── DEPLOYMENT.md             # 📖 完整部署指南
└── README.md                 # 项目说明
```
