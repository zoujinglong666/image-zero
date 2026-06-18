#!/bin/bash

# 图灵绘境生产环境快速配置脚本
# 一键设置生产环境变量

echo "🚀 开始配置图灵绘境生产环境..."

# 检查必要命令
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装Node.js"
    exit 1
fi

# 创建备份
echo "📁 创建配置备份..."
cp backend/.env.example backend/.env.backup.$(date +%Y%m%d%H%M%S) 2>/dev/null || true
cp .env.production .env.backup.$(date +%Y%m%d%H%M%S) 2>/dev/null || true

# 生成JWT密钥
echo "🔑 生成JWT密钥..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "JWT密钥: $JWT_SECRET"

# 获取用户输入
echo ""
echo "📝 请输入生产环境配置信息："

read -p "请输入您的域名 (例如: yourdomain.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    DOMAIN="yourdomain.com"
fi

read -p "请输入OpenRouter API密钥: " API_KEY
if [ -z "$API_KEY" ]; then
    API_KEY="your_openrouter_api_key_here"
fi

read -p "请输入端口号 (默认: 3000): " PORT
if [ -z "$PORT" ]; then
    PORT="3000"
fi

# 创建后端生产环境配置
echo ""
echo "⚙️ 创建后端生产环境配置..."
cat > backend/.env.production << EOF
# ══════════════════════════════════════════
# 图灵绘境后端生产环境配置
# ══════════════════════════════════════════

# 运行环境
NODE_ENV=production

# 服务端口
PORT=$PORT

# OpenRouter API Key
OPENROUTER_API_KEY=$API_KEY

# 分析模型
ANALYSIS_MODEL=nvidia/nemotron-nano-12b-v2-vl:free

# CORS 允许的域名
ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN

# JWT 认证密钥
JWT_SECRET=$JWT_SECRET

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
WX_APPID=
WX_SECRET=

# 数据目录（Railway Volume 挂载路径）
DATA_DIR=/data
EOF

# 创建前端生产环境配置
echo "🌐 创建前端生产环境配置..."
cat > .env.production << EOF
# 生产环境前端配置

# 后端 API 地址
VITE_API_BASE_URL=https://$DOMAIN

# 应用信息
VITE_APP_NAME=图灵绘境
VITE_APP_VERSION=1.0.0
EOF

# 创建Nginx配置
echo "⚡ 创建Nginx配置..."
cat > deploy/nginx-production.conf << EOF
# HTTP重定向到HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS主配置
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # 前端静态文件
    location / {
        root /var/www/turing-paint/dist/build/h5;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://localhost:$PORT/health;
        access_log off;
    }
    
    # 上传文件处理
    client_max_body_size 20M;
}
EOF

# 显示配置摘要
echo ""
echo "✅ 生产环境配置完成！"
echo ""
echo "📋 配置摘要："
echo "   域名: https://$DOMAIN"
echo "   端口: $PORT"
echo "   API密钥: ${API_KEY:0:10}..."  # 只显示前10位
echo "   JWT密钥: ${JWT_SECRET:0:10}..."  # 只显示前10位
echo ""
echo "📁 生成的配置文件："
echo "   - backend/.env.production (后端配置)"
echo "   - .env.production (前端配置)"
echo "   - deploy/nginx-production.conf (Nginx配置)"
echo ""
echo "🔧 下一步操作："
echo "   1. 将backend/.env.production上传到服务器"
echo "   2. 将.env.production用于前端构建"
echo "   3. 配置Nginx使用deploy/nginx-production.conf"
echo "   4. 申请SSL证书"
echo ""
echo "💡 提示："
echo "   - 请妥善保管JWT_SECRET，不要提交到Git"
echo "   - 建议将.env.production添加到.gitignore"
echo "   - 定期备份配置文件"