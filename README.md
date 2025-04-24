## 一线 (OneLine)

一线是一个热点事件时间轴分析工具，它可以帮助用户快速了解重大事件的发展脉络并提供AI辅助分析。[Demo站点](https://oneline.chengtx.me)
![image](https://github.com/user-attachments/assets/a16f198f-ee6d-4c6b-b212-00f212641cf0)

## 主要功能

- 根据用户输入的关键词，生成相关历史事件的时间轴
- 显示每个事件的时间、标题、描述和相关人物
- 时间筛选功能，可按不同时间范围筛选事件
- AI分析功能，提供事件的深入背景、过程、影响分析
- 标记事件信息来源，增强可信度
- SearXNG搜索增强，提供更准确的事件信息和上下文（新增功能）

## 快速开始（Docker）

无需克隆代码库，直接使用预构建的Docker镜像快速部署：

```bash
# 从Docker Hub拉取镜像
docker pull justincnn/oneline:latest

# 运行容器
docker run -p 1212:3000 -d justincnn/oneline:latest
```

或者使用docker-compose（推荐）：

1. 创建docker-compose.yml文件，内容如下：

```yaml
version: '3'

services:
  oneline:
    image: justincnn/oneline:latest
    ports:
      - "1212:3000"
    environment:
      - NODE_ENV=production
      # API配置（二选一配置方式）
      # 方式1：使用外部API服务（如OpenAI、Google Gemini等）
      # - NEXT_PUBLIC_API_ENDPOINT=https://api.example.com/v1/chat/completions
      # - NEXT_PUBLIC_API_MODEL=gemini-2.0-pro-exp-search
      # - NEXT_PUBLIC_API_KEY=your_api_key_here
      
      # 方式2：使用SearXNG搜索增强（推荐）
      # - NEXT_PUBLIC_SEARXNG_URL=https://sousuo.emoe.top
      # - NEXT_PUBLIC_SEARXNG_ENABLED=true
      
      # 安全设置
      # - NEXT_PUBLIC_ALLOW_USER_CONFIG=true
      # - NEXT_PUBLIC_ACCESS_PASSWORD=your_access_password_here
    restart: always
```

2. 运行以下命令：

```bash
docker-compose up -d
```

3. 访问 http://localhost:1212 查看应用

## 技术栈

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui 组件库

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 构建

```bash
# 构建生产版本
npm run build
```

## 从源码构建Docker镜像（可选）

如果您想自己构建Docker镜像，可以按照以下步骤操作：

### 使用 Docker Compose

1. 确保您的系统已安装 Docker 和 Docker Compose
2. 克隆此仓库
3. 修改docker-compose.yml文件，将image改为build配置：

```yaml
version: '3'

services:
  oneline:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "1212:3000"
    environment:
      - NODE_ENV=production
    restart: always
```

4. 在项目根目录执行以下命令：

```bash
# 构建并启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 使用 Docker 命令

1. 构建 Docker 镜像：

```bash
docker build -t oneline:latest .
```

2. 运行容器：

```bash
docker run -p 1212:3000 -d oneline:latest
```

## 配置

### 前端配置

该应用需要配置外部AI API（如Google Gemini API或OpenAI API）或SearXNG搜索服务才能正常工作。在使用前，点击右上角的"API设置"按钮，配置以下信息：

#### 方式1：外部AI API（如Google Gemini API、OpenAI等）
- API端点
- 模型名称
- API密钥

#### 方式2：SearXNG搜索增强（推荐）
- SearXNG服务URL（默认使用 https://sousuo.emoe.top）
- 启用SearXNG
- 可选择搜索引擎、语言、时间范围等

### Docker环境变量配置

在Docker环境中，您可以通过环境变量进行配置。我们提供了两种方式来设置环境变量：

#### 方式1：通过docker-compose.yml文件（推荐）

编辑docker-compose.yml文件，取消注释（删除#）并设置相应的环境变量：

```yaml
environment:
  - NODE_ENV=production
  # 方式1：使用外部API服务
  - NEXT_PUBLIC_API_ENDPOINT=https://api.example.com/v1/chat/completions
  - NEXT_PUBLIC_API_MODEL=gemini-2.0-pro-exp-search
  - NEXT_PUBLIC_API_KEY=your_api_key_here
  # 方式2：使用SearXNG搜索增强（推荐）
  - NEXT_PUBLIC_SEARXNG_URL=https://sousuo.emoe.top
  - NEXT_PUBLIC_SEARXNG_ENABLED=true
  # 安全设置
  - NEXT_PUBLIC_ALLOW_USER_CONFIG=true
  - NEXT_PUBLIC_ACCESS_PASSWORD=your_access_password
```

然后运行：

```bash
docker-compose up -d
```

#### 方式2：通过docker run命令

```bash
docker run -p 1212:3000 \
  -e NEXT_PUBLIC_API_ENDPOINT=https://api.example.com/v1/chat/completions \
  -e NEXT_PUBLIC_API_MODEL=gemini-2.0-pro-exp-search \
  -e NEXT_PUBLIC_API_KEY=your_api_key_here \
  -e NEXT_PUBLIC_SEARXNG_URL=https://sousuo.emoe.top \
  -e NEXT_PUBLIC_SEARXNG_ENABLED=true \
  -e NEXT_PUBLIC_ALLOW_USER_CONFIG=true \
  -e NEXT_PUBLIC_ACCESS_PASSWORD=your_access_password \
  -d justincnn/oneline:latest
```

### 环境变量说明

| 环境变量 | 说明 | 默认值 |
|---------|------|-------|
| NEXT_PUBLIC_API_ENDPOINT | 外部API端点 | - |
| NEXT_PUBLIC_API_MODEL | API模型名称 | gemini-2.0-flash-exp-search |
| NEXT_PUBLIC_API_KEY | API密钥 | - |
| NEXT_PUBLIC_SEARXNG_URL | SearXNG搜索服务URL | https://sousuo.emoe.top |
| NEXT_PUBLIC_SEARXNG_ENABLED | 是否启用SearXNG | false |
| NEXT_PUBLIC_ALLOW_USER_CONFIG | 是否允许用户在前端修改配置 | true |
| NEXT_PUBLIC_ACCESS_PASSWORD | 访问密码 | - |

**注意事项：**

- 环境变量配置的优先级高于前端用户配置
- 当`NEXT_PUBLIC_ALLOW_USER_CONFIG`设置为`false`时，用户将无法在前端修改API设置
- 当设置了`NEXT_PUBLIC_ACCESS_PASSWORD`时，用户需要输入正确的密码才能访问API设置
- 推荐使用SearXNG搜索增强功能，这样可以避免配置API密钥
