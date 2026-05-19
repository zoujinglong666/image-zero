@echo off
setlocal enabledelayedexpansion

REM 图灵绘境部署脚本 (Windows版本)
REM 支持Docker部署模式

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%\..\.."
set "DEPLOY_MODE=docker"
set "ENVIRONMENT=dev"
set "SKIP_BUILD=false"
set "SKIP_TESTS=true"
set "FORCE_DEPLOY=false"
set "QUIET=false"

REM 颜色定义 (Windows 10+)
set "RED="
set "GREEN="
set "YELLOW="
set "BLUE="
set "NC="

REM 检查是否支持颜色输出
for /f "tokens=2 delims=:" %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
if not "%ESC%"=="" (
    set "RED=%ESC%[91m"
    set "GREEN=%ESC%[92m"
    set "YELLOW=%ESC%[93m"
    set "BLUE=%ESC%[94m"
    set "NC=%ESC%[0m"
)

REM 应用配置
set "APP_NAME=turing-drawing"
set "APP_VERSION=2.0.0"
set "BACKEND_DIR=%PROJECT_ROOT%\backend"
set "FRONTEND_DIR=%PROJECT_ROOT%\frontend"
set "CONFIG_DIR=%PROJECT_ROOT%\config"
set "DOCKER_COMPOSE_FILE=%PROJECT_ROOT%\docker-compose.yml"

REM 帮助信息
:show_help
echo %BLUE%图灵绘境部署脚本 (Windows)%NC%
echo.
echo 用法: %~nx0 [选项]
echo.
echo 选项:
echo   -h, --help           显示帮助信息
echo   -m, --mode MODE      部署模式 (docker) [默认: %DEPLOY_MODE%]
echo   -e, --env ENV        环境 (dev^|test^|prod) [默认: %ENVIRONMENT%]
echo   -s, --skip-build     跳过构建步骤
echo   -t, --run-tests      运行测试 (默认跳过)
echo   -f, --force          强制部署，覆盖现有配置
echo   -q, --quiet          静默模式
echo.
echo 示例:
echo   %~nx0                  使用默认配置部署
echo   %~nx0 -m docker -e prod  Docker模式部署生产环境
echo   %~nx0 -s -f            跳过构建，强制部署
echo.
echo 部署模式说明:
echo   docker  - 使用Docker Compose部署
echo.
echo 环境说明:
echo   dev   - 开发环境
echo   test  - 测试环境
echo   prod  - 生产环境
echo.
goto :eof

REM 日志函数
:log_info
if "%QUIET%"=="false" echo %GREEN%[INFO]%NC% %~1
goto :eof

:log_warn
if "%QUIET%"=="false" echo %YELLOW%[WARN]%NC% %~1
goto :eof

:log_error
echo %RED%[ERROR]%NC% %~1 1>&2
goto :eof

REM 检查依赖
:check_dependencies
call :log_info "检查依赖..."
where docker >nul 2>nul
if errorlevel 1 (
    call :log_error "Docker未安装或未添加到PATH"
    exit /b 1
)

where docker-compose >nul 2>nul
if errorlevel 1 (
    call :log_error "Docker Compose未安装或未添加到PATH"
    exit /b 1
)

call :log_info "依赖检查通过"
goto :eof

REM 检查环境配置
:check_environment
set "env_dir=%CONFIG_DIR%\environments\%ENVIRONMENT%"
if not exist "%env_dir%" (
    call :log_warn "环境配置不存在: %env_dir%"
    call :log_info "正在生成环境配置..."
    call "%CONFIG_DIR%\scripts\setup-env.bat" "%ENVIRONMENT%"
)

if not exist "%env_dir%\.env" (
    call :log_error "环境配置文件缺失: %env_dir%\.env"
    exit /b 1
)

call :log_info "环境配置检查通过: %ENVIRONMENT%"
goto :eof

REM 构建后端
:build_backend
if "%SKIP_BUILD%"=="true" (
    call :log_info "跳过后端构建"
    goto :eof
)

call :log_info "构建后端应用..."

cd /d "%BACKEND_DIR%"

REM 清理之前的构建
call mvnw clean
if errorlevel 1 (
    call :log_error "后端清理失败"
    exit /b 1
)

REM 构建应用
set "build_cmd=mvnw package"
if "%SKIP_TESTS%"=="true" set "build_cmd=%build_cmd% -DskipTests"

call %build_cmd%
if errorlevel 1 (
    call :log_error "后端构建失败"
    exit /b 1
)

call :log_info "后端构建成功"
goto :eof

REM 构建前端
:build_frontend
if "%SKIP_BUILD%"=="true" (
    call :log_info "跳过后端构建"
    goto :eof
)

call :log_info "构建前端应用..."

cd /d "%FRONTEND_DIR%"

REM 安装依赖
if not exist "node_modules" (
    call :log_info "安装前端依赖..."
    call npm install
    if errorlevel 1 (
        call :log_error "前端依赖安装失败"
        exit /b 1
    )
)

REM 构建应用
call npm run build
if errorlevel 1 (
    call :log_error "前端构建失败"
    exit /b 1
)

call :log_info "前端构建成功"
goto :eof

REM Docker部署
:deploy_docker
call :log_info "开始Docker部署..."

REM 检查Docker Compose文件
if not exist "%DOCKER_COMPOSE_FILE%" (
    call :log_error "Docker Compose文件不存在: %DOCKER_COMPOSE_FILE%"
    exit /b 1
)

REM 构建镜像
if "%SKIP_BUILD%"=="false" (
    call :log_info "构建Docker镜像..."
    call docker compose build
    if errorlevel 1 (
        call :log_error "Docker镜像构建失败"
        exit /b 1
    )
)

REM 停止现有服务
call :log_info "停止现有服务..."
call docker compose down
if errorlevel 1 (
    call :log_warn "停止服务时出现问题，继续部署..."
)

REM 启动服务
call :log_info "启动服务..."
call docker compose -f "%DOCKER_COMPOSE_FILE%" ^
                   -f "%CONFIG_DIR%\environments\%ENVIRONMENT%\docker-compose.override.yml" ^
                   up -d
if errorlevel 1 (
    call :log_error "启动Docker服务失败"
    call docker compose logs
    exit /b 1
)

REM 等待服务启动
call :log_info "等待服务启动..."
timeout /t 10 /nobreak >nul

REM 检查服务状态
call docker compose ps | findstr "Up" >nul
if errorlevel 1 (
    call :log_error "Docker服务启动失败"
    call docker compose logs
    exit /b 1
)

call :log_info "Docker服务启动成功"
goto :eof

REM 健康检查
:health_check
call :log_info "执行健康检查..."

set "max_attempts=30"
set "attempt=1"

:health_check_loop
call curl -s -f http://localhost:8080/actuator/health >nul 2>nul
if not errorlevel 1 (
    call :log_info "应用健康检查通过"
    
    REM 显示健康状态
    for /f "tokens=*" %%a in ('curl -s http://localhost:8080/actuator/health 2^>nul ^| findstr "status"') do (
        call :log_info "健康状态: %%a"
    )
    goto :eof
)

call :log_info "等待应用启动... (尝试 !attempt!/%max_attempts%)"
timeout /t 5 /nobreak >nul
set /a attempt+=1
if !attempt! leq %max_attempts% goto :health_check_loop

call :log_error "健康检查失败，应用未正常启动"
exit /b 1

REM 显示部署摘要
:show_deployment_summary
call :log_info "部署摘要:"
echo   部署模式: %DEPLOY_MODE%
echo   环境: %ENVIRONMENT%
echo   应用名称: %APP_NAME%
echo   应用版本: %APP_VERSION%
echo   Docker Compose: %DOCKER_COMPOSE_FILE%
echo   环境覆盖: %CONFIG_DIR%\environments\%ENVIRONMENT%\docker-compose.override.yml
echo.
call :log_info "访问应用:"
echo   健康检查: http://localhost:8080/actuator/health
echo   API文档: http://localhost:8080/swagger-ui.html
goto :eof

REM 主函数
:main
call :log_info "开始部署图灵绘境应用..."

REM 显示配置
call :log_debug "部署模式: %DEPLOY_MODE%"
call :log_debug "环境: %ENVIRONMENT%"
call :log_debug "项目根目录: %PROJECT_ROOT%"

REM 检查依赖
call :check_dependencies

REM 检查环境配置
call :check_environment

REM 构建应用
call :build_backend
call :build_frontend

REM 部署应用
if "%DEPLOY_MODE%"=="docker" (
    call :deploy_docker
) else (
    call :log_error "不支持的部署模式: %DEPLOY_MODE%"
    exit /b 1
)

REM 健康检查
call :health_check

REM 显示摘要
call :show_deployment_summary

call :log_info "部署完成!"
goto :eof

REM 解析命令行参数
:parse_args
if "%~1"=="" goto :eof
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help
if "%~1"=="-m" set "DEPLOY_MODE=%~2" & shift & shift & goto :parse_args
if "%~1"=="--mode" set "DEPLOY_MODE=%~2" & shift & shift & goto :parse_args
if "%~1"=="-e" set "ENVIRONMENT=%~2" & shift & shift & goto :parse_args
if "%~1"=="--env" set "ENVIRONMENT=%~2" & shift & shift & goto :parse_args
if "%~1"=="-s" set "SKIP_BUILD=true" & shift & goto :parse_args
if "%~1"=="--skip-build" set "SKIP_BUILD=true" & shift & goto :parse_args
if "%~1"=="-t" set "SKIP_TESTS=false" & shift & goto :parse_args
if "%~1"=="--run-tests" set "SKIP_TESTS=false" & shift & goto :parse_args
if "%~1"=="-f" set "FORCE_DEPLOY=true" & shift & goto :parse_args
if "%~1"=="--force" set "FORCE_DEPLOY=true" & shift & goto :parse_args
if "%~1"=="-q" set "QUIET=true" & shift & goto :parse_args
if "%~1"=="--quiet" set "QUIET=true" & shift & goto :parse_args
call :log_error "未知选项: %~1"
call :show_help
exit /b 1

REM 解析参数
call :parse_args %*

REM 执行主函数
call :main

endlocal