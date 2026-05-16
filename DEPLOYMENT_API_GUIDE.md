# 图灵绘境 - API 路径 & 部署配置指南

## 一、架构概览

```
小程序 / H5 前端  →  腾讯云 Nginx (43.138.156.217)  →  Node.js 后端 (:3000)
     ↓                    ↓                                          ↓
 www.image-zero.art    HTTPS + 反向代理                    routes → controllers → services
                        ↓
                  location /api/ {
                      proxy_pass http://127.0.0.1:3000;  ← 不带尾部斜杠！
                  }
```

## 二、域名 & HTTPS

| 项目 | 值 |
|------|-----|
| 域名 | `www.image-zero.art` |
| 服务器 IP | `43.138.156.217` |
| SSL 证书 | Let's Encrypt (certbot) |
| 证书路径 | `/etc/letsencrypt/live/www.image-zero.art/fullchain.pem` |

### DNS 配置

```
image-zero.art       →  A 记录  →  43.138.156.217
www.image-zero.art   →  A 记录  →  43.138.156.217
```

### HTTPS 证书申请

```bash
# 1. 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 2. 申请证书
sudo certbot --nginx -d www.image-zero.art -d image-zero.art

# 3. 自动续期（certbot 默认已配置 systemd timer）
sudo certbot renew --dry-run
```

## 三、核心问题：Nginx proxy_pass 尾部斜杠

`proxy_pass` 尾部是否带 `/` 会**完全改变路径转发行为**：

### ❌ 带尾部斜杠（路径被改写）

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000/;
}
```

| 前端请求 | Nginx 去掉匹配的 `/api/` | 后端收到 |
|----------|--------------------------|----------|
| `/api/analyze` | → `/` + `analyze` | `/analyze` ❌ 404 |
| `/api/auth/wechat` | → `/` + `auth/wechat` | `/auth/wechat` ❌ 404 |

### ✅ 不带尾部斜杠（路径原样转发）

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000;
}
```

| 前端请求 | 后端收到 |
|----------|----------|
| `/api/analyze` | `/api/analyze` ✅ |
| `/api/auth/wechat` | `/api/auth/wechat` ✅ |

> **结论：`proxy_pass` 后面不要加斜杠！**

## 四、后端路由注册

```js
// backend/src/app.js
app.use('/api', imageRoutes)        // /api/analyze, /api/generate, /api/edit
app.use('/api/auth', authRoutes)    // /api/auth/wechat, /api/auth/status
app.use('/api/data', dataRoutes)    // /api/data/history, /api/data/profile
app.use('/api/prompt', promptRoutes) // /api/prompt/list, /api/prompt/community
```

后端所有路由都以 `/api` 开头，所以 Nginx 必须**原样转发**路径。

## 五、前端 API 基地址配置

### 各环境 baseUrl

| 环境 | baseUrl | 来源 |
|------|---------|------|
| 小程序（开发/生产） | `https://www.image-zero.art/api` | `.env` |
| H5 开发 | `/api` | `vite.config.ts` 自动覆盖 |
| H5 生产 | `https://www.image-zero.art/api` | `.env.production` |

### 环境变量文件

**`.env`** — 本地开发（小程序 + H5 dev）
```env
VITE_API_BASE_URL=https://www.image-zero.art/api
```

**`.env.production`** — 生产构建
```env
VITE_API_BASE_URL=https://www.image-zero.art/api
```

### H5 开发模式跨域处理

`vite.config.ts` 中配置了 Vite dev server proxy：

```ts
server: mode === 'development' ? {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
} : {},
```

前端请求 `/api/xxx` → Vite proxy 转发到本地后端，避免浏览器跨域。

## 六、认证机制

### JWT Token

| 项目 | 配置 |
|------|------|
| 密钥 | `JWT_SECRET` 环境变量（64 位随机十六进制） |
| 有效期 | `JWT_EXPIRES_IN=7d` |
| 生成方式 | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### 认证中间件

| 中间件 | 行为 |
|--------|------|
| `authMiddleware` | 强制登录，无 token 返回 401 |
| `optionalAuth` | 有 token 则解析 `req.user`，无 token 则跳过 |

### 认证流程

```
微信小程序: wx.login() → code → POST /api/auth/wechat → JWT
开发调试:   POST /api/auth/token → JWT（生产环境自动禁用）
Token 验证: GET /api/auth/verify → { valid, user }
```

## 七、小程序注意事项

### 1. 开发阶段

微信开发者工具中开启：**详情 → 本地设置 → ☑ 不校验合法域名**

这样开发时可以用 HTTP + IP 地址请求。

### 2. 生产上线必须满足

| 要求 | 说明 |
|------|------|
| HTTPS | 微信小程序强制要求，HTTP 不可用 |
| ICP 备案域名 | 不支持纯 IP 地址 |
| 后台白名单 | 微信公众平台 → 开发管理 → 服务器域名 → request 合法域名 |

### 3. 微信后台配置

```
request 合法域名: https://www.image-zero.art
uploadFile 合法域名: https://www.image-zero.art
downloadFile 合法域名: https://lq-picture-1367878423.cos.ap-guangzhou.myqcloud.com
```

## 八、Nginx 完整配置参考

详见 `deploy/nginx.conf`，关键配置：

```nginx
# HTTP → HTTPS 重定向
server {
    listen 80;
    server_name image-zero.art www.image-zero.art;
    return 301 https://www.image-zero.art$request_uri;
}

# HTTPS 主配置
server {
    listen 443 ssl http2;
    server_name www.image-zero.art;

    # 前端静态资源
    location / {
        root /var/www/turing-paint/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 反向代理（⚠️ proxy_pass 不带尾部斜杠）
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_read_timeout 120s;  # AI 接口需要较长超时
    }
}
```

## 九、环境变量配置

### 后端 `backend/.env`

```env
NODE_ENV=production
PORT=3000
OPENROUTER_API_KEY=sk-xxx
ANALYSIS_MODEL=nvidia/nemotron-nano-12b-v2-vl:free
ALLOWED_ORIGINS=https://www.image-zero.art
JWT_SECRET=<64位随机十六进制>
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE=10

# 微信小程序（可选）
WX_APPID=
WX_SECRET=

# 腾讯云 COS（社区图片上传）
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=lq-picture-1367878423
COS_REGION=ap-guangzhou
COS_DOMAIN=lq-picture-1367878423.cos.ap-guangzhou.myqcloud.com
```

## 十、排查清单

遇到 404 时，按以下步骤排查：

```bash
# 1. 确认后端服务运行中
curl http://127.0.0.1:3000/health

# 2. 确认 Nginx 转发正确（在服务器上执行）
curl http://127.0.0.1/api/auth/status
# 应返回: {"code":0,"data":{...},"message":"操作成功"}

# 3. 确认 Nginx 配置的 proxy_pass 不带斜杠
grep proxy_pass /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*

# 4. 从外部测试 HTTPS
curl https://www.image-zero.art/api/auth/status

# 5. 检查小程序开发者工具 Network 面板
#    查看实际请求的完整 URL 是否正确
```

## 十一、API 路径速查

### 图片处理

| 功能 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 图片分析 | POST | `/api/analyze` | 可选 | multipart/form-data, field: `image` |
| 图片生成 | POST | `/api/generate` | 可选 | JSON body |
| 图片编辑 | POST | `/api/edit` | 可选 | JSON body |
| 提示词适配 | POST | `/api/prompt/adapt` | 无 | JSON body |
| 提示词增强 | POST | `/api/prompt/enhance` | 无 | JSON body |

### 认证

| 功能 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 微信登录 | POST | `/api/auth/wechat` | 无 | body: `{ code }` |
| 匿名登录 | POST | `/api/auth/token` | 无 | 仅开发环境 |
| 验证令牌 | GET | `/api/auth/verify` | Bearer | Header: `Authorization: Bearer <token>` |
| 认证状态 | GET | `/api/auth/status` | 无 | 查询 JWT/微信配置状态 |

### 数据

| 功能 | 方法 | 路径 | 认证 |
|------|------|------|------|
| 历史记录列表 | GET | `/api/data/history` | 可选 |
| 添加历史 | POST | `/api/data/history` | 必须 |
| 切换收藏 | PUT | `/api/data/history/:id/favorite` | 必须 |
| 删除单条 | DELETE | `/api/data/history/:id` | 必须 |
| 清空历史 | DELETE | `/api/data/history` | 必须 |
| 用户偏好 | GET | `/api/data/preferences` | 可选 |
| 更新偏好 | PUT | `/api/data/preferences` | 必须 |
| 用户信息 | GET | `/api/data/profile` | 可选 |
| 更新信息 | PUT | `/api/data/profile` | 必须 |

### 提示词库

| 功能 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 分类列表 | GET | `/api/prompt/categories` | 无 | |
| 提示词列表 | GET | `/api/prompt/list` | 无 | `?category_id=&page=&page_size=` |
| 搜索 | GET | `/api/prompt/search` | 无 | `?q=&category_id=&page=` |
| 提示词详情 | GET | `/api/prompt/:id` | 无 | |
| 互动 | POST | `/api/prompt/:id/interact` | 可选 | body: `{ action: 'view'|'like'|'copy' }` |
| 收藏 | POST | `/api/prompt/:id/favorite` | 必须 | |
| 收藏列表 | GET | `/api/prompt/favorites/list` | 必须 | |

### 用户自创提示词

| 功能 | 方法 | 路径 | 认证 |
|------|------|------|------|
| 创建 | POST | `/api/prompt/mine` | 必须 |
| 更新 | PUT | `/api/prompt/mine/:id` | 必须 |
| 删除 | DELETE | `/api/prompt/mine/:id` | 必须 |
| 我的列表 | GET | `/api/prompt/mine/list` | 必须 |

### 社区分享 (v2.0)

| 功能 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 图片上传 | POST | `/api/prompt/upload` | 必须 | multipart/form-data, field: `image` |
| 创建分享 | POST | `/api/prompt/community` | 必须 | 含安全审核 |
| 社区列表 | GET | `/api/prompt/community` | 可选 | `?sort=&page=&category_id=` |
| 帖子详情 | GET | `/api/prompt/community/:id` | 可选 | |
| 点赞 | POST | `/api/prompt/community/:id/like` | 可选 | |
| 举报 | POST | `/api/prompt/community/:id/report` | 可选 | body: `{ reason, description }` |
| 删除 | DELETE | `/api/prompt/community/:id` | 必须 | 仅可删自己的 |

### 健康检查

| 功能 | 方法 | 路径 | 认证 |
|------|------|------|------|
| 服务状态 | GET | `/health` | 无 |
