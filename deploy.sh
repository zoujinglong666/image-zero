#!/bin/bash
# ══════════════════════════════════════════════════════════
#  图灵绘境 - 一键部署脚本 (Spring Boot + MySQL + Nginx)
#  适用于: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
#  用法: chmod +x deploy.sh && sudo ./deploy.sh
# ══════════════════════════════════════════════════════════

set -euo pipefail

# ── 颜色输出 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step()  { echo -e "\n${CYAN}═══════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════${NC}"; }

# ── 项目路径 ──
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
DEPLOY_DIR="$PROJECT_DIR/deploy"

# ── 默认配置 ──
DOMAIN=""
DB_PASSWORD=""
JWT_SECRET=""
COS_SECRET_ID=""
COS_SECRET_KEY=""
COS_BUCKET=""
COS_REGION="ap-guangzhou"
COS_DOMAIN=""
OPENAI_API_KEY=""
WECHAT_APP_ID=""
WECHAT_APP_SECRET=""
INSTALL_DIR="/opt/turing-drawing"

# ══════════════════════════════════════════
#  1. 解析参数
# ══════════════════════════════════════════
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --domain=*)    DOMAIN="${1#*=}"; shift ;;
            --install-dir=*) INSTALL_DIR="${1#*=}"; shift ;;
            --help|-h)
                echo "用法: sudo ./deploy.sh [选项]"
                echo ""
                echo "选项:"
                echo "  --domain=DOMAIN       域名 (如: www.example.com)"
                echo "  --install-dir=DIR     安装目录 (默认: /opt/turing-drawing)"
                echo "  --help                显示帮助"
                echo ""
                echo "不带参数运行将进入交互式配置"
                exit 0
                ;;
            *) error "未知参数: $1. 使用 --help 查看帮助" ;;
        esac
    done
}

# ══════════════════════════════════════════
#  2. 交互式配置
# ══════════════════════════════════════════
interactive_setup() {
    step "交互式配置"

    if [[ -z "$DOMAIN" ]]; then
        read -rp "请输入域名 (如: www.image-zero.art): " DOMAIN
    fi
    if [[ -z "$DB_PASSWORD" ]]; then
        DB_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=' | head -c 20)
        warn "已自动生成数据库密码: $DB_PASSWORD"
    fi
    if [[ -z "$JWT_SECRET" ]]; then
        JWT_SECRET=$(openssl rand -hex 32)
        warn "已自动生成JWT密钥: ${JWT_SECRET:0:16}..."
    fi

    read -rp "腾讯云 COS Secret ID (留空跳过): " COS_SECRET_ID
    read -rp "腾讯云 COS Secret Key (留空跳过): " COS_SECRET_KEY
    read -rp "腾讯云 COS Bucket (如: my-bucket-1250000000): " COS_BUCKET
    read -rp "腾讯云 COS Region (默认: ap-guangzhou): " COS_REGION_INPUT
    COS_REGION="${COS_REGION_INPUT:-ap-guangzhou}"
    read -rp "COS CDN 域名 (留空使用默认): " COS_DOMAIN

    read -rp "OpenAI/OpenRouter API Key (留空跳过): " OPENAI_API_KEY

    read -rp "微信 App ID (留空跳过): " WECHAT_APP_ID
    read -rp "微信 App Secret (留空跳过): " WECHAT_APP_SECRET

    echo ""
    info "配置确认:"
    echo "  域名: $DOMAIN"
    echo "  安装目录: $INSTALL_DIR"
    echo "  数据库密码: ${DB_PASSWORD:0:4}****"
    echo "  JWT密钥: ${JWT_SECRET:0:8}****"
    echo "  COS Bucket: ${COS_BUCKET:-未配置}"
    echo ""
    read -rp "确认开始部署? [y/N]: " CONFIRM
    [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]] && error "部署已取消"
}

# ══════════════════════════════════════════
#  3. 检查系统依赖
# ══════════════════════════════════════════
check_system() {
    step "检查系统环境"

    # 检查root
    [[ $EUID -ne 0 ]] && error "请使用 root 或 sudo 运行此脚本"

    # 检查OS
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        info "操作系统: $PRETTY_NAME"
    fi

    # 安装基础依赖
    local PKG_MANAGER=""
    if command -v apt-get &>/dev/null; then
        PKG_MANAGER="apt-get"
        apt-get update -qq
        apt-get install -y -qq curl wget git openssl > /dev/null
    elif command -v yum &>/dev/null; then
        PKG_MANAGER="yum"
        yum install -y -q curl wget git openssl
    fi
    info "基础依赖已安装"
}

# ══════════════════════════════════════════
#  4. 安装 Docker
# ══════════════════════════════════════════
install_docker() {
    step "安装 Docker"

    if command -v docker &>/dev/null; then
        info "Docker 已安装: $(docker --version)"
        return 0
    fi

    info "正在安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
    info "Docker 安装完成: $(docker --version)"

    # 安装 docker compose
    if ! docker compose version &>/dev/null; then
        info "正在安装 Docker Compose 插件..."
        apt-get install -y -qq docker-compose-plugin 2>/dev/null || \
        mkdir -p /usr/local/lib/docker/cli-plugins && \
        curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
            -o /usr/local/lib/docker/cli-plugins/docker-compose && \
        chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    fi
    info "Docker Compose: $(docker compose version)"
}

# ══════════════════════════════════════════
#  5. 安装 JDK 17 + Maven (非Docker部署用)
# ══════════════════════════════════════════
install_java() {
    step "安装 JDK 17"

    if java -version 2>&1 | grep -q "17"; then
        info "JDK 17 已安装"
        return 0
    fi

    info "正在安装 JDK 17..."
    if command -v apt-get &>/dev/null; then
        apt-get install -y -qq openjdk-17-jdk > /dev/null
    elif command -v yum &>/dev/null; then
        yum install -y -q java-17-openjdk-devel
    fi

    # 验证
    local JAVA_VER=$(java -version 2>&1 | head -1)
    info "Java 版本: $JAVA_VER"
}

# ══════════════════════════════════════════
#  6. 生成环境配置文件
# ══════════════════════════════════════════
generate_env() {
    step "生成环境配置"

    # 生成 .env 文件
    cat > "$PROJECT_DIR/.env" << EOF
# ═══ 图灵绘境生产环境配置 ═══
# 自动生成于 $(date '+%Y-%m-%d %H:%M:%S')

# 数据库
DB_PASSWORD=$DB_PASSWORD

# JWT
JWT_SECRET=$JWT_SECRET

# 腾讯云 COS
COS_SECRET_ID=$COS_SECRET_ID
COS_SECRET_KEY=$COS_SECRET_KEY
COS_REGION=$COS_REGION
COS_BUCKET=$COS_BUCKET
COS_DOMAIN=$COS_DOMAIN
COS_UPLOAD_DIR=./uploads

# AI 服务
OPENAI_API_KEY=$OPENAI_API_KEY

# 微信
WECHAT_APP_ID=$WECHAT_APP_ID
WECHAT_APP_SECRET=$WECHAT_APP_SECRET
EOF
    chmod 600 "$PROJECT_DIR/.env"
    info "已生成 .env 配置文件"

    # 生成前端 .env.production
    local API_URL="https://$DOMAIN/api"
    cat > "$FRONTEND_DIR/.env.production" << EOF
VITE_API_BASE_URL=$API_URL
VITE_APP_NAME=图灵绘境
VITE_APP_VERSION=1.0.0
EOF
    info "已生成前端 .env.production (API: $API_URL)"
}

# ══════════════════════════════════════════
#  7. 构建后端 JAR
# ══════════════════════════════════════════
build_backend() {
    step "构建 Spring Boot 后端"

    # 加载 .env
    if [[ -f "$PROJECT_DIR/.env" ]]; then
        set -a; source "$PROJECT_DIR/.env"; set +a
    fi

    cd "$BACKEND_DIR"

    # 检查 Maven
    if command -v mvn &>/dev/null; then
        info "使用系统 Maven 构建..."
        mvn clean package -DskipTests -q
    else
        # 使用 Maven Wrapper
        info "使用 Maven Wrapper 构建..."
        chmod +x mvnw
        ./mvnw clean package -DskipTests -q 2>/dev/null || {
            warn "Maven Wrapper 不完整，尝试安装 Maven..."
            if command -v apt-get &>/dev/null; then
                apt-get install -y -qq maven > /dev/null
            elif command -v yum &>/dev/null; then
                yum install -y -q maven
            fi
            mvn clean package -DskipTests -q
        }
    fi

    # 验证JAR
    local JAR_FILE=$(ls -t "$BACKEND_DIR"/target/*.jar 2>/dev/null | head -1)
    if [[ -z "$JAR_FILE" ]]; then
        error "构建失败: 未找到 JAR 文件"
    fi
    info "构建成功: $(basename $JAR_FILE) ($(du -h "$JAR_FILE" | cut -f1))"
}

# ══════════════════════════════════════════
#  8. 构建前端 H5
# ══════════════════════════════════════════
build_frontend() {
    step "构建前端 H5"

    cd "$FRONTEND_DIR"

    # 检查 Node.js
    if ! command -v node &>/dev/null; then
        info "安装 Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y -qq nodejs > /dev/null
    fi
    info "Node.js: $(node --version)"

    # 检查 pnpm
    if ! command -v pnpm &>/dev/null; then
        info "安装 pnpm..."
        npm install -g pnpm > /dev/null 2>&1
    fi

    # 安装依赖并构建
    info "安装前端依赖..."
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install

    info "构建前端 (H5)..."
    pnpm build:h5

    # 验证产物
    if [[ ! -d "$FRONTEND_DIR/dist/build/h5" ]]; then
        error "前端构建失败: 未找到 dist/build/h5 目录"
    fi

    local DIST_SIZE=$(du -sh "$FRONTEND_DIR/dist/build/h5" | cut -f1)
    info "前端构建成功 (大小: $DIST_SIZE)"
}

# ══════════════════════════════════════════
#  9. Docker Compose 部署
# ══════════════════════════════════════════
deploy_docker() {
    step "Docker Compose 部署"

    cd "$PROJECT_DIR"

    # 停止旧容器
    info "停止旧容器..."
    docker compose down --remove-orphans 2>/dev/null || true

    # 构建并启动
    info "构建 Docker 镜像..."
    docker compose build --no-cache backend

    info "启动服务..."
    docker compose up -d

    # 等待 MySQL 就绪
    info "等待 MySQL 就绪..."
    local RETRY=0
    while [[ $RETRY -lt 30 ]]; do
        if docker compose exec -T mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
            break
        fi
        RETRY=$((RETRY + 1))
        sleep 2
        echo -n "."
    done
    echo ""

    # 等待后端就绪
    info "等待后端就绪..."
    RETRY=0
    while [[ $RETRY -lt 30 ]]; do
        if curl -sf http://localhost:8080/actuator/health > /dev/null 2>&1; then
            break
        fi
        RETRY=$((RETRY + 1))
        sleep 3
        echo -n "."
    done
    echo ""

    info "Docker 服务状态:"
    docker compose ps
}

# ══════════════════════════════════════════
#  10. 非 Docker 部署 (systemd)
# ══════════════════════════════════════════
deploy_systemd() {
    step "Systemd 服务部署"

    # 加载 .env
    if [[ -f "$PROJECT_DIR/.env" ]]; then
        set -a; source "$PROJECT_DIR/.env"; set +a
    fi

    # 创建安装目录
    mkdir -p "$INSTALL_DIR"/{backend,frontend,uploads,logs}

    # 复制后端 JAR
    local JAR_FILE=$(ls -t "$BACKEND_DIR"/target/*.jar 2>/dev/null | head -1)
    cp "$JAR_FILE" "$INSTALL_DIR/backend/app.jar"
    info "后端 JAR 已复制到 $INSTALL_DIR/backend/"

    # 复制前端产物
    cp -r "$FRONTEND_DIR/dist/build/h5/"* "$INSTALL_DIR/frontend/"
    info "前端产物已复制到 $INSTALL_DIR/frontend/"

    # 创建 systemd 服务
    cat > /etc/systemd/system/turing-drawing.service << EOF
[Unit]
Description=图灵绘境 Spring Boot 后端
After=network.target mysql.service

[Service]
Type=simple
User=spring
Group=spring
WorkingDirectory=$INSTALL_DIR/backend
EnvironmentFile=$PROJECT_DIR/.env
ExecStart=/usr/bin/java -jar app.jar --spring.profiles.active=prod
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # 创建 spring 用户
    id -u spring &>/dev/null || useradd -r -s /bin/false spring
    chown -R spring:spring "$INSTALL_DIR"

    # 启动服务
    systemctl daemon-reload
    systemctl enable turing-drawing
    systemctl restart turing-drawing

    info "后端服务已启动 (systemd)"
    sleep 5
    systemctl status turing-drawing --no-pager -l
}

# ══════════════════════════════════════════
#  11. 配置 Nginx
# ══════════════════════════════════════════
setup_nginx() {
    step "配置 Nginx"

    if ! command -v nginx &>/dev/null; then
        info "安装 Nginx..."
        if command -v apt-get &>/dev/null; then
            apt-get install -y -qq nginx > /dev/null
        elif command -v yum &>/dev/null; then
            yum install -y -q nginx
        fi
    fi

    # 生成 Nginx 配置
    local NGINX_CONF="/etc/nginx/sites-available/turing-drawing"
    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

    cat > "$NGINX_CONF" << EOF
# 图灵绘境 Nginx 配置 - 自动生成
# 域名: $DOMAIN

server {
    listen 80;
    server_name $DOMAIN;

    # HTTP → HTTPS (取消注释以启用)
    # return 301 https://\$host\$request_uri;

    # 临时: 先用 HTTP 部署
    client_max_body_size 15m;

    # 前端静态资源
    location / {
        root $INSTALL_DIR/frontend;
        index index.html;
        try_files \$uri \$uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # 后端 API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # AI 接口超时
        proxy_connect_timeout 10s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:8080/actuator/health;
        proxy_http_version 1.1;
    }

    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }
}
EOF

    # 启用站点
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # 测试配置
    nginx -t && info "Nginx 配置测试通过" || error "Nginx 配置测试失败"

    # 重启 Nginx
    systemctl enable nginx
    systemctl reload nginx
    info "Nginx 已配置并重启"
}

# ══════════════════════════════════════════
#  12. 安装 SSL 证书 (Let's Encrypt)
# ══════════════════════════════════════════
setup_ssl() {
    step "安装 SSL 证书"

    if [[ -z "$DOMAIN" ]]; then
        warn "未配置域名，跳过 SSL"
        return 0
    fi

    # 安装 certbot
    if ! command -v certbot &>/dev/null; then
        info "安装 Certbot..."
        if command -v apt-get &>/dev/null; then
            apt-get install -y -qq certbot python3-certbot-nginx > /dev/null
        elif command -v yum &>/dev/null; then
            yum install -y -q certbot python3-certbot-nginx
        fi
    fi

    info "申请 SSL 证书..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect

    info "SSL 证书已安装，自动续期已配置"
    info "测试续期: certbot renew --dry-run"
}

# ══════════════════════════════════════════
#  13. 部署验证
# ══════════════════════════════════════════
verify_deployment() {
    step "部署验证"

    local API_BASE="http://localhost:8080"
    local FAIL=0

    # 检查后端健康
    info "检查后端健康..."
    if curl -sf "$API_BASE/actuator/health" | grep -q "UP"; then
        info "  后端: 健康"
    else
        warn "  后端: 未就绪 (可能还在启动中)"
        FAIL=1
    fi

    # 检查数据库连接
    info "检查数据库..."
    if curl -sf "$API_BASE/actuator/health" | grep -q "db"; then
        info "  数据库: 连接正常"
    else
        warn "  数据库: 未检测到"
        FAIL=1
    fi

    # 检查 Nginx
    info "检查 Nginx..."
    if systemctl is-active --quiet nginx; then
        info "  Nginx: 运行中"
    else
        warn "  Nginx: 未运行"
        FAIL=1
    fi

    # 检查前端
    if [[ -n "$DOMAIN" ]]; then
        info "检查前端访问..."
        if curl -sf "http://$DOMAIN" | grep -q "html"; then
            info "  前端: 可访问"
        else
            warn "  前端: 无法访问"
            FAIL=1
        fi
    fi

    echo ""
    if [[ $FAIL -eq 0 ]]; then
        info "所有检查通过!"
    else
        warn "部分检查未通过，请查看上方日志"
    fi
}

# ══════════════════════════════════════════
#  14. 输出部署信息
# ══════════════════════════════════════════
print_summary() {
    step "部署完成"

    echo ""
    info "部署信息:"
    echo "  域名:       ${DOMAIN:-未配置}"
    echo "  后端地址:   http://localhost:8080"
    echo "  健康检查:   http://localhost:8080/actuator/health"
    echo "  安装目录:   $INSTALL_DIR"
    echo "  配置文件:   $PROJECT_DIR/.env"
    echo ""
    echo "  常用命令:"
    echo "    查看后端日志:  docker compose logs -f backend"
    echo "    重启后端:      docker compose restart backend"
    echo "    停止所有服务:  docker compose down"
    echo "    查看状态:      docker compose ps"
    echo ""

    if [[ -n "$DOMAIN" ]]; then
        info "访问地址: https://$DOMAIN"
    fi
}

# ══════════════════════════════════════════
#  主流程
# ══════════════════════════════════════════
main() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}   图灵绘境 - 一键部署脚本 v1.0${NC}"
    echo -e "${CYAN}   Spring Boot + MySQL + Nginx${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo ""

    parse_args "$@"
    check_system

    # 选择部署方式
    echo ""
    echo "请选择部署方式:"
    echo "  1) Docker Compose (推荐，包含 MySQL)"
    echo "  2) 直接部署 (需要已有 MySQL，使用 systemd)"
    echo ""
    read -rp "请选择 [1/2]: " DEPLOY_MODE

    case $DEPLOY_MODE in
        1) DEPLOY_MODE="docker" ;;
        2) DEPLOY_MODE="systemd" ;;
        *) error "无效选择" ;;
    esac

    interactive_setup
    install_docker
    generate_env
    build_backend
    build_frontend

    if [[ "$DEPLOY_MODE" == "docker" ]]; then
        deploy_docker
    else
        install_java
        deploy_systemd
        setup_nginx
        read -rp "是否安装 SSL 证书? [y/N]: " INSTALL_SSL
        [[ "$INSTALL_SSL" == "y" || "$INSTALL_SSL" == "Y" ]] && setup_ssl
    fi

    verify_deployment
    print_summary
}

main "$@"