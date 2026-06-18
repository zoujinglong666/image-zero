-- V15: prompt_library 表补充 image_url 字段
-- 用于保存提示词对应的示例图片地址（COS / 网络图）
-- 前端 PromptItem 接口期望 image_url 字段

ALTER TABLE prompt_library
  ADD COLUMN image_url VARCHAR(500) DEFAULT '' COMMENT '示例图片URL'
  AFTER content_cn;
