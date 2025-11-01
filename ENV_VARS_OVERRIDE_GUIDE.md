# LibreChat Docker环境变量配置指南

## 概述

增强的 `loadCustomConfig.js` 现在支持Docker环境变量覆盖 `librechat.yaml` 配置。这允许您完全通过Docker环境变量配置LibreChat，而无需挂载配置文件。

## 工作原理

### 环境变量格式

环境变量必须遵循以下模式：`LIBRECHAT_<CONFIG_PATH>`

其中 `<CONFIG_PATH>` 是YAML路径，具有以下特点：

- 段落用下划线 (`_`) 分隔
- 全小写

### 示例

#### 基础配置

```bash
# 启用缓存
LIBRECHAT_CACHE=true

# 禁用缓存
LIBRECHAT_CACHE=false
```

#### 嵌套配置

```bash
# 自定义欢迎消息
LIBRECHAT_INTERFACE_CUSTOMWELCOME="欢迎来到我们的聊天平台！"

# 启用文件搜索
LIBRECHAT_INTERFACE_FILESEARCH=true

# 配置隐私政策
LIBRECHAT_INTERFACE_PRIVACYPOLICY_EXTERNALURL="https://example.com/privacy"
LIBRECHAT_INTERFACE_PRIVACYPOLICY_OPENNEWTAB=true
```

#### 常见用例

##### Turnstile配置（用于CAPTCHA）

```bash
# 启用Turnstile CAPTCHA
LIBRECHAT_TURNSTILE_SITEKEY="你的turnstile站点密钥"
LIBRECHAT_TURNSTILE_OPTIONS_THEME="light"
LIBRECHAT_TURNSTILE_OPTIONS_SIZE="normal"
```

##### 注册设置

```bash
# 启用注册
LIBRECHAT_REGISTRATION_ENABLED=true

# 允许社交登录
LIBRECHAT_REGISTRATION_SOCIALLOGINS='["google", "github", "discord"]'

# 注册声明（需要JSON）
LIBRECHAT_REGISTRATION_CLAIMS='{"username": true, "email": true, "name": true}'
```

##### 文件存储策略配置

```bash
# 使用本地文件存储
LIBRECHAT_FILESTRATEGY="local"

# 或为不同类型使用不同策略
LIBRECHAT_FILESTRATEGY_AVATAR="s3"
LIBRECHAT_FILESTRATEGY_IMAGE="s3"
LIBRECHAT_FILESTRATEGY_DOCUMENT="local"
```

##### 界面设置

```bash
# 启用/禁用界面功能
LIBRECHAT_INTERFACE_ENDPOINTSMENU=true
LIBRECHAT_INTERFACE_MODELSELECT=true
LIBRECHAT_INTERFACE_PARAMETERS=true
LIBRECHAT_INTERFACE_SIDEPANEL=true
LIBRECHAT_INTERFACE_PRESETS=true
LIBRECHAT_INTERFACE_PROMPTS=true
LIBRECHAT_INTERFACE_BOOKMARKS=true
LIBRECHAT_INTERFACE_MULTICONVO=true
LIBRECHAT_INTERFACE_AGENTS=true
```

## 值类型转换

环境变量会自动解析并转换为适当的类型：

### 布尔值

```bash
LIBRECHAT_CACHE=true          # 转换为：true (布尔值)
LIBRECHAT_CACHE=false         # 转换为：false (布尔值)
```

### 数值

```bash
LIBRECHAT_INTERFACE_TEMPORARYCHATRETENTION=720  # 转换为：720 (数字)
```

### 空值

```bash
LIBRECHAT_SOMEVALUE=null      # 转换为：null
```

### JSON数组

```bash
LIBRECHAT_REGISTRATION_SOCIALLOGINS='["google", "github"]'  # 解析为数组
```

### JSON对象

```bash
LIBRECHAT_REGISTRATION_CLAIMS='{"email": true, "username": true}'  # 解析为对象
```

### 字符串值

任何不匹配上述模式的值保持为字符串：

```bash
LIBRECHAT_INTERFACE_CUSTOMWELCOME="你好世界！"  # 保持为字符串
```

## Docker使用示例

### Docker Compose

创建 `docker-compose.yml` 或直接使用环境变量：

```yaml
version: '3.8'

services:
  librechat:
    image: librechat:latest
    ports:
      - '3080:3080'
    environment:
      # 基础配置
      LIBRECHAT_CACHE: 'true'

      # 界面
      LIBRECHAT_INTERFACE_CUSTOMWELCOME: '欢迎来到LibreChat！'
      LIBRECHAT_INTERFACE_FILESEARCH: 'true'

      # Turnstile
      LIBRECHAT_TURNSTILE_SITEKEY: '${TURNSTILE_SITE_KEY}'
      LIBRECHAT_TURNSTILE_OPTIONS_THEME: 'light'

      # 注册
      LIBRECHAT_REGISTRATION_ENABLED: 'true'
      LIBRECHAT_REGISTRATION_SOCIALLOGINS: '["google", "github"]'
```

### Docker Run命令

```bash
docker run -d \
  -p 3080:3080 \
  -e LIBRECHAT_CACHE=true \
  -e LIBRECHAT_INTERFACE_CUSTOMWELCOME="欢迎！" \
  -e LIBRECHAT_TURNSTILE_SITEKEY="你的密钥" \
  librechat:latest
```

### 使用.env文件

创建 `.env` 文件：

```bash
LIBRECHAT_CACHE=true
LIBRECHAT_INTERFACE_CUSTOMWELCOME=欢迎来到LibreChat！
LIBRECHAT_TURNSTILE_SITEKEY=你的turnstile密钥
LIBRECHAT_REGISTRATION_ENABLED=true
LIBRECHAT_REGISTRATION_SOCIALLOGINS=["google", "github"]
```

然后使用docker-compose：

```bash
docker-compose --env-file .env up
```

## 配置优先级

环境变量 **优先于** `librechat.yaml` 设置。

### 优先级顺序（从高到低）：

1. **Docker环境变量** (LIBRECHAT\_\*) - 最高优先级
2. **librechat.yaml配置** - 默认/回退值
3. **代码默认值** - 最低优先级

### 示例：

如果 `librechat.yaml` 包含：

```yaml
cache: false
interface:
  customWelcome: '默认欢迎'
```

并设置：

```bash
LIBRECHAT_CACHE=true
LIBRECHAT_INTERFACE_CUSTOMWELCOME="Docker欢迎"
```

最终配置将为：

```yaml
cache: true
interface:
  customWelcome: 'Docker欢迎'
```

## 日志和调试

当应用环境变量时，系统在启动时会记录它们：

```
[loadCustomConfig] Environment variables applied: [
  'LIBRECHAT_CACHE',
  'LIBRECHAT_INTERFACE_CUSTOMWELCOME',
  'LIBRECHAT_TURNSTILE_SITEKEY'
]
```

调试日志显示实际覆盖值：

```
[loadCustomConfig] Env var override: CACHE = true
[loadCustomConfig] Env var override: INTERFACE_CUSTOMWELCOME = "Docker欢迎"
```

## 常见配置示例

### 启用Turnstile的最小设置

```yaml
services:
  librechat:
    image: librechat:latest
    environment:
      LIBRECHAT_CACHE: 'true'
      LIBRECHAT_TURNSTILE_SITEKEY: '你的密钥'
      LIBRECHAT_REGISTRATION_ENABLED: 'true'
```

### 完整功能设置

```yaml
services:
  librechat:
    image: librechat:latest
    environment:
      # 核心配置
      LIBRECHAT_CACHE: 'true'
      LIBRECHAT_VERSION: '1.2.1'

      # 界面
      LIBRECHAT_INTERFACE_CUSTOMWELCOME: '欢迎来到我们的AI平台'
      LIBRECHAT_INTERFACE_FILESEARCH: 'true'
      LIBRECHAT_INTERFACE_ENDPOINTSMENU: 'true'
      LIBRECHAT_INTERFACE_MODELSELECT: 'true'
      LIBRECHAT_INTERFACE_AGENTS: 'true'

      # Turnstile CAPTCHA
      LIBRECHAT_TURNSTILE_SITEKEY: '${TURNSTILE_SITE_KEY}'
      LIBRECHAT_TURNSTILE_OPTIONS_THEME: 'light'
      LIBRECHAT_TURNSTILE_OPTIONS_SIZE: 'normal'

      # 注册
      LIBRECHAT_REGISTRATION_ENABLED: 'true'
      LIBRECHAT_REGISTRATION_SOCIALLOGINS: '["google", "github", "discord"]'
      LIBRECHAT_REGISTRATION_CLAIMS: '{"email": true, "username": true, "name": true}'

      # 文件存储
      LIBRECHAT_FILESTRATEGY_AVATAR: 's3'
      LIBRECHAT_FILESTRATEGY_IMAGE: 'local'
      LIBRECHAT_FILESTRATEGY_DOCUMENT: 'local'

      # 隐私和条款
      LIBRECHAT_INTERFACE_PRIVACYPOLICY_EXTERNALURL: 'https://example.com/privacy'
      LIBRECHAT_INTERFACE_TERMSOFSERVICE_EXTERNALURL: 'https://example.com/tos'
```

## 故障排除

### 环境变量未被应用

1. **检查变量名称**：必须以 `LIBRECHAT_` 开头（不区分大小写）
2. **验证YAML路径**：使用下划线作为分隔符，全小写
3. **检查日志**：在启动时查找"Environment variables applied"消息

### 无效配置错误

- 确保JSON值格式正确
- 特殊字符的字符串应加引号
- 布尔值应为 `true` 或 `false`（小写）

### 嵌套路径问题

如果不确定正确的路径：

1. 在 `librechat.yaml` 或文档中查找设置
2. 用下划线替换点和嵌套级别
3. 将环境变量名转换为大写

示例：

```yaml
# YAML路径
turnstile.options.theme

# 环境变量
LIBRECHAT_TURNSTILE_OPTIONS_THEME
```

## 优势

- ✅ **无需文件挂载** - 完全通过环境变量配置
- ✅ **Kubernetes友好** - 完美用于ConfigMaps和Secrets
- ✅ **Docker Swarm兼容** - 使用环境变量文件
- ✅ **易于CI/CD集成** - 在管道中设置变量
- ✅ **敏感数据在Secrets中** - 不在YAML文件中暴露密钥
- ✅ **环境特定配置** - 每个环境不同设置

## 高级用法：使用Kubernetes

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: librechat-config
data:
  LIBRECHAT_CACHE: 'true'
  LIBRECHAT_INTERFACE_CUSTOMWELCOME: '企业聊天'
  LIBRECHAT_TURNSTILE_OPTIONS_THEME: 'dark'

---
apiVersion: v1
kind: Secret
metadata:
  name: librechat-secrets
type: Opaque
stringData:
  LIBRECHAT_TURNSTILE_SITEKEY: '你的秘密密钥'

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: librechat
spec:
  template:
    spec:
      containers:
        - name: librechat
          image: librechat:latest
          envFrom:
            - configMapRef:
                name: librechat-config
            - secretRef:
                name: librechat-secrets
```

## 其他说明

- 环境变量在YAML文件加载 **之后** 合并
- 原始 `librechat.yaml` 文件仍然用作基础配置
- 如果不存在 `librechat.yaml` 文件，环境变量可单独配置系统
- 所有标准YAML配置选项都支持通过环境变量配置
