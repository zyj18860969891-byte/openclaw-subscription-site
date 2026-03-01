# OpenClaw Subscription Platform

完整的OpenClaw月度订阅网站后端实现

## 快速开始

<!-- 环境变量更新 -->

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 并填写以下关键信息:
# - DATABASE_URL: PostgreSQL连接字符串
# - JWT_SECRET: JWT密钥（最少32字符）
# - 支付相关密钥（支付宝、微信）
```

### 3. 初始化数据库

```bash
# 生成Prisma客户端
npm run prisma:generate

# 运行迁移
npm run prisma:migrate

# （可选）执行种子数据
npm run prisma:seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动

## 项目结构

```
openclaw-subscription-site/
├── src/
│   ├── config/          # 配置文件
│   ├── middleware/      # Express中间件
│   ├── routes/          # API路由
│   ├── services/        # 业务逻辑层
│   │   ├── auth/        # 认证相关服务
│   │   ├── payment/     # 支付相关服务
│   │   └── deployment/  # Railway部署服务
│   ├── utils/           # 工具函数
│   └── index.ts         # 应用入口
├── prisma/
│   └── schema.prisma    # 数据库schema
├── tests/               # 测试文件
├── .env.example         # 环境变量示例
├── package.json
└── tsconfig.json
```

## API 文档

### 认证相关 (Phase 1 ✅)

#### 注册新用户
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe"
}
```

**响应:**
```json
{
  "success": true,
  "code": "REGISTRATION_SUCCESS",
  "message": "注册成功",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "fullName": "John Doe"
    },
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": "7d"
  }
}
```

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### 刷新令牌
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "..."
}
```

#### 用户登出
```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
```

#### 获取用户信息
```http
GET /api/auth/profile
Authorization: Bearer {accessToken}
```

#### 更新用户信息
```http
PUT /api/auth/profile
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fullName": "New Name"
}
```

#### 修改密码
```http
POST /api/auth/change-password
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

## 开发阶段规划

### ✅ Phase 1: 数据库和认证 (已完成)
- [x] 数据库Schema设计
- [x] Prisma ORM集成
- [x] 用户注册系统
- [x] 用户登录系统
- [x] JWT令牌管理
- [x] 密码加密和验证
- [x] 认证中间件
- [x] 用户信息管理

### 🔄 Phase 2: 支付集成 (下周)
- [ ] 支付宝SDK集成
- [ ] 微信支付SDK集成
- [ ] 支付订单创建
- [ ] 支付回调处理
- [ ] 支付状态查询

### ⏳ Phase 3: Railway部署 (后周)
- [ ] Railway API集成
- [ ] 自动部署逻辑
- [ ] 环境变量配置
- [ ] 实例管理

### ⏳ Phase 4: 前端UI
- [ ] React项目设置
- [ ] 定价页面
- [ ] 订阅表单
- [ ] 支付页面

### ⏳ Phase 5: 测试和优化
- [ ] 单元测试
- [ ] E2E测试
- [ ] 性能优化
- [ ] 安全审计

## 依赖说明

### 核心依赖
- **express**: Web框架
- **typescript**: 类型系统
- **@prisma/client**: ORM库
- **jsonwebtoken**: JWT认证
- **bcrypt**: 密码加密

### 支付相关 (Phase 2)
- **alipay-sdk**: 支付宝官方SDK
- **wechatpay-node-sdk**: 微信支付官方SDK

### 工具库
- **axios**: HTTP客户端
- **joi**: 数据验证
- **cors**: 跨域资源共享
- **helmet**: 安全头设置
- **express-validator**: 请求验证

## 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm test -- --coverage
```

## 部署

### Railway部署

```bash
# 构建
npm run build

# 推送到Railway
git push heroku main
```

### 环境变量配置

在Railway控制面板中配置以下变量：
- NODE_ENV=production
- DATABASE_URL=postgresql://...
- JWT_SECRET=...
- ALIPAY_APP_ID=...
- WECHAT_MCHID=...
- etc.

## 常见问题

### Q: 如何重置数据库？
```bash
npm run db:reset
```

### Q: 如何更新Prisma Schema？
编辑 `prisma/schema.prisma` 后运行：
```bash
npm run prisma:migrate -- --name description_of_change
```

### Q: 如何调试？
```bash
# 使用 node inspector
node --inspect dist/index.js

# 或在VS Code中使用launch.json配置
```

## 安全建议

1. **永远不要在代码中硬编码密钥** - 使用环境变量
2. **定期更换JWT密钥** - 建议每3个月更换一次
3. **使用HTTPS** - 生产环境必须使用HTTPS
4. **启用CORS限制** - 只允许前端域名访问
5. **实施速率限制** - 防止暴力破解
6. **记录所有认证事件** - 审计日志

## 性能优化

1. **启用Redis缓存** - 缓存用户会话
2. **数据库索引** - 已在Schema中定义关键索引
3. **连接池** - Prisma自动管理
4. **gzip压缩** - 由Express.js处理

## 支持和反馈

如有问题或建议，请：
1. 查看项目文档
2. 检查GitHub Issues
3. 提交Pull Request

## License

MIT
