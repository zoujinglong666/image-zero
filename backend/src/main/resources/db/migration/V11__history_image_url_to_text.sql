-- V11: history.image_url 改为 TEXT 类型
-- 原因: base64 图片数据远超 VARCHAR(2048) 上限
ALTER TABLE history MODIFY COLUMN image_url TEXT;
