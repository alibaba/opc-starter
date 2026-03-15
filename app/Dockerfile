# OPC-Starter 开发环境 Dockerfile
# 支持 MSW Mock 模式，无需真实 Supabase 即可运行
FROM node:20-alpine AS base
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache git

# 依赖层（缓存优化）
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# 源码层
COPY . .

# --- 开发模式 ---
FROM base AS dev
EXPOSE 5173
CMD ["npm", "run", "dev:test", "--", "--host", "0.0.0.0"]

# --- 构建产物 ---
FROM base AS build
RUN npm run build

# --- 生产预览 ---
FROM node:20-alpine AS preview
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 4173
CMD ["npm", "run", "preview"]
