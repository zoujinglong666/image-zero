-- ═══════════════════════════════════════════════════════════════
--  V22: 社区内容审核系统 — AI审核 + 人工审核双层风控
-- ═══════════════════════════════════════════════════════════════

-- ━━━ user_prompts 表增加审核字段 ━━━
SET @tbl = 'user_prompts';

SET @col = 'review_status';
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql = IF(@col_exists = 0, CONCAT('ALTER TABLE ', @tbl, ' ADD COLUMN review_status VARCHAR(20) NOT NULL DEFAULT ''pending'' COMMENT ''审核状态'' AFTER status'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 'moderation_result';
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql = IF(@col_exists = 0, CONCAT('ALTER TABLE ', @tbl, ' ADD COLUMN moderation_result TEXT DEFAULT NULL COMMENT ''AI审核结果JSON'''), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 'reviewed_at';
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql = IF(@col_exists = 0, CONCAT('ALTER TABLE ', @tbl, ' ADD COLUMN reviewed_at DATETIME DEFAULT NULL COMMENT ''人工审核时间'''), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 'reviewed_by';
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql = IF(@col_exists = 0, CONCAT('ALTER TABLE ', @tbl, ' ADD COLUMN reviewed_by BIGINT DEFAULT NULL COMMENT ''人工审核员ID'''), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ━━━ challenge_submissions 表增加审核字段 ━━━
SET @tbl = 'challenge_submissions';

SET @col = 'review_status';
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql = IF(@col_exists = 0, CONCAT('ALTER TABLE ', @tbl, ' ADD COLUMN review_status VARCHAR(20) NOT NULL DEFAULT ''pending'' COMMENT ''审核状态'' AFTER image_url'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 'moderation_result';
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql = IF(@col_exists = 0, CONCAT('ALTER TABLE ', @tbl, ' ADD COLUMN moderation_result TEXT DEFAULT NULL COMMENT ''AI审核结果JSON'''), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 'reject_reason';
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql = IF(@col_exists = 0, CONCAT('ALTER TABLE ', @tbl, ' ADD COLUMN reject_reason VARCHAR(500) DEFAULT NULL COMMENT ''拒绝原因'''), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 'reviewed_at';
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql = IF(@col_exists = 0, CONCAT('ALTER TABLE ', @tbl, ' ADD COLUMN reviewed_at DATETIME DEFAULT NULL COMMENT ''审核时间'''), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 'reviewed_by';
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = @col;
SET @sql = IF(@col_exists = 0, CONCAT('ALTER TABLE ', @tbl, ' ADD COLUMN reviewed_by BIGINT DEFAULT NULL COMMENT ''审核员ID'''), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ━━━ 内容审核日志表（审计追踪）━━━
CREATE TABLE IF NOT EXISTS content_moderation_log (
    id              BIGINT       AUTO_INCREMENT PRIMARY KEY,
    target_type     VARCHAR(30)  NOT NULL                         COMMENT '审核目标类型: user_prompt/challenge_submission',
    target_id       BIGINT       NOT NULL                         COMMENT '目标记录ID',
    moderator_type  VARCHAR(20)  NOT NULL                         COMMENT '审核方式: ai/manual',
    verdict         VARCHAR(20)  NOT NULL                         COMMENT '判定: pass/warn/reject',
    categories      VARCHAR(500) DEFAULT ''                       COMMENT '命中分类: nsfw/violence/spam/copyright等，逗号分隔',
    confidence      DECIMAL(3,2) DEFAULT 0.00                     COMMENT 'AI置信度 0.00-1.00',
    reason          TEXT                                          COMMENT '审核原因/备注',
    raw_response    TEXT                                          COMMENT 'AI原始响应(调试用)',
    reviewer_id     BIGINT       DEFAULT NULL                     COMMENT '人工审核员ID(人工审核时)',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_mod_target    (target_type, target_id),
    INDEX idx_mod_verdict   (verdict),
    INDEX idx_mod_created   (created_at),
    INDEX idx_mod_reviewer  (reviewer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容审核日志表';

-- ━━━ 敏感词库表（支持分级）━━━
CREATE TABLE IF NOT EXISTS sensitive_words (
    id            BIGINT       AUTO_INCREMENT PRIMARY KEY,
    word          VARCHAR(100) NOT NULL                           COMMENT '敏感词',
    category      VARCHAR(30)  NOT NULL                          COMMENT '分类: nsfw/violence/politics/spam/copyright',
    level         TINYINT(1)   NOT NULL DEFAULT 1                COMMENT '级别: 1=警告 2=拦截 3=严重',
    is_regex      TINYINT(1)   NOT NULL DEFAULT 0                COMMENT '是否正则表达式',
    is_active     TINYINT(1)   NOT NULL DEFAULT 1                COMMENT '是否启用',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_sensitive_word (word),
    INDEX idx_sw_category (category),
    INDEX idx_sw_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感词库表';

-- ━━━ 插入基础敏感词种子数据（IGNORE 避免重复）━━━
INSERT IGNORE INTO sensitive_words (word, category, level, is_regex) VALUES
('色情', 'nsfw', 2, 0), ('裸体', 'nsfw', 2, 0), ('淫秽', 'nsfw', 2, 0),
('黄片', 'nsfw', 3, 0), ('做爱', 'nsfw', 2, 0), ('性交', 'nsfw', 2, 0),
('暴力', 'violence', 2, 0), ('杀人', 'violence', 2, 0), ('血腥', 'violence', 1, 0),
('恐怖', 'violence', 1, 0), ('自残', 'violence', 2, 0), ('自杀', 'violence', 2, 0),
('代开发票', 'spam', 3, 0), ('加微信', 'spam', 1, 0), ('QQ群', 'spam', 1, 0),
('刷单', 'spam', 2, 0), ('博彩', 'spam', 3, 0), ('赌博', 'spam', 3, 0),
('违禁品', 'copyright', 2, 0), ('盗版', 'copyright', 1, 0), ('破解版', 'copyright', 1, 0);

-- ━━━ 将现有已发布内容标记为已通过审核（不影响线上数据）━━━
UPDATE user_prompts SET review_status = 'ai_pass' WHERE is_public = 1 AND status = 'published';
UPDATE challenge_submissions SET review_status = 'approved' WHERE review_status IS NULL OR review_status = '';
