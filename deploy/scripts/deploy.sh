#!/bin/bash

# 图灵绘境部署脚本
# 支持Docker和原生部署模式

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DEPLOY_MODE="docker"
ENVIRONMENT="dev"
SKIP_BUILD=false
SKIP_TESTS=true
FORCE_DEPLOY=false
QUIET=false
VERBOSE=false

# 应用配置
APP_NAME="turing-drawing"
APP_VERSION="2.0.0"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
CONFIG_DIR="$PROJECT_ROOT/config"

# Docker配置
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
DOCKER_IMAGE_NAME="$APP_NAME:$APP_VERSION"

# 原生部署配置
DEPLOY_PATH="/opt/$APP_NAME"
SERVICE_NAME="$APP_NAME"

# 帮助信息
show_help() {
    cat << EOF
${BLUE}图灵绘境部署脚本${NC}

用法: $0 [选项]

选项:
  -h, --help           显示帮助信息
  -m, --mode MODE      部署模式 (docker|native) [默认: $DEPLOY_MODE]
  -e, --env ENV        环境 (dev|test|prod) [默认: $ENVIRONMENT]
  -s, --skip-build     跳过构建步骤
  -t, --run-tests      运行测试 (默认跳过)
  -f, --force          强制部署，覆盖现有配置
  -q, --quiet          静默模式
  -v, --verbose        详细输出模式

示例:
  $0                  # 使用默认配置部署
  $0 -m docker -e prod # Docker模式部署生产环境
  $0 -m native -e prod # 原生模式部署生产环境
  $0 -s -f            # 跳过构建，强制部署

部署模式说明:
  docker  - 使用Docker Compose部署
  native  - 原生部署到系统目录

环境说明:
  dev   - 开发环境
  test  - 测试环境
  prod  - 生产环境

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

# 检查依赖
check_dependencies() {
    local deps=()
    
    case $DEPLOY_MODE in
        docker)
            deps=("docker" "docker-compose")
            ;;
        native)
            deps=("java" "mvn" "npm")
            ;;
    esac
    
    local missing=()
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        fi
    done
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "缺少依赖命令: ${missing[*]}"
        exit 1
    fi
}

# 检查环境配置
check_environment() {
    local env_dir="$CONFIG_DIR/environments/$ENVIRONMENT"
    
    if [[ ! -d "$env_dir" ]]; then
        log_warn "环境配置不存在: $env_dir"
        log_info "正在生成环境配置..."
        "$CONFIG_DIR/scripts/setup-env.sh" "$ENVIRONMENT"
    fi
    
    if [[ ! -f "$env_dir/.env" ]]; then
        log_error "环境配置文件缺失: $env_dir/.env"
        exit 1
    fi
    
    log_info "环境配置检查通过: $ENVIRONMENT"
}

# 构建后端
build_backend() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log_info "跳过后端构建"
        return 0
    fi
    
    log_info "构建后端应用..."
    
    cd "$BACKEND_DIR"
    
    # 清理之前的构建
    ./mvnw clean
    
    # 构建应用
    local build_cmd="./mvnw package"
    [[ "$SKIP_TESTS" == true ]] && build_cmd="$build_cmd -DskipTests"
    
    if eval "$build_cmd"; then
        log_info "后端构建成功"
    else
        log_error "后端构建失败"
        exit 1
    fi
}

# 构建前端
build_frontend() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log_info "跳过后端构建"
        return 0
    fi
    
    log_info "构建前端应用..."
    
    cd "$FRONTEND_DIR"
    
    # 安装依赖
    if [[ ! -d "node_modules" ]]; then
        log_info "安装前端依赖..."
        npm install
    fi
    
    # 构建应用
    if npm run build; then
        log_info "前端构建成功"
    else
        log_error "前端构建失败"
        exit 1
    fi
}

# Docker部署
deploy_docker() {
    log_info "开始Docker部署..."
    
    # 检查Docker Compose文件
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        log_error "Docker Compose文件不存在: $DOCKER_COMPOSE_FILE"
        exit 1
    fi
    
    # 构建镜像
    if [[ "$SKIP_BUILD" == false ]]; then
        log_info "构建Docker镜像..."
        docker compose build
    fi
    
    # 停止现有服务
    log_info "停止现有服务..."
    docker compose down
    
    # 启动服务
    log_info "启动服务..."
    docker compose -f "$DOCKER_COMPOSE_FILE" \
                   -f "$CONFIG_DIR/environments/$ENVIRONMENT/docker-compose.override.yml" \
                   up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    if docker compose ps | grep -q "Up"; then
        log_info "Docker服务启动成功"
    else
        log_error "Docker服务启动失败"
        docker compose logs
        exit 1
    fi
    
    # 显示服务状态
    docker compose ps
}

# 原生部署
deploy_native() {
    log_info "开始原生部署..."
    
    # 检查部署目录
    if [[ -d "$DEPLOY_PATH" && "$FORCE_DEPLOY" == false ]]; then
        log_warn "部署目录已存在: $DEPLOY_PATH"
        read -p "是否覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "操作已取消"
            exit 0
        fi
    fi
    
    # 创建部署目录
    log_info "创建部署目录: $DEPLOY_PATH"
    mkdir -p "$DEPLOY_PATH"/{backend,frontend,logs,uploads,config}
    
    # 复制文件
    log_info "复制应用文件..."
    
    # 复制后端
    cp "$BACKEND_DIR/target/"*.jar "$DEPLOY_PATH/backend/app.jar"
    
    # 复制前端
    cp -r "$FRONTEND_DIR/dist/build/h5/"* "$DEPLOY_PATH/frontend/"
    
    # 复制配置
    cp "$CONFIG_DIR/environments/$ENVIRONMENT/.env" "$DEPLOY_PATH/config/"
    
    # 设置权限
    chown -R spring:spring "$DEPLOY_PATH"
    chmod 644 "$DEPLOY_PATH/config/.env"
    
    # 配置systemd服务
    log_info "配置systemd服务..."
    local service_file="/etc/systemd/system/$SERVICE_NAME.service"
    
    cat > "$service_file" << EOF
[Unit]
Description=图灵绘境应用服务
After=network.target mysql.service

[Service]
Type=simple
User=spring
Group=spring
WorkingDirectory=$DEPLOY_PATH/backend
EnvironmentFile=$DEPLOY_PATH/config/.env
ExecStart=/usr/bin/java -jar app.jar --spring.profiles.active=$ENVIRONMENT
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# 安全限制
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DEPLOY_PATH

# 资源限制
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF
    
    # 重新加载systemd
    systemctl daemon-reload
    
    # 启动服务
    log_info "启动服务..."
    systemctl enable "$SERVICE_NAME"
    systemctl restart "$SERVICE_NAME"
    
    # 检查服务状态
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log_info "原生服务启动成功"
    else
        log_error "原生服务启动失败"
        systemctl status "$SERVICE_NAME"
        exit 1
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s -f http://localhost:8080/actuator/health > /dev/null; then
            log_info "应用健康检查通过"
            
            # 显示健康状态
            local health_status=$(curl -s http://localhost:8080/actuator/health | jq -r '.status' 2>/dev/null || echo "UNKNOWN")
            log_info "健康状态: $health_status"
            
            return 0
        fi
        
        log_info "等待应用启动... (尝试 $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    log_error "健康检查失败，应用未正常启动"
    return 1
}

# 显示部署摘要
show_deployment_summary() {
    log_info "部署摘要:"
    echo "  部署模式: $DEPLOY_MODE"
    echo "  环境: $ENVIRONMENT"
    echo "  应用名称: $APP_NAME"
    echo "  应用版本: $APP_VERSION"
    
    case $DEPLOY_MODE in
        docker)
            echo "  Docker Compose: $DOCKER_COMPOSE_FILE"
            echo "  环境覆盖: $CONFIG_DIR/environments/$ENVIRONMENT/docker-compose.override.yml"
            ;;
        native)
            echo "  部署路径: $DEPLOY_PATH"
            echo "  服务名称: $SERVICE_NAME"
            ;;
    esac
    
    echo ""
    log_info "访问应用:"
    echo "  健康检查: http://localhost:8080/actuator/health"
    echo "  API文档: http://localhost:8080/swagger-ui.html"
}

# 主函数
main() {
    log_info "开始部署图灵绘境应用..."
    
    # 显示配置
    log_debug "部署模式: $DEPLOY_MODE"
    log_debug "环境: $ENVIRONMENT"
    log_debug "项目根目录: $PROJECT_ROOT"
    
    # 检查依赖
    check_dependencies
    
    # 检查环境配置
    check_environment
    
    # 构建应用
    build_backend
    build_frontend
    
    # 部署应用
    case $DEPLOY_MODE in
        docker)
            deploy_docker
            ;;
        native)
            deploy_native
            ;;
        *)
            log_error "不支持的部署模式: $DEPLOY_MODE"
            exit 1
            ;;
    esac
    
    # 健康检查
    health_check
    
    # 显示摘要
    show_deployment_summary
    
    log_info "部署完成!"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -m|--mode)
            DEPLOY_MODE="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -t|--run-tests)
            SKIP_TESTS=false
            shift
            ;;
        -f|--force)
            FORCE_DEPLOY=true
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
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 执行主函数
main