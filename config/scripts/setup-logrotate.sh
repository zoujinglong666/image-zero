#!/bin/bash

# 图灵绘境日志轮转配置脚本
# 用于设置系统日志轮转

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
LOGROTATE_CONF_DIR="/etc/logrotate.d"
APP_NAME="turing-drawing"
LOG_PATH="/opt/turing-drawing/logs"
ROTATE_DAYS=30
ROTATE_SIZE="10M"
COMPRESS=true

# 帮助信息
show_help() {
    cat << EOF
${BLUE}图灵绘境日志轮转配置脚本${NC}

用法: $0 [选项]

选项:
  -h, --help           显示帮助信息
  -p, --path PATH      日志文件路径 [默认: $LOG_PATH]
  -n, --name NAME      应用名称 [默认: $APP_NAME]
  -d, --days DAYS      保留天数 [默认: $ROTATE_DAYS]
  -s, --size SIZE      日志文件大小限制 [默认: $ROTATE_SIZE]
  -c, --no-compress    禁用压缩
  -f, --force          强制覆盖现有配置
  -q, --quiet          静默模式

示例:
  $0                  # 使用默认配置
  $0 -p /var/log/app -n myapp -d 7
  $0 -f -q            # 强制静默安装

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

# 检查系统权限
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要root权限运行"
        log_info "请使用sudo运行: sudo $0"
        exit 1
    fi
}

# 检查logrotate是否安装
check_logrotate() {
    if ! command -v logrotate &> /dev/null; then
        log_error "logrotate未安装"
        log_info "请安装logrotate: sudo apt install logrotate (Ubuntu/Debian) 或 sudo yum install logrotate (CentOS/RHEL)"
        exit 1
    fi
    
    if [[ ! -d "$LOGROTATE_CONF_DIR" ]]; then
        log_error "logrotate配置目录不存在: $LOGROTATE_CONF_DIR"
        exit 1
    fi
}

# 创建日志目录
create_log_directory() {
    if [[ ! -d "$LOG_PATH" ]]; then
        log_info "创建日志目录: $LOG_PATH"
        mkdir -p "$LOG_PATH"
    fi
    
    # 设置正确的权限
    chmod 755 "$LOG_PATH"
}

# 生成logrotate配置
generate_logrotate_config() {
    local config_file="$LOGROTATE_CONF_DIR/$APP_NAME"
    
    if [[ -f "$config_file" && "$FORCE_OVERWRITE" == false ]]; then
        log_warn "logrotate配置已存在: $config_file"
        read -p "是否覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "操作已取消"
            exit 0
        fi
    fi
    
    log_info "生成logrotate配置: $config_file"
    
    # 生成配置内容
    cat > "$config_file" << EOF
# 图灵绘境应用日志轮转配置
# 配置文件: $config_file
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')

# 主应用日志
$LOG_PATH/*.log {
    daily
    rotate $ROTATE_DAYS
    size $ROTATE_SIZE
    missingok
    notifempty
    compress
    delaycompress
    copytruncate
    dateext
    dateformat -%Y%m%d
    create 0644 spring spring
    postrotate
        # 发送USR1信号给应用进程，重新打开日志文件
        if [ -f /var/run/$APP_NAME.pid ]; then
            kill -USR1 \$(cat /var/run/$APP_NAME.pid) 2>/dev/null || true
        fi
    endscript
}

# Spring Boot应用日志
$LOG_PATH/spring.log {
    daily
    rotate $ROTATE_DAYS
    size $ROTATE_SIZE
    missingok
    notifempty
    compress
    delaycompress
    copytruncate
    dateext
    dateformat -%Y%m%d
    create 0644 spring spring
    postrotate
        if [ -f /var/run/$APP_NAME.pid ]; then
            kill -USR1 \$(cat /var/run/$APP_NAME.pid) 2>/dev/null || true
        fi
    endscript
}

# Nginx访问日志
/var/log/nginx/$APP_NAME-access.log {
    daily
    rotate $ROTATE_DAYS
    size $ROTATE_SIZE
    missingok
    notifempty
    compress
    delaycompress
    copytruncate
    dateext
    dateformat -%Y%m%d
    create 0644 www-data www-data
    postrotate
        # 重新加载Nginx配置
        systemctl reload nginx 2>/dev/null || true
    endscript
}

# Nginx错误日志
/var/log/nginx/$APP_NAME-error.log {
    daily
    rotate $ROTATE_DAYS
    size $ROTATE_SIZE
    missingok
    notifempty
    compress
    delaycompress
    copytruncate
    dateext
    dateformat -%Y%m%d
    create 0644 www-data www-data
    postrotate
        systemctl reload nginx 2>/dev/null || true
    endscript
}
EOF

    # 设置配置文件权限
    chmod 644 "$config_file"
    
    log_info "logrotate配置已生成"
}

# 测试logrotate配置
test_logrotate_config() {
    log_info "测试logrotate配置..."
    
    if logrotate -d "$LOGROTATE_CONF_DIR/$APP_NAME" 2>/dev/null; then
        log_info "logrotate配置测试通过"
    else
        log_warn "logrotate配置测试失败，请检查配置"
        return 1
    fi
}

# 创建systemd服务日志配置
create_systemd_journal_config() {
    local journal_conf="/etc/systemd/journald.conf.d/$APP_NAME.conf"
    
    mkdir -p "$(dirname "$journal_conf")"
    
    cat > "$journal_conf" << EOF
# 图灵绘境systemd日志配置
# 配置文件: $journal_conf
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')

[Journal]
# 限制日志大小
SystemMaxUse=1G
SystemMaxFileSize=100M
MaxFileSec=1day

# 日志轮转
MaxRetentionSec=30day
EOF

    log_info "systemd日志配置已创建: $journal_conf"
    
    # 重新加载systemd配置
    systemctl restart systemd-journald
    
    log_info "systemd日志服务已重启"
}

# 创建日志清理脚本
create_cleanup_script() {
    local cleanup_script="/usr/local/bin/cleanup-$APP_NAME-logs.sh"
    
    cat > "$cleanup_script" << EOF
#!/bin/bash

# 图灵绘境日志清理脚本
# 自动清理旧日志文件

set -e

LOG_DIR="$LOG_PATH"
RETENTION_DAYS=$ROTATE_DAYS
APP_NAME="$APP_NAME"

# 清理应用日志
find "\$LOG_DIR" -name "*.log.*" -type f -mtime +\$RETENTION_DAYS -delete 2>/dev/null || true

# 清理压缩的日志
find "\$LOG_DIR" -name "*.gz" -type f -mtime +\$RETENTION_DAYS -delete 2>/dev/null || true

# 清理Nginx日志
find "/var/log/nginx" -name "$APP_NAME-*" -type f -mtime +\$RETENTION_DAYS -delete 2>/dev/null || true

# 发送通知（可选）
# logger -t "$APP_NAME-cleanup" "日志清理完成，保留 \$RETENTION_DAYS 天内的日志"

exit 0
EOF

    chmod +x "$cleanup_script"
    
    log_info "日志清理脚本已创建: $cleanup_script"
    
    # 添加到crontab
    local cron_job="0 2 * * * $cleanup_script"
    
    # 检查是否已存在
    if ! crontab -l 2>/dev/null | grep -q "cleanup-$APP_NAME-logs"; then
        (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
        log_info "日志清理任务已添加到crontab"
    else
        log_info "日志清理任务已存在"
    fi
}

# 显示配置摘要
show_summary() {
    log_info "日志轮转配置摘要:"
    echo "  应用名称: $APP_NAME"
    echo "  日志路径: $LOG_PATH"
    echo "  保留天数: $ROTATE_DAYS"
    echo "  文件大小: $ROTATE_SIZE"
    echo "  压缩日志: $([[ "$COMPRESS" == true ]] && echo "启用" || echo "禁用")"
    echo "  配置文件: $LOGROTATE_CONF_DIR/$APP_NAME"
}

# 主函数
main() {
    log_info "开始配置日志轮转..."
    
    # 检查权限和依赖
    check_permissions
    check_logrotate
    
    # 创建日志目录
    create_log_directory
    
    # 生成配置
    generate_logrotate_config
    
    # 测试配置
    test_logrotate_config
    
    # 创建systemd配置
    create_systemd_journal_config
    
    # 创建清理脚本
    create_cleanup_script
    
    # 显示摘要
    show_summary
    
    log_info "日志轮转配置完成!"
    log_info "下次轮转时间可以通过以下命令查看:"
    log_info "  sudo logrotate -d $LOGROTATE_CONF_DIR/$APP_NAME"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -p|--path)
            LOG_PATH="$2"
            shift 2
            ;;
        -n|--name)
            APP_NAME="$2"
            shift 2
            ;;
        -d|--days)
            ROTATE_DAYS="$2"
            shift 2
            ;;
        -s|--size)
            ROTATE_SIZE="$2"
            shift 2
            ;;
        -c|--no-compress)
            COMPRESS=false
            shift
            ;;
        -f|--force)
            FORCE_OVERWRITE=true
            shift
            ;;
        -q|--quiet)
            QUIET=true
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