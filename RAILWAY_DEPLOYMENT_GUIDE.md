# OpenClaw 订阅网站 Railway 部署指南

## 📋 部署前准备

### 1. Railway 账户设置
- [ ] 注册 Railway 账户: https://railway.app
- [ ] 创建 API Token: Settings → Tokens
- [ ] 安装 Railway CLI: `npm install -g @railway/cli`

### 2. 环境变量配置
在 Railway 项目中设置以下环境变量：

#### 认证配置
```bash
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
```

#### 数据库配置
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

#### 支付宝配置
```bash
ALIPAY_APP_ID=your-alipay-app-id
ALIPAY_PRIVATE_KEY=your-alipay-private-key
ALIPAY_PUBLIC_KEY=your-alipay-public-key
ALIPAY_NOTIFY_URL=https://your-domain.com/api/payment/alipay/notify
```

#### 微信支付配置
```bash
WECHAT_MCHID=your-wechat-mchid
WECHAT_API_V3_KEY=your-wechat-api-v3-key
WECHAT_API_CERT_PATH=/path/to/apiclient_cert.pem
WECHAT_API_KEY_PATH=/path/to/apiclient_key.pem
WECHAT_NOTIFY_URL=https://your-domain.com/api/payment/wechat/notify
```

#### Railway 配置
```bash
RAILWAY_PUBLIC_DOMAIN=your-railway-domain.railway.app
RAILWAY_ENVIRONMENT=production
```

## 🚀 部署步骤

### 1. 项目初始化
```bash
# 进入项目目录
cd openclaw-subscription-site

# 初始化 Railway 项目
railway init

# 登录 Railway
railway login
```

### 2. 本地测试
```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入测试环境变量

# 启动开发服务器
npm run dev
```

### 3. Railway 部署
```bash
# 推送代码到 Railway
railway up

# 查看部署状态
railway status

# 查看日志
railway logs
```

### 4. 验证部署
```bash
# 访问部署的应用
curl https://your-project.railway.app/health

# 检查 API 端点
curl https://your-project.railway.app/api/auth/profile
```

## 🔧 配置文件说明

### railway.toml
主配置文件，定义构建和部署设置：
- 构建配置：使用 Dockerfile.railway
- 部署配置：自动重启策略
- 环境变量：所有必要的环境变量
- 服务配置：健康检查和资源限制

### Dockerfile.railway
优化的 Docker 镜像构建配置：
- 使用 Node.js 22 官方镜像
- 安装必要依赖
- 构建前端应用
- 创建 Railway 兼容的服务器

### .railwayignore
忽略不需要部署的文件和目录。

## 📊 监控和维护

### 1. 健康检查
应用提供 `/health` 端点用于健康检查：
```bash
curl https://your-project.railway.app/health
```

### 2. 日志监控
```bash
# 实时查看日志
railway logs --follow

# 查看特定服务的日志
railway logs --service openclaw-subscription-site
```

### 3. 性能监控
- Railway 提供内置的性能监控
- 可以通过 Railway Dashboard 查看资源使用情况
- 设置告警规则：CPU > 80%, 内存 > 90%

### 4. 自动重启
配置了自动重启策略：
- 重启类型：always
- 最大重试次数：10
- 内存限制：512MB

## 🚨 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 查看构建日志
railway logs --build

# 重新构建
railway up --build
```

#### 2. 启动失败
```bash
# 查看启动日志
railway logs --deploy

# 重启服务
railway restart
```

#### 3. 环境变量问题
```bash
# 检查环境变量
railway variables

# 更新环境变量
railway variables set KEY=value
```

#### 4. 数据库连接问题
```bash
# 测试数据库连接
railway run "node -e \"require('pg').Client({connectionString: process.env.DATABASE_URL}).connect().then(() => console.log('DB connected')).catch(e => console.error('DB error:', e))\""
```

### 回滚策略
```bash
# 查看部署历史
railway deployments

# 回滚到特定版本
railway rollback <deployment-id>
```

## 🔄 更新和部署

### 1. 代码更新
```bash
# 提交代码更改
git add .
git commit -m "更新功能描述"

# 推送到 Railway
railway up
```

### 2. 环境变量更新
```bash
# 更新环境变量
railway variables set NEW_VAR=value

# 重新部署以应用更改
railway up
```

### 3. 配置文件更新
```bash
# 更新 railway.toml 或 Dockerfile.railway
# 重新部署
railway up --build
```

## 📈 性能优化

### 1. 资源优化
- 内存限制：512MB（可根据需求调整）
- CPU 限制：Railway 自动管理
- 网络优化：使用 CDN 加速静态资源

### 2. 缓存策略
- 静态资源缓存：利用 Railway 的 CDN
- API 响应缓存：在应用层实现
- 数据库查询缓存：使用 Redis

### 3. 扩展性
- 水平扩展：Railway 自动处理
- 垂直扩展：增加内存限制
- 负载均衡：Railway 内置

## 🎯 最佳实践

### 1. 安全性
- 使用 HTTPS（Railway 自动提供）
- 定期更新依赖包
- 实施输入验证和输出编码
- 定期轮换密钥

### 2. 可维护性
- 保持代码整洁和文档更新
- 使用语义化版本控制
- 实施自动化测试
- 定期备份重要数据

### 3. 可靠性
- 实施健康检查
- 设置适当的超时和重试机制
- 监控关键指标
- 制定灾难恢复计划

## 📞 支持

如遇到问题，请参考：
- Railway 官方文档：https://docs.railway.app/
- 本项目的 GitHub Issues
- Railway 社区论坛

---

**部署成功后，您的 OpenClaw 订阅网站将在 Railway 上运行！** 🚀