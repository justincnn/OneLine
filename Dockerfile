FROM node:16 AS base

# 安装依赖
FROM base AS deps
WORKDIR /app

# 复制package.json和package-lock.json
COPY package.json package-lock.json ./
# 安装依赖 - 使用普通install而非ci
RUN npm install

# 构建应用
FROM base AS builder
WORKDIR /app

# 设置环境变量 - 增加内存限制
ENV NODE_OPTIONS="--max-old-space-size=4096"

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产环境
FROM node:16-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# 复制环境变量处理脚本
COPY --from=builder /app/fix-env.js ./

# 创建启动脚本
RUN echo '#!/bin/sh\nnode fix-env.js && node server.js' > ./start.sh && chmod +x ./start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./start.sh"] 