-- V5: 添加用户角色字段
-- role: ADMIN(管理员) / USER(普通用户，默认)

ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER' COMMENT '用户角色: ADMIN-管理员 / USER-普通用户';

-- 为现有用户设置默认角色（已有用户默认为普通用户）
UPDATE users SET role = 'USER' WHERE role IS NULL OR role = '';

-- 创建索引（便于按角色查询）
CREATE INDEX idx_users_role ON users(role);