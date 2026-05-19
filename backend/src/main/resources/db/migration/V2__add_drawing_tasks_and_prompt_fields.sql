-- ═══════════════════════════════════════════════════════════════
--  V2: 补充绘图任务表 + prompt_library 缺失字段
-- ═══════════════════════════════════════════════════════════════

-- 1. 绘图任务表 (AI图片生成/编辑/分析任务)
CREATE TABLE IF NOT EXISTS drawing_tasks (
    id              BIGINT       AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT       NOT NULL DEFAULT 0               COMMENT '所属用户ID',
    type            VARCHAR(20)  NOT NULL DEFAULT 'generate'      COMMENT '类型: analyze/generate/edit',
    prompt          TEXT         DEFAULT ''                        COMMENT '提示词',
    negative_prompt TEXT         DEFAULT ''                        COMMENT '负面提示词',
    model           VARCHAR(100) DEFAULT ''                       COMMENT '模型名称',
    width           INT          DEFAULT NULL                      COMMENT '图片宽度',
    height          INT          DEFAULT NULL                      COMMENT '图片高度',
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending'       COMMENT '状态: pending/processing/completed/failed',
    input_data      TEXT         DEFAULT ''                        COMMENT '输入数据JSON',
    result_url      VARCHAR(500) DEFAULT ''                       COMMENT '结果图片URL',
    error_message   TEXT         DEFAULT ''                        COMMENT '错误信息',
    provider        VARCHAR(30)  DEFAULT ''                       COMMENT 'AI服务商: OPENAI/GEMINI/STABILITY',
    provider_task_id VARCHAR(100) DEFAULT ''                      COMMENT 'AI服务商返回的任务ID',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_drawing_user_id      (user_id),
    INDEX idx_drawing_status       (status),
    INDEX idx_drawing_provider_tid (provider_task_id),
    INDEX idx_drawing_created_at   (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='绘图任务表';

-- 2. prompt_library 表补充字段
ALTER TABLE prompt_library
    ADD COLUMN content_cn  TEXT DEFAULT '' AFTER prompt_text COMMENT '提示词中文内容',
    ADD COLUMN sort_order  INT NOT NULL DEFAULT 0 AFTER tags COMMENT '排序权重',
    ADD COLUMN status      VARCHAR(20) NOT NULL DEFAULT 'published' AFTER sort_order COMMENT '状态: published/draft';