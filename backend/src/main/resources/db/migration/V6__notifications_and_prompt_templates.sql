-- ═══════════════════════════════════════════════════════════════
--  V6: 站内信通知表 + 提示词模板表
-- ═══════════════════════════════════════════════════════════════

-- 6.1 站内信通知表（替代内存 ConcurrentHashMap）
CREATE TABLE IF NOT EXISTS notifications (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '通知ID',
    user_id     BIGINT       NOT NULL COMMENT '接收用户ID',
    type        VARCHAR(30)  NOT NULL DEFAULT 'system' COMMENT '通知类型: system/ai_result/challenge/vip/social',
    title       VARCHAR(200) NOT NULL COMMENT '通知标题',
    content     TEXT         COMMENT '通知内容',
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE COMMENT '是否已读',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_user_read (user_id, is_read),
    INDEX idx_notifications_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='站内信通知表';

-- 6.2 提示词模板表（从 awesome-gpt-image-2 导入）
CREATE TABLE IF NOT EXISTS prompt_templates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL COMMENT '提示词标题',
    description TEXT COMMENT '描述',
    prompt_text LONGTEXT NOT NULL COMMENT '提示词内容',
    prompt_type VARCHAR(50) DEFAULT 'gpt-image-2' COMMENT '提示词类型',
    category VARCHAR(100) COMMENT '分类（如：photography, anime, portrait等）',
    style VARCHAR(100) COMMENT '风格',
    subject VARCHAR(100) COMMENT '主体',
    language VARCHAR(20) DEFAULT 'en' COMMENT '语言',
    author VARCHAR(255) COMMENT '作者',
    source_url VARCHAR(1000) COMMENT '来源URL',
    image_url VARCHAR(1000) COMMENT '示例图片URL',
    featured_image_url VARCHAR(1000) COMMENT '特色图片URL',
    tags VARCHAR(500) COMMENT '标签，逗号分隔',
    is_featured BOOLEAN DEFAULT FALSE COMMENT '是否精选',
    use_count INT DEFAULT 0 COMMENT '使用次数',
    like_count INT DEFAULT 0 COMMENT '点赞数',
    view_count INT DEFAULT 0 COMMENT '浏览次数',
    published_date DATE COMMENT '发布日期',
    raw_content LONGTEXT COMMENT '原始内容（JSON格式）',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_category (category),
    INDEX idx_style (style),
    INDEX idx_subject (subject),
    INDEX idx_featured (is_featured),
    INDEX idx_language (language),
    INDEX idx_prompt_type (prompt_type),
    FULLTEXT idx_title_description (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci
  COMMENT='提示词模板表（从 awesome-gpt-image-2 导入）';
