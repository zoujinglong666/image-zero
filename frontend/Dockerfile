# ════════════════════════════════════════════════════
#  画风提取器前端 - Dockerfile
#  构建 uni-app H5 生产包 → 输出到 dist/build/h5
# ════════════════════════════════════════════════════

# 使用 Node.js 20 LTS 构建前端
FROM node:20-alpine AS build

WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 先复制依赖定义文件，利用 Docker 缓存
COPY package.json pnpm-lock.yaml ./
# 如果没有 lock 文件就用 npm
COPY package.json ./
RUN pnpm install --frozen-lockfile || npm install

# 复制源码并构建 H5
COPY . .
RUN pnpm build:h5 || npx uni build -p h5

# 阶段2: Nginx 托管静态资源（仅用于独立运行）
FROM nginx:alpine
COPY --from=build /app/dist/build/h5 /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
