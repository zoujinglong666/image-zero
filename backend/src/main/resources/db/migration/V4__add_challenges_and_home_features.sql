-- ═══════════════════════════════════════════════════════════════
--  V4: 新增主题挑战表 + 历史记录公开分享字段 + 首页数据支撑
-- ═══════════════════════════════════════════════════════════════

-- 1. 主题挑战表
CREATE TABLE IF NOT EXISTS challenges (
    id              BIGINT       AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(200) NOT NULL                        COMMENT '挑战标题，如"赛博朋克城市"',
    description     TEXT         DEFAULT ''                       COMMENT '挑战描述/规则',
    cover_image     VARCHAR(500) DEFAULT ''                       COMMENT '挑战封面图URL',
    theme_tags      VARCHAR(500) DEFAULT ''                       COMMENT '主题标签，逗号分隔',
    prompt_hint     TEXT         DEFAULT ''                       COMMENT '推荐的提示词模板',
    start_at        DATETIME     NOT NULL                         COMMENT '开始时间',
    end_at          DATETIME     NOT NULL                         COMMENT '结束时间',
    status          VARCHAR(20)  NOT NULL DEFAULT 'upcoming'      COMMENT '状态: upcoming/active/completed',
    sort_order      INT          NOT NULL DEFAULT 0               COMMENT '排序权重',
    participant_count INT        NOT NULL DEFAULT 0               COMMENT '参与人数(缓存)',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_challenges_status    (status),
    INDEX idx_challenges_start_at  (start_at),
    INDEX idx_challenges_end_at    (end_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主题挑战表';

-- 2. 挑战参与/投稿表
CREATE TABLE IF NOT EXISTS challenge_submissions (
    id              BIGINT       AUTO_INCREMENT PRIMARY KEY,
    challenge_id    BIGINT       NOT NULL,
    user_id         BIGINT       NOT NULL,
    title           VARCHAR(200) DEFAULT ''                       COMMENT '作品标题',
    prompt_text     TEXT         DEFAULT ''                       COMMENT '使用的提示词',
    image_url       VARCHAR(500) DEFAULT ''                       COMMENT '作品图片URL',
    like_count      INT          NOT NULL DEFAULT 0,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_challenge_user (challenge_id, user_id),
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sub_challenge  (challenge_id),
    INDEX idx_sub_user       (user_id),
    INDEX idx_sub_likes      (like_count DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='挑战投稿表';

-- 3. history 表增加 is_public 和 like_count 字段（支持社区作品展示）
-- is_public 字段已在V1中添加，检查是否需要补充 like_count
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'history' AND COLUMN_NAME = 'like_count';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE history ADD COLUMN like_count INT NOT NULL DEFAULT 0 COMMENT ''点赞数'' AFTER favorite',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. 插入初始挑战种子数据
INSERT INTO challenges (title, description, theme_tags, prompt_hint, start_at, end_at, status, sort_order) VALUES
('赛博朋克城市', '用AI描绘你心中的未来都市——霓虹灯、摩天楼、赛博义体...', '赛博朋克,城市,未来,霓虹', 'cyberpunk city, neon lights, futuristic architecture, rain-soaked streets, holographic signs, --ar 16:9', '2025-01-01 00:00:00', '2026-12-31 23:59:59', 'active', 1),
('水墨山水', '以传统水墨风格描绘东方山水意境', '水墨,山水,中国风,传统', 'Chinese ink wash painting, misty mountains, flowing river, traditional landscape, --ar 16:9', '2025-01-08 00:00:00', '2026-12-31 23:59:59', 'active', 2),
('奇幻生物', '创造前所未见的奇幻生物——融合多种动物特征', '奇幻,生物,想象,创作', 'fantasy creature, hybrid animal, magical beast, detailed illustration, --ar 1:1', '2025-01-15 00:00:00', '2026-12-31 23:59:59', 'active', 3),
('微观世界', '探索肉眼看不见的微观世界之美', '微观,科学,细节,摄影', 'macro photography, microscopic world, crystalline structures, vibrant colors, --ar 1:1', '2025-01-22 00:00:00', '2026-12-31 23:59:59', 'active', 4);