# ════════════════════════════════════════════════════
#  画风提取器后端 - Dockerfile（标准版）
#  多阶段构建: Maven(JDK21) → JRE(Alpine)
# ════════════════════════════════════════════════════

# 阶段1: Maven 构建
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# 阿里云 Maven 镜像加速
RUN mkdir -p /root/.m2 && \
    echo '<?xml version="1.0" encoding="UTF-8"?>\
<settings xmlns="http://maven.apache.org/SETTINGS/1.2.0"\
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\
  xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.2.0 https://maven.apache.org/xsd/settings-1.2.0.xsd">\
  <mirrors>\
    <mirror><id>aliyun</id><mirrorOf>*</mirrorOf><name>Aliyun</name>\
      <url>https://maven.aliyun.com/repository/public</url></mirror>\
  </mirrors>\
</settings>' > /root/.m2/settings.xml

# 先复制 pom.xml 利用 Docker 层缓存依赖
COPY pom.xml .
RUN mvn dependency:go-offline -B -q

# 复制源码并构建
COPY src ./src
RUN mvn package -DskipTests -B -q

# 阶段2: 生产运行时（轻量 JRE Alpine）
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# 安装基础工具 + 设置时区
RUN apk add --no-cache curl tzdata && \
    ln -snf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

# 非 root 用户
RUN addgroup -g 1001 -S app && adduser -S app -u 1001 -G app && \
    mkdir -p logs uploads && chown -R app:app /app

USER app

# 复制构建产物
COPY --from=build --chown=app:app /app/target/*.jar app.jar

EXPOSE 8080

# 健康检查（使用公开的 /api/health 端点）
HEALTHCHECK --interval=30s --timeout=5s --start_period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=${SPRING_PROFILES_ACTIVE:-prod}"]
