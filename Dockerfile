# ---- Builder Stage ----

FROM oven/bun:1-slim AS builder

WORKDIR /app

# Bun install 使用 bun.lockb (二进制文件)
# 如果只有 bun.lock (文本文件)，bun install 会生成 bun.lockb
# 复制 package.json 和 bun.lock* (bun.lock 或 bun.lockb)
COPY package.json bun.lock* ./

# 安装所有依赖 (包括 devDependencies 用于构建)
# --frozen-lockfile 确保使用锁文件中的确切版本
RUN bun install --frozen-lockfile

# 复制所有项目文件
COPY . .

# 设置任何构建时需要的 NEXT_PUBLIC_ 环境变量
# 这些变量会被嵌入到客户端代码中
# ARG NEXT_PUBLIC_ALLOW_USER_CONFIG
# ENV NEXT_PUBLIC_ALLOW_USER_CONFIG=${NEXT_PUBLIC_ALLOW_USER_CONFIG}
# … 其他 NEXT_PUBLIC_ 变量

# 注意：直接在 Dockerfile 中设置 ENV 仅对该构建阶段有效，或作为默认值
# 更好的方式是在 docker build 命令中使用 --build-arg，或者让 next.config.js 在运行时读取它们

# 构建 Next.js 应用
RUN bun run build

# ---- Runner Stage ----
FROM oven/bun:1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# 如果你的应用在运行时也需要 bun (比如 next start 仍然通过 bun run start 启动)
# 并且你想要更小的镜像，理论上 Next.js 的 .next/standalone 输出可以不依赖 bun
# 但你的 package.json 的 start 命令是 "next start"，oven/bun 包含 node，所以没问题

# 从 builder 阶段复制构建产物和必要文件
COPY --from=builder /app/package.json /app/bun.lock* ./

# 仅安装生产依赖（如果 next start 需要 node_modules）
# 对于 Next.js，通常 .next 目录是自包含的或 next start 会处理
# 但为了安全起见，可以复制整个 node_modules 或只安装生产依赖
# 如果使用 Next.js 的 standalone output，则不需要 node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
# COPY --from=builder /app/public ./public # 移除或注释掉此行
COPY --from=builder /app/next.config.js ./next.config.js

# 暴露端口
EXPOSE 3000

# 设置运行时环境变量的默认值 (可以在 docker run 时覆盖)
# API 相关 (服务器端)
ENV API_ENDPOINT=""
ENV API_MODEL=""
ENV API_KEY=""

# NEXT_PUBLIC 相关 (这些应该在构建时就确定，但如果 next.config.js 运行时读取它们，这里设置也有用)
ENV NEXT_PUBLIC_API_ENDPOINT=""
ENV NEXT_PUBLIC_API_MODEL=""
ENV NEXT_PUBLIC_API_KEY=""
ENV NEXT_PUBLIC_ALLOW_USER_CONFIG="true"
ENV NEXT_PUBLIC_ACCESS_PASSWORD=""
ENV NEXT_PUBLIC_SEARXNG_URL="https://sousuo.emoe.top"
ENV NEXT_PUBLIC_SEARXNG_ENABLED="true"
# NEXT_PUBLIC_HAS_SERVER_CONFIG 会在 next.config.js 中根据 API_ENDPOINT 和 API_KEY 动态生成

# 启动应用
# 使用 ["bun", "run", "start"] 而不是 "bun run start" 是 Docker CMD 的推荐格式
CMD ["bun", "run", "start"]
