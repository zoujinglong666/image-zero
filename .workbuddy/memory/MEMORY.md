# MEMORY.md — 图灵绘境项目长期记忆

## 项目结构（重要！）

- **真正运行的后端**：`/backend/`（Spring Boot + MyBatis Plus + MySQL）
- **旧的后端**：`/legacy-nodejs-backend/`（Node.js，已废弃，不要再改）
- **前端**：`/frontend/`（UniApp Vue3，微信小程序）

## Spring Boot 后端关键文件

| 文件 | 作用 |
|------|------|
| `service/AiService.java` | 所有 AI 调用（分析/生成/编辑），支持智谱/OpenAI/SiliconFlow/Gemini |
| `service/ImageService.java` | 业务逻辑层，协调 AI + 存储 |
| `controller/ImageController.java` | HTTP 接口，含广告墙 + 防刷 + 积分抵扣逻辑 |
| `service/UserPreferenceService.java` | 广告观看记录、每日生成计数 |
| `service/PaymentService.java` | VIP套餐管理、订单创建、支付回调、额度管理 |
| `service/InviteService.java` | 邀请码生成、邀请关系记录、裂变奖励 |
| `service/CreditService.java` | 积分充值、余额管理、积分消费 |
| `service/DailyTaskService.java` | 每日签到、连续签到奖励 |
| `resources/application.yml` | 配置，从 `.env` 读取 |
| `.env`（backend/） | 实际密钥配置文件 |

## 变现系统关键配置

- **WX_AD_UNIT_ID**：`wechat.mini-program-ad-unit-id`，需在微信小程序后台申请
- **VIP套餐**：basic ¥9.9(50次/天/30天) / pro ¥29.9(200次/天/30天) / ultimate ¥59.9(无限/365天)
- **积分包**：mini ¥6(60积分) / small ¥18(200积分) / medium ¥39(500积分) / large ¥79(1200积分)
- **邀请奖励**：双方各得 3 次免费生图
- **签到奖励**：1天=1次, 3天=2次, 7天=3次（连续递增）

## 智谱生图配置

- API Key：`backend/.env` 中 `ZHIPU_API_KEY`（已配置）
- 模型：`glm-image`（`application.yml` → `zhipu.generate-model: ${ZHIPU_GENERATE_MODEL:glm-image}`）
- URL：`https://open.bigmodel.cn/api/paas/v4/images/generations`
- 广告墙：`ZHIPU_ENABLE_AD_GATE=true`（生产），`false` 或 `X-Skip-Ad: 1` 头可跳过
- 每日免费限额：`ZHIPU_DAILY_FREE_LIMIT=3`
- 微信广告 ID：`WX_AD_UNIT_ID`（待申请）

## 前端设计系统

**薄雾白（Mist Canvas）** —— 当前使用的设计系统
- 背景：`#F6F7FB`（微冷雾蓝灰）
- 主色：`#8B9DC8`（雾蓝）
- 辅色：`#C4B5E0`（淡薰衣草）
- 文字：`#2C2E3A` / `#6B6E7D` / `#9A9BAC`

## 已知 Bug 修复记录

- `AiService.java` `generateWithZhipu()` 原来传 `user` 字段，改为 `user_id`（2026-05-23）
- `AiService.java` quality 参数按模型区分：`glm-image` → `hd`，`cogview-*` → `standard`（2026-05-23）
- `ImageService.java` 默认生图 provider 从 `"openai"` 改为 `"zhipu"`（2026-05-23）
- `AiService.java` 智谱 429 限流兜底：原只对 5xx 兜底 Pollinations，429 被忽略导致抛异常；现 429 也触发兜底（2026-05-23）
- `AiService.java` `generateWithOpenAI` 增加智谱 baseUrl 转发 + 5xx/429 兜底 Pollinations（2026-05-23）
- `AiService.java` 分析链路 fallback 重构：智谱失败不再回 OpenAI（同后端），直接走 SiliconFlow；OpenAI 失败也走 SiliconFlow；SiliconFlow 失败终止于 buildFallbackAnalysis（无循环）（2026-05-23）
- `AiService.java` `editImage()` 分析步骤不再传生图 provider，改为 `null` 走默认最优链路（MiMo > 智谱 > SiliconFlow）（2026-05-23）

## 前端编辑页 UX（2026-05-23）

- 分析默认 MiMo，生图默认智谱 glm-image，两套链路完全独立
- edit.vue 新增「提示词快速复制卡片」：hero-card 下方，始终可见，含中英文提示词 + 一键复制按钮
- edit.vue step 2 编辑器 English Prompt / 中文描述旁各加行内复制按钮
- hero-card 文字更新：强调"提示词可复制"的核心价值

## 前端 URL 拼接规范（2026-05-23 重要！）

- `.env`（dev）的 `VITE_API_BASE_URL` **带 `/api` 后缀**，值为 `http://localhost:8080/api`（供小程序直连）
- `.env.production`（prod）的 `VITE_API_BASE_URL` **必须带 `/api` 后缀**，值为 `https://api.image-zero.art/api`
- **H5 开发环境**：`getApiBaseUrl()` 检测到 localhost 自动返回 `/api`（走 Vite 代理），忽略 `.env` 值
- `http`（uview-pro）走 `http.interceptor.ts` baseUrl = `config.api.baseUrl` = `/api`（H5 dev）/ 完整URL（小程序/prod）
- `uni.uploadFile` / `uni.request` 裸调用**必须**用 `configUtils.getFullApiUrl()` 或 `config.api.baseUrl + path`，**禁止**直接读 `import.meta.env.VITE_API_BASE_URL`
- 已修复：`prompt.ts`（uploadCommunityImage/deleteCommunityPost）、`data.ts`（uploadAvatar）
- 上传参数名约定：图片编辑用 `name: 'file'`，社区用 `name: 'image'`，头像用 `name: 'avatar'`

## 上线配置清单

- `backend/.env`：JWT_SECRET、CORS_ALLOWED_ORIGINS、COS 密钥、AI API 密钥均在生产 `.env` 中配置
- `frontend/.env.production`：`VITE_API_BASE_URL=https://api.image-zero.art/api`
- SecurityConfig：`/api/data/**` 是刻意 permitAll()（GET 有软降级，写操作内部有 auth 守卫），不需要改
- flyway 自动迁移：`spring.flyway.enabled=true`，SQL 放 `backend/src/main/resources/db/migration/`

## 启动验证

- Spring Boot 启动正常：`Started TuringDrawingApplication in ~3.4s`
- 编译：70 个源文件，0 错误（只有 Lombok EqualsAndHashCode warning，无害）
- 连接数据库：MySQL，需本地 `turing_drawing` 库可用
- 重启命令：`kill $(lsof -ti :8080); cd backend && mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Dserver.port=8080"`

## 用户偏好

- 语言：中文
- 不要再改 `legacy-nodejs-backend/`，只改 `backend/`（Spring Boot）
- 代码修改前先 `clean compile` 验证
