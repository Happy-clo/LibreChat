# LibreChat

<p align="center">
  <a href="https://librechat.ai">
    <img src="client/public/assets/logo.svg" height="256">
  </a>
  <h1 align="center">
    <a href="https://librechat.ai">LibreChat</a>
  </h1>
</p>

<p align="center">
  <a href="https://discord.librechat.ai"> 
    <img
      src="https://img.shields.io/discord/1086345563026489514?label=&logo=discord&style=for-the-badge&logoWidth=20&logoColor=white&labelColor=000000&color=blueviolet">
  </a>
  <a href="https://www.youtube.com/@LibreChat"> 
    <img
      src="https://img.shields.io/badge/YOUTUBE-red.svg?style=for-the-badge&logo=youtube&logoColor=white&labelColor=000000&logoWidth=20">
  </a>
  <a href="https://docs.librechat.ai"> 
    <img
      src="https://img.shields.io/badge/DOCS-blue.svg?style=for-the-badge&logo=read-the-docs&logoColor=white&labelColor=000000&logoWidth=20">
  </a>
  <a aria-label="Sponsors" href="https://github.com/sponsors/danny-avila">
    <img
      src="https://img.shields.io/badge/SPONSORS-brightgreen.svg?style=for-the-badge&logo=github-sponsors&logoColor=white&labelColor=000000&logoWidth=20">
  </a>
</p>

<p align="center">
<a href="https://railway.app/template/b5k2mn?referralCode=HI9hWz">
  <img src="https://railway.app/button.svg" alt="Deploy on Railway" height="30">
</a>
<a href="https://zeabur.com/templates/0X2ZY8">
  <img src="https://zeabur.com/button.svg" alt="Deploy on Zeabur" height="30"/>
</a>
<a href="https://template.cloud.sealos.io/deploy?templateName=librechat">
  <img src="https://raw.githubusercontent.com/labring-actions/templates/main/Deploy-on-Sealos.svg" alt="Deploy on Sealos" height="30">
</a>
</p>

# ✨ 功能

- 🖥️ **用户界面与体验**：受到 ChatGPT 启发，具有增强的设计和功能

- 🤖 **AI 模型选择**：  
  - Anthropic (Claude)、AWS Bedrock、OpenAI、Azure OpenAI、Google、Vertex AI、OpenAI Assistants API (包括 Azure)
  - [自定义端点](https://www.librechat.ai/docs/quick_start/custom_endpoints)：无需代理即可使用任何兼容 openAI 的 API
  - 兼容 [本地与远程 AI 提供商](https://www.librechat.ai/docs/configuration/librechat_yaml/ai_endpoints):
    - Ollama、groq、Cohere、Mistral AI、Apple MLX、koboldcpp、together.ai、
    - OpenRouter、Perplexity、ShuttleAI、Deepseek、Qwen 等

- 🔧 **[代码解释器 API](https://www.librechat.ai/docs/features/code_interpreter)**：
  - 安全、沙箱执行，支持 Python、Node.js (JS/TS)、Go、C/C++、Java、PHP、Rust 和 Fortran
  - 无缝文件处理：直接上传、处理和下载文件
  - 无隐私问题：完全隔离和安全的执行

- 🔦 **代理和工具集成**：  
  - **[LibreChat 代理](https://www.librechat.ai/docs/features/agents)**：
    - 无需代码的自定义助手：构建专业化的 AI 驱动助手，无需编码  
    - 灵活和可扩展：附加 DALL-E-3、文件搜索、代码执行等工具  
    - 兼容自定义端点、OpenAI、Azure、Anthropic、AWS Bedrock 等
    - 支持 [模型上下文协议 (MCP)](https://modelcontextprotocol.io/clients#librechat) 的工具
  - 使用 LibreChat 代理和 OpenAI 助手与文件、代码解释器、工具和 API 操作

- 🪄 **带有代码工件的生成 UI**：  
  - [代码工件](https://youtu.be/GfTj7O4gmd0?si=WJbdnemZpJzBrJo3) 允许在聊天中直接创建 React、HTML 和 Mermaid 图

- 💾 **预设和上下文管理**：  
  - 创建、保存和分享自定义预设  
  - 交谈中智能切换 AI 端点和预设
  - 编辑、重新提交和继续消息，进行对话分支  
  - [分叉消息与对话](https://www.librechat.ai/docs/features/fork) 以实现高级上下文控制

- 💬 **多模态与文件交互**：  
  - 上传并分析图像，支持 Claude 3、GPT-4o、o1、Llama-Vision 和 Gemini 📸  
  - 与文件聊天，支持自定义端点、OpenAI、Azure、Anthropic、AWS Bedrock 和 Google 🗃️

- 🌎 **多语言用户界面**：  
  - 英语、中文、德语、西班牙语、法语、意大利语、波兰语、巴西葡萄牙语
  - Русский、日语、瑞典语、韩语、越南语、繁体中文、阿拉伯语、土耳其语、荷兰语、希伯来语

- 🎨 **可自定义界面**：  
  - 可自定义的下拉菜单和界面，适应专业用户和新手

- 🗣️ **语音与音频**：  
  - 通过语音识别和语音合成进行免提聊天  
  - 自动发送和播放音频  
  - 支持 OpenAI、Azure OpenAI 和 Elevenlabs

- 📥 **导入与导出对话**：  
  - 从 LibreChat、ChatGPT、Chatbot UI 导入对话  
  - 导出对话为截图、markdown、文本、json

- 🔍 **搜索与发现**：  
  - 搜索所有消息/对话

- 👥 **多用户与安全访问**：
  - 多用户、安全的 OAuth2、LDAP 和电子邮件登录支持
  - 内置审核和令牌开销工具

- ⚙️ **配置与部署**：  
  - 配置代理、反向代理、Docker 和多种部署选项  
  - 可完全本地使用或在云端部署

- 📖 **开源与社区**：  
  - 完全开源与公众构建  
  - 社区驱动的开发、支持与反馈

[有关我们功能的详细审查，请查看我们的文档](https://docs.librechat.ai/) 📚

---

## 🪶 全方位 AI 对话与 LibreChat

LibreChat 将助理 AI 的未来与 OpenAI 的 ChatGPT 革命性技术结合在一起。庆祝原创样式，LibreChat 使您能够集成多个 AI 模型。它还集成并增强了原始客户端的功能，如对话和消息搜索、提示模板和插件。

使用 LibreChat，您不再需要选择 ChatGPT Plus，而可以使用免费的或按调用计费的 API。我们欢迎对这个高级聊天平台的贡献、克隆和分叉，以增强其能力。

![查看视频](https://raw.githubusercontent.com/LibreChat-AI/librechat.ai/main/public/images/changelog/v0.7.6.gif)
单击缩略图以观看视频☝️

---

## 🌐 资源

**GitHub 仓库：**
  - **RAG API:** [github.com/danny-avila/rag_api](https://github.com/danny-avila/rag_api)
  - **网站:** [github.com/LibreChat-AI/librechat.ai](https://github.com/LibreChat-AI/librechat.ai)

**其他：**
  - **网站:** [librechat.ai](https://librechat.ai)
  - **文档:** [docs.librechat.ai](https://docs.librechat.ai)
  - **博客:** [blog.librechat.ai](https://blog.librechat.ai)

---

## 📝 更新日志

通过访问发行页面和说明来保持对最新更新的了解：
- [发行版](https://github.com/danny-avila/LibreChat/releases)
- [更新日志](https://www.librechat.ai/changelog) 

**⚠️ 请在更新之前参阅 [更新日志](https://www.librechat.ai/changelog) 以了解重大变更。**

---

## ⭐ 星标历史

<p align="center">
  <a href="https://star-history.com/#danny-avila/LibreChat&Date">
    <img alt="星标历史图" src="https://api.star-history.com/svg?repos=danny-avila/LibreChat&type=Date&theme=dark" onerror="this.src='https://api.star-history.com/svg?repos=danny-avila/LibreChat&type=Date'" />
  </a>
</p>
<p align="center">
  <a href="https://trendshift.io/repositories/4685" target="_blank" style="padding: 10px;">
    <img src="https://trendshift.io/api/badge/repositories/4685" alt="danny-avila%2FLibreChat | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/>
  </a>
  <a href="https://runacap.com/ross-index/q1-24/" target="_blank" rel="noopener" style="margin-left: 20px;">
    <img style="width: 260px; height: 56px" src="https://runacap.com/wp-content/uploads/2024/04/ROSS_badge_white_Q1_2024.svg" alt="ROSS Index - 2024 年第一季度增长最快的开源初创公司 | Runa Capital" width="260" height="56"/>
  </a>
</p>

---

## ✨ 贡献

欢迎贡献、建议、错误报告和修复！

对于新功能、组件或扩展，请在发送 Pull Request 之前先打开一个问题进行讨论。

---

## 💖 本项目能以现有状态存在，得益于所有贡献者

<a href="https://github.com/danny-avila/LibreChat/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=danny-avila/LibreChat" />
</a>
