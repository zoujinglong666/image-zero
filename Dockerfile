# 图灵绘境后端 - 仓库根目录 Dockerfile
# Railway 从根目录构建时使用此文件
# 构建Spring Boot后端

# 阶段1: Maven构建
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# 配置Maven阿里云镜像加速
RUN mkdir -p /root/.m2 && echo '<?xml version="1.0" encoding="UTF-8"?>\n<settings xmlns="http://maven.apache.org/SETTINGS/1.2.0"\n  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n  xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.2.0 https://maven.apache.org/xsd/settings-1.2.0.xsd">\n  <mirrors>\n    <mirror>\n      <id>aliyunmaven</id>\n      <mirrorOf>*</mirrorOf>\n      <name>阿里云公共仓库</name>\n      <url>https://maven.aliyun.com/repository/public</url>\n    </mirror>\n  </mirrors>\n</settings>' > /root/.m2/settings.xml

# 先复制pom.xml，利用Docker缓存
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B

# 复制源码并构建
COPY backend/src ./src
RUN mvn package -DskipTests -B

# 阶段2: 生产镜像
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# 安全: 使用非root用户
RUN addgroup -g 1001 -S spring && adduser -S spring -u 1001

# 创建必要目录
RUN mkdir -p logs && chown -R spring:spring /app

USER spring

# 从构建阶段复制JAR
COPY --from=build --chown=spring:spring /app/target/*.jar app.jar

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# 启动 — 默认激活 prod profile，可通过 SPRING_PROFILES_ACTIVE 环境变量覆盖
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=${SPRING_PROFILES_ACTIVE:-prod}"]