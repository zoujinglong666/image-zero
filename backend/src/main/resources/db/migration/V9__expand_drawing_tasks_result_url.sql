-- V9__expand_drawing_tasks_result_url.sql
-- 修复: result_url 列 VARCHAR(500) 存不下 base64 图片数据（编辑功能返回的图片）
ALTER TABLE drawing_tasks MODIFY COLUMN result_url varchar(2048) DEFAULT NULL;
