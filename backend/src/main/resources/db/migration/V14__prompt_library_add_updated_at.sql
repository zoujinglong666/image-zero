-- V14: prompt_library 表补充 updated_at 字段
-- BaseEntity 中有 @TableField(fill = FieldFill.INSERT_UPDATE) 的 updatedAt，
-- 缺少该字段会导致 MyBatis Plus INSERT/UPDATE 报 "Unknown column 'updated_at'"

ALTER TABLE prompt_library
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  AFTER created_at;
