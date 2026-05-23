# 图灵绘境 — 修复记录

## 修复 1: 社区发帖 FK 约束错误

**问题：** `POST /api/prompt/community` 返回 500，报 `user_prompts.category_id` FK 约束失败。

**根因：** `category_id` 表定义 `BIGINT DEFAULT 0`，FK 引用 `prompt_categories(id)`，但 `prompt_categories` 没有 id=0 的行（自增从 1 开始）。MyBatis Plus 跳过 null 字段不写入 INSERT，MySQL 用 DEFAULT 0 → FK 报错。

**修复：** Flyway V12 迁移 → `ALTER TABLE user_prompts MODIFY category_id BIGINT NULL DEFAULT NULL`。InnoDB FK 对 NULL 不强制执行。

## 修复 2: 全局异常处理器遮盖 SQL 异常

**问题：** 500 错误响应暴露完整 SQL（表名、字段名、约束名、SQL 语句），安全隐患。

**根因：** `GlobalExceptionHandler.handleRuntimeException()` 直接 `e.getMessage()` 透传，SQL 异常继承自 RuntimeException。

**修复：** 新增 `@ExceptionHandler(DataAccessException.class)` handler，返回 `"服务器内部错误，请稍后重试"`，日志仍记录完整堆栈。

## 验证结果

| 测试 | 结果 |
|------|------|
| 社区发帖无 category_id | `{"code":0,"data":{"id":1}}` ✅ |
| 社区发帖无效 category_id | `{"code":500,"message":"服务器内部错误，请稍后重试"}` ✅ |
| 编译 | `mvn clean compile` 0 错误 ✅ |
| 后端启动 | `Started TuringDrawingApplication` ✅ |
