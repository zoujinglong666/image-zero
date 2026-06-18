-- V10: drawing_tasks.result_url 改为 TEXT 类型
-- 原因: base64 图片数据远超 VARCHAR(2048) 上限（一张小图即可达数万字符）
ALTER TABLE drawing_tasks MODIFY COLUMN result_url TEXT;
