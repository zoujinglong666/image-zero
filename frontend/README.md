# 图灵绘境 - 前端项目

基于 UniApp + Vue3 + TypeScript 的跨平台应用，支持微信小程序和H5环境。

## 项目特性

- ✅ **跨平台支持**: 微信小程序 + H5 双端适配
- ✅ **现代技术栈**: Vue3 + TypeScript + Vite
- ✅ **UI框架**: uView Pro + UnoCSS
- ✅ **状态管理**: Pinia
- ✅ **请求封装**: 统一API请求工具
- ✅ **类型安全**: 完整的TypeScript支持
- ✅ **性能优化**: 图片压缩、懒加载、缓存策略

## 环境要求

- Node.js >= 16.0.0
- pnpm >= 7.0.0
- HBuilderX (用于微信小程序开发)

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发环境

```bash
# H5开发
pnpm dev:h5

# 微信小程序开发
pnpm dev:mp-weixin
```

### 构建生产版本

```bash
# H5生产构建
pnpm build:h5

# 微信小程序生产构建
pnpm build:mp-weixin
```

## 项目结构

```
frontend/
├── src/
│   ├── api/              # API接口封装
│   ├── common/           # 公共配置和工具
│   ├── components/       # 公共组件
│   ├── composables/      # 组合式函数
│   ├── config/           # 应用配置
│   ├── locale/           # 国际化
│   ├── pages/            # 页面
│   ├── static/           # 静态资源
│   ├── stores/           # 状态管理
│   ├── types/            # TypeScript类型定义
│   ├── utils/            # 工具函数
│   └── main.ts           # 入口文件
├── .env.*               # 环境变量配置
├── vite.config.ts       # Vite配置
└── package.json         # 项目配置
```

## 核心功能

### 1. 跨平台配置管理

项目使用统一的配置中心，自动适配微信小程序和H5环境：

```typescript
// src/config/index.ts
import { config } from '@/config'

// 获取当前平台
const platform = config.platform // 'wechat' | 'h5'

// 获取API地址
const apiUrl = config.api.baseUrl

// 判断是否为微信小程序
if (configUtils.isWechat()) {
  // 微信小程序特有逻辑
}
```

### 2. 统一请求工具

提供跨平台兼容的请求工具，支持重试、错误处理、加载提示等功能：

```typescript
// src/utils/request.ts
import { request } from '@/utils/request'

// GET请求
const userInfo = await request.get<UserInfo>('/user/info')

// POST请求
const result = await request.post('/user/login', { username, password })

// 上传文件
const result = await request.upload('/image/upload', {
  filePath: tempFilePath,
  name: 'file'
})
```

### 3. 平台工具

提供微信小程序和H5环境的专用工具：

```typescript
// src/utils/platform.ts
import { wechatUtils, h5Utils } from '@/utils/platform'

// 微信小程序登录
const code = await wechatUtils.login()

// H5复制到剪贴板
await h5Utils.copyToClipboard('复制的内容')

// 跨平台存储
import { storageUtils } from '@/utils/platform'
storageUtils.set('token', 'xxx', 3600000) // 1小时过期
const token = storageUtils.get('token')
```

## 微信小程序开发指南

### 1. 开发环境配置

1. 安装HBuilderX
2. 导入项目根目录
3. 配置微信小程序AppID
4. 运行到微信小程序开发者工具

### 2. 微信小程序特有功能

- 微信登录授权
- 微信分享
- 微信支付
- 微信客服
- 微信卡券

### 3. 注意事项

- 必须使用HTTPS和备案域名
- 文件上传大小限制：10MB
- 本地存储限制：10MB
- 网络请求必须使用HTTPS

## H5开发指南

### 1. 开发环境配置

```bash
# 启动开发服务器
pnpm dev:h5

# 访问 http://localhost:3000
```

### 2. H5特有功能

- 浏览器分享
- 剪贴板操作
- 文件下载
- 响应式布局

### 3. 注意事项

- 支持PWA（渐进式Web应用）
- 支持响应式布局
- 支持Service Worker缓存

## 环境配置

### 开发环境

```bash
# .env.development
VITE_API_BASE_URL=/api
VITE_DEV_PROXY_TARGET=http://localhost:8080
```

### 生产环境

```bash
# .env.production
VITE_API_BASE_URL=https://api.image-zero.art/api
```

## 构建和部署

### 微信小程序

1. 构建生产版本：
```bash
pnpm build:mp-weixin
```

2. 在HBuilderX中导入`dist/build/mp-weixin`
3. 上传代码到微信开发者平台
4. 提交审核发布

### H5部署

1. 构建生产版本：
```bash
pnpm build:h5
```

2. 部署`dist/build/h5`到Web服务器

## API接口规范

### 响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "success": true,
  "timestamp": 1234567890
}
```

### 错误码

- `0`: 成功
- `400`: 请求参数错误
- `401`: 未授权
- `403`: 权限不足
- `404`: 资源不存在
- `500`: 服务器内部错误

## 开发规范

### 1. 代码规范

- 使用TypeScript
- 遵循ESLint规则
- 使用Prettier格式化代码

### 2. 目录规范

- 页面组件放在`pages/`目录
- 公共组件放在`components/`目录
- API接口放在`api/`目录
- 工具函数放在`utils/`目录

### 3. 命名规范

- 组件名：PascalCase
- 文件名：kebab-case
- 变量名：camelCase
- 常量名：UPPER_SNAKE_CASE

## 常见问题

### 1. 微信小程序无法访问API

- 检查API域名是否已备案
- 检查是否使用HTTPS
- 检查request合法域名配置

### 2. H5跨域问题

- 开发环境使用Vite代理
- 生产环境确保同源策略

### 3. 图片上传失败

- 检查文件大小限制
- 检查网络连接
- 检查API接口权限

## 技术支持

- 微信小程序开发文档：https://developers.weixin.qq.com/miniprogram/dev/
- UniApp官方文档：https://uniapp.dcloud.net.cn/
- uView Pro文档：https://uview-plus.jiangruyi.com/