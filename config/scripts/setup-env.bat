@echo off
setlocal enabledelayedexpansion

REM 图灵绘境环境配置生成脚本 (Windows版本)
REM 用于快速生成不同环境的配置文件

set "SCRIPT_DIR=%~dp0"
set "CONFIG_DIR=%SCRIPT_DIR%\.."
set "ENVIRONMENT=dev"
set "FORCE_OVERWRITE=false"
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

REM 帮助信息
:show_help
echo %BLUE%图灵绘境环境配置生成脚本 (Windows)%NC%
echo.
echo 用法: %~nx0 [选项] [环境]
echo.
echo 参数:
echo   环境                  环境名称 (dev^|test^|prod) [默认: dev]
echo.
echo 选项:
echo   -h, --help           显示帮助信息
echo   -f, --force          强制覆盖已存在的配置文件
echo   -q, --quiet          静默模式，减少输出
echo.
echo 示例:
echo   %~nx0                  生成开发环境配置
echo   %~nx0 prod             生成生产环境配置
echo   %~nx0 -f test          强制生成测试环境配置
echo   %~nx0 -q prod          静默生成生产环境配置
echo.
echo 环境说明:
echo   dev   - 开发环境，使用本地数据库，调试级别日志
echo   test  - 测试环境，使用测试数据库，警告级别日志
echo   prod  - 生产环境，使用生产数据库，错误级别日志
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

REM 生成随机字符串
:generate_random_string
set "length=%~1"
if "%length%"=="" set "length=32"
set "chars=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
set "result="
for /L %%i in (1,1,%length%) do (
    set /a "rand=%random% %% 62"
    for %%j in (!rand!) do set "result=!result!!chars:~%%j,1!"
)
set "%~2=%result%"
goto :eof

REM 生成JWT密钥
:generate_jwt_secret
set "length=%~1"
if "%length%"=="" set "length=64"
set "result="
for /L %%i in (1,1,%length%) do (
    set /a "rand=%random% %% 16"
    if !rand! LSS 10 (
        set "result=!result!!rand!"
    ) else (
        set /a "hex=rand+55"
        cmd /c exit /b !hex!
        for /F "tokens=*" %%a in ('echo %=exitcodeAscii%') do set "result=!result!%%a"
    )
)
set "%~2=%result%"
goto :eof

REM 创建环境配置目录
:create_env_directory
set "env_dir=%CONFIG_DIR%\environments\%ENVIRONMENT%"
if exist "%env_dir%" (
    if "%FORCE_OVERWRITE%"=="false" (
        call :log_warn "环境配置目录已存在: %env_dir%"
        echo 是否覆盖? (y/N): 
        set /p "overwrite="
        if /i not "!overwrite!"=="y" (
            call :log_info "操作已取消"
            exit /b 0
        )
    )
)
mkdir "%env_dir%" 2>nul
call :log_info "创建环境配置目录: %env_dir%"
goto :eof

REM 生成环境变量文件
:generate_env_file
set "env_file=%CONFIG_DIR%\environments\%ENVIRONMENT%\.env"
call :generate_jwt_secret 64 jwt_secret
call :generate_random_string 16 db_password

call :log_info "生成环境变量文件: %env_file%"

(
echo # 图灵绘境 - %ENVIRONMENT% 环境配置
echo # 生成时间: %date% %time%
echo.
echo # ======================
echo # 数据库配置
echo # ======================
echo DB_HOST=mysql
echo DB_PORT=3306
echo DB_NAME=turing_drawing
echo DB_USERNAME=root
echo DB_PASSWORD=%db_password%
echo.
echo # ======================
echo # JWT配置
echo # ======================
echo JWT_SECRET=%jwt_secret%
echo JWT_EXPIRATION=86400000
echo.
echo # ======================
echo # 腾讯云COS配置
echo # ======================
echo COS_SECRET_ID=your_cos_secret_id_here
echo COS_SECRET_KEY=your_cos_secret_key_here
echo COS_REGION=ap-guangzhou
echo COS_BUCKET=your-bucket-name
echo.
echo # ======================
echo # AI服务配置
echo # ======================
echo OPENAI_API_KEY=your_openai_api_key_here
echo GEMINI_API_KEY=your_gemini_api_key_here
echo.
echo # ======================
echo # 微信配置
echo # ======================
echo WECHAT_APP_ID=your_wechat_app_id_here
echo WECHAT_APP_SECRET=your_wechat_app_secret_here
echo.
echo # ======================
echo # 邮件配置
echo # ======================
echo MAIL_HOST=smtp.gmail.com
echo MAIL_PORT=587
echo MAIL_USERNAME=your_email@gmail.com
echo MAIL_PASSWORD=your_app_password
echo MAIL_FROM=noreply@your-domain.com
echo.
echo # ======================
echo # 应用配置
echo # ======================
echo APP_PORT=8080
echo APP_CONTEXT_PATH=/
echo CORS_ALLOWED_ORIGINS=https://your-domain.com
echo FILE_UPLOAD_MAX_SIZE=50MB
echo.
echo # ======================
echo # 日志配置
echo # ======================
echo LOG_LEVEL=INFO
echo LOG_PATH=/app/logs
echo LOG_FILE_MAX_SIZE=10MB
echo LOG_FILE_MAX_HISTORY=30
) > "%env_file%"

call :log_info "环境变量文件已生成"
goto :eof

REM 生成Spring Boot配置文件
:generate_spring_config
set "spring_file=%CONFIG_DIR%\environments\%ENVIRONMENT%\application-%ENVIRONMENT%.yml"

REM 根据环境设置日志级别
if "%ENVIRONMENT%"=="dev" (
    set "log_level=DEBUG"
) else if "%ENVIRONMENT%"=="test" (
    set "log_level=INFO"
) else if "%ENVIRONMENT%"=="prod" (
    set "log_level=WARN"
) else (
    set "log_level=INFO"
)

call :log_info "生成Spring Boot配置文件: %spring_file%"

(
echo # 图灵绘境 - Spring Boot %ENVIRONMENT% 环境配置
echo # 生成时间: %date% %time%
echo.
echo # ======================
echo # 服务器配置
echo # ======================
echo server:
echo   port: ${APP_PORT:8080}
echo   servlet:
echo     context-path: ${APP_CONTEXT_PATH:/}
echo.
echo # ======================
echo # 数据源配置
echo # ======================
echo spring:
echo   datasource:
echo     url: jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:turing_drawing}?useUnicode=true^&characterEncoding=utf8^&useSSL=false^&serverTimezone=Asia/Shanghai
echo     username: ${DB_USERNAME:root}
echo     password: ${DB_PASSWORD:password}
echo     driver-class-name: com.mysql.cj.jdbc.Driver
echo     hikari:
echo       maximum-pool-size: 20
echo       minimum-idle: 5
echo       idle-timeout: 300000
echo       max-lifetime: 1200000
echo       connection-timeout: 30000
echo.
echo   # ======================
echo   # JPA/Hibernate配置
echo   # ======================
echo   jpa:
echo     hibernate:
echo       ddl-auto: validate
echo     show-sql: false
echo     database-platform: org.hibernate.dialect.MySQL8Dialect
echo     properties:
echo       hibernate:
echo         format_sql: false
echo         use_sql_comments: false
echo.
echo   # ======================
echo   # 文件上传配置
echo   # ======================
echo   servlet:
echo     multipart:
echo       max-file-size: ${FILE_UPLOAD_MAX_SIZE:50MB}
echo       max-request-size: ${FILE_UPLOAD_MAX_SIZE:50MB}
echo.
echo   # ======================
echo   # 邮件配置
echo   # ======================
echo   mail:
echo     host: ${MAIL_HOST:smtp.gmail.com}
echo     port: ${MAIL_PORT:587}
echo     username: ${MAIL_USERNAME:}
echo     password: ${MAIL_PASSWORD:}
echo     properties:
echo       mail:
echo         smtp:
echo           auth: true
echo           starttls:
echo             enable: true
echo.
echo # ======================
echo # JWT配置
echo # ======================
echo jwt:
echo   secret: ${JWT_SECRET:default_jwt_secret_change_this_in_production}
echo   expiration: ${JWT_EXPIRATION:86400000}
echo.
echo # ======================
echo # 腾讯云COS配置
echo # ======================
echo cos:
echo   secret-id: ${COS_SECRET_ID:}
echo   secret-key: ${COS_SECRET_KEY:}
echo   region: ${COS_REGION:ap-guangzhou}
echo   bucket: ${COS_BUCKET:}
echo.
echo # ======================
echo # AI服务配置
echo # ======================
echo ai:
echo   openai:
echo     api-key: ${OPENAI_API_KEY:}
echo     model: gpt-4
echo     max-tokens: 2000
echo     temperature: 0.7
echo   gemini:
echo     api-key: ${GEMINI_API_KEY:}
echo     model: gemini-pro
echo     max-tokens: 2000
echo     temperature: 0.7
echo.
echo # ======================
echo # 微信配置
echo # ======================
echo wechat:
echo   app-id: ${WECHAT_APP_ID:}
echo   app-secret: ${WECHAT_APP_SECRET:}
echo.
echo # ======================
echo # CORS配置
echo # ======================
echo cors:
echo   allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:3000}
echo.
echo # ======================
echo # 日志配置
echo # ======================
echo logging:
echo   level:
echo     root: %log_level%
echo     com.turingdrawing: %log_level%
echo     org.springframework: INFO
echo     org.hibernate: INFO
echo   pattern:
echo     console: "%%d{yyyy-MM-dd HH:mm:ss} [%%thread] %%-5level %%logger{36} - %%msg%%n"
echo     file: "%%d{yyyy-MM-dd HH:mm:ss} [%%thread] %%-5level %%logger{36} - %%msg%%n"
echo   file:
echo     name: ${LOG_PATH:/app/logs}/app.log
echo.
echo # ======================
echo # Actuator配置
echo # ======================
echo management:
echo   endpoints:
echo     web:
echo       exposure:
echo         include: health,info,prometheus,metrics
echo   endpoint:
echo     health:
echo       show-details: always
echo   metrics:
echo     export:
echo       prometheus:
echo         enabled: true
echo.
echo # ======================
echo # 自定义配置
echo # ======================
echo app:
echo   name: 图灵绘境
echo   version: 2.0.0
echo   environment: %ENVIRONMENT%
) > "%spring_file%"

call :log_info "Spring Boot配置文件已生成"
goto :eof

REM 生成Docker Compose覆盖文件
:generate_docker_compose_override
set "override_file=%CONFIG_DIR%\environments\%ENVIRONMENT%\docker-compose.override.yml"

call :log_info "生成Docker Compose覆盖文件: %override_file%"

(
echo # 图灵绘境 - Docker Compose %ENVIRONMENT% 环境覆盖配置
echo # 生成时间: %date% %time%
echo.
echo version: '3.8'
echo.
echo services:
echo   backend:
echo     environment:
echo       - SPRING_PROFILES_ACTIVE=%ENVIRONMENT%
echo     volumes:
echo       - ./config/environments/%ENVIRONMENT%/.env:/app/.env:ro
echo     ports:
echo       - "8080:8080"
echo     restart: unless-stopped
echo     depends_on:
echo       mysql:
echo         condition: service_healthy
echo.
echo   mysql:
echo     environment:
echo       - MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
echo       - MYSQL_DATABASE=${DB_NAME}
echo     ports:
echo       - "3306:3306"
echo     restart: unless-stopped
echo     healthcheck:
echo       test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
echo       interval: 30s
echo       timeout: 10s
echo       retries: 5
) > "%override_file%"

call :log_info "Docker Compose覆盖文件已生成"
goto :eof

REM 生成README
:generate_readme
set "readme_file=%CONFIG_DIR%\environments\%ENVIRONMENT%\README.md"

call :log_info "生成环境README: %readme_file%"

(
echo # 图灵绘境 - %ENVIRONMENT% 环境配置
echo.
echo ## 配置说明
echo.
echo 此目录包含 %ENVIRONMENT% 环境的配置文件。
echo.
echo ### 文件说明
echo.
echo - \`.env\` - 环境变量配置文件
echo - \`application-%ENVIRONMENT%.yml\` - Spring Boot 配置文件
echo - \`docker-compose.override.yml\` - Docker Compose 覆盖配置
echo.
echo ### 使用说明
echo.
echo 1. 修改 \`.env\` 文件中的配置值
echo 2. 根据需要调整 \`application-%ENVIRONMENT%.yml\` 中的配置
echo 3. 使用 Docker Compose 启动:
echo    \`\`\`cmd
echo    docker compose -f docker-compose.yml -f config\environments\%ENVIRONMENT%\docker-compose.override.yml up -d
echo    \`\`\`
echo.
echo ### 注意事项
echo.
echo - 请确保所有敏感信息都已正确配置
echo - 生产环境请使用强密码和安全的密钥
echo - 定期更新和备份配置文件
echo.
echo 生成时间: %date% %time%
) > "%readme_file%"

call :log_info "环境README已生成"
goto :eof

REM 主函数
:main
call :log_info "开始生成 %ENVIRONMENT% 环境配置..."

REM 创建目录
call :create_env_directory

REM 生成配置文件
call :generate_env_file
call :generate_spring_config
call :generate_docker_compose_override
call :generate_readme

call :log_info "环境配置生成完成!"
call :log_info "配置目录: %CONFIG_DIR%\environments\%ENVIRONMENT%"
call :log_info "请检查并修改配置文件中的占位符值"
goto :eof

REM 解析命令行参数
:parse_args
if "%~1"=="" goto :eof
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help
if "%~1"=="-f" set "FORCE_OVERWRITE=true" & shift & goto :parse_args
if "%~1"=="--force" set "FORCE_OVERWRITE=true" & shift & goto :parse_args
if "%~1"=="-q" set "QUIET=true" & shift & goto :parse_args
if "%~1"=="--quiet" set "QUIET=true" & shift & goto :parse_args
if "%~1"=="dev" set "ENVIRONMENT=dev" & shift & goto :parse_args
if "%~1"=="test" set "ENVIRONMENT=test" & shift & goto :parse_args
if "%~1"=="prod" set "ENVIRONMENT=prod" & shift & goto :parse_args
call :log_error "未知选项: %~1"
call :show_help
exit /b 1

REM 主程序入口
call :parse_args %*

REM 执行主函数
call :main

endlocal