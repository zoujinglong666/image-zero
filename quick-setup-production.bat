@echo off
chcp 65001 >nul
:: 图灵绘境生产环境快速配置脚本 (Windows版)
:: 一键设置生产环境变量

echo 🚀 开始配置图灵绘境生产环境...

:: 检查Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 请先安装Node.js
    pause
    exit /b 1
)

:: 创建备份
echo 📁 创建配置备份...
if exist "backend\.env.production" (
    copy "backend\.env.production" "backend\.env.backup.%date:~0,4%%date:~5,2%%date:~8,2%%time:~0,2%%time:~3,2%%time:~6,2%.bak" >nul
)
if exist ".env.production" (
    copy ".env.production" ".env.backup.%date:~0,4%%date:~5,2%%date:~8,2%%time:~0,2%%time:~3,2%%time:~6,2%.bak" >nul
)

:: 生成JWT密钥
echo 🔑 生成JWT密钥...
for /f %%i in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set JWT_SECRET=%%i
echo JWT密钥: %JWT_SECRET%

:: 获取用户输入
echo.
echo 📝 请输入生产环境配置信息：

set /p DOMAIN=请输入您的域名 (例如: yourdomain.com): 
if "%DOMAIN%"=="" set DOMAIN=yourdomain.com

set /p API_KEY=请输入OpenRouter API密钥: 
if "%API_KEY%"=="" set API_KEY=your_openrouter_api_key_here

set /p PORT=请输入端口号 (默认: 3000): 
if "%PORT%"=="" set PORT=3000

:: 创建后端生产环境配置
echo.
echo ⚙️ 创建后端生产环境配置...
(
echo # ══════════════════════════════════════════
echo # 图灵绘境后端生产环境配置
echo # ══════════════════════════════════════════
echo.
echo # 运行环境
echo NODE_ENV=production
echo.
echo # 服务端口
echo PORT=%PORT%
echo.
echo # OpenRouter API Key
echo OPENROUTER_API_KEY=%API_KEY%
echo.
echo # 分析模型
echo ANALYSIS_MODEL=nvidia/nemotron-nano-12b-v2-vl:free
echo.
echo # CORS 允许的域名
echo ALLOWED_ORIGINS=https://%DOMAIN%,https://www.%DOMAIN%
echo.
echo # JWT 认证密钥
echo JWT_SECRET=%JWT_SECRET%
echo.
echo # JWT 令牌有效期
echo JWT_EXPIRES_IN=7d
echo.
echo # 上传文件大小限制
echo MAX_FILE_SIZE=10
echo.
echo # 速率限制配置
echo RATE_LIMIT_WINDOW_MS=60000
echo RATE_LIMIT_MAX=100
echo.
echo # 日志级别
echo LOG_LEVEL=info
echo.
echo # 日志输出目录
echo LOG_DIR=logs/
echo.
echo # 微信小程序配置（可选）
echo WX_APPID=
echo WX_SECRET=
echo.
echo # 数据目录（Railway Volume 挂载路径）
echo DATA_DIR=/data
) > backend/.env.production

:: 创建前端生产环境配置
echo 🌐 创建前端生产环境配置...
(
echo # 生产环境前端配置
echo.
echo # 后端 API 地址
echo VITE_API_BASE_URL=https://%DOMAIN%
echo.
echo # 应用信息
echo VITE_APP_NAME=图灵绘境
echo VITE_APP_VERSION=1.0.0
) > .env.production

:: 创建Nginx配置
echo ⚡ 创建Nginx配置...
(
echo # HTTP重定向到HTTPS
echo server {
echo     listen 80;
echo     server_name %DOMAIN% www.%DOMAIN%;
echo     return 301 https://$server_name$request_uri;
echo }
echo.
echo # HTTPS主配置
echo server {
echo     listen 443 ssl http2;
echo     server_name %DOMAIN% www.%DOMAIN%;
echo.
echo     # SSL证书配置
echo     ssl_certificate /etc/letsencrypt/live/%DOMAIN%/fullchain.pem;
echo     ssl_certificate_key /etc/letsencrypt/live/%DOMAIN%/privkey.pem;
echo.
echo     # SSL优化
echo     ssl_protocols TLSv1.2 TLSv1.3;
echo     ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
echo     ssl_prefer_server_ciphers off;
echo     ssl_session_cache shared:SSL:10m;
echo     ssl_session_timeout 10m;
echo.
echo     # 安全头
echo     add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
echo     add_header X-Frame-Options "SAMEORIGIN" always;
echo     add_header X-Content-Type-Options "nosniff" always;
echo.
echo     # 前端静态文件
echo     location / {
echo         root /var/www/turing-paint/dist/build/h5;
echo         index index.html;
echo         try_files $uri $uri/ /index.html;
echo.
echo         # 缓存静态资源
echo         location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
echo             expires 1y;
echo             add_header Cache-Control "public, immutable";
echo         }
echo     }
echo.
echo     # 后端API代理
echo     location /api/ {
echo         proxy_pass http://localhost:%PORT%;
echo         proxy_http_version 1.1;
echo         proxy_set_header Upgrade $http_upgrade;
echo         proxy_set_header Connection 'upgrade';
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo         proxy_cache_bypass $http_upgrade;
echo.
echo         # 超时设置
echo         proxy_connect_timeout 60s;
echo         proxy_send_timeout 60s;
echo         proxy_read_timeout 60s;
echo     }
echo.
echo     # 健康检查
echo     location /health {
echo         proxy_pass http://localhost:%PORT%/health;
echo         access_log off;
echo     }
echo.
echo     # 上传文件处理
echo     client_max_body_size 20M;
echo }
) > deploy/nginx-production.conf

:: 显示配置摘要
echo.
echo ✅ 生产环境配置完成！
echo.
echo 📋 配置摘要：
echo    域名: https://%DOMAIN%
echo    端口: %PORT%
echo    API密钥: %API_KEY:~0,10%...
echo    JWT密钥: %JWT_SECRET:~0,10%...
echo.
echo 📁 生成的配置文件：
echo    - backend/.env.production (后端配置)
echo    - .env.production (前端配置)
echo    - deploy/nginx-production.conf (Nginx配置)
echo.
echo 🔧 下一步操作：
echo    1. 将backend/.env.production上传到服务器
echo    2. 将.env.production用于前端构建
echo    3. 配置Nginx使用deploy/nginx-production.conf
echo    4. 申请SSL证书
echo.
echo 💡 提示：
echo    - 请妥善保管JWT_SECRET，不要提交到Git
echo    - 建议将.env.production添加到.gitignore
echo    - 定期备份配置文件

pause