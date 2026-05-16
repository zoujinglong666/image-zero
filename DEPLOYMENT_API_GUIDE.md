# 图灵绘境 - API 路径 & 部署配置指南

## 一、架构概览

```
小程序 / H5 前端  →  腾讯云 Nginx (43.138.156.217)  →  Node.js 后端 (:3000)
                        ↓
                  location /api/ {
                      proxy_pass http://127.0.0.1:3000;  ← 不带尾部斜杠！
                  }
```

## 二、核心问题：Nginx proxy_pass 尾部斜杠

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

## 三、后端路由注册

```js
// backend/src/app.js
app.use('/api', imageRoutes)       // /api/analyze, /api/generate, /api/edit
app.use('/api/auth', authRoutes)   // /api/auth/wechat, /api/auth/status
app.use('/api/data', dataRoutes)   // /api/data/history, /api/data/profile
app.use('/api/prompt', promptRoutes) // /api/prompt/list, /api/prompt/categories
```

后端所有路由都以 `/api` 开头，所以 Nginx 必须**原样转发**路径。

## 四、前端 API 基地址配置

### 各环境 baseUrl

| 环境 | baseUrl | 来源 |
|------|---------|------|
| 小程序（开发/生产） | `http://43.138.156.217/api` | `.env` |
| H5 开发 | `/api` | `vite.config.ts` 自动覆盖 |
| H5 生产 | `http://43.138.156.217/api` | `.env.production` |

### 环境变量文件

**`.env`** — 本地开发（小程序 + H5 dev）
```env
VITE_API_BASE_URL=http://43.138.156.217/api
```

**`.env.production`** — 生产构建
```env
VITE_API_BASE_URL=http://43.138.156.217/api
```

### H5 开发模式跨域处理

`vite.config.ts` 中配置了 Vite dev server proxy：

```ts
server: mode === 'development' ? {
  proxy: {
    '/api': {
      target: 'http://43.138.156.217',
      changeOrigin: true,
    },
  },
} : {},
```

前端请求 `/api/xxx` → Vite proxy 转发到 `http://43.138.156.217/api/xxx`，避免浏览器跨域。

### http.interceptor.ts 中的 baseUrl

```ts
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://43.138.156.217/api'
```

优先读取环境变量，fallback 到腾讯云服务器地址。

## 五、小程序注意事项

### 1. 开发阶段

微信开发者工具中开启：**详情 → 本地设置 → ☑ 不校验合法域名**

这样开发时可以用 HTTP + IP 地址请求。

### 2. 生产上线必须满足

| 要求 | 说明 |
|------|------|
| HTTPS | 微信小程序强制要求，HTTP 不可用 |
| ICP 备案域名 | 不支持纯 IP 地址 |
| 后台白名单 | 微信公众平台 → 开发管理 → 服务器域名 → request 合法域名 |

### 3. HTTPS 配置步骤

```bash
# 1. 域名解析到 43.138.156.217（在域名商后台操作）

# 2. 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 3. 申请免费 SSL 证书
sudo certbot --nginx -d your-domain.com

# 4. certbot 会自动修改 Nginx 配置，添加 SSL 并设置 HTTP→HTTPS 重定向

# 5. 验证
sudo nginx -t && sudo nginx -s reload
```

申请成功后，将所有 `http://43.138.156.217/api` 改为 `https://your-domain.com/api`。

## 六、Nginx 完整配置参考

```nginx
# HTTP（开发阶段 / 小程序调试用）
server {
    listen 80;
    server_name your-domain.com;

    # 上传限制
    client_max_body_size 15m;

    # 前端静态资源（H5 部署时启用）
    location / {
        root /var/www/turing-paint/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 反向代理（⚠️ proxy_pass 不带尾部斜杠）
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # AI 接口超时设置
        proxy_connect_timeout 10s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

## 七、排查清单

遇到 404 时，按以下步骤排查：

```bash
# 1. 确认后端服务运行中
curl http://127.0.0.1:3000/health

# 2. 确认 Nginx 转发正确（在服务器上执行）
curl http://127.0.0.1/api/analyze
# 应返回业务错误（如 "图片格式无效"），而非 404

# 3. 确认 Nginx 配置的 proxy_pass 不带斜杠
grep proxy_pass /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*

# 4. 从外部测试
curl -X POST http://43.138.156.217/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"test"}'
# 应返回: {"error":"图片格式无效","code":"INVALID_IMAGE",...}

# 5. 检查小程序开发者工具 Network 面板
#    查看实际请求的完整 URL 是否正确
```

## 八、API 路径速查

| 功能 | 方法 | 路径 | 控制器 |
|------|------|------|--------|
| 图片分析 | POST | `/api/analyze` | imageController.analyze |
| 图片生成 | POST | `/api/generate` | imageController.generate |
| 图片编辑 | POST | `/api/edit` | imageController.edit |
| 提示词适配 | POST | `/api/prompt/adapt` | imageRoutes 内联 |
| 提示词增强 | POST | `/api/prompt/enhance` | imageRoutes 内联 |
| 微信登录 | POST | `/api/auth/wechat` | authController |
| 登录状态 | GET | `/api/auth/status` | authController |
| 历史记录 | GET | `/api/data/history` | dataController |
| 收藏切换 | POST | `/api/data/favorite` | dataController |
| 提示词分类 | GET | `/api/prompt/categories` | promptController |
| 提示词列表 | GET | `/api/prompt/list` | promptController |
| 提示词搜索 | GET | `/api/prompt/search` | promptController |
