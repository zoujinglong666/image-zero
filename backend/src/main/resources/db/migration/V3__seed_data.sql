-- ═══════════════════════════════════════════════════════════════
--  图灵绘境 - 种子数据
--  V2__seed_data.sql
-- ═══════════════════════════════════════════════════════════════

-- 默认提示词分类（与Node.js版本保持一致）
INSERT INTO prompt_categories (name, name_en, icon, sort_order) VALUES
('人像摄影', 'Portrait',     '👤', 1),
('海报设计', 'Poster',       '🎨', 2),
('信息图',   'Infographic',  '📊', 3),
('角色设计', 'Character',    '🦸', 4),
('游戏美术', 'Game Art',     '🎮', 5),
('UI设计',   'UI Design',    '🖥️', 6),
('插画艺术', 'Illustration', '🖌️', 7),
('排版设计', 'Typography',   '🔤', 8),
('产品摄影', 'Product',      '📦', 9),
('风景摄影', 'Landscape',    '🏔️', 10),
('Logo设计', 'Logo',         '⭕', 11),
('图像编辑', 'Image Edit',   '✂️', 12)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 默认管理员用户（密码: admin123，BCrypt加密）
-- 注意：生产环境部署后请立即修改密码
INSERT INTO users (uid, type, nickname, vip_level, daily_quota, password_hash, email, is_active)
VALUES ('admin', 'guest', '管理员', 3, 999,
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'admin@turing-drawing.com', 1)
ON DUPLICATE KEY UPDATE uid = VALUES(uid);