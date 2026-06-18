#!/bin/bash

# 图灵绘境环境配置生成脚本
# 用于快速生成不同环境的配置文件

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="dev"
FORCE_OVERWRITE=false
QUIET=false

# 帮助信息
show_help() {
    cat << EOF
${BLUE}图灵绘境环境配置生成脚本${NC}

用法: $0 [选项] [环境]

参数:
  环境                  环境名称 (dev|test|prod) [默认: dev]

选项:
  -h, --help           显示帮助信息
  -f, --force          强制覆盖已存在的配置文件
  -q, --quiet          静默模式，减少输出
  -v, --verbose        详细输出模式

示例:
  $0                  # 生成开发环境配置
  $0 prod             # 生成生产环境配置
  $0 -f test          # 强制生成测试环境配置
  $0 -q prod          # 静默生成生产环境配置

环境说明:
  dev   - 开发环境，使用本地数据库，调试级别日志
  test  - 测试环境，使用测试数据库，警告级别日志
  prod  - 生产环境，使用生产数据库，错误级别日志

EOF
}

# 日志函数
log_info() {
    [[ "$QUIET" == false ]] && echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    [[ "$QUIET" == false ]] && echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_debug() {
    [[ "$VERBOSE" == true ]] && echo -e "${BLUE}[DEBUG]${NC} $1"
}

# 检查命令依赖
check_dependencies() {
    local deps=("openssl" "uuidgen")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        fi
    done
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "缺少依赖命令: ${missing[*]}"
        log_info "请安装缺失的依赖后重试"
        exit 1
    fi
}

# 生成随机字符串
generate_random_string() {
    local length=${1:-32}
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# 生成JWT密钥
generate_jwt_secret() {
    local length=${1:-64}
    openssl rand -hex "$((length/2))"
}

# 创建环境配置目录
create_env_directory() {
    local env_dir="$CONFIG_DIR/environments/$ENVIRONMENT"
    
    if [[ -d "$env_dir" && "$FORCE_OVERWRITE" == false ]]; then
        log_warn "环境配置目录已存在: $env_dir"
        read -p "是否覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "操作已取消"
            exit 0
        fi
    fi
    
    mkdir -p "$env_dir"
    log_info "创建环境配置目录: $env_dir"
}

# 生成环境变量文件
generate_env_file() {
    local env_file="$CONFIG_DIR/environments/$ENVIRONMENT/.env"
    local jwt_secret
    local db_password
    
    # 生成密钥
    jwt_secret=$(generate_jwt_secret 64)
    db_password=$(generate_random_string 16)
    
    log_info "生成环境变量文件: $env_file"
    
    cat > "$env_file" << EOF
# 图灵绘境 - $ENVIRONMENT 环境配置
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')

# ======================
# 数据库配置
# ======================
DB_HOST=mysql
DB_PORT=3306
DB_NAME=turing_drawing
DB_USERNAME=root
DB_PASSWORD=$db_password

# ======================
# JWT配置
# ======================
JWT_SECRET=$jwt_secret
JWT_EXPIRATION=86400000

# ======================
# 腾讯云COS配置
# ======================
COS_SECRET_ID=your_cos_secret_id_here
COS_SECRET_KEY=your_cos_secret_key_here
COS_REGION=ap-guangzhou
COS_BUCKET=your-bucket-name

# ======================
# AI服务配置
# ======================
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# ======================
# 微信配置
# ======================
WECHAT_APP_ID=your_wechat_app_id_here
WECHAT_APP_SECRET=your_wechat_app_secret_here

# ======================
# 邮件配置
# ======================
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=noreply@your-domain.com

# ======================
# 应用配置
# ======================
APP_PORT=8080
APP_CONTEXT_PATH=/
CORS_ALLOWED_ORIGINS=https://your-domain.com
FILE_UPLOAD_MAX_SIZE=50MB

# ======================
# 日志配置
# ======================
LOG_LEVEL=INFO
LOG_PATH=/app/logs
LOG_FILE_MAX_SIZE=10MB
LOG_FILE_MAX_HISTORY=30
EOF
    
    log_info "环境变量文件已生成"
}

# 生成Spring Boot配置文件
generate_spring_config() {
    local spring_file="$CONFIG_DIR/environments/$ENVIRONMENT/application-$ENVIRONMENT.yml"
    local log_level
    
    # 根据环境设置日志级别
    case $ENVIRONMENT in
        dev)
            log_level="DEBUG"
            ;;
        test)
            log_level="INFO"
            ;;
        prod)
            log_level="WARN"
            ;;
        *)
            log_level="INFO"
            ;;
    esac
    
    log_info "生成Spring Boot配置文件: $spring_file"
    
    cat > "$spring_file" << EOF
# 图灵绘境 - Spring Boot $ENVIRONMENT 环境配置
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')

# ======================
# 服务器配置
# ======================
server:
  port: \${APP_PORT:8080}
  servlet:
    context-path: \${APP_CONTEXT_PATH:/}

# ======================
# 数据源配置
# ======================
spring:
  datasource:
    url: jdbc:mysql://\${DB_HOST:localhost}:\${DB_PORT:3306}/\${DB_NAME:turing_drawing}?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai
    username: \${DB_USERNAME:root}
    password: \${DB_PASSWORD:password}
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 300000
      max-lifetime: 1200000
      connection-timeout: 30000

  # ======================
  # JPA/Hibernate配置
  # ======================
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    database-platform: org.hibernate.dialect.MySQL8Dialect
    properties:
      hibernate:
        format_sql: false
        use_sql_comments: false

  # ======================
  # 文件上传配置
  # ======================
  servlet:
    multipart:
      max-file-size: \${FILE_UPLOAD_MAX_SIZE:50MB}
      max-request-size: \${FILE_UPLOAD_MAX_SIZE:50MB}

  # ======================
  # 邮件配置
  # ======================
  mail:
    host: \${MAIL_HOST:smtp.gmail.com}
    port: \${MAIL_PORT:587}
    username: \${MAIL_USERNAME:}
    password: \${MAIL_PASSWORD:}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true

# ======================
# JWT配置
# ======================
jwt:
  secret: \${JWT_SECRET:default_jwt_secret_change_this_in_production}
  expiration: \${JWT_EXPIRATION:86400000}

# ======================
# 腾讯云COS配置
# ======================
cos:
  secret-id: \${COS_SECRET_ID:}
  secret-key: \${COS_SECRET_KEY:}
  region: \${COS_REGION:ap-guangzhou}
  bucket: \${COS_BUCKET:}

# ======================
# AI服务配置
# ======================
ai:
  openai:
    api-key: \${OPENAI_API_KEY:}
    model: gpt-4
    max-tokens: 2000
    temperature: 0.7
  gemini:
    api-key: \${GEMINI_API_KEY:}
    model: gemini-pro
    max-tokens: 2000
    temperature: 0.7

# ======================
# 微信配置
# ======================
wechat:
  app-id: \${WECHAT_APP_ID:}
  app-secret: \${WECHAT_APP_SECRET:}

# ======================
# CORS配置
# ======================
cors:
  allowed-origins: \${CORS_ALLOWED_ORIGINS:http://localhost:3000}

# ======================
# 日志配置
# ======================
logging:
  level:
    root: $log_level
    com.turingdrawing: $log_level
    org.springframework: INFO
    org.hibernate: INFO
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
  file:
    name: \${LOG_PATH:/app/logs}/app.log

# ======================
# Actuator配置
# ======================
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus,metrics
  endpoint:
    health:
      show-details: always
  metrics:
    export:
      prometheus:
        enabled: true

# ======================
# 自定义配置
# ======================
app:
  name: 图灵绘境
  version: 2.0.0
  environment: $ENVIRONMENT
EOF
    
    log_info "Spring Boot配置文件已生成"
}

# 生成Docker Compose覆盖文件
generate_docker_compose_override() {
    local override_file="$CONFIG_DIR/environments/$ENVIRONMENT/docker-compose.override.yml"
    
    log_info "生成Docker Compose覆盖文件: $override_file"
    
    cat > "$override_file" << EOF
# 图灵绘境 - Docker Compose $ENVIRONMENT 环境覆盖配置
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')

version: '3.8'

services:
  backend:
    environment:
      - SPRING_PROFILES_ACTIVE=$ENVIRONMENT
    volumes:
      - ./config/environments/$ENVIRONMENT/.env:/app/.env:ro
    ports:
      - "8080:8080"
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy

  mysql:
    environment:
      - MYSQL_ROOT_PASSWORD=\${DB_PASSWORD}
      - MYSQL_DATABASE=\${DB_NAME}
    ports:
      - "3306:3306"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 30s
      timeout: 10s
      retries: 5
EOF
    
    log_info "Docker Compose覆盖文件已生成"
}

# 生成README
generate_readme() {
    local readme_file="$CONFIG_DIR/environments/$ENVIRONMENT/README.md"
    
    log_info "生成环境README: $readme_file"
    
    cat > "$readme_file" << EOF
# 图灵绘境 - $ENVIRONMENT 环境配置

## 配置说明

此目录包含 $ENVIRONMENT 环境的配置文件。

### 文件说明

- \`.env\` - 环境变量配置文件
- \`application-$ENVIRONMENT.yml\` - Spring Boot 配置文件
- \`docker-compose.override.yml\` - Docker Compose 覆盖配置

### 使用说明

1. 修改 \`.env\` 文件中的配置值
2. 根据需要调整 \`application-$ENVIRONMENT.yml\` 中的配置
3. 使用 Docker Compose 启动:
   \`\`\`bash
   docker compose -f docker-compose.yml -f config/environments/$ENVIRONMENT/docker-compose.override.yml up -d
   \`\`\`

### 注意事项

- 请确保所有敏感信息都已正确配置
- 生产环境请使用强密码和安全的密钥
- 定期更新和备份配置文件

生成时间: $(date '+%Y-%m-%d %H:%M:%S')
EOF
    
    log_info "环境README已生成"
}

# 主函数
main() {
    log_info "开始生成 $ENVIRONMENT 环境配置..."
    
    # 创建目录
    create_env_directory
    
    # 生成配置文件
    generate_env_file
    generate_spring_config
    generate_docker_compose_override
    generate_readme
    
    log_info "环境配置生成完成!"
    log_info "配置目录: $CONFIG_DIR/environments/$ENVIRONMENT"
    log_info "请检查并修改配置文件中的占位符值"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--force)
            FORCE_OVERWRITE=true
            shift
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        dev|test|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 检查依赖
check_dependencies

# 执行主函数
main