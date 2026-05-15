# 🚀 生产环境变量配置指南

## 📋 环境变量总览

### 后端环境变量 (backend/.env)
| 变量名 | 是否必填 | 说明 | 生产环境建议值 |
|--------|----------|------|----------------|
| `NODE_ENV` | ✅ | 运行环境 | `production` |
| `PORT` | ✅ | 服务端口 | `3000` |
| `OPENROUTER_API_KEY` | ✅ | AI服务API密钥 | 从OpenRouter获取 |
| `ANALYSIS_MODEL` | ❌ | 分析模型 | `nvidia/nemotron-nano-12b-v2-vl:free` |
| `ALLOWED_ORIGINS` | ✅ | CORS允许域名 | 您的域名列表 |
| `JWT_SECRET` | ✅ | JWT密钥 | 32位随机字符串 |
| `JWT_EXPIRES_IN` | ❌ | JWT有效期 | `7d` |
| `MAX_FILE_SIZE` | ❌ | 文件大小限制 | `10` |
| `RATE_LIMIT_WINDOW_MS` | ❌ | 限流时间窗口 | `60000` |
| `RATE_LIMIT_MAX` | ❌ | 限流次数 | `100` |
| `LOG_LEVEL` | ❌ | 日志级别 | `info` |
| `LOG_DIR` | ❌ | 日志目录 | `logs/` |
| `WX_APPID` | ❌ | 微信小程序ID | 可选 |
| `WX_SECRET` | ❌ | 微信小程序密钥 | 可选 |
| `DATA_DIR` | ❌ | 数据目录 | Railway Volume路径 |

### 前端环境变量 (.env.production)
| 变量名 | 是否必填 | 说明 | 生产环境建议值 |
|--------|----------|------|----------------|
| `VITE_API_BASE_URL` | ✅ | 后端API地址 | 您的服务器域名 |
| `VITE_APP_NAME` | ❌ | 应用名称 | `图灵绘境` |
| `VITE_APP_VERSION` | ❌ | 应用版本 | `1.0.0` |

## 🛠️ 配置步骤

### 第一步：后端配置

#### 1. 创建生产环境配置文件
```bash
cd backend
cp .env.example .env.production
```

#### 2. 修改关键配置
```bash
# 编辑配置文件
nano .env.production
```

#### 3. 生产环境配置示例
```env
# 运行环境
NODE_ENV=production

# 服务端口
PORT=3000

# OpenRouter API Key（必填）
OPENROUTER_API_KEY=your_actual_openrouter_api_key

# 分析模型（可选）
ANALYSIS_MODEL=nvidia/nemotron-nano-12b-v2-vl:free

# CORS 允许的域名（生产环境必须修改！）
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# JWT 认证密钥（必填！）
JWT_SECRET=your_32_character_random_string_here

# JWT 令牌有效期
JWT_EXPIRES_IN=7d

# 上传文件大小限制
MAX_FILE_SIZE=10

# 速率限制配置
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# 日志级别
LOG_LEVEL=info

# 日志输出目录
LOG_DIR=logs/

# 微信小程序配置（可选）
WX_APPID=your_wechat_appid
WX_SECRET=your_wechat_secret

# 数据目录（Railway Volume 挂载路径）
DATA_DIR=/data
```

### 第二步：前端配置

#### 1. 修改前端环境变量
```bash
# 编辑前端生产环境配置
nano .env.production
```

#### 2. 生产环境配置示例
```env
# 后端 API 地址
VITE_API_BASE_URL=https://yourdomain.com

# 应用信息
VITE_APP_NAME=图灵绘境
VITE_APP_VERSION=1.0.0
```

## 🔐 安全配置

### 1. 生成JWT密钥
```bash
# 生成32位随机字符串
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. 获取OpenRouter API密钥
1. 访问 https://openrouter.ai/keys
2. 注册账号并创建API密钥
3. 复制密钥到 `OPENROUTER_API_KEY`

### 3. 域名配置
```env
# 只允许您的域名访问
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 🚀 不同部署平台的配置方法

### Railway部署

#### 1. 在线配置环境变量
- 登录Railway控制台
- 选择您的项目
- 进入"Variables"选项卡
- 添加以下环境变量：

```env
NODE_ENV=production
PORT=3000
OPENROUTER_API_KEY=your_api_key
ALLOWED_ORIGINS=https://yourdomain.com
JWT_SECRET=your_jwt_secret
```

#### 2. 使用Railway CLI
```bash
# 安装Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 连接项目
railway link

# 设置环境变量
railway variables set NODE_ENV=production
railway variables set OPENROUTER_API_KEY=your_api_key
railway variables set JWT_SECRET=your_jwt_secret
```

### Docker部署

#### 1. 使用环境变量文件
```bash
# 创建环境变量文件
cp backend/.env.example backend/.env.production

# 修改配置
nano backend/.env.production

# 运行Docker容器
docker run -d \
  --name turing-paint \
  --env-file backend/.env.production \
  -p 3000:3000 \
  your-image-name
```

#### 2. Docker Compose配置
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - ALLOWED_ORIGINS=https://yourdomain.com
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/data
```

### 传统服务器部署

#### 1. 手动配置环境变量
```bash
# 编辑环境变量文件
nano /var/www/turing-paint/backend/.env.production

# 设置文件权限
chmod 600 /var/www/turing-paint/backend/.env.production

# 启动应用
cd /var/www/turing-paint/backend
NODE_ENV=production node src/index.js
```

#### 2. 使用PM2管理进程
```bash
# 安装PM2
npm install -g pm2

# 创建PM2配置文件
nano ecosystem.config.js
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'turing-paint',
    script: 'src/index.js',
    cwd: '/var/www/turing-paint/backend',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      OPENROUTER_API_KEY: 'your_api_key',
      ALLOWED_ORIGINS: 'https://yourdomain.com',
      JWT_SECRET: 'your_jwt_secret'
    }
  }]
}
```

```bash
# 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔍 验证配置

### 1. 检查环境变量
```bash
# 后端
cd backend
node -e "console.log(process.env.NODE_ENV)"

# 检查配置文件
node -e "const config = require('./src/config/index.js').default; console.log(config)"
```

### 2. 测试API连接
```bash
# 测试健康检查
curl https://yourdomain.com/health

# 测试AI功能
curl -X POST https://yourdomain.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "test.jpg"}'
```

### 3. 检查日志
```bash
# 查看应用日志
tail -f /var/www/turing-paint/backend/logs/app.log

# 查看错误日志
tail -f /var/www/turing-paint/backend/logs/error.log
```

## 🚨 常见问题解决

### 1. 环境变量未生效
```bash
# 检查文件权限
ls -la backend/.env.production

# 重启应用
pm2 restart turing-paint
```

### 2. CORS错误
```bash
# 检查ALLOWED_ORIGINS配置
echo $ALLOWED_ORIGINS

# 临时调试
export ALLOWED_ORIGINS="*"
```

### 3. JWT验证失败
```bash
# 检查JWT密钥
echo $JWT_SECRET

# 重新生成密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📋 配置检查清单

### 后端配置
- [ ] `NODE_ENV=production`
- [ ] `OPENROUTER_API_KEY` 已配置
- [ ] `JWT_SECRET` 已配置（32位随机字符串）
- [ ] `ALLOWED_ORIGINS` 只包含生产域名
- [ ] `PORT` 端口配置正确
- [ ] 日志目录权限正确

### 前端配置
- [ ] `VITE_API_BASE_URL` 指向正确域名
- [ ] 应用名称和版本正确

### 安全配置
- [ ] JWT密钥复杂度足够
- [ ] API密钥已正确配置
- [ ] CORS域名限制正确
- [ ] 环境变量文件权限安全

完成以上配置后，您的应用就可以在生产环境中安全运行了！