# 环境变量配置示例

## 基础系统变量

```bash
# 应用环境
NODE_ENV=production
LOG_LEVEL=info
ENVIRONMENT=basic

# 应用配置
APP_URL=https://your-app-url.com
PORT=3000
```

## OpenClaw系统变量

```bash
# 用户信息
OPENCLAW_USER_ID=user_123456
OPENCLAW_SUBSCRIPTION_ID=sub_789012
OPENCLAW_PLAN=BASIC
OPENCLAW_INSTANCE_NAME=moltbot-basic-1708878234
OPENCLAW_CREATED_AT=2026-02-27T10:30:00.000Z

# 计划限制
PLAN_MAX_INSTANCES=1
PLAN_MAX_CHANNELS=3
PLAN_MAX_BANDWIDTH=5
PLAN_MAX_BANDWIDTH_UNIT=GB
PLAN_SUPPORT_LEVEL=community
```

## 通道凭证配置

### 飞书 (Feishu)

```bash
# 飞书应用配置
FEISHU_APP_ID=cli_a1b2c3d4e5f6
FEISHU_SECRET=your_feishu_secret_here
FEISHU_TOKEN=your_feishu_token_here

# 飞书完整配置 (JSON格式)
FEISHU_CONFIG={"appId":"cli_a1b2c3d4e5f6","secret":"your_feishu_secret_here","token":"your_feishu_token_here"}
```

### 钉钉 (DingTalk)

```bash
# 钉钉应用配置
DINGTALK_APP_KEY=dingoxxxxxxxxxxxxxxxxxxxx
DINGTALK_APP_SECRET=your_dingtalk_secret_here

# 钉钉完整配置
DINGTALK_CONFIG={"appKey":"dingoxxxxxxxxxxxxxxxxxxxx","appSecret":"your_dingtalk_secret_here"}
```

### 企业微信 (WeCom)

```bash
# 企业微信应用配置
WECOM_CORP_ID=wwxxxxxxxxxxxxxxxxxxxx
WECOM_SECRET=your_wecom_secret_here
WECOM_AGENT_ID=1000002

# 企业微信完整配置
WECOM_CONFIG={"corpId":"wwxxxxxxxxxxxxxxxxxxxx","secret":"your_wecom_secret_here","agentId":1000002}
```

### Telegram

```bash
# Telegram机器人配置
TELEGRAM_TOKEN=123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ
TELEGRAM_BOT_ID=123456789

# Telegram完整配置
TELEGRAM_CONFIG={"token":"123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ","botId":123456789}
```

## 数据库配置

```bash
# PostgreSQL数据库
DATABASE_URL=postgresql://username:password@localhost:5432/openclaw_subscription

# 数据库连接池配置
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_IDLE_TIMEOUT=10000
```

## 支付配置

```bash
# 支付宝配置
ALIPAY_APP_ID=2021001123456789
ALIPAY_MERCHANT_PRIVATE_KEY=your_private_key_here
ALIPAY_PUBLIC_KEY=alipay_public_key_here
ALIPAY_NOTIFY_URL=https://your-app-url.com/api/payment/alipay/notify

# 微信支付配置
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_MCH_ID=1234567890
WECHAT_API_KEY=your_wechat_api_key_here
WECHAT_NOTIFY_URL=https://your-app-url.com/api/payment/wechat/notify
```

## Railway配置

```bash
# Railway API配置
RAILWAY_API_TOKEN=your_railway_api_token_here
RAILWAY_TEMPLATE_PROJECT_ID=proj_xxxxxxxxxxxxxxxx
RAILWAY_TEMPLATE_SERVICE_ID=svc_xxxxxxxxxxxxxxxx

# Railway模板配置
RAILWAY_TEMPLATE_REPO=github.com/yourusername/your-repo
RAILWAY_TEMPLATE_BRANCH=main
RAILWAY_TEMPLATE_PROVIDER=github
```

## 监控配置

```bash
# 监控间隔 (毫秒)
MONITOR_CHECK_INTERVAL=30000

# 告警阈值 (毫秒)
MONITOR_ALERT_THRESHOLD=300000

# 通知配置
MONITOR_NOTIFICATION_ENABLED=true
MONITOR_NOTIFICATION_WEBHOOK=https://your-webhook-url.com

# 部署超时 (毫秒)
DEPLOYMENT_TIMEOUT=600000
MAX_DEPLOYMENT_ATTEMPTS=3
```

## 安全配置

```bash
# 加密密钥 (必须32字节)
ENCRYPTION_KEY=your_encryption_key_here_32_bytes

# JWT配置
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# CORS配置
CORS_ORIGIN=https://your-frontend-url.com
```

## 日志配置

```bash
# 日志级别
LOG_LEVEL=info

# 日志输出
LOG_OUTPUT=console  # console, file, or both

# 日志文件路径 (如果使用文件输出)
LOG_FILE_PATH=/var/log/openclaw/app.log
LOG_ERROR_FILE_PATH=/var/log/openclaw/error.log
```

## 缓存配置

```bash
# Redis配置
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# 缓存TTL (秒)
CACHE_TTL=3600
SESSION_CACHE_TTL=86400
```

## 邮件配置 (可选)

```bash
# SMTP配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 邮件模板
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=OpenClaw Team
```

## 配置管理

### 环境变量优先级

1. **系统环境变量** (最高优先级)
2. **.env文件**
3. **默认值**

### 配置验证

```typescript
// 配置验证示例
const requiredEnvVars = [
  'RAILWAY_API_TOKEN',
  'RAILWAY_TEMPLATE_PROJECT_ID',
  'RAILWAY_TEMPLATE_SERVICE_ID',
  'ENCRYPTION_KEY',
  'DATABASE_URL',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
```

### 配置备份

```bash
# 导出配置
npm run config:export

# 导入配置
npm run config:import
```

## 故障排除

### 常见问题

1. **环境变量未生效**
   - 检查变量名拼写
   - 重启应用
   - 检查环境变量优先级

2. **加密失败**
   - 检查加密密钥长度 (必须32字节)
   - 验证加密算法
   - 检查数据格式

3. **数据库连接失败**
   - 检查DATABASE_URL格式
   - 验证数据库权限
   - 检查网络连接

### 调试配置

```bash
# 启用调试模式
DEBUG=openclaw:* npm run dev

# 查看特定服务的调试信息
DEBUG=openclaw:environment-service npm run dev
DEBUG=openclaw:railway-service npm run dev
```

## 安全最佳实践

### 密钥管理

1. **不要将密钥提交到版本控制**
2. **使用密钥管理服务** (如AWS Secrets Manager)
3. **定期轮换密钥**
4. **使用不同的密钥用于不同环境**

### 环境变量安全

1. **敏感信息标记为`isSecret`**
2. **不在日志中记录敏感值**
3. **使用加密存储敏感配置**
4. **限制环境变量访问权限**

### 生产环境建议

```bash
# 使用环境变量文件
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://...

# 使用密钥管理服务
# AWS Secrets Manager
# HashiCorp Vault
# Azure Key Vault
```

## 相关文档

- [Railway自动化部署配置](./RAILWAY_DEPLOYMENT_CONFIG.md)
- [Phase 3完整实现](./PHASE_3_COMPLETE.md)
- [技能安装指南](./技能安装指南.md)