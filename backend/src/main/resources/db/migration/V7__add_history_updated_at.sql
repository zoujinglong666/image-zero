-- ══════════════════════════════════════════
--  V7: 修复 history 表缺少 updated_at 字段
--  BaseEntity 包含 updatedAt，但建表时遗漏了
-- ══════════════════════════════════════════

ALTER TABLE history ADD COLUMN updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
