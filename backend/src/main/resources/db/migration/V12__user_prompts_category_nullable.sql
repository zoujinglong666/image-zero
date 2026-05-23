-- V12: 将 user_prompts.category_id 改为可空，允许社区帖子不选分类
-- InnoDB FK 约束对 NULL 值不强制执行，无需改动外键
ALTER TABLE user_prompts
  MODIFY category_id BIGINT NULL DEFAULT NULL;
