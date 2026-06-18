-- ══════════════════════════════════════════
-- V17: 邀请裂变系统
-- 邀请关系表 + 用户邀请码字段
-- ══════════════════════════════════════════

-- 用户邀请码
ALTER TABLE users ADD COLUMN invite_code VARCHAR(20) UNIQUE DEFAULT NULL COMMENT '个人邀请码';
ALTER TABLE users ADD COLUMN invited_by BIGINT DEFAULT NULL COMMENT '邀请人用户ID';

-- 邀请记录表
CREATE TABLE invite_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    inviter_id BIGINT NOT NULL COMMENT '邀请人ID',
    invitee_id BIGINT NOT NULL COMMENT '被邀请人ID',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态: pending-待完成注册/registered-已注册/completed-已完成任务',
    reward_given BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已发放奖励',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_inviter_invitee (inviter_id, invitee_id),
    KEY idx_inviter (inviter_id),
    KEY idx_invitee (invitee_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邀请记录表';
