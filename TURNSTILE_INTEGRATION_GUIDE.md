# LibreChat Turnstile 集成指南

## 概述

LibreChat 已完全集成 Cloudflare Turnstile 验证码系统，为注册和登录流程提供安全保护。本指南详细说明了如何配置和使用 Turnstile 功能。

## 🔧 配置步骤

### 1. 获取 Turnstile 密钥

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 "Turnstile" 部分
3. 创建新的站点
4. 获取 `Site Key` 和 `Secret Key`

### 2. 环境变量配置

在 `.env` 文件中添加以下配置：

```bash
# Turnstile 配置
TURNSTILE_SITE_KEY=your-site-key-here
TURNSTILE_SECRET_KEY=your-secret-key-here
```

### 3. librechat.yaml 配置

在 `librechat.yaml` 中配置 Turnstile：

```yaml
# Turnstile 验证码配置
turnstile:
  siteKey: "${TURNSTILE_SITE_KEY}"
  options:
    language: "auto"    # "auto" 或 ISO 639-1 语言代码 (如 zh, en)
    size: "normal"      # 选项: "normal", "compact", "flexible", "invisible"
    theme: "auto"       # 选项: "auto", "light", "dark"
```

## 🏗️ 架构说明

### 前端实现

#### 注册组件 (`client/src/components/Auth/Registration.tsx`)

```typescript
// 检查是否需要验证码
const requireCaptcha = !!startupConfig?.turnstile?.siteKey;

// Turnstile 组件
{startupConfig?.turnstile?.siteKey && (
  <div className="my-4 flex justify-center">
    <Turnstile
      siteKey={startupConfig.turnstile.siteKey}
      options={{
        ...startupConfig.turnstile?.options,
        theme: validTheme,
      }}
      onSuccess={(token) => setTurnstileToken(token)}
      onError={() => setTurnstileToken(null)}
      onExpire={() => setTurnstileToken(null)}
    />
  </div>
)}

// 提交按钮禁用逻辑
<Button
  disabled={
    Object.keys(errors).length > 0 ||
    isSubmitting ||
    (requireCaptcha && !turnstileToken)  // 需要验证码但未完成时禁用
  }
  type="submit"
>
```

#### 登录组件 (`client/src/components/Auth/LoginForm.tsx`)

登录组件使用相同的逻辑和UI模式。

### 后端实现

#### 中间件验证 (`api/server/middleware/validateTurnstile.js`)

```javascript
const validateTurnstile = async (req, res, next) => {
  try {
    // 检查 Turnstile 是否启用
    const appConfig = getAppConfig();
    const turnstileEnabled = !!appConfig?.turnstile?.siteKey;

    // 如果未启用，跳过验证
    if (!turnstileEnabled) {
      logger.debug('[validateTurnstile] Turnstile is disabled, skipping validation');
      return next();
    }

    const { turnstileToken } = req.body || {};

    // 验证 token 存在且有效
    if (!turnstileToken || typeof turnstileToken !== 'string' || turnstileToken.trim() === '') {
      return res.status(400).json({
        message: 'Captcha verification is required.',
      });
    }

    // 验证 Turnstile token
    const turnstileResult = await verifyTurnstileToken(turnstileToken);
    
    if (!turnstileResult || !turnstileResult.success || !turnstileResult.verified) {
      return res.status(400).json({
        message: 'Captcha verification failed. Please try again.',
      });
    }

    req.turnstileVerified = true;
    next();
  } catch (error) {
    logger.error('[validateTurnstile] Error during Turnstile validation:', error);
    return res.status(500).json({
      message: 'Internal server error during captcha verification.',
    });
  }
};
```

#### 路由配置 (`api/server/routes/auth.js`)

```javascript
// 注册路由 - 包含 Turnstile 验证
router.post(
  '/register',
  middleware.registerLimiter,
  middleware.checkBan,
  middleware.validateTurnstile,  // Turnstile 验证中间件
  middleware.checkInviteUser,
  middleware.validateRegistration,
  registrationController,
);

// 登录路由 - 包含 Turnstile 验证
router.post(
  '/login',
  middleware.logHeaders,
  middleware.loginLimiter,
  middleware.checkBan,
  middleware.validateTurnstile,  // Turnstile 验证中间件
  ldapAuth ? middleware.requireLdapAuth : middleware.requireLocalAuth,
  setBalanceConfig,
  loginController,
);
```

#### 服务层验证 (`api/server/services/AuthService.js`)

```javascript
const registerUser = async (user, additionalData = {}) => {
  const { email, password, name, username, turnstileToken } = user;

  try {
    const appConfig = await getAppConfig();
    
    // 检查 Turnstile 是否启用
    const turnstileEnabled = !!appConfig?.turnstile?.siteKey;
    
    if (turnstileEnabled) {
      if (!turnstileToken) {
        return { status: 400, message: 'Captcha verification is required.' };
      }
      
      const turnstileResult = await verifyTurnstileToken(turnstileToken);
      if (!turnstileResult.success || !turnstileResult.verified) {
        return { status: 400, message: 'Captcha verification failed. Please try again.' };
      }
    }
    
    // 继续注册流程...
  } catch (error) {
    // 错误处理...
  }
};
```

## 🔄 工作流程

### 启用 Turnstile 时的流程

```
用户访问注册页面
  ↓
检查 startupConfig.turnstile.siteKey
  ↓
显示 Turnstile 验证码组件
  ↓
用户完成验证码，获得 token
  ↓
提交按钮启用
  ↓
表单提交，发送 turnstileToken 到后端
  ↓
后端 validateTurnstile 中间件检查：
  ├─ 检查启用状态 (启用 ✓)
  ├─ 检查 token 存在且有效 ✓
  └─ 通过 verifyTurnstileToken 服务验证 token ✓
  ↓
验证成功，继续处理注册/登录
```

### 禁用 Turnstile 时的流程

```
用户访问注册页面
  ↓
检查 startupConfig.turnstile.siteKey (未配置)
  ↓
不显示验证码组件
  ↓
提交按钮始终启用
  ↓
表单提交，不发送 turnstileToken
  ↓
后端 validateTurnstile 中间件检查：
  ├─ 检查启用状态 (禁用 ✓)
  └─ 跳过所有验证，调用 next()
  ↓
直接处理注册/登录
```

## 🛡️ 安全特性

### 1. 多层验证
- **前端验证**: 检查 token 存在才允许提交
- **中间件验证**: 服务器端验证 token 有效性
- **服务层验证**: 双重检查确保安全

### 2. 类型安全
```javascript
// 检查 token 类型和内容
if (!turnstileToken || typeof turnstileToken !== 'string' || turnstileToken.trim() === '') {
  // 拒绝请求
}
```

### 3. 配置驱动
- 仅当配置了 `siteKey` 时才启用验证
- 支持动态启用/禁用
- 向后兼容性保证

### 4. 详细日志
```javascript
logger.info('[validateTurnstile] Turnstile verification successful', {
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  tokenLength: turnstileToken.length,
});
```

## 🧪 测试场景

### 后端测试 (Turnstile 启用)
- [ ] 未提供 token → 400 错误
- [ ] 提供空字符串 token → 400 错误  
- [ ] 提供无效 token → 400 错误
- [ ] 提供有效 token → 请求通过

### 后端测试 (Turnstile 禁用)
- [ ] 未提供 token → 请求通过
- [ ] 提供或不提供 token → 均通过

### 前端测试 (Turnstile 已配置)
- [ ] 验证码组件显示
- [ ] 未完成验证时提交按钮禁用
- [ ] 完成后提交按钮启用

### 前端测试 (Turnstile 未配置)
- [ ] 验证码组件隐藏
- [ ] 提交按钮始终启用

## 🔧 故障排除

### 常见问题

1. **验证码不显示**
   - 检查 `librechat.yaml` 中的 `siteKey` 配置
   - 确认环境变量正确设置
   - 检查浏览器控制台错误

2. **验证失败**
   - 确认 `secretKey` 正确配置
   - 检查网络连接
   - 查看服务器日志

3. **提交按钮始终禁用**
   - 检查表单验证错误
   - 确认 Turnstile token 状态
   - 查看浏览器开发者工具

### 调试日志

启用详细日志：
```bash
# 在 .env 中设置
LOG_LEVEL=debug
```

查看关键日志：
```bash
# 搜索 Turnstile 相关日志
grep -i turnstile logs/librechat.log
```

## 📝 配置示例

### 完整的 librechat.yaml 配置

```yaml
version: 1.2.1

# Turnstile 验证码配置
turnstile:
  siteKey: "0x4AAAAAAABkMYinukE8nzKf"
  options:
    language: "zh"        # 中文界面
    size: "normal"        # 正常大小
    theme: "auto"         # 自动主题

# 注册配置
registration:
  socialLogins: ['github', 'google']
  allowedDomains:
    - "example.com"
    - "company.com"

# 接口配置
interface:
  customWelcome: '欢迎使用 LibreChat！'
  endpointsMenu: true
  modelSelect: true
```

### Docker Compose 环境变量

```yaml
# docker-compose.override.yml
services:
  api:
    environment:
      - TURNSTILE_SITE_KEY=0x4AAAAAAABkMYinukE8nzKf
      - TURNSTILE_SECRET_KEY=0x4AAAAAAABkMYinukE8nzKf_secret
```

## 🚀 最佳实践

1. **生产环境**
   - 使用环境变量存储密钥
   - 启用详细日志记录
   - 定期轮换密钥

2. **开发环境**
   - 使用测试密钥
   - 可以临时禁用验证码进行调试

3. **用户体验**
   - 选择合适的验证码大小和主题
   - 提供清晰的错误提示
   - 支持多语言界面

4. **安全考虑**
   - 结合其他安全措施（速率限制、IP 封禁）
   - 监控验证失败率
   - 定期更新 Turnstile 配置

## 📚 相关文档

- [Cloudflare Turnstile 官方文档](https://developers.cloudflare.com/turnstile/)
- [LibreChat 配置指南](https://docs.librechat.ai/install/configuration/custom_config)
- [React Turnstile 组件文档](https://github.com/marsidev/react-turnstile)

---

通过以上配置，LibreChat 将具备完整的 Turnstile 验证码保护功能，有效防止自动化攻击和垃圾注册。