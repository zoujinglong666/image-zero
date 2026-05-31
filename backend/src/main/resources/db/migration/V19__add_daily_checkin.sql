-- ══════════════════════════════════════════
-- V19: 每日签到系统
-- 召回用户的核心手段
-- ══════════════════════════════════════════

CREATE TABLE daily_checkins (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    checkin_date DATE NOT NULL COMMENT '签到日期',
    streak_days INT NOT NULL DEFAULT 1 COMMENT '连续签到天数',
    reward_times INT NOT NULL DEFAULT 1 COMMENT '奖励次数',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_date (user_id, checkin_date),
    KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日签到表';
