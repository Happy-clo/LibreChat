# Docker环境变量快速参考

## 格式

`LIBRECHAT_<YAML路径_大写_用下划线分隔>`

## 快速示例

### 基础设置

```bash
LIBRECHAT_CACHE=true
LIBRECHAT_INTERFACE_CUSTOMWELCOME="欢迎！"
```

### Turnstile验证码

```bash
LIBRECHAT_TURNSTILE_SITEKEY="你的密钥"
LIBRECHAT_TURNSTILE_OPTIONS_THEME="light"
LIBRECHAT_TURNSTILE_OPTIONS_SIZE="normal"
```

### 注册

```bash
LIBRECHAT_REGISTRATION_ENABLED=true
LIBRECHAT_REGISTRATION_SOCIALLOGINS='["google","github"]'
```

### 文件存储

```bash
LIBRECHAT_FILESTRATEGY="local"
# 或更细粒度的配置：
LIBRECHAT_FILESTRATEGY_AVATAR="s3"
LIBRECHAT_FILESTRATEGY_IMAGE="firebase"
LIBRECHAT_FILESTRATEGY_DOCUMENT="local"
```

### 界面切换

```bash
LIBRECHAT_INTERFACE_ENDPOINTSMENU=true
LIBRECHAT_INTERFACE_MODELSELECT=true
LIBRECHAT_INTERFACE_FILESEARCH=true
LIBRECHAT_INTERFACE_AGENTS=true
LIBRECHAT_INTERFACE_MULTICONVO=true
```

### 隐私和条款

```bash
LIBRECHAT_INTERFACE_PRIVACYPOLICY_EXTERNALURL="https://example.com/privacy"
LIBRECHAT_INTERFACE_PRIVACYPOLICY_OPENNEWTAB=true
LIBRECHAT_INTERFACE_TERMSOFSERVICE_EXTERNALURL="https://example.com/tos"
LIBRECHAT_INTERFACE_TERMSOFSERVICE_MODALACCEPTANCE=true
```

## 值类型转换

| 输入             | 转换为           |
| ---------------- | ---------------- |
| `true` / `false` | 布尔值           |
| `123`            | 数字             |
| `null`           | 空值             |
| `'["a","b"]'`    | 数组（JSON解析） |
| `'{"x":1}'`      | 对象（JSON解析） |
| `"text"`         | 字符串           |

## Docker Compose模板

```yaml
version: '3.8'
services:
  librechat:
    image: librechat:latest
    ports:
      - '3080:3080'
    environment:
      # 核心
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

## Docker Run命令

```bash
docker run -d \
  -p 3080:3080 \
  -e LIBRECHAT_CACHE=true \
  -e LIBRECHAT_TURNSTILE_SITEKEY="你的密钥" \
  -e LIBRECHAT_INTERFACE_CUSTOMWELCOME="欢迎！" \
  librechat:latest
```

## 路径转换

YAML → 环境变量

```
cache → LIBRECHAT_CACHE
interface.customWelcome → LIBRECHAT_INTERFACE_CUSTOMWELCOME
turnstile.siteKey → LIBRECHAT_TURNSTILE_SITEKEY
registration.socialLogins → LIBRECHAT_REGISTRATION_SOCIALLOGINS
interface.privacyPolicy.externalUrl → LIBRECHAT_INTERFACE_PRIVACYPOLICY_EXTERNALURL
```

## 常见错误

❌ 不要：变量名中使用点

```bash
LIBRECHAT_INTERFACE.CUSTOMWELCOME=...  # 错误
```

✅ 正确：用下划线作为分隔符

```bash
LIBRECHAT_INTERFACE_CUSTOMWELCOME=...  # 正确
```

---

❌ 不要：忘记LIBRECHAT\_前缀

```bash
INTERFACE_CUSTOMWELCOME=...  # 不生效
```

✅ 正确：包含LIBRECHAT\_前缀

```bash
LIBRECHAT_INTERFACE_CUSTOMWELCOME=...  # 有效
```

---

❌ 不要：使用不适当的大小写

```bash
LIBRECHAT_Interface_CustomWelcome=...  # 错误（虽然不区分大小写，但不推荐）
```

✅ 正确：使用大写

```bash
LIBRECHAT_INTERFACE_CUSTOMWELCOME=...  # 正确
```

## 调试

检查日志中应用的变量：

```
[loadCustomConfig] Environment variables applied: [
  'LIBRECHAT_CACHE',
  'LIBRECHAT_TURNSTILE_SITEKEY'
]
```

启用调试日志查看覆盖详情：

```
[loadCustomConfig] Env var override: CACHE = true
[loadCustomConfig] Env var override: TURNSTILE_SITEKEY = "你的密钥"
```

## 参考表

| 设置              | 环境变量                                       | 示例值                |
| ----------------- | ---------------------------------------------- | --------------------- |
| 缓存              | LIBRECHAT_CACHE                                | true                  |
| 自定义欢迎        | LIBRECHAT_INTERFACE_CUSTOMWELCOME              | "欢迎！"              |
| 文件搜索          | LIBRECHAT_INTERFACE_FILESEARCH                 | true                  |
| 端点菜单          | LIBRECHAT_INTERFACE_ENDPOINTSMENU              | true                  |
| 模型选择          | LIBRECHAT_INTERFACE_MODELSELECT                | true                  |
| 参数              | LIBRECHAT_INTERFACE_PARAMETERS                 | true                  |
| 侧边栏            | LIBRECHAT_INTERFACE_SIDEPANEL                  | true                  |
| 预设              | LIBRECHAT_INTERFACE_PRESETS                    | true                  |
| 提示词            | LIBRECHAT_INTERFACE_PROMPTS                    | true                  |
| 书签              | LIBRECHAT_INTERFACE_BOOKMARKS                  | true                  |
| 多对话            | LIBRECHAT_INTERFACE_MULTICONVO                 | true                  |
| 代理              | LIBRECHAT_INTERFACE_AGENTS                     | true                  |
| 文件引用          | LIBRECHAT_INTERFACE_FILECITATIONS              | true                  |
| 市场              | LIBRECHAT_INTERFACE_MARKETPLACE_USE            | false                 |
| 临时聊天保留      | LIBRECHAT_INTERFACE_TEMPORARYCHATRETENTION     | 720                   |
| 注册启用          | LIBRECHAT_REGISTRATION_ENABLED                 | true                  |
| 社交登录          | LIBRECHAT_REGISTRATION_SOCIALLOGINS            | '["google","github"]' |
| 文件策略          | LIBRECHAT_FILESTRATEGY                         | local                 |
| Turnstile站点密钥 | LIBRECHAT_TURNSTILE_SITEKEY                    | 密钥                  |
| Turnstile主题     | LIBRECHAT_TURNSTILE_OPTIONS_THEME              | light                 |
| Turnstile大小     | LIBRECHAT_TURNSTILE_OPTIONS_SIZE               | normal                |
| 隐私政策URL       | LIBRECHAT_INTERFACE_PRIVACYPOLICY_EXTERNALURL  | https://...           |
| 条款URL           | LIBRECHAT_INTERFACE_TERMSOFSERVICE_EXTERNALURL | https://...           |
