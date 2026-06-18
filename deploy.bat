@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
:: ══════════════════════════════════════════════════════════
::  图灵绘境 - Windows 快速部署脚本
::  用法: deploy.bat
:: ══════════════════════════════════════════════════════════

echo.
echo ══════════════════════════════════════════
echo   图灵绘境 - Windows 快速部署
echo   Spring Boot + MySQL
echo ══════════════════════════════════════════
echo.

:: ── 检查 Java 17+ ──
echo [1/6] 检查 Java 环境...
java -version 2>&1 | findstr /C:"17" >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 需要 JDK 17+，当前未检测到
    echo 请安装 JDK 17: https://adoptium.net/
    pause
    exit /b 1
)
echo [OK] Java 17 已就绪

:: ── 检查 Maven ──
echo [2/6] 检查 Maven...
where mvn >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 系统未安装 Maven，将尝试使用 Maven Wrapper
    set MVN_CMD=.\mvnw.cmd
) else (
    set MVN_CMD=mvn
)
echo [OK] 构建工具就绪: %MVN_CMD%

:: ── 检查 Node.js ──
echo [3/6] 检查 Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 需要 Node.js，请安装: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER%

:: ── 检查 pnpm ──
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [安装] 正在安装 pnpm...
    npm install -g pnpm
)

:: ── 交互式配置 ──
echo.
echo ── 环境配置 ──────────────────────────
set /p DB_HOST="数据库主机 (默认: localhost): "
if "%DB_HOST%"=="" set DB_HOST=localhost
set /p DB_PORT="数据库端口 (默认: 3306): "
if "%DB_PORT%"=="" set DB_PORT=3306
set /p DB_NAME="数据库名 (默认: turing_drawing): "
if "%DB_NAME%"=="" set DB_NAME=turing_drawing
set /p DB_USERNAME="数据库用户 (默认: root): "
if "%DB_USERNAME%"=="" set DB_USERNAME=root
set /p DB_PASSWORD="数据库密码: "

:: 生成 JWT 密钥
for /f "tokens=*" %%i in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set JWT_SECRET=%%i
echo [自动] JWT 密钥已生成: %JWT_SECRET:~0,16%...

set /p COS_SECRET_ID="腾讯云 COS Secret ID (留空跳过): "
set /p COS_SECRET_KEY="腾讯云 COS Secret Key (留空跳过): "
set /p COS_BUCKET="腾讯云 COS Bucket (留空跳过): "
set /p COS_REGION="腾讯云 COS Region (默认: ap-guangzhou): "
if "%COS_REGION%"=="" set COS_REGION=ap-guangzhou

set /p OPENAI_API_KEY="OpenAI API Key (留空跳过): "
set /p WECHAT_APP_ID="微信 App ID (留空跳过): "
set /p WECHAT_APP_SECRET="微信 App Secret (留空跳过): "

echo.
echo ── 配置确认 ──────────────────────────
echo   数据库: %DB_HOST%:%DB_PORT%/%DB_NAME%
echo   JWT密钥: %JWT_SECRET:~0,8%****
echo   COS Bucket: %COS_BUCKET%
echo.
set /p CONFIRM="确认开始构建和部署? [y/N]: "
if /i not "%CONFIRM%"=="y" (
    echo 部署已取消
    pause
    exit /b 0
)

:: ── 构建后端 ──
echo.
echo [4/6] 构建 Spring Boot 后端...
cd backend
call %MVN_CMD% clean package -DskipTests -q
if %errorlevel% neq 0 (
    echo [错误] 后端构建失败
    cd ..
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('dir /b target\*.jar 2^>nul ^| findstr /V ".original"') do set JAR_FILE=%%i
echo [OK] 后端构建成功: %JAR_FILE%
cd ..

:: ── 构建前端 ──
echo.
echo [5/6] 构建前端 H5...
cd frontend
call pnpm install --frozen-lockfile 2>nul || call pnpm install
if %errorlevel% neq 0 (
    echo [错误] 前端依赖安装失败
    cd ..
    pause
    exit /b 1
)
call pnpm build:h5
if %errorlevel% neq 0 (
    echo [错误] 前端构建失败
    cd ..
    pause
    exit /b 1
)
echo [OK] 前端构建成功
cd ..

:: ── 启动后端 ──
echo.
echo [6/6] 启动 Spring Boot 后端...
cd backend

:: 设置环境变量并启动
set SPRING_PROFILES_ACTIVE=prod
set DB_HOST=%DB_HOST%
set DB_PORT=%DB_PORT%
set DB_NAME=%DB_NAME%
set DB_USERNAME=%DB_USERNAME%
set DB_PASSWORD=%DB_PASSWORD%
set JWT_SECRET=%JWT_SECRET%
set COS_SECRET_ID=%COS_SECRET_ID%
set COS_SECRET_KEY=%COS_SECRET_KEY%
set COS_BUCKET=%COS_BUCKET%
set COS_REGION=%COS_REGION%
set OPENAI_API_KEY=%OPENAI_API_KEY%
set WECHAT_APP_ID=%WECHAT_APP_ID%
set WECHAT_APP_SECRET=%WECHAT_APP_SECRET%

echo.
echo ══════════════════════════════════════════
echo   启动中... 后端运行在 http://localhost:8080
echo   按 Ctrl+C 停止
echo ══════════════════════════════════════════
echo.

java -jar target\%JAR_FILE% --spring.profiles.active=prod

cd ..
pause