# OneLine (一线)

OneLine（一线）是一个AI驱动的分析工具，旨在为您提供关于客户和产品的最新情景信息。

## 🌟 主要功能

*   利用AI技术为您关心的话题生成全面分析。
*   支持自定义搜索内容，实时生成您感兴趣的事件分析。
*   内置网络搜索功能，通过 Tavily 搜索引擎自动获取最新信息。
*   简洁优雅的用户界面，提供流畅的浏览体验。
*   支持多种AI模型，包括Gemini和OpenAI的API。

## 🔧 技术栈

*   Next.js
*   React
*   TypeScript
*   Tailwind CSS
*   shadcn/ui 组件库
*   Tavily Search API

## 🚀 快速开始

### Docker Compose 部署 (推荐)

这是最简单的部署方式。确保您已安装 Docker 和 Docker Compose。

1.  创建 `docker-compose.yml` 文件：

    ```yaml
    version: '3.8'
    services:
      oneline:
        image: justincnn/oneline:latest
        ports:
          - "3000:3000"
        restart: unless-stopped
        environment:
          - API_ENDPOINT=https://api.example.com/v1/chat/completions
          - API_MODEL=gemini-2.0-pro-exp-search
          - API_KEY=your_api_key_here
          - NEXT_PUBLIC_TAVILY_API_KEY=your_tavily_api_key_here
    ```

2.  在 `docker-compose.yml` 文件所在目录运行：

    ```bash
    docker-compose up -d
    ```

3.  访问 `http://localhost:3000` 即可使用。

### 本地开发环境

1.  克隆仓库

    ```bash
    git clone https://github.com/justincnn/OneLine.git
    cd OneLine
    ```

2.  安装依赖

    ```bash
    # 使用bun包管理器（推荐）
    bun install
    ```

3.  配置环境变量

    在项目根目录创建 `.env.local` 文件，并填入以下内容：

    ```
    # AI API端点
    API_ENDPOINT=https://api.example.com/v1/chat/completions

    # API模型名称
    API_MODEL=gemini-2.0-pro-exp-search

    # API密钥
    API_KEY=your_api_key_here

    # Tavily API 密钥
    NEXT_PUBLIC_TAVILY_API_KEY=your_tavily_api_key_here
    ```

4.  启动开发服务器

    ```bash
    bun run dev
    ```

5.  访问 `http://localhost:3000` 开始使用。

## ⚙️ 配置说明

您可以通过环境变量或在应用的设置界面中配置以下参数：

*   **AI API Endpoint**: 您的语言模型 API 端点。
*   **AI API Model**: 您希望使用的模型名称。
*   **AI API Key**: 您的语言模型 API 密钥。
*   **Tavily API Key**: 您的 Tavily 搜索引擎 API 密钥。

## 🤝 贡献指南

欢迎通过Pull Request或Issue贡献代码或提出建议。

## 📜 许可证

本项目采用MIT许可证 - 详情请查看[LICENSE](LICENSE)文件。
