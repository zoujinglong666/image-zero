# img-prompt-starter 优化计划

## 当前状态
- 项目路径: /Users/zou/img-prompt-starter
- 项目名称: 图灵绘境
- 域名: www.image-zero.art
- 技术栈: uni-app Vue3 + TypeScript + uview-pro + Pinia
- 后端: Node.js Express (分层架构: routes/controllers/services/middlewares)

## 优化任务清单

### ✅ P0 级别（立即修复）

#### 1. 前端 API 地址硬编码 → 环境变量
- [x] 创建 `.env` 配置文件
- [x] 修改 `src/api/image.ts` 读取环境变量
- [x] 更新 `vite.config.ts` 支持环境变量
- [x] 创建 `.env.example` 模板文件

#### 2. 后端 CORS 配置优化
- [x] 修改后端配置限制 CORS 允许的来源
- [x] 支持从环境变量 `ALLOWED_ORIGINS` 读取允许的域名
- [x] 生产环境校验不允许 localhost

#### 3. 后端文件类型验证
- [x] 修改 `multer` 配置，限制只允许图片文件
- [x] 添加文件类型白名单
- [x] 文件名净化防止路径穿越 (`sanitizeFilename`)

#### 4. 前端网络状态检测
- [x] 在前端添加网络检测
- [x] 无网络时禁用按钮并显示提示

### ✅ P1 级别（本周内）

#### 5. 图片上传前端压缩
- [x] 添加图片压缩逻辑
- [x] 添加压缩质量配置

#### 6. 历史记录分页加载
- [x] 后端 `dataController` 支持分页
- [x] 前端实现懒加载
- [x] 分页查询参数 `page` / `pageSize`

#### 7. 前端请求超时与重试
- [x] 统一 API 请求库 (uview-pro http)
- [x] 后端添加超时中间件 `createTimeoutMiddleware`
- [x] 请求拦截器自动携带 Authorization

#### 8. 改进错误提示
- [x] 创建错误码映射表（`AppError` 体系）
- [x] 统一错误提示文案（全局异常处理器）
- [x] 自定义业务异常: `BadRequestError` / `UnauthorizedError` / `ForbiddenError` 等

### ✅ P2 级别（本月内）

#### 9. 后端代码分层重构
- [x] 创建 `backend/routes/` 目录
- [x] 创建 `backend/controllers/` 目录
- [x] 创建 `backend/services/` 目录
- [x] 创建 `backend/middlewares/` 目录
- [x] 拆分 `server.js` 为多个模块

#### 10. 添加日志系统
- [x] 安装 `winston`
- [x] 替换所有 `console.log` 为日志库 (`utils/logger.js`)
- [x] 配置日志级别和输出格式

#### 11. 添加缓存机制
- [x] 内存缓存 (`RateLimiter` 滑动窗口)
- [x] 社区发布频率限制 (`communityGuard`)

#### 12. 添加单元测试
- [ ] 配置 Vitest
- [ ] 为关键函数编写测试用例
- [ ] 配置 CI/CD 自动运行测试

### 🆕 v2.0 新增

#### 13. 社区分享功能 (UGC)
- [x] 图片上传到腾讯云 COS (`cosService.js`)
- [x] 社区帖子 CRUD
- [x] 点赞 / 举报功能
- [x] 内容安全审核中间件 (`communityGuard.js`)
- [x] 敏感词过滤（分级: 拦截 / 替换）

#### 14. 认证体系
- [x] JWT 认证中间件 (`authMiddleware` / `optionalAuth`)
- [x] 微信小程序登录 (`wechatService.js` + `authController.js`)
- [x] 匿名登录（开发环境）
- [x] Token 验证接口
- [x] 路由级认证保护

#### 15. 安全加固
- [x] Helmet 安全响应头
- [x] CSP 内容安全策略
- [x] IP 限流 (`RateLimiter`)
- [x] openid 脱敏 (SHA-256 hash)
- [x] CORS 严格校验
- [x] 文件上传净化 (`sanitizeFilename`)

#### 16. 部署配置
- [x] 域名配置: www.image-zero.art
- [x] Nginx 反向代理配置
- [x] HTTPS (Let's Encrypt)
- [x] Dockerfile
- [x] PM2 进程管理
- [x] 部署文档更新 (3 份)

---

## 剩余待办

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P2 | 单元测试 | 配置 Vitest + 关键函数测试 |
| P3 | Redis 缓存 | 替代内存缓存，支持多实例部署 |
| P3 | 图片去重 | `checkImageDuplicate` 已实现，需接入路由 |
| P3 | 第三方内容审核 | 替代本地敏感词，接入腾讯云天御 |

---

_最近更新: 2026-05-16_
