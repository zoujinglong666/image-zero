# 图灵绘境后端 - 仓库根目录 Dockerfile
# Railway 从根目录构建时使用此文件，自动进入 backend 子目录

# 阶段1: 安装依赖
FROM node:20-alpine AS deps
WORKDIR /app

# 安装 better-sqlite3 原生编译所需的构建工具
RUN apk add --no-cache python3 make g++

# 从 backend 子目录复制依赖声明
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# 阶段2: 生产镜像
FROM node:20-alpine AS production
WORKDIR /app

# 安全: 使用非 root 用户
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# 创建必要目录并设置权限（在切换用户之前）
RUN mkdir -p uploads logs data && chown -R nodejs:nodejs /app

USER nodejs

# 复制依赖
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# 复制 backend 子目录的全部源码
COPY --chown=nodejs:nodejs backend/ .

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 启动
CMD ["node", "src/index.js"]