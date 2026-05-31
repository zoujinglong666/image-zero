-- V21: 修复 vip_subscriptions 表 expire_at 无默认值导致创建订单失败
-- 问题: expire_at NOT NULL 但没有 DEFAULT，PaymentService.createOrder() 创建 pending 订单时未设置 expire_at
-- 解决: 给 expire_at 添加 DEFAULT CURRENT_TIMESTAMP，允许 pending 状态的订单暂时使用当前时间作为占位

ALTER TABLE vip_subscriptions
    MODIFY COLUMN expire_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '到期时间';
