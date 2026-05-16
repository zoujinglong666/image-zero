# 图灵绘境 - 部署检查清单

> 域名: `www.image-zero.art` | 服务器: 腾讯云 `43.138.156.217`

## 一、DNS & 域名

- [ ] `image-zero.art` A 记录指向 `43.138.156.217`
- [ ] `www.image-zero.art` A 记录指向 `43.138.156.217`
- [ ] 域名已完成 ICP 备案
- [ ] DNS 解析生效（`dig www.image-zero.art` 验证）

## 二、SSL 证书

- [ ] certbot 已安装
- [ ] 证书已申请: `sudo certbot --nginx -d www.image-zero.art -d image-zero.art`
- [ ] HTTP 自动重定向到 HTTPS
- [ ] 证书自动续期已配置（`sudo certbot renew --dry-run` 验证）
- [ ] 浏览器访问 `https://www.image-zero.art` 无证书警告

## 三、服务器环境

- [ ] Node.js v20+ 已安装
- [ ] Nginx 已安装并运行
- [ ] PM2 已安装
- [ ] 编译工具已安装（`python3 make g++`，用于 better-sqlite3）

## 四、后端配置

- [ ] 代码已部署到服务器
- [ ] 依赖已安装: `npm ci --omit=dev`
- [ ] `backend/.env` 已配置:
  - [ ] `NODE_ENV=production`
  - [ ] `OPENROUTER_API_KEY` 已填写
  - [ ] `ALLOWED_ORIGINS=https://www.image-zero.art`
  - [ ] `JWT_SECRET` 已生成 64 位随机密钥
  - [ ] `JWT_EXPIRES_IN=7d`
  - [ ] `COS_SECRET_ID` / `COS_SECRET_KEY` 已填写（社区图片上传）
  - [ ] `COS_BUCKET` / `COS_REGION` / `COS_DOMAIN` 已填写
- [ ] PM2 服务已启动: `pm2 start src/index.js --name turing-paint`
- [ ] PM2 开机自启已配置: `pm2 save && pm2 startup`
- [ ] 健康检查通过: `curl http://127.0.0.1:3000/health`

## 五、Nginx 配置

- [ ] 配置文件已复制到 `/etc/nginx/sites-available/`
- [ ] 符号链接已创建到 `/etc/nginx/sites-enabled/`
- [ ] `server_name` 为 `www.image-zero.art`
- [ ] `proxy_pass http://127.0.0.1:3000`（**不带尾部斜杠**）
- [ ] `client_max_body_size 15m`（图片上传）
- [ ] `proxy_read_timeout 120s`（AI 接口超时）
- [ ] 静态资源路径指向 `/var/www/turing-paint/dist`
- [ ] `sudo nginx -t` 通过
- [ ] `sudo nginx -s reload` 已执行

## 六、前端部署

- [ ] `.env.production` 中 `VITE_API_BASE_URL=https://www.image-zero.art/api`
- [ ] H5 构建成功: `npm run build:h5`
- [ ] 产物已上传到服务器 `/var/www/turing-paint/dist/`
- [ ] H5 页面可正常访问: `https://www.image-zero.art`

## 七、微信小程序

- [ ] `src/manifest.json` 中 `appid` 已配置
- [ ] 微信公众平台 → 服务器域名已配置:
  - [ ] request 合法域名: `https://www.image-zero.art`
  - [ ] uploadFile 合法域名: `https://www.image-zero.art`
  - [ ] downloadFile 合法域名: `https://lq-picture-1367878423.cos.ap-guangzhou.myqcloud.com`
- [ ] 开发者工具中关闭「不校验合法域名」（测试生产环境）
- [ ] 小程序预览/体验版功能正常

## 八、功能验证

### 基础功能

- [ ] 首页加载正常
- [ ] 图片分析 (POST `/api/analyze`) 正常
- [ ] 图片生成 (POST `/api/generate`) 正常

### 认证

- [ ] 认证状态查询: `GET /api/auth/status` 返回正常
- [ ] 微信登录: `POST /api/auth/wechat` 正常（需配置 WX_APPID / WX_SECRET）
- [ ] 匿名登录在生产环境被拒绝（返回 403）
- [ ] Token 验证: `GET /api/auth/verify` 正常

### 提示词库

- [ ] 分类列表: `GET /api/prompt/categories` 正常
- [ ] 提示词列表: `GET /api/prompt/list` 正常
- [ ] 搜索功能: `GET /api/prompt/search?q=xxx` 正常

### 社区 (v2.0)

- [ ] 社区列表: `GET /api/prompt/community` 正常
- [ ] 图片上传: `POST /api/prompt/upload`（需登录）正常
- [ ] 创建分享: `POST /api/prompt/community`（需登录 + 审核通过）正常
- [ ] 点赞: `POST /api/prompt/community/:id/like` 正常
- [ ] 删除自己的分享: `DELETE /api/prompt/community/:id`（需登录）正常

### 数据

- [ ] 历史记录 CRUD 正常
- [ ] 收藏功能正常
- [ ] 用户偏好更新正常

## 九、安全检查

- [ ] `NODE_ENV=production`
- [ ] `ALLOWED_ORIGINS` 不包含 `localhost`
- [ ] `JWT_SECRET` 不为空
- [ ] 匿名登录在生产环境被禁用
- [ ] 敏感路由使用 `authMiddleware` 保护
- [ ] `backend/.env` 文件权限: `chmod 600 .env`
- [ ] `.env` 已加入 `.gitignore`
- [ ] COS 密钥未暴露在前端代码中

## 十、监控 & 日志

- [ ] PM2 进程监控: `pm2 monit`
- [ ] Nginx 访问日志可查看: `/var/log/nginx/access.log`
- [ ] 后端日志目录: `backend/logs/`
- [ ] 后端日志级别: `LOG_LEVEL=info`

---

## 快速部署命令

```bash
# 一键部署后端
cd /var/www/turing-paint && git pull
cd backend && npm ci --omit=dev && pm2 restart turing-paint

# 一键部署前端（本地执行）
npm run build:h5 && scp -r dist/build/h5/* root@43.138.156.217:/var/www/turing-paint/dist/

# 验证
curl https://www.image-zero.art/health
curl https://www.image-zero.art/api/auth/status
```
