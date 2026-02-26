# Railway 自动化部署配置指南

## 环境变量配置

### 必需的环境变量

```bash
# Railway API Token (从Railway.app获取)
RAILWAY_API_TOKEN=your_railway_api_token_here

# 模板项目ID (用于克隆的模板项目)
RAILWAY_TEMPLATE_PROJECT_ID=your_template_project_id

# 模板服务ID (用于克隆的模板服务)
RAILWAY_TEMPLATE_SERVICE_ID=your_template_service_id

# 加密密钥 (用于加密通道凭证)
ENCRYPTION_KEY=your_encryption_key_here

# 数据库连接字符串
DATABASE_URL=postgresql://user:password@localhost:5432/database_name

# 应用URL (用于支付回调)
APP_URL=http://localhost:3000
```

### 可选的环境变量

```bash
# Railway模板仓库配置
RAILWAY_TEMPLATE_REPO=github.com/yourusername/your-repo
RAILWAY_TEMPLATE_BRANCH=main

# 监控配置
MONITOR_CHECK_INTERVAL=30000  # 检查间隔(毫秒)
MONITOR_ALERT_THRESHOLD=300000  # 告警阈值(毫秒)
MONITOR_NOTIFICATION_ENABLED=true

# 部署配置
DEPLOYMENT_TIMEOUT=600000  # 部署超时时间(毫秒)
MAX_DEPLOYMENT_ATTEMPTS=3
```

## 部署流程

### 1. 准备模板项目

1. 在Railway.app创建一个模板项目
2. 配置所有必需的环境变量
3. 确保项目可以正常部署
4. 获取项目ID和服务ID

### 2. 配置数据库

```bash
# 运行数据库迁移
npm run prisma:generate
npm run prisma:migrate
```

### 3. 启动应用

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## API端点

### 部署管理

```
POST /api/deployment/trigger
  - 触发新部署
  - 需要订阅ID

GET /api/deployment/status/:subscriptionId
  - 获取部署状态

POST /api/deployment/retry
  - 重试部署

DELETE /api/deployment/cancel
  - 取消部署

GET /api/deployment/logs/:subscriptionId
  - 获取部署日志
```

### 实例管理

```
POST /api/railway/instances
  - 创建新实例

GET /api/railway/instances/:instanceId
  - 获取实例详情

PUT /api/railway/instances/:instanceId/variables
  - 更新环境变量

DELETE /api/railway/instances/:instanceId
  - 删除实例

POST /api/railway/instances/:instanceId/redeploy
  - 重新部署实例
```

### 监控管理

```
GET /api/deployment-monitor/status/:instanceId
  - 获取实例监控状态

GET /api/deployment-monitor/progress/:instanceId
  - 获取部署进度

GET /api/deployment-monitor/logs/:instanceId
  - 获取部署日志

GET /api/deployment-monitor/stats
  - 获取监控统计

POST /api/deployment-monitor/manual-check/:instanceId
  - 手动触发检查
```

## 支付集成

### 支付成功后的自动部署

1. 用户完成支付
2. 支付回调处理
3. 激活订阅
4. 触发Railway部署
5. 监控部署状态
6. 通知用户部署结果

### 支付回调URL

```
POST /api/payment/alipay/notify
POST /api/payment/wechat/notify
```

## 监控和日志

### 部署状态

- `INITIALIZING`: 初始化中
- `BUILDING`: 构建中
- `DEPLOYING`: 部署中
- `RUNNING`: 运行中
- `FAILED`: 失败
- `CRASHED`: 崩溃

### 监控指标

- 部署进度百分比
- 部署时间
- 错误率
- 资源使用情况

## 故障排除

### 常见问题

1. **部署失败**
   - 检查环境变量配置
   - 验证模板项目权限
   - 查看部署日志

2. **环境变量问题**
   - 检查加密密钥
   - 验证通道凭证格式
   - 确保必需字段存在

3. **数据库连接问题**
   - 检查DATABASE_URL
   - 验证数据库权限
   - 确保表已创建

### 调试模式

```bash
# 启用详细日志
DEBUG=railway:* npm run dev

# 查看特定服务的日志
DEBUG=railway:clone-service npm run dev
DEBUG=railway:monitor-service npm run dev
```

## 安全考虑

### 凭证管理

- 所有通道凭证都使用AES-256加密存储
- 加密密钥必须安全保管
- 定期轮换加密密钥

### 访问控制

- 所有API端点都需要认证
- 用户只能访问自己的实例
- 实现适当的权限检查

### 环境变量安全

- 敏感信息标记为`isSecret`
- 日志中不记录敏感值
- 环境变量在传输中加密

## 性能优化

### 部署优化

- 使用克隆服务而非手动创建
- 批量设置环境变量
- 异步监控部署状态

### 数据库优化

- 使用索引加速查询
- 定期清理旧记录
- 优化复杂查询

## 扩展性

### 添加新通道类型

1. 在`ChannelType`枚举中添加新类型
2. 更新通道凭证验证逻辑
3. 添加环境变量映射
4. 更新文档

### 添加新计划

1. 在`SubscriptionPlan`枚举中添加新计划
2. 更新计划特性配置
3. 更新价格和功能描述
4. 更新数据库迁移

## 部署检查清单

- [ ] 环境变量已配置
- [ ] 数据库已初始化
- [ ] 模板项目已创建
- [ ] 支付网关已配置
- [ ] 监控服务已启用
- [ ] 日志系统已配置
- [ ] 错误处理已实现
- [ ] 文档已更新

## 相关文档

- [Phase 3 完整实现文档](./PHASE_3_COMPLETE.md)
- [技能安装指南](./技能安装指南.md)
- [部署说明](./部署说明.md)