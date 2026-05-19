# 实现任务

## 任务概述
- 总任务数: 8
- 任务类别: 依赖配置、配置迁移、Mapper迁移、复杂查询、分页功能、测试验证

## 开发任务

### 依赖配置任务
- [ ] 1. 添加 MyBatis Plus 依赖并移除 JPA 依赖
  - 修改 pom.xml 文件，添加 mybatis-plus-boot-starter 依赖
  - 移除 spring-boot-starter-data-jpa 依赖
  - 保持 MySQL 驱动依赖不变
  - _需求: 1.1_

### 配置迁移任务
- [ ] 2. 配置 MyBatis Plus 核心配置和分页插件
  - 创建 MyBatisPlusConfig 配置类
  - 配置分页插件 PaginationInnerInterceptor
  - 更新 application.yml 添加 MyBatis Plus 配置
  - _需求: 1.2, 3.1_

### Mapper 迁移任务
- [ ] 3. 创建基础 Mapper 接口并继承 BaseMapper
  - 为每个实体类创建对应的 Mapper 接口
  - Mapper 接口继承 BaseMapper<T>
  - 添加 @Mapper 注解
  - _需求: 1.3, 1.4_

- [ ] 4. 迁移现有 Repository 方法到 Mapper
  - 分析现有 Repository 中的自定义方法
  - 在 Mapper 接口中实现对应方法
  - 使用 @Select、@Insert、@Update、@Delete 注解
  - _需求: 4.1, 4.2_

### 复杂查询任务
- [ ] 5. 实现复杂 SQL 查询功能
  - 创建 XML 映射文件目录结构
  - 编写多表关联查询的 XML 映射
  - 实现动态条件查询示例
  - 提供 QueryWrapper 使用示例
  - _需求: 2.1, 2.2, 2.3_

### 分页功能任务
- [ ] 6. 实现分页查询功能
  - 使用 MyBatis Plus 分页插件
  - 实现简单分页查询示例
  - 实现复杂条件分页查询示例
  - 提供分页结果封装类
  - _需求: 3.2, 3.3_

### 服务层适配任务
- [ ] 7. 修改 Service 层以使用 Mapper
  - 更新 Service 实现类，注入 Mapper 而不是 Repository
  - 适配现有业务逻辑到 MyBatis Plus
  - 保持 API 接口不变
  - _需求: 4.3, 4.4_

### 测试验证任务
- [ ] 8. 编写测试用例验证迁移结果
  - 编写 Mapper 单元测试
  - 测试复杂查询功能
  - 测试分页功能
  - 性能对比测试
  - _需求: 所有需求_