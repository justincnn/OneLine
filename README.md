# OneLine (一线) ；

OneLine（一线）是一个AI驱动的热点事件梳理分析工具，让您轻松追踪和了解热门事件的发展过程及其带来的影响。
- ![](https://img.shields.io/badge/One-Line-blue)![GitHub Stars](https://img.shields.io/github/stars/chengtx809/OneLine?style=social) ![GitHub Forks](https://img.shields.io/github/forks/chengtx809/OneLine?style=social)
## 演示

在线体验：[https://oneline.chengtx.me](https://oneline.chengtx.me)

![OneLine 截图1](https://ext.same-assets.com/1204961896/3933883241.png)
![OneLine 截图2](https://ext.same-assets.com/1204961896/3709366445.png)

## 🌟 主要功能

* 利用AI技术为热点新闻生成完整时间轴，直观展示事件发展过程
* 支持自定义搜索内容，实时生成您感兴趣的事件时间轴
* 内置网络搜索功能，自动获取最新事件信息
* 简洁优雅的用户界面，提供流畅的浏览体验
* 支持多种AI模型，包括Gemini和OpenAI的API
* 支持SearXNG自定义搜索引擎，提供更精准的内容检索

## 🔧 技术栈

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui 组件库

## 🚀 快速开始

### Vercel部署（推荐）

fork仓库后填入环境变量部署即可

### Docker部署

直接使用预构建的Docker镜像：

```bash
docker pull justincnn/oneline
```

然后运行容器：

```bash
docker run -p 3000:3000 justincnn/oneline
```

访问 `http://localhost:3000` 即可使用。

#### Docker配置

如果需要自定义配置，可以通过环境变量进行设置：

```bash
docker run -p 3000:3000 \
  -e API_ENDPOINT=https://api.example.com/v1/chat/completions \
  -e API_MODEL=gemini-2.0-pro-exp-search \
  -e API_KEY=your_api_key_here \
  -e NEXT_PUBLIC_ALLOW_USER_CONFIG=true \
  -e NEXT_PUBLIC_SEARXNG_URL=https://sousuo.emoe.top \
  -e NEXT_PUBLIC_SEARXNG_ENABLED=true \
  justincnn/oneline
```

### 本地开发环境

1. 克隆仓库

```bash
git clone https://github.com/chengtx809/OneLine.git
cd OneLine
```

2. 安装依赖

```bash
# 使用bun包管理器（推荐）
bun install
# 或使用npm
npm install
```

3. 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env.local
# 编辑.env.local文件，填入所需的API密钥等信息
```

4. 启动开发服务器

```bash
bun run dev
# 或使用npm
npm run dev
```

5. 访问 `http://localhost:3000` 开始使用

## ⚙️ 配置说明

在 `.env.local` 中配置以下环境变量：

```
# AI API端点
# 可以是OpenAI、Google Gemini等API
API_ENDPOINT=https://api.example.com/v1/chat/completions

# API模型名称
API_MODEL=gemini-2.0-pro-exp-search

# API密钥
API_KEY=your_api_key_here

# 是否允许用户自定义API配置
# "false"表示用户不能修改API配置
# "true"表示用户可以修改API配置
NEXT_PUBLIC_ALLOW_USER_CONFIG=true

# 访问密码（可选）
# 如果设置，用户需要输入密码才能访问API功能
NEXT_PUBLIC_ACCESS_PASSWORD=your_access_password_here

# SearXNG搜索引擎配置
# SearXNG搜索引擎的URL
NEXT_PUBLIC_SEARXNG_URL=https://sousuo.emoe.top
# 是否启用SearXNG
NEXT_PUBLIC_SEARXNG_ENABLED=true
```

**重要说明：**

* 当 `NEXT_PUBLIC_ALLOW_USER_CONFIG` 设置为 `false` 时，用户将无法修改API配置
* 设置 `NEXT_PUBLIC_ACCESS_PASSWORD` 可增加对API访问的安全控制
* SearXNG配置为可选，提供更精准的搜索能力

### SearXNG集成

OneLine支持集成SearXNG搜索引擎，以提高搜索质量：

1. 当设置了`NEXT_PUBLIC_SEARXNG_URL`环境变量时，系统将自动启用SearXNG
2. 也可通过`NEXT_PUBLIC_SEARXNG_ENABLED`明确控制是否启用SearXNG
3. 建议使用自己搭建的SearXNG实例，以获得更稳定的服务

SearXNG是一个尊重隐私的元搜索引擎，可以聚合多个搜索引擎的结果，提供更全面的搜索效果。

## 🌩️ Vercel部署

OneLine可以轻松部署到Vercel平台：

1. Fork此仓库到您的GitHub账户
2. 在Vercel中导入该项目
3. 在Vercel环境变量设置中配置所需的API密钥和端点（至少需要设置`API_KEY`和`API_ENDPOINT`）
4. 如果需要控制访问权限，可设置`NEXT_PUBLIC_ACCESS_PASSWORD`环境变量
5. 部署完成后，Vercel会提供一个域名，您可以直接访问或绑定自定义域名

**注意**：如果在Vercel上部署遇到API超时问题，可以尝试修改`netlify.toml`文件中的配置以解决。

## 🤝 贡献指南

欢迎通过Pull Request或Issue贡献代码或提出建议。

## 📜 许可证

本项目采用MIT许可证 - 详情请查看[LICENSE](LICENSE)文件。

## 🔗 相关链接

* 在线演示：[https://oneline.chengtx.me](https://oneline.chengtx.me)
* 项目仓库：[https://github.com/chengtx809/OneLine](https://github.com/chengtx809/OneLine)
* Docker镜像：[justincnn/oneline](https://hub.docker.com/r/justincnn/oneline)

## 🙏 致谢

* 感谢[@snailyp](https://github.com/snailyp)大佬的[gemini-balance](https://github.com/snailyp/gemini-balance)项目，为本项目Demo提供了API支持
* 感谢[@justincnn](https://github.com/justincnn)维护Docker镜像
* 感谢所有贡献者和使用者的支持和反馈
* CDN acceleration and security protection for this project are sponsored by [Tencent EdgeOne](https://edgeone.ai/?from=github)
[![Star History Chart](https://api.star-history.com/svg?repos=chengtx809/OneLine&type=Date)](https://www.star-history.com/#chengtx809/OneLine&Date)
[![Powered by DartNode](https://dartnode.com/branding/DN-Open-Source-sm.png)](https://dartnode.com "Powered by DartNode - Free VPS for Open Source")
[![Best Asian CDN, Edge, and Secure Solutions - Tencent EdgeOne](https://edgeone.ai/media/34fe3a45-492d-4ea4-ae5d-ea1087ca7b4b.png)](https://edgeone.ai/?from=github "Best Asian CDN, Edge, and Secure Solutions - Tencent EdgeOne")

