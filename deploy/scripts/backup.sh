#!/bin/bash

# 图灵绘境备份脚本
# 自动备份数据库和文件

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
BACKUP_DIR="/var/backups/turing-drawing"
APP_NAME="turing-drawing"
DB_NAME="turing_drawing"
DB_USER="root"
DB_HOST="localhost"
DB_PORT="3306"
KEEP_BACKUPS=7
COMPRESS=true
QUIET=false

# 帮助信息
show_help() {
    cat << EOF
${BLUE}图灵绘境备份脚本${NC}

用法: $0 [选项]

选项:
  -h, --help           显示帮助信息
  -d, --dir DIR        备份目录 [默认: $BACKUP_DIR]
  -n, --name NAME      应用名称 [默认: $APP_NAME]
  -k, --keep DAYS      保留备份天数 [默认: $KEEP_BACKUPS]
  -c, --no-compress    禁用压缩
  -q, --quiet          静默模式
  -f, --force          强制备份，不提示确认

示例:
  $0                  # 使用默认配置备份
  $0 -d /backup -k 30 # 备份到指定目录，保留30天
  $0 -c -q            # 不压缩，静默备份

备份内容:
  - 数据库完整备份
  - 上传文件
  - 配置文件
  - 日志文件（可选）

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

# 检查依赖
check_dependencies() {
    local deps=("mysql" "tar" "gzip")
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

# 创建备份目录
create_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_info "创建备份目录: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
    
    # 设置权限
    chmod 750 "$BACKUP_DIR"
}

# 获取数据库配置
get_db_config() {
    local env_file="$PROJECT_ROOT/.env"
    
    if [[ -f "$env_file" ]]; then
        # 从环境文件读取配置
        source "$env_file"
        DB_NAME="${DB_NAME:-turing_drawing}"
        DB_USER="${DB_USERNAME:-root}"
        DB_HOST="${DB_HOST:-localhost}"
        DB_PORT="${DB_PORT:-3306}"
        DB_PASS="${DB_PASSWORD:-}"
    else
        log_warn "环境文件不存在: $env_file"
        read -p "请输入数据库密码: " -s DB_PASS
        echo
    fi
}

# 备份数据库
backup_database() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local db_backup_file="$BACKUP_DIR/${APP_NAME}_db_${timestamp}.sql"
    
    log_info "备份数据库..."
    
    # 构建mysqldump命令
    local mysqldump_cmd="mysqldump"
    mysqldump_cmd="$mysqldump_cmd -h $DB_HOST -P $DB_PORT -u $DB_USER"
    
    if [[ -n "$DB_PASS" ]]; then
        mysqldump_cmd="$mysqldump_cmd -p$DB_PASS"
    fi
    
    mysqldump_cmd="$mysqldump_cmd --single-transaction --routines --triggers --hex-blob"
    mysqldump_cmd="$mysqldump_cmd $DB_NAME"
    
    # 执行备份
    if eval "$mysqldump_cmd" > "$db_backup_file"; then
        log_info "数据库备份成功: $db_backup_file"
        
        # 压缩备份文件
        if [[ "$COMPRESS" == true ]]; then
            gzip "$db_backup_file"
            db_backup_file="${db_backup_file}.gz"
            log_info "数据库备份已压缩: $db_backup_file"
        fi
        
        echo "$db_backup_file"
    else
        log_error "数据库备份失败"
        rm -f "$db_backup_file"
        exit 1
    fi
}

# 备份上传文件
backup_uploads() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local uploads_backup_file="$BACKUP_DIR/${APP_NAME}_uploads_${timestamp}.tar"
    
    log_info "备份上传文件..."
    
    # 查找上传目录
    local upload_dirs=()
    
    # Docker环境的上传目录
    if [[ -d "$PROJECT_ROOT/uploads" ]]; then
        upload_dirs+=("$PROJECT_ROOT/uploads")
    fi
    
    # 原生部署的上传目录
    if [[ -d "/opt/$APP_NAME/uploads" ]]; then
        upload_dirs+=("/opt/$APP_NAME/uploads")
    fi
    
    if [[ ${#upload_dirs[@]} -eq 0 ]]; then
        log_warn "未找到上传目录"
        return 0
    fi
    
    # 创建备份
    local tar_cmd="tar -cf $uploads_backup_file"
    for dir in "${upload_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            tar_cmd="$tar_cmd -C $(dirname "$dir") $(basename "$dir")"
        fi
    done
    
    if eval "$tar_cmd"; then
        log_info "上传文件备份成功: $uploads_backup_file"
        
        # 压缩备份文件
        if [[ "$COMPRESS" == true ]]; then
            gzip "$uploads_backup_file"
            uploads_backup_file="${uploads_backup_file}.gz"
            log_info "上传文件备份已压缩: $uploads_backup_file"
        fi
        
        echo "$uploads_backup_file"
    else
        log_error "上传文件备份失败"
        rm -f "$uploads_backup_file"
        exit 1
    fi
}

# 备份配置文件
backup_configs() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local config_backup_file="$BACKUP_DIR/${APP_NAME}_config_${timestamp}.tar"
    
    log_info "备份配置文件..."
    
    # 配置文件目录
    local config_dirs=()
    
    # 项目配置
    if [[ -d "$PROJECT_ROOT/config" ]]; then
        config_dirs+=("$PROJECT_ROOT/config")
    fi
    
    # 环境配置
    if [[ -d "$PROJECT_ROOT/.env" ]]; then
        config_dirs+=("$PROJECT_ROOT/.env")
    fi
    
    # Docker配置
    if [[ -f "$PROJECT_ROOT/docker-compose.yml" ]]; then
        config_dirs+=("$PROJECT_ROOT/docker-compose.yml")
    fi
    
    # Nginx配置
    if [[ -d "/etc/nginx/sites-available" ]]; then
        config_dirs+=("/etc/nginx/sites-available")
    fi
    
    if [[ ${#config_dirs[@]} -eq 0 ]]; then
        log_warn "未找到配置文件"
        return 0
    fi
    
    # 创建备份
    local tar_cmd="tar -cf $config_backup_file"
    for item in "${config_dirs[@]}"; do
        if [[ -e "$item" ]]; then
            tar_cmd="$tar_cmd -C $(dirname "$item") $(basename "$item")"
        fi
    done
    
    if eval "$tar_cmd"; then
        log_info "配置文件备份成功: $config_backup_file"
        
        # 压缩备份文件
        if [[ "$COMPRESS" == true ]]; then
            gzip "$config_backup_file"
            config_backup_file="${config_backup_file}.gz"
            log_info "配置文件备份已压缩: $config_backup_file"
        fi
        
        echo "$config_backup_file"
    else
        log_error "配置文件备份失败"
        rm -f "$config_backup_file"
        exit 1
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log_info "清理旧备份文件..."
    
    local find_cmd="find $BACKUP_DIR -name '${APP_NAME}_*' -type f -mtime +$KEEP_BACKUPS"
    
    if [[ "$COMPRESS" == true ]]; then
        find_cmd="$find_cmd -o -name '${APP_NAME}_*.gz' -type f -mtime +$KEEP_BACKUPS"
    fi
    
    local old_files=$(eval "$find_cmd")
    
    if [[ -n "$old_files" ]]; then
        echo "$old_files" | xargs rm -f
        log_info "已清理旧备份文件"
    else
        log_info "未发现需要清理的旧备份"
    fi
}

# 创建备份清单
create_backup_manifest() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local manifest_file="$BACKUP_DIR/${APP_NAME}_manifest_${timestamp}.txt"
    
    log_info "创建备份清单..."
    
    {
        echo "# 图灵绘境备份清单"
        echo "# 备份时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "# 应用名称: $APP_NAME"
        echo "# 备份目录: $BACKUP_DIR"
        echo ""
        echo "备份文件列表:"
        
        # 列出备份目录中的文件
        ls -la "$BACKUP_DIR" | grep "$APP_NAME"
        
        echo ""
        echo "磁盘使用情况:"
        df -h "$BACKUP_DIR"
        
        echo ""
        echo "备份大小统计:"
        du -sh "$BACKUP_DIR"/* | grep "$APP_NAME" || true
        
    } > "$manifest_file"
    
    log_info "备份清单已创建: $manifest_file"
}

# 验证备份
verify_backup() {
    local backup_files=("$@")
    
    log_info "验证备份文件..."
    
    for file in "${backup_files[@]}"; do
        if [[ -f "$file" ]]; then
            local size=$(du -h "$file" | cut -f1)
            log_info "备份文件验证通过: $file ($size)"
        else
            log_error "备份文件验证失败: $file"
            return 1
        fi
    done
    
    return 0
}

# 发送通知
send_notification() {
    local backup_files=("$@")
    
    # 计算总大小
    local total_size=0
    for file in "${backup_files[@]}"; do
        if [[ -f "$file" ]]; then
            total_size=$((total_size + $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")))
        fi
    done
    
    # 格式化大小
    local size_str
    if [[ $total_size -gt 1073741824 ]]; then
        size_str=$(printf "%.2f GB" "$(echo "$total_size/1073741824" | bc -l)")
    elif [[ $total_size -gt 1048576 ]]; then
        size_str=$(printf "%.2f MB" "$(echo "$total_size/1048576" | bc -l)")
    else
        size_str=$(printf "%.2f KB" "$(echo "$total_size/1024" | bc -l)")
    fi
    
    # 记录日志
    logger -t "$APP_NAME-backup" "备份完成: ${#backup_files[@]} 个文件, 总大小: $size_str"
    
    # 如果配置了邮件通知，可以在这里发送
    # mail -s "备份完成通知" admin@your-domain.com <<< "备份已完成，共 ${#backup_files[@]} 个文件，总大小: $size_str"
}

# 主函数
main() {
    log_info "开始备份图灵绘境应用..."
    
    # 检查依赖
    check_dependencies
    
    # 获取数据库配置
    get_db_config
    
    # 创建备份目录
    create_backup_dir
    
    # 确认备份
    if [[ "$FORCE_BACKUP" == false ]]; then
        log_info "即将执行备份操作:"
        echo "  备份目录: $BACKUP_DIR"
        echo "  保留天数: $KEEP_BACKUPS"
        echo "  压缩: $([[ "$COMPRESS" == true ]] && echo "启用" || echo "禁用")"
        echo ""
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "备份操作已取消"
            exit 0
        fi
    fi
    
    # 执行备份
    local backup_files=()
    
    # 备份数据库
    backup_files+=("$(backup_database)")
    
    # 备份上传文件
    backup_files+=("$(backup_uploads)")
    
    # 备份配置文件
    backup_files+=("$(backup_configs)")
    
    # 验证备份
    if verify_backup "${backup_files[@]}"; then
        log_info "所有备份验证通过"
    else
        log_error "备份验证失败"
        exit 1
    fi
    
    # 清理旧备份
    cleanup_old_backups
    
    # 创建备份清单
    create_backup_manifest
    
    # 发送通知
    send_notification "${backup_files[@]}"
    
    log_info "备份完成!"
    log_info "备份文件保存在: $BACKUP_DIR"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -n|--name)
            APP_NAME="$2"
            shift 2
            ;;
        -k|--keep)
            KEEP_BACKUPS="$2"
            shift 2
            ;;
        -c|--no-compress)
            COMPRESS=false
            shift
            ;;
        -f|--force)
            FORCE_BACKUP=true
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