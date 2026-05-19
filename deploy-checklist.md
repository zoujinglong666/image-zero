# 图灵绘境 - 腾讯云部署自检文档

> 项目：图灵绘境 (uni-app Vue3 前端 + Express 后端)
> 目标：部署到腾讯云 Ubuntu 22.04 服务器
> 健康检查端点：`/health`（非 `/api/health`）

---

## 一、服务器基础环境

### 1.1 系统更新

| 检查项 | 命令 | 预期结果 | 通过 |
|--------|------|----------|------|
| 系统更新 | `apt update && apt upgrade -y` | 无报错 | ☐ |

### 1.2 Node.js 20.x

| 检查项 | 命令 | 预期结果 | 通过 |
|--------|------|----------|------|
| Node.js 已安装 | `node -v` | v20.x.x | ☐ |
| npm 已安装 | `npm -v` | 10.x.x | ☐ |
| pnpm 已安装 | `pnpm -v` | 9.x.x | ☐ |

安装命令：
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pnpm
```

### 1.3 Nginx

| 检查项 | 命令 | 预期结果 | 通过 |
|--------|------|----------|------|
| Nginx 已安装 | `nginx -v` | nginx/1.x.x | ☐ |
| Nginx 服务运行 | `systemctl status nginx` | active (running) | ☐ |

安装命令：
```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 1.4 Docker & Docker Compose

| 检查项 | 命令 | 预期结果 | 通过 |
|--------|------|----------|------|
| Docker 已安装 | `docker -v` | Docker 2x.x.x | ☐ |
| Docker 服务运行 | `systemctl status docker` | active (running) | ☐ |
| Docker Compose 已安装 | `docker compose version` | Docker Compose v2.x.x | ☐ |

安装命令：
```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

### 1.5 PM2

| 检查项 | 命令 | 预期结果 | 通过 |
|--------|------|----------|------|
| PM2 已安装 | `pm2 -v` | 5.x.x | ☐ |

安装命令：
```bash
npm install -g pm2
```

### 1.6 Git

| 检查项 | 命令 | 预期结果 | 通过 |
|--------|------|----------|------|
| Git 已安装 | `git --version` | git version 2.x.x | ☐ |

---

## 二、项目代码部署

### 2.1 目录结构

| 检查项 | 命令 | 预期结果 | 通过 |
|--------|------|----------|------|
| 后端目录存在 | `ls /opt/turing-paint/backend/package.json` | 文件存在 | ☐ |
| 前端目录存在 | `ls /opt/turing-paint/frontend/index.html` | 文件存在 | ☐ |

目录规划：
```
/opt/turing-paint/
├── backend/          # 后端代码
│   ├── src/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── ecosystem.config.cjs
│   ├── .env          # 环境变量（需手动创建）
│   └── package.json
└── frontend/         # 前端构建产物
    ├── index.html
    └── static/
```

### 2.2 获取代码

| 检查项 | 命令 | 预期结果 | 通过 |
|--------|------|----------|------|
| 创建项目目录 | `mkdir -p /opt/turing-paint` | 无报错 | ☐ |
| 克隆代码 | `git clone <仓库地址> /opt/turing-paint/repo` | 克隆成功 | ☐ |
| 后端代码就位 | `cp -r /opt/turing-paint/repo/backend /opt/turing-paint/backend` | 无报错 | ☐ |

---

## 三、后端部署

> 选择方式A（Docker）或方式B（PM2），二选一

### 3.0 环境变量配置（两种方式共用）

| 检查项 | 预期结果 | 通过 |
|--------|----------|------|
| `.env` 文件已创建 | `/opt/turing-paint/backend/.env` 存在 | ☐ |
| `NODE_ENV=production` | 已设置 | ☐ |
| `PORT=3000` | 已设置 | ☐ |
| `OPENROUTER_API_KEY` | 已填写实际 Key（非空） | ☐ |
| `JWT_SECRET` | 已填写随机密钥（非空） | ☐ |
| `ALLOWED_ORIGINS` | 已填写服务器 IP/域名，**不含 localhost** | ☐ |
| `ALLOWED_ORIGINS` 不含 localhost | 否则生产环境校验会失败退出 | ☐ |

`.env` 模板：
```bash
NODE_ENV=production
PORT=3000
OPENROUTER_API_KEY=你的实际Key
JWT_SECRET=运行此命令生成: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ALLOWED_ORIGINS=http://你的服务器IP,http://你的域名
ANALYSIS_MODEL=nvidia/nemotron-nano-12b-v2-vl:free
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE=10
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
LOG_DIR=logs/
```

⚠️ **关键校验**：后端 `validateConfig()` 会在生产环境启动时检查：
- `OPENROUTER_API_KEY` 不能为空，否则进程退出
- `JWT_SECRET` 不能为空，否则进程退出
- `ALLOWED_ORIGINS` 不能包含 `localhost`，否则进程退出

---

### 方式A：Docker 部署（推荐）

| 步骤 | 命令 | 预期结果 | 通过 |
|------|------|----------|------|
| 进入后端目录 | `cd /opt/turing-paint/backend` | — | ☐ |
| 构建镜像 | `docker compose build` | Successfully built | ☐ |
| 启动容器 | `docker compose up -d` | Container Started | ☐ |
| 容器运行状态 | `docker compose ps` | 状态 Up | ☐ |
| 容器日志无报错 | `docker compose logs --tail=50` | 无 ERROR/FATAL | ☐ |
| 健康检查通过 | `curl http://localhost:3000/health` | 返回 JSON 含 `"status":"ok"` | ☐ |
| 数据卷持久化 | `docker volume ls` | 含 uploads-data/logs-data/data-data | ☐ |

验证健康检查响应示例：
```json
{
  "status": "ok",
  "service": "图灵绘境后端",
  "version": "4.0.0",
  "mode": "production (真实AI)",
  "apis": {
    "analyze": "OpenRouter ✅",
    "generate": "Pollinations.AI (免费 ✅)",
    "edit": "OpenRouter + Pollinations ✅"
  }
}
```

---

### 方式B：PM2 部署

| 步骤 | 命令 | 预期结果 | 通过 |
|------|------|----------|------|
| 进入后端目录 | `cd /opt/turing-paint/backend` | — | ☐ |
| 安装依赖 | `npm ci --omit=dev` | added xxx packages | ☐ |
| PM2 启动 | `pm2 start ecosystem.config.cjs --env production` | online | ☐ |
| 进程状态 | `pm2 status` | turing-paint 状态 online | ☐ |
| 日志无报错 | `pm2 logs turing-paint --lines=30` | 无 ERROR | ☐ |
| 健康检查通过 | `curl http://localhost:3000/health` | 返回 JSON 含 `"status":"ok"` | ☐ |
| 设置开机自启 | `pm2 save && pm2 startup` | 成功 | ☐ |

---

## 四、前端部署

### 4.1 构建前端

| 步骤 | 命令 | 预期结果 | 通过 |
|------|------|----------|------|
| 修改 `.env.production` | 设置 `VITE_API_BASE_URL` 为后端地址 | — | ☐ |
| 本地安装依赖 | `pnpm install` | 无报错 | ☐ |
| 构建 H5 | `pnpm build:h5` | 构建成功 | ☐ |
| 产物存在 | `ls dist/build/h5/index.html` | 文件存在 | ☐ |

`.env.production` 配置：
```bash
VITE_API_BASE_URL=http://你的服务器IP
VITE_APP_NAME=图灵绘境
VITE_APP_VERSION=1.0.0
```

> ⚠️ `VITE_API_BASE_URL` 不要加尾部斜杠，不要加 `/api` 后缀
> 前端请求会自动走 `/api/xxx`，由 Nginx 反向代理到后端

### 4.2 上传前端产物

| 步骤 | 命令 | 预期结果 | 通过 |
|------|------|----------|------|
| 创建前端目录 | `mkdir -p /opt/turing-paint/frontend` | 无报错 | ☐ |
| 上传构建产物 | `scp -r dist/build/h5/* root@服务器IP:/opt/turing-paint/frontend/` | 上传完成 | ☐ |
| 确认文件完整 | `ls /opt/turing-paint/frontend/index.html` | 文件存在 | ☐ |

---

## 五、Nginx 配置

### 5.1 配置文件

| 检查项 | 预期结果 | 通过 |
|--------|----------|------|
| 配置文件已创建 | `/etc/nginx/sites-available/turing-paint` 存在 | ☐ |
| 软链接已创建 | `/etc/nginx/sites-enabled/turing-paint` 指向 sites-available | ☐ |
| 默认站点已移除 | `/etc/nginx/sites-enabled/default` 不存在 | ☐ |
| 配置语法正确 | `nginx -t` 输出 `syntax is ok` | ☐ |
| Nginx 已重载 | `systemctl reload nginx` 无报错 | ☐ |

Nginx 配置内容（`/etc/nginx/sites-available/turing-paint`）：

```nginx
server {
    listen 80;
    server_name 你的服务器IP 你的域名;

    # 前端静态文件
    root /opt/turing-paint/frontend;
    index index.html;

    # gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1024;
    gzip_comp_level 6;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    # API 反向代理 → 后端
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;

        # 图片上传需要较大的 body
        client_max_body_size 10m;
    }

    # 健康检查反向代理
    location /health {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 前端路由 history 模式 → 所有路径回退到 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5.2 SSL 配置（有域名时）

| 检查项 | 命令 | 预期结果 | 通过 |
|--------|------|----------|------|
| Certbot 已安装 | `certbot --version` | certbot x.x.x | ☐ |
| 证书已获取 | `certbot --nginx -d 你的域名` | Successfully received certificate | ☐ |
| HTTPS 访问正常 | `curl -I https://你的域名` | HTTP/2 200 | ☐ |
| 自动续期 | `certbot renew --dry-run` | Congratulations, all simulated renewals succeeded | ☐ |

安装命令：
```bash
apt install -y certbot python3-certbot-nginx
```

---

## 六、安全配置

### 6.1 防火墙

| 检查项 | 命令 | 预期结果 | 通过 |
|--------|------|----------|------|
| ufw 已安装 | `ufw status` | Status: active | ☐ |
| SSH 端口开放 | `ufw allow 22/tcp` | Rule added | ☐ |
| HTTP 端口开放 | `ufw allow 80/tcp` | Rule added | ☐ |
| HTTPS 端口开放 | `ufw allow 443/tcp` | Rule added | ☐ |
| 3000 端口（可选） | `ufw allow 3000/tcp` | Rule added | ☐ |
| 防火墙已启用 | `ufw enable` | Firewall is active | ☐ |

> ⚠️ 启用 ufw 前务必先放行 22 端口，否则 SSH 会断开

### 6.2 SSH 安全

| 检查项 | 预期结果 | 通过 |
|--------|----------|------|
| SSH 密钥已配置 | 可通过密钥登录 | ☐ |
| 密码登录已禁用 | `/etc/ssh/sshd_config` 中 `PasswordAuthentication no` | ☐ |
| root 登录已限制 | `PermitRootLogin prohibit-password` | ☐ |
| SSH 服务已重启 | `systemctl restart sshd` | ☐ |

### 6.3 腾讯云安全组

| 检查项 | 预期结果 | 通过 |
|--------|----------|------|
| 入站规则：22 端口 | 已放行 | ☐ |
| 入站规则：80 端口 | 已放行 | ☐ |
| 入站规则：443 端口 | 已放行 | ☐ |
| 入站规则：3000 端口 | 按需放行 | ☐ |

---

## 七、功能验证

### 7.1 基础连通性

| 检查项 | 命令 | 预期结果 | 通过 |
|--------|------|----------|------|
| 前端页面可访问 | 浏览器访问 `http://服务器IP` | 页面正常渲染 | ☐ |
| 后端健康检查 | `curl http://服务器IP/health` | 返回 JSON 含 `"status":"ok"` | ☐ |
| API 代理正常 | `curl http://服务器IP/api/prompt/list` | 返回 JSON 数据 | ☐ |

### 7.2 后端状态校验

| 检查项 | 验证方式 | 预期结果 | 通过 |
|--------|----------|----------|------|
| AI 服务已配置 | 健康检查返回中 `mode` 字段 | `"production (真实AI)"` | ☐ |
| OpenRouter 可用 | 健康检查返回中 `apis.analyze` | 含 `✅` | ☐ |
| 图片生成可用 | 健康检查返回中 `apis.generate` | `"Pollinations.AI (免费 ✅)"` | ☐ |
| 认证已启用 | 健康检查返回中无认证警告 | 无 `⚠️` | ☐ |

### 7.3 核心功能测试

| 检查项 | 操作 | 预期结果 | 通过 |
|--------|------|----------|------|
| 页面加载 | 浏览器打开首页 | 图灵绘境首页正常显示 | ☐ |
| 图片上传 | 上传一张测试图片 | 上传成功，无网络错误 | ☐ |
| AI 分析 | 点击分析按钮 | 返回分析结果 | ☐ |
| 图片生成 | 输入提示词生成图片 | 图片正常生成 | ☐ |
| 微信登录（如已配置） | 点击微信登录 | 跳转授权流程 | ☐ |

### 7.4 前后端联调

| 检查项 | 验证方式 | 预期结果 | 通过 |
|--------|----------|----------|------|
| 浏览器控制台无 CORS 错误 | F12 → Console | 无 CORS 报错 | ☐ |
| 浏览器控制台无 404 错误 | F12 → Network | 无 API 404 | ☐ |
| API 请求路径正确 | F12 → Network → 查看 API 请求 | 请求走 `/api/xxx`，状态 200 | ☐ |

---

## 八、运维命令速查

### Docker 方式

```bash
# 查看容器状态
docker compose -f /opt/turing-paint/backend/docker-compose.yml ps

# 查看日志
docker compose -f /opt/turing-paint/backend/docker-compose.yml logs -f

# 重启后端
docker compose -f /opt/turing-paint/backend/docker-compose.yml restart

# 更新后端代码并重启
cd /opt/turing-paint/backend && git pull && docker compose up -d --build
```

### PM2 方式

```bash
# 查看进程
pm2 status

# 查看日志
pm2 logs turing-paint

# 重启
pm2 restart turing-paint

# 更新代码并重启
cd /opt/turing-paint/backend && git pull && npm ci --omit=dev && pm2 restart turing-paint
```

### 前端更新

```bash
# 本地重新构建
pnpm build:h5

# 上传到服务器
scp -r dist/build/h5/* root@服务器IP:/opt/turing-paint/frontend/

# 重载 Nginx（一般不需要，静态文件变更即时生效）
nginx -s reload
```

### Nginx

```bash
# 检查配置
nginx -t

# 重载配置
systemctl reload nginx

# 查看错误日志
tail -f /var/log/nginx/error.log
```

---

## 九、常见问题排查

| 现象 | 可能原因 | 排查命令 |
|------|----------|----------|
| 页面空白 | 前端产物未上传或不完整 | `ls /opt/turing-paint/frontend/index.html` |
| 502 Bad Gateway | 后端未启动或端口不对 | `curl http://localhost:3000/health` |
| CORS 报错 | `ALLOWED_ORIGINS` 未包含前端域名 | 检查后端 `.env` 中 `ALLOWED_ORIGINS` |
| 后端启动后立即退出 | 生产环境配置校验失败 | 查看日志：`docker compose logs` 或 `pm2 logs` |
| AI 功能不可用 | `OPENROUTER_API_KEY` 未配置 | 检查 `.env` 中 `OPENROUTER_API_KEY` |
| 图片上传失败 | Nginx `client_max_body_size` 太小 | 检查 Nginx 配置，默认已设 10m |
| 健康检查返回 development 模式 | `NODE_ENV` 未设置为 production | 检查 `.env` 或 Docker 环境变量 |
| 数据丢失 | Docker 卷未挂载或 PM2 模式下数据目录未持久化 | `docker volume ls` 检查卷 |

---

## 十、部署签字确认

| 阶段 | 确认人 | 日期 | 签字 |
|------|--------|------|------|
| 服务器基础环境 | | | |
| 后端部署 | | | |
| 前端部署 | | | |
| Nginx 配置 | | | |
| 安全配置 | | | |
| 功能验证 | | | |
| 全部通过 | | | |
