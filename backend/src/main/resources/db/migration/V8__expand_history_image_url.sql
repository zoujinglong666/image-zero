-- V8__expand_history_image_url.sql
-- 修复: image_url 列 VARCHAR(500) 存不下 base64 图片数据
-- 扩容至 VARCHAR(2048) 以支持长 URL 和 base64 缩略信息
ALTER TABLE history MODIFY COLUMN image_url varchar(2048) DEFAULT NULL;
