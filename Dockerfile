# ════════════════════════════════════════════════════
#  画风提取器 - 根目录 Dockerfile
#  用于 Railway / Render 等平台从仓库根目录构建
#  自动构建 backend + frontend
# ════════════════════════════════════════════════════

# 阶段1: 构建前端 H5
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY frontend/package.json ./
RUN pnpm install || npm install
COPY frontend/ .
RUN pnpm build:h5 || npx uni build -p h5

# 阶段2: 构建后端 Spring Boot
FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /app/backend
RUN mkdir -p /root/.m2 && \
    echo '<?xml version="1.0"?>\
<settings><mirrors><mirror><id>aliyun</id><mirrorOf>*</mirrorOf>\
<url>https://maven.aliyun.com/repository/public</url></mirror></mirrors></settings>' \
    > /root/.m2/settings.xml
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B -q
COPY backend/src ./src
RUN mvn package -DskipTests -B -q

# 阶段3: 生产镜像（后端 + Nginx 托管前端）
FROM eclipse-temurin:21-jre-alpine

RUN apk add --no-cache curl nginx tzdata && \
    ln -snf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    addgroup -S app && adduser -S app -u 1001 -G app && \
    mkdir -p /app/logs /app/static && \
    chown -R app:app /app

WORKDIR /app

# 复制后端 JAR
COPY --from=backend-build --chown=app:app /app/backend/target/*.jar app.jar

# 复制前端 H5 构建产物到 Nginx 静态目录
COPY --from=frontend-build /app/frontend/dist/build/h5 /usr/share/nginx/html

# Nginx 配置（内嵌：API 反代 + 前端静态托管）
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 8081;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        expires -1;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

USER app

EXPOSE 8080 8081

HEALTHCHECK --interval=30s --timeout=5s --start_period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# 启动脚本：同时运行 Spring Boot(8080) 和 Nginx(8081)
ENTRYPOINT ["sh", "-c", "nginx && java -jar app.jar --spring.profiles.active=${SPRING_PROFILES_ACTIVE:-prod}"]
