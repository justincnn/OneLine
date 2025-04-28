FROM node:18-alpine

WORKDIR /app

# 复制项目文件
COPY . .

# 设置Node环境变量
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 安装依赖并构建
RUN npm install
RUN npm run build

# 启动应用
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"] 