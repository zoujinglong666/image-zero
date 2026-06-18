-- ══════════════════════════════════════════
-- V18: 积分充值系统
-- 用户积分表 + 充值订单表
-- ══════════════════════════════════════════

-- 用户积分表
CREATE TABLE user_credits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    balance INT NOT NULL DEFAULT 0 COMMENT '积分余额',
    total_earned INT NOT NULL DEFAULT 0 COMMENT '累计获得积分',
    total_spent INT NOT NULL DEFAULT 0 COMMENT '累计消费积分',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户积分表';

-- 充值订单表
CREATE TABLE credit_orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    credit_pack_id VARCHAR(50) NOT NULL COMMENT '积分包ID: mini/small/medium/large',
    credit_amount INT NOT NULL COMMENT '充值积分数',
    amount_cents INT NOT NULL COMMENT '支付金额（分）',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态: pending/paid/cancelled',
    payment_no VARCHAR(100) DEFAULT NULL COMMENT '微信支付单号',
    paid_at DATETIME DEFAULT NULL COMMENT '支付完成时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_user_id (user_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分充值订单表';
