-- V23: 用户反馈建议表
CREATE TABLE IF NOT EXISTS `feedback` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NULL COMMENT '用户ID，NULL表示未登录游客',
  `type` VARCHAR(20) NOT NULL DEFAULT 'suggestion' COMMENT 'feedback/suggestion/bug_report',
  `content` TEXT NOT NULL COMMENT '反馈内容',
  `contact` VARCHAR(100) NULL COMMENT '联系方式（可选）',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/replied/resolved/closed',
  `admin_reply` TEXT NULL COMMENT '管理员回复',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (`status`),
  INDEX idx_user_id (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
