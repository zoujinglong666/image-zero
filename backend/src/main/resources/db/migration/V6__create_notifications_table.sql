-- V6: 创建站内信通知表
-- 替代 NotificationService 的内存 ConcurrentHashMap 实现

CREATE TABLE notifications (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '通知ID',
    user_id     BIGINT       NOT NULL COMMENT '接收用户ID',
    type        VARCHAR(30)  NOT NULL DEFAULT 'system' COMMENT '通知类型: system/ai_result/challenge/vip/social',
    title       VARCHAR(200) NOT NULL COMMENT '通知标题',
    content     TEXT         COMMENT '通知内容',
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE COMMENT '是否已读',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_user_read (user_id, is_read),
    INDEX idx_notifications_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='站内信通知表';