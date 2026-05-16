# 图灵绘境 - 傻瓜式上线部署指南

> 域名: `www.image-zero.art` | 服务器: 腾讯云 `43.138.156.217`

## 一、部署架构

```
┌──────────────┐       HTTPS        ┌──────────────────────┐
│  小程序 / H5  │ ─────────────────→ │  Nginx (:443/:80)     │
│  前端         │                    │  www.image-zero.art   │
└──────────────┘                    └──────────┬───────────┘
                                               │
                          ┌────────────────────┼────────────────────┐
                          │                    │                    │
                    ┌─────▼──────┐      ┌──────▼─────┐     ┌──────▼─────┐
                    │ 静态资源    │      │ /api/ 反代  │     │ /health    │
                    │ /dist      │      │ → :3000    │     │ → :3000    │
                    └────────────┘      └──────┬─────┘     └──────┬─────┘
                                               │                  │
                                          ┌────▼─────┐      ┌────▼─────┐
                                          │ Node.js  │      │ 健康检查  │
                                          │ 后端服务  │      │          │
                                          │ :3000    │      └──────────┘
                                          └────┬─────┘
                                               │
                          ┌────────────────────┼────────────────────┐
                          │                    │                    │
                    ┌─────▼──────┐      ┌──────▼─────┐     ┌──────▼─────┐
                    │ OpenRouter  │      │ 腾讯云 COS  │     │ SQLite     │
                    │ AI API      │      │ 图片存储    │     │ 数据库     │
                    └────────────┘      └────────────┘     └────────────┘
```

## 二、服务器环境准备

### 1. 安装 Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # 确认 v20+
```

### 2. 安装 Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 3. 安装 certbot（HTTPS 证书）

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 4. 配置域名解析

在域名商后台添加 DNS 记录：

| 类型 | 主机记录 | 记录值 |
|------|----------|--------|
| A | `@` | `43.138.156.217` |
| A | `www` | `43.138.156.217` |

## 三、后端部署

### 1. 上传代码

```bash
# 在服务器上
sudo mkdir -p /var/www/turing-paint
cd /var/www/turing-paint

# 方式一: git clone
git clone <你的仓库地址> .

# 方式二: scp 上传
# 本地执行: scp -r ./* root@43.138.156.217:/var/www/turing-paint/
```

### 2. 安装后端依赖

```bash
cd /var/www/turing-paint/backend
npm ci --omit=dev
```

> `better-sqlite3` 需要编译环境，如报错请安装: `sudo apt install -y python3 make g++`

### 3. 配置环境变量

```bash
cd /var/www/turing-paint/backend
cp .env.example .env
nano .env
```

**必须修改的项：**

```env
NODE_ENV=production
OPENROUTER_API_KEY=sk-or-v1-xxx        # 你的 OpenRouter API Key
ALLOWED_ORIGINS=https://www.image-zero.art
JWT_SECRET=<64位随机十六进制>              # 生成方式见下方
```

生成 JWT_SECRET：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. 启动后端服务

使用 PM2 管理进程：

```bash
# 安装 PM2
sudo npm install -g pm2

# 启动
cd /var/www/turing-paint/backend
pm2 start src/index.js --name turing-paint

# 设置开机自启
pm2 save
pm2 startup
```

验证：

```bash
curl http://127.0.0.1:3000/health
# {"status":"ok"}
```

### 5. 常用 PM2 命令

```bash
pm2 status                    # 查看状态
pm2 logs turing-paint         # 查看日志
pm2 restart turing-paint      # 重启
pm2 stop turing-paint        # 停止
pm2 monit                     # 监控面板
```

## 四、前端构建 & 部署

### 1. 本地构建

```bash
# 在本地项目根目录
npm install
npm run build:h5
```

构建产物在 `dist/build/h5/` 目录。

### 2. 上传到服务器

```bash
# 本地执行
scp -r dist/build/h5/* root@43.138.156.217:/var/www/turing-paint/dist/
```

### 3. 小程序发布

1. 微信开发者工具导入项目
2. 确认 `src/manifest.json` 中 `appid` 已配置
3. 点击「上传」→ 提交审核

## 五、Nginx 配置

### 1. 复制配置

```bash
sudo cp /var/www/turing-paint/deploy/nginx.conf /etc/nginx/sites-available/turing-paint
sudo ln -sf /etc/nginx/sites-available/turing-paint /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

### 2. 申请 HTTPS 证书

```bash
sudo certbot --nginx -d www.image-zero.art -d image-zero.art
```

certbot 会自动修改 Nginx 配置添加 SSL。

### 3. 验证 & 重载

```bash
sudo nginx -t && sudo nginx -s reload
```

### 4. 验证 HTTPS

```bash
curl https://www.image-zero.art/api/auth/status
# {"code":0,"data":{"jwt":true,"wechat":false,"anonymousAllowed":false},"message":"操作成功"}
```

## 六、微信小程序配置

### 1. 服务器域名白名单

微信公众平台 → 开发管理 → 开发设置 → 服务器域名：

| 类型 | 域名 |
|------|------|
| request 合法域名 | `https://www.image-zero.art` |
| uploadFile 合法域名 | `https://www.image-zero.art` |
| downloadFile 合法域名 | `https://lq-picture-1367878423.cos.ap-guangzhou.myqcloud.com` |

### 2. 小程序配置

确保 `src/manifest.json` 中的 `appid` 已填写。

## 七、Docker 部署（可选）

项目根目录自带 `Dockerfile`，可使用 Docker 部署：

```bash
# 构建镜像
docker build -t turing-paint .

# 运行
docker run -d \
  --name turing-paint \
  -p 3000:3000 \
  --env-file backend/.env \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  turing-paint
```

## 八、更新部署

### 后端更新

```bash
cd /var/www/turing-paint
git pull
cd backend
npm ci --omit=dev
pm2 restart turing-paint
```

### 前端更新

```bash
# 本地构建
npm run build:h5

# 上传
scp -r dist/build/h5/* root@43.138.156.217:/var/www/turing-paint/dist/
```

## 九、日志查看

```bash
# 后端日志
pm2 logs turing-paint

# Nginx 访问日志
sudo tail -f /var/log/nginx/access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

## 十、常见问题

### Q: 前端请求 404

1. 检查 Nginx `proxy_pass` 是否**不带尾部斜杠**
2. 检查后端是否运行: `curl http://127.0.0.1:3000/health`
3. 检查 Nginx 是否正确转发: `curl http://127.0.0.1/api/auth/status`

### Q: CORS 报错

1. 确认 `backend/.env` 中 `ALLOWED_ORIGINS` 包含前端域名
2. 确认 Nginx 正确传递 `Host` 头

### Q: 微信小程序请求失败

1. 确认服务器域名已在微信后台白名单配置
2. 确认使用 HTTPS（非 HTTP）
3. 确认域名已 ICP 备案

### Q: 图片上传失败

1. 检查 Nginx `client_max_body_size`（建议 15m）
2. 检查后端 `MAX_FILE_SIZE` 环境变量
3. 检查 COS 配置是否正确
