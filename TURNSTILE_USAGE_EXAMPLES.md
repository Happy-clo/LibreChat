# Turnstile 使用示例

## 🚀 快速开始

### 1. 获取 Cloudflare Turnstile 密钥

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的域名或创建新的
3. 进入 "Turnstile" 部分
4. 点击 "Add Site"
5. 配置站点设置：
   - **Site name**: LibreChat
   - **Domain**: 你的域名 (例如: `localhost`, `example.com`)
   - **Widget Mode**: Managed (推荐)
6. 获取 `Site Key` 和 `Secret Key`

### 2. 配置环境变量

在项目根目录的 `.env` 文件中添加：

```bash
# Turnstile 配置
TURNSTILE_SITE_KEY=0x4AAAAAAABkMYinukE8nzKf
TURNSTILE_SECRET_KEY=0x4AAAAAAABkMYinukE8nzKf_secret
```

### 3. 配置 librechat.yaml

```yaml
version: 1.2.1

# Turnstile 验证码配置
turnstile:
  siteKey: "${TURNSTILE_SITE_KEY}"
  options:
    language: "zh"        # 中文界面
    size: "normal"        # 正常大小
    theme: "auto"         # 自动主题
```

### 4. 验证配置

运行验证脚本检查配置：

```bash
npm run validate-turnstile
```

### 5. 启动应用

```bash
# 开发环境
npm run frontend:dev  # 终端1
npm run backend:dev   # 终端2

# 或使用 Docker
docker-compose up
```

## 📋 配置选项详解

### Turnstile 选项

```yaml
turnstile:
  siteKey: "${TURNSTILE_SITE_KEY}"
  options:
    # 语言设置
    language: "auto"      # 自动检测
    # language: "zh"      # 中文
    # language: "en"      # 英文
    
    # 大小设置
    size: "normal"        # 正常大小 (推荐)
    # size: "compact"     # 紧凑型
    # size: "flexible"    # 灵活大小
    # size: "invisible"   # 隐形模式
    
    # 主题设置
    theme: "auto"         # 自动跟随系统
    # theme: "light"      # 浅色主题
    # theme: "dark"       # 深色主题
```

### 环境特定配置

#### 开发环境
```bash
# .env.development
TURNSTILE_SITE_KEY=1x00000000000000000000AA  # 测试密钥
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA  # 测试密钥
```

#### 生产环境
```bash
# .env.production
TURNSTILE_SITE_KEY=0x4AAAAAAABkMYinukE8nzKf  # 真实密钥
TURNSTILE_SECRET_KEY=0x4AAAAAAABkMYinukE8nzKf_secret  # 真实密钥
```

## 🐳 Docker 配置示例

### docker-compose.override.yml

```yaml
version: '3.8'

services:
  api:
    environment:
      # Turnstile 配置
      - TURNSTILE_SITE_KEY=0x4AAAAAAABkMYinukE8nzKf
      - TURNSTILE_SECRET_KEY=0x4AAAAAAABkMYinukE8nzKf_secret
    volumes:
      # 挂载配置文件
      - ./librechat.yaml:/app/librechat.yaml
```

### 完整的 docker-compose.yml 示例

```yaml
version: '3.8'

services:
  api:
    image: ghcr.io/danny-avila/librechat-dev:latest
    container_name: LibreChat
    ports:
      - "3080:3080"
    depends_on:
      - mongodb
      - meilisearch
    environment:
      - HOST=0.0.0.0
      - PORT=3080
      - MONGO_URI=mongodb://mongodb:27017/LibreChat
      - MEILI_HOST=http://meilisearch:7700
      - MEILI_MASTER_KEY=your-meili-master-key
      
      # Turnstile 配置
      - TURNSTILE_SITE_KEY=0x4AAAAAAABkMYinukE8nzKf
      - TURNSTILE_SECRET_KEY=0x4AAAAAAABkMYinukE8nzKf_secret
    volumes:
      - ./librechat.yaml:/app/librechat.yaml
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    restart: always

  mongodb:
    image: mongo:latest
    container_name: chat-mongodb
    restart: always
    volumes:
      - ./data-node:/data/db
    command: mongod --noauth

  meilisearch:
    image: getmeili/meilisearch:v1.12.3
    container_name: chat-meilisearch
    restart: always
    environment:
      - MEILI_HOST=http://meilisearch:7700
      - MEILI_NO_ANALYTICS=true
      - MEILI_MASTER_KEY=your-meili-master-key
    volumes:
      - ./meili_data:/meili_data
```

## 🎨 UI 自定义示例

### 不同主题配置

```yaml
# 浅色主题配置
turnstile:
  siteKey: "${TURNSTILE_SITE_KEY}"
  options:
    theme: "light"
    size: "normal"
    language: "zh"

# 深色主题配置  
turnstile:
  siteKey: "${TURNSTILE_SITE_KEY}"
  options:
    theme: "dark"
    size: "compact"
    language: "en"

# 自适应配置（推荐）
turnstile:
  siteKey: "${TURNSTILE_SITE_KEY}"
  options:
    theme: "auto"      # 跟随系统主题
    size: "flexible"   # 自适应大小
    language: "auto"   # 自动检测语言
```

### 移动端优化

```yaml
turnstile:
  siteKey: "${TURNSTILE_SITE_KEY}"
  options:
    size: "compact"    # 移动端使用紧凑模式
    theme: "auto"
    language: "auto"
```

## 🔧 高级配置

### 条件启用 Turnstile

```yaml
# 仅在生产环境启用
turnstile:
  siteKey: "${TURNSTILE_SITE_KEY}"
  options:
    language: "auto"
    size: "normal"
    theme: "auto"

# 在开发环境中，不设置 TURNSTILE_SITE_KEY 即可禁用
```

### 多域名配置

如果你的应用部署在多个域名下，需要在 Cloudflare 中配置多个站点：

```yaml
# 主域名配置
turnstile:
  siteKey: "${TURNSTILE_SITE_KEY_MAIN}"
  options:
    language: "auto"
    size: "normal"
    theme: "auto"
```

### 与其他安全措施结合

```yaml
# 完整的安全配置示例
version: 1.2.1

# Turnstile 验证码
turnstile:
  siteKey: "${TURNSTILE_SITE_KEY}"
  options:
    language: "auto"
    size: "normal"
    theme: "auto"

# 注册限制
registration:
  socialLogins: ['google', 'github']
  allowedDomains:
    - "company.com"
    - "trusted-domain.com"

# 速率限制
rateLimits:
  fileUploads:
    ipMax: 50
    ipWindowInMinutes: 60
    userMax: 25
    userWindowInMinutes: 60
```

## 🧪 测试配置

### 本地测试

1. 使用 Cloudflare 提供的测试密钥：
```bash
# 测试环境密钥（总是通过验证）
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

# 测试环境密钥（总是失败验证）
TURNSTILE_SITE_KEY=2x00000000000000000000AB
TURNSTILE_SECRET_KEY=2x0000000000000000000000000000000AB
```

2. 运行验证脚本：
```bash
npm run validate-turnstile
```

3. 测试注册流程：
   - 访问 `http://localhost:3080/register`
   - 填写表单
   - 完成验证码
   - 提交注册

### 自动化测试

```bash
# 运行前端测试
cd client && npm test Registration.turnstile.test.tsx

# 运行后端测试
cd api && npm test validateTurnstile.test.js

# 运行端到端测试
npm run e2e
```

## 🚨 故障排除

### 常见问题及解决方案

#### 1. 验证码不显示

**问题**: 注册页面没有显示验证码组件

**解决方案**:
```bash
# 检查配置
npm run validate-turnstile

# 检查浏览器控制台错误
# 确认 siteKey 正确配置
```

#### 2. 验证失败

**问题**: 完成验证码后仍然提示验证失败

**可能原因**:
- Secret Key 错误
- 域名不匹配
- 网络连接问题

**解决方案**:
```bash
# 检查服务器日志
tail -f logs/librechat.log | grep -i turnstile

# 验证密钥配置
echo $TURNSTILE_SECRET_KEY

# 测试网络连接
curl -I https://challenges.cloudflare.com/turnstile/v0/api.js
```

#### 3. 提交按钮始终禁用

**问题**: 完成验证码后提交按钮仍然禁用

**检查项目**:
- 表单验证错误
- JavaScript 错误
- 验证码状态

**调试方法**:
```javascript
// 在浏览器控制台中检查
console.log('Form errors:', formErrors);
console.log('Turnstile token:', turnstileToken);
console.log('Require captcha:', requireCaptcha);
```

### 调试技巧

#### 启用详细日志

```bash
# 在 .env 中设置
LOG_LEVEL=debug
NODE_ENV=development
```

#### 查看网络请求

1. 打开浏览器开发者工具
2. 切换到 Network 标签
3. 提交表单
4. 检查 `/api/auth/register` 请求
5. 查看请求体是否包含 `turnstileToken`

#### 服务器端调试

```bash
# 查看 Turnstile 相关日志
grep -i turnstile logs/librechat.log

# 实时监控日志
tail -f logs/librechat.log | grep -E "(turnstile|captcha)"
```

## 📊 监控和分析

### 验证成功率监控

```javascript
// 在服务器端添加监控代码
const turnstileStats = {
  attempts: 0,
  successes: 0,
  failures: 0
};

// 在验证中间件中记录统计
logger.info('Turnstile stats', turnstileStats);
```

### 用户体验分析

- 监控验证完成时间
- 分析失败原因
- 收集用户反馈

## 🔄 维护和更新

### 定期检查

1. **密钥轮换**: 定期更新 Turnstile 密钥
2. **配置审查**: 检查配置是否仍然适用
3. **性能监控**: 监控验证对用户体验的影响
4. **安全审计**: 定期检查安全日志

### 更新流程

```bash
# 1. 备份当前配置
cp .env .env.backup
cp librechat.yaml librechat.yaml.backup

# 2. 更新配置
# 编辑 .env 和 librechat.yaml

# 3. 验证新配置
npm run validate-turnstile

# 4. 重启服务
docker-compose restart api
# 或
npm run backend:stop && npm run backend:dev
```

## 📚 相关资源

- [Cloudflare Turnstile 官方文档](https://developers.cloudflare.com/turnstile/)
- [React Turnstile 组件](https://github.com/marsidev/react-turnstile)
- [LibreChat 配置指南](https://docs.librechat.ai/)
- [TURNSTILE_INTEGRATION_GUIDE.md](./TURNSTILE_INTEGRATION_GUIDE.md)

---

通过以上配置，你的 LibreChat 实例将具备完整的 Turnstile 验证码保护功能！