# img-prompt-starter 优化计划

## 当前状态
- 项目路径: /Users/zou/img-prompt-starter
- 项目名称: 图灵绘境
- 技术栈: uni-app Vue3 + TypeScript + uview-pro + Pinia
- 后端: Node.js Express (backend/server.js)

## 优化任务清单

### ✅ P0 级别（立即修复）

#### 1. 前端 API 地址硬编码 → 环境变量
- [ ] 创建 `.env` 配置文件
- [ ] 修改 `src/api/image.ts` 读取环境变量
- [ ] 更新 `vite.config.ts` 支持环境变量
- [ ] 创建 `.env.example` 模板文件

#### 2. 后端 CORS 配置优化
- [ ] 修改 `backend/server.js` 限制 CORS 允许的来源
- [ ] 支持从环境变量读取允许的域名

#### 3. 后端文件类型验证
- [ ] 修改 `multer` 配置，限制只允许图片文件
- [ ] 添加文件类型白名单

#### 4. 前端网络状态检测
- [ ] 在 `src/pages/index/index.vue` 添加网络检测
- [ ] 无网络时禁用按钮并显示提示

### ✅ P1 级别（本周内）

#### 5. 图片上传前端压缩
- [ ] 安装图片压缩库（如 `compressorjs`）
- [ ] 修改上传逻辑，在上传前压缩图片
- [ ] 添加压缩质量配置

#### 6. 历史记录分页加载
- [ ] 修改 `src/stores/history.ts` 支持分页
- [ ] 修改 `src/pages/history/history.vue` 实现懒加载
- [ ] 添加 "加载更多" 按钮

#### 7. 前端请求超时与重试
- [ ] 封装统一的 API 请求库
- [ ] 添加请求超时处理（AbortController）
- [ ] 添加失败重试机制（最多 3 次）

#### 8. 改进错误提示
- [ ] 创建错误码映射表
- [ ] 统一错误提示文案
- [ ] 添加用户友好的错误提示组件

### ✅ P2 级别（本月内）

#### 9. 后端代码分层重构
- [ ] 创建 `backend/routes/` 目录
- [ ] 创建 `backend/controllers/` 目录
- [ ] 创建 `backend/services/` 目录
- [ ] 创建 `backend/middlewares/` 目录
- [ ] 拆分 `server.js` 为多个模块

#### 10. 添加日志系统
- [ ] 安装 `winston` 或 `pino`
- [ ] 替换所有 `console.log` 为日志库
- [ ] 配置日志级别和输出格式

#### 11. 添加缓存机制
- [ ] 安装 `node-cache` 或配置 Redis
- [ ] 为 `/api/analyze` 添加缓存（相同图片）
- [ ] 设置缓存过期时间

#### 12. 添加单元测试
- [ ] 配置 Vitest
- [ ] 为关键函数编写测试用例
- [ ] 配置 CI/CD 自动运行测试

---

## 实施顺序

1. **第一批**: P0 级别问题（1-4）
2. **第二批**: P1 级别问题（5-8）
3. **第三批**: P2 级别问题（9-12）

---

## 开始时间
2026-05-14 23:37

## 预计完成时间
- P0: 1-2 小时
- P1: 3-5 小时
- P2: 1-2 天

---

_由 OpenClaw AI 生成并实施_
