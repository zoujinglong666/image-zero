#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════
#  画风提取器 - 一键部署脚本
#  使用方式:
#    chmod +x deploy.sh
#    ./deploy.sh              # Docker 模式（默认）
#    ./deploy.sh --native      # 原生 systemd 模式
#    ./deploy.sh --down        # 停止服务
#    ./deploy.sh --logs        # 看日志
#    ./deploy.sh --status      # 查状态
#    ./deploy.sh --skip-build  # 跳过构建直接重启
# ══════════════════════════════════════════════════════════

set -euo pipefail

# ━━━ 颜色 ━━━
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*" >&2; }
die()   { error "$1"; exit 1; }

# ━━━ 路径 ━━━
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
ENV_FILE="$BACKEND_DIR/.env.production"

# ━━━ 参数 ━━━
MODE="docker"
ACTION="deploy"
SKIP_BUILD=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --native)    MODE="native"; shift ;;
    --docker)    MODE="docker"; shift ;;
    --down)      ACTION="down"; shift ;;
    --logs)      ACTION="logs"; shift ;;
    --status)    ACTION="status"; shift ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    -h|--help)
      echo "画风提取器一键部署"
      echo "用法: $0 [--docker|--native] [--down|--logs|--status|--skip-build]"
      exit 0 ;;
    *) die "未知参数: $1" ;;
  esac
done

# ═══════════════════════════════════════════════════
#  1. 预检查
# ═══════════════════════════════════════════════════
preflight() {
  echo -e "\n${CYAN}━━━ ① 预检查 ━━━${NC}\n"

  if [[ "$MODE" == "docker" ]]; then
    command -v docker &>/dev/null || die "未找到 docker"
    docker compose version &>/dev/null || die "需要 docker compose v2"
    info "Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
  else
    command -v java &>/dev/null || die "未找到 java (需 JDK 21+)"
    command -v mvn  &>/dev/null || die "未找到 mvn"
    info "Java: $(java -version 2>&1 | head -1)"
  fi

  [[ -f "$ENV_FILE" ]] || die "缺失: $ENV_FILE\n  请: cp backend/.env.example backend/.env.production 并填写密钥"

  # 检查关键变量是否还是占位符
  for var in DB_PASSWORD JWT_SECRET COS_SECRET_ID COS_SECRET_KEY; do
    local val
    val=$(grep "^$var=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- || true)
    if [[ -z "$val" || "$val" == your_* || "$val" == change-me* ]]; then
      warn "⚠️  $var 未配置 ($ENV_FILE)"
    fi
  done

  info "预检查通过 ✅"
}

# ═══════════════════════════════════════════════════
#  2. 构建
# ═══════════════════════════════════════════════════
build() {
  [[ "$SKIP_BUILD" == "1" ]] && { info "跳过构建 (--skip-build)"; return; }

  echo -e "\n${CYAN}━━─ ② 构建后端 (Spring Boot) ━──${NC}\n"
  cd "$BACKEND_DIR"
  mvn clean package -DskipTests -q
  info "JAR: $(ls target/*.jar 2>/dev/null | grep -v -E '(sources|javadoc)' | xargs basename 2>/dev/null || echo 'OK')"

  echo -e "\n${CYAN}━━─ ③ 构建前端 (uni-app H5) ━──${NC}\n"
  cd "$FRONTEND_DIR"
  if [[ -f "pnpm-lock.yaml" ]]; then
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    pnpm build:h5
  elif [[ -f "package.json" ]]; then
    npm ci 2>/dev/null || npm install
    npm run build:h5 2>/dev/null || npx uni build -p h5
  else
    warn "未找到 package.json，跳过前端构建"
  fi
  info "H5 产物: dist/build/h5/"
}

# ═══════════════════════════════════════════════════
#  3. Docker 部署
# ═══════════════════════════════════════════════════
deploy_docker() {
  echo -e "\n${CYAN}━━━ ④ Docker 部署 ━━━${NC}\n"
  cd "$PROJECT_ROOT"

  info "停止旧容器..."
  docker compose down --remove-orphans 2>/dev/null || true

  info "构建镜像 & 启动服务..."
  docker compose up -d --build

  # 等 MySQL
  info "等待 MySQL 就绪..."
  local db_pass
  db_pass=$(grep '^DB_PASSWORD=' "$ENV_FILE" | cut -d'=' -f2-)
  for i in $(seq 1 30); do
    if docker exec turing-mysql mysqladmin ping -u root -p"${db_pass:-turing123}" -h localhost &>/dev/null 2>&1; then
      info "MySQL ✓"; break
    fi
    sleep 2
  done

  # 等后端
  info "等待后端就绪..."
  for i in $(seq 1 20); do
    if curl -sf http://localhost:8080/api/health &>/dev/null; then
      info "后端 API ✓"; break
    fi
    sleep 3
  done

  echo ""
  docker compose ps
  echo ""
  info "🚀 Docker 部署完成！"
  echo -e "   API:     ${CYAN}http://localhost:8080/api/health${NC}"
  echo -e "   H5:     ${CYAN}http://localhost${NC}"
  echo -e "   日志:   ${CYAN}$0 --logs${NC}"
  echo -e "   停止:   ${CYAN}$0 --down${NC}"
}

# ═══════════════════════════════════════════════════
#  4. 原生部署 (systemd)
# ═══════════════════════════════════════════════════
DEPLOY_PATH="/opt/turing-drawing"
SERVICE_NAME="turing-drawing"

deploy_native() {
  echo -e "\n${CYAN}━━━ ④ 原生模式部署 ━━━${NC}\n"

  # spring 用户
  id spring &>/dev/null || sudo useradd -r -s /bin/false spring 2>/dev/null || true

  sudo mkdir -p "$DEPLOY_PATH"/{backend,frontend,logs,uploads,config}

  # JAR
  local jar
  jar=$(ls "$BACKEND_DIR/target/"*.jar 2>/dev/null | grep -v -E '(sources|javadoc)' | head -1)
  [[ -z "$jar" ]] && die "未找到 JAR，请先: cd backend && mvn package -DskipTests"
  sudo cp "$jar" "$DEPLOY_PATH/backend/app.jar"
  info "JAR → app.jar"

  # 前端
  if [[ -d "$FRONTEND_DIR/dist/build/h5" ]]; then
    sudo rm -rf "$DEPLOY_PATH/frontend/"*
    sudo cp -r "$FRONTEND_DIR/dist/build/h5/." "$DEPLOY_PATH/frontend/"
    info "H5 → frontend/"
  fi

  # .env
  sudo cp "$ENV_FILE" "$DEPLOY_PATH/config/.env"
  sudo chmod 600 "$DEPLOY_PATH/config/.env"
  info ".env → config/"

  sudo chown -R spring:spring "$DEPLOY_PATH"

  # systemd
  install_systemd

  sudo systemctl daemon-reload
  sudo systemctl enable "$SERVICE_NAME"
  sudo systemctl restart "$SERVICE_NAME"

  health_native

  info "🚀 原生部署完成！"
  echo -e "   管理:   ${CYAN}sudo systemctl status turing-drawing${NC}"
  echo -e "   日志:   ${CYAN}sudo journalctl -u turing-drawing -f${NC}"
}

install_systemd() {
  sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null <<EOF
[Unit]
Description=画风提取器后端
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=spring
Group=spring
WorkingDirectory=$DEPLOY_PATH/backend
EnvironmentFile=$DEPLOY_PATH/config/.env
ExecStart=/usr/bin/java -Xms256m -Xmx768m \
  -XX:+UseG1GC -XX:MaxGCPauseMillis=100 \
  -Djava.security.egd=file:/dev/./urandom \
  -jar app.jar --spring.profiles.active=prod
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=turing-drawing
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DEPLOY_PATH
LimitNOFILE=65536
MemoryMax=1.5G
TimeoutStartSec=120

[Install]
WantedBy=multi-user.target
EOF
  info "systemd 服务已安装"
}

health_native() {
  info "健康检查..."
  for i in $(seq 1 20); do
    if curl -sf http://localhost:8080/api/health &>/dev/null; then
      info "✅ 后端运行正常"; return 0
    fi
    sleep 3
  done
  error "❌ 启动超时! 查看: sudo journalctl -u turing-drawing -n 50"
}

# ═══════════════════════════════════════════════════
#  辅助命令
# ═══════════════════════════════════════════════════
do_down() {
  echo "${CYAN}停止服务...${NC}"
  if [[ "$MODE" == "docker" ]]; then
    cd "$PROJECT_ROOT" && docker compose down
  else
    sudo systemctl stop "$SERVICE_NAME" 2>/dev/null; info "已停止"
  fi
}
do_logs() {
  [[ "$MODE" == "docker" ]] && cd "$PROJECT_ROOT" && exec docker compose logs -f --tail=80 backend
  exec sudo journalctl -u "$SERVICE_NAME" -f -n 80
}
do_status() {
  [[ "$MODE" == "docker" ]] && cd "$PROJECT_ROOT" && docker compose ps
  systemctl status "$SERVICE_NAME" --no-pager 2>/dev/null || true
  curl -sf http://localhost:8080/api/health && info "API 健康 ✓" || warn "API 无响应"
}

# ═══════════════════════════════════════════════════
#  主入口
# ═══════════════════════════════════════════════════
main() {
  echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  🎨 画风提取器 一键部署             ║${NC}"
  echo -e "${BLUE}║  模式: $MODE  │  操作: $ACTION        ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"

  case "$ACTION" in
    down)   do_down;   exit 0 ;;
    logs)   do_logs;   exit 0 ;;  # exec 不返回
    status) do_status; exit 0 ;;
  esac

  preflight
  build

  case "$MODE" in
    docker) deploy_docker ;;
    native) deploy_native ;;
  esac
}

main "$@"
