-- ════════════════════════════════════════
-- V20: daily_checkins 补 updated_at 列
-- ════════════════════════════════════════

ALTER TABLE daily_checkins
    ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间';
