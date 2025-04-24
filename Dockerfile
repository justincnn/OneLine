FROM node:18-alpine AS base

# 安装依赖
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
# 使用--no-frozen-lockfile而不是直接使用npm install，更稳定
RUN npm ci --no-audit --no-fund

# 构建应用
FROM base AS builder
WORKDIR /app

# 环境变量设置 - 增加Node内存限制
ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 使用更安全的构建命令
RUN echo "开始构建应用..." && \
    npm run build || (echo "构建失败，显示错误日志:" && cat /tmp/build-error.log && exit 1)

# 生产环境
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# 在生产环境也设置内存限制
ENV NODE_OPTIONS="--max-old-space-size=1024"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 设置正确的权限
RUN mkdir -p .next
RUN chown nextjs:nodejs .next

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# 复制环境变量处理脚本
COPY --from=builder --chown=nextjs:nodejs /app/fix-env.js ./

# 创建启动脚本
RUN echo '#!/bin/sh\nnode fix-env.js && node server.js' > ./start.sh && chmod +x ./start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./start.sh"] 