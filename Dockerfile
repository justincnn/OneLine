FROM node:16-alpine AS base

# 安装依赖
FROM base AS deps
WORKDIR /app

# 增加基本构建工具
RUN apk add --no-cache libc6-compat python3 make g++ curl

# 设置npm配置
RUN npm config set legacy-peer-deps true
RUN npm config set network-timeout 300000

COPY package.json package-lock.json ./
# 回退到使用npm install，因为npm ci在ARM架构上可能不稳定
RUN npm install --verbose || npm install --verbose --no-optional

# 构建应用
FROM base AS builder
WORKDIR /app

# 环境变量设置 - 增加Node内存限制
ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 使用更安全的构建命令，增加重试选项
RUN echo "开始构建应用..." && \
    (npm run build || (echo "首次构建失败，正在重试..." && npm cache clean --force && npm run build)) || \
    (echo "构建失败，无法恢复" && exit 1)

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