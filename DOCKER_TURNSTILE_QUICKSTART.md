# 🐳 Docker Turnstile 快速启动指南

## 🚀 一键启用 Turnstile 保护

### 方法1: 使用环境变量文件

1. **复制环境变量模板**
```bash
cp .env.turnstile.example .env
```

2. **编辑 .env 文件，添加你的 Turnstile 密钥**
```bash
# 替换为你的实际密钥
TURNSTILE_SITE_KEY=0x4AAAAAAABkMYinukE8nzKf
TURNSTILE_SECRET_KEY=0x4AAAAAAABkMYinukE8nzKf_secret
```

3. **验证配置**
```bash
npm run validate-docker-turnstile
```

4. **启动应用**
```bash
npm run start-docker-turnstile
```

### 方法2: 直接设置环境变量

```bash
# 设置环境变量
export TURNSTILE_SITE_KEY=0x4AAAAAAABkMYinukE8nzKf
export TURNSTILE_SECRET_KEY=0x4AAAAAAABkMYinukE8nzKf_secret

# 启动应用
docker-compose up -d
```

### 方法3: Docker Compose Override

创建 `docker-compose.override.yml`:

```yaml
version: '3.8'

services:
  api:
    environment:
      - TURNSTILE_SITE_KEY=0x4AAAAAAABkMYinukE8nzKf
      - TURNSTILE_SECRET_KEY=0x4AAAAAAABkMYinukE8nzKf_secret
      - TURNSTILE_LANGUAGE=auto
      - TURNSTILE_SIZE=normal
      - TURNSTILE_THEME=auto
```

然后启动：
```bash
docker-compose up -d
```

## 🔍 验证 Turnstile 是否正常工作

### 1. 检查后端日志
```bash
docker-compose logs api | grep -i turnstile
```

预期输出：
```
✅ Turnstile is ENABLED via environment variables
✅ Site Key: 0x4AAAAAAA...
✅ Options: {"language":"auto","size":"normal","theme":"auto"}
```

### 2. 测试前端
1. 访问 http://localhost:3080/register
2. 检查是否显示 Turnstile 验证码
3. 完成验证码后提交按钮应该启用

### 3. 检查网络请求
在浏览器开发者工具中：
1. 打开 Network 标签
2. 提交注册表单
3. 检查 `/api/auth/register` 请求是否包含 `turnstileToken`

## 🛠️ 配置选项

### 环境变量说明

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `TURNSTILE_SITE_KEY` | ✅ | - | Cloudflare Turnstile 站点密钥 |
| `TURNSTILE_SECRET_KEY` | ✅ | - | Cloudflare Turnstile 密钥 |
| `TURNSTILE_LANGUAGE` | ❌ | `auto` | 语言设置 |
| `TURNSTILE_SIZE` | ❌ | `normal` | 验证码大小 |
| `TURNSTILE_THEME` | ❌ | `auto` | 主题设置 |

### 测试密钥

用于开发和测试的密钥：

```bash
# 总是通过验证的测试密钥
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

# 总是失败验证的测试密钥（用于测试错误处理）
TURNSTILE_SITE_KEY=2x00000000000000000000AB
TURNSTILE_SECRET_KEY=2x0000000000000000000000000000000AB
```

## 🔧 故障排除

### 问题1: 验证码不显示

**检查步骤：**
```bash
# 1. 验证环境变量
npm run validate-docker-turnstile

# 2. 检查容器日志
docker-compose logs api | grep -i turnstile

# 3. 检查浏览器控制台错误
```

### 问题2: 验证失败

**检查步骤：**
```bash
# 1. 确认密钥正确
echo $TURNSTILE_SECRET_KEY

# 2. 检查网络连接
curl -I https://challenges.cloudflare.com/turnstile/v0/api.js

# 3. 查看详细日志
docker-compose logs api | grep -E "(turnstile|error)"
```

### 问题3: 提交按钮始终禁用

**检查步骤：**
1. 打开浏览器开发者工具
2. 在控制台执行：
```javascript
console.log('Turnstile token:', window.turnstileToken);
console.log('Form errors:', window.formErrors);
```

## 📊 监控和日志

### 启用详细日志
```bash
# 在 .env 中添加
LOG_LEVEL=debug
NODE_ENV=development
```

### 实时监控
```bash
# 监控 Turnstile 相关日志
docker-compose logs -f api | grep -i turnstile

# 监控所有日志
docker-compose logs -f
```

## 🔄 自动化脚本

### 一键设置脚本
```bash
#!/bin/bash
# setup-turnstile.sh

echo "🔧 Setting up Turnstile for LibreChat..."

# 复制环境变量模板
cp .env.turnstile.example .env

echo "📝 Please edit .env file with your Turnstile keys:"
echo "   TURNSTILE_SITE_KEY=your-site-key"
echo "   TURNSTILE_SECRET_KEY=your-secret-key"

read -p "Press Enter after editing .env file..."

# 验证配置
npm run validate-docker-turnstile

if [ $? -eq 0 ]; then
    echo "✅ Configuration valid, starting LibreChat..."
    npm run start-docker-turnstile
else
    echo "❌ Configuration invalid, please check your settings"
fi
```

### 健康检查脚本
```bash
#!/bin/bash
# health-check.sh

echo "🏥 LibreChat Turnstile Health Check"

# 检查容器状态
if docker ps | grep -q "LibreChat"; then
    echo "✅ LibreChat container is running"
else
    echo "❌ LibreChat container is not running"
    exit 1
fi

# 检查 Turnstile 配置
if curl -s http://localhost:3080/api/config | grep -q "turnstile"; then
    echo "✅ Turnstile is configured"
else
    echo "⚠️  Turnstile may not be configured"
fi

# 检查注册页面
if curl -s http://localhost:3080/register | grep -q "turnstile"; then
    echo "✅ Registration page includes Turnstile"
else
    echo "⚠️  Registration page may not include Turnstile"
fi

echo "🎉 Health check completed"
```

## 📚 相关资源

- [Cloudflare Turnstile 文档](https://developers.cloudflare.com/turnstile/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [LibreChat 配置指南](https://docs.librechat.ai/)

---

通过以上步骤，你的 LibreChat Docker 实例将自动检测环境变量并启用 Turnstile 保护！