# 🚀 Phase 2 快速参考指南

## 环境设置

### 1. 安装依赖
```bash
npm install
```

### 2. 配置.env文件
```bash
cp .env.example .env
```

### 3. 配置支付宝

**获取信息**:
- 访问: https://openhome.alipay.com/platform/appDaily.htm
- 获取: App ID、商户私钥、支付宝公钥

**设置.env**:
```env
ALIPAY_APP_ID=your_app_id
ALIPAY_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
ALIPAY_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----
```

### 4. 配置微信支付

**获取信息**:
- 访问: https://pay.weixin.qq.com
- 获取: 商户ID、API密钥、证书等

**设置.env**:
```env
WECHAT_APPID=your_appid
WECHAT_MCHID=your_mchid
WECHAT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
WECHAT_APIV3_KEY=your_apiv3_key
```

### 5. 初始化数据库
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 6. 运行应用
```bash
npm run dev
```

---

## 常用命令

```bash
# 启动开发服务器（热重载）
npm run dev

# 运行所有测试
npm test

# 运行特定测试
npm test -- alipay-service.test.ts

# 生成Prisma客户端
npm run prisma:generate

# 创建迁移
npm run prisma:migrate -- --name migration_name

# 重置数据库
npm run db:reset

# 代码检查
npm run lint

# 代码格式化
npm run format

# 构建生产版本
npm run build

# 启动生产版本
npm start
```

---

## API 快速调用

### 支付宝支付示例

**1. 创建支付订单**
```bash
curl -X POST http://localhost:3000/api/payment/create \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionId": "sub123",
    "plan": "BASIC",
    "method": "alipay",
    "amount": 49,
    "tradeType": "pc"
  }'
```

**2. 查询订单状态**
```bash
curl -X GET http://localhost:3000/api/payment/alipay/ALIPAY_1708876543_abc12345 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**3. 申请退款**
```bash
curl -X POST http://localhost:3000/api/payment/refund \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "alipay",
    "outTradeNo": "ALIPAY_1708876543_abc12345",
    "amount": 49,
    "reason": "用户申请退款"
  }'
```

### 微信支付示例

**1. 创建H5支付**
```bash
curl -X POST http://localhost:3000/api/payment/create \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionId": "sub123",
    "plan": "PRO",
    "method": "wechat",
    "amount": 149,
    "tradeType": "h5"
  }'
```

**2. 创建JSAPI支付**
```bash
curl -X POST http://localhost:3000/api/payment/create \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionId": "sub123",
    "plan": "ENTERPRISE",
    "method": "wechat",
    "amount": 499,
    "tradeType": "jsapi",
    "openId": "openid_from_wechat"
  }'
```

### 订阅管理示例

**1. 获取所有计划**
```bash
curl -X GET http://localhost:3000/api/subscription/plans
```

**2. 创建订阅**
```bash
curl -X POST http://localhost:3000/api/subscription/create \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "BASIC",
    "autoRenew": true
  }'
```

**3. 获取当前订阅**
```bash
curl -X GET http://localhost:3000/api/subscription/current \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**4. 升级订阅**
```bash
curl -X PUT http://localhost:3000/api/subscription/upgrade \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan": "PRO"}'
```

**5. 取消订阅**
```bash
curl -X POST http://localhost:3000/api/subscription/cancel \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 文件位置导航

| 功能 | 文件位置 |
|------|---------|
| 支付宝服务 | `src/services/payment/alipay-service.ts` |
| 微信服务 | `src/services/payment/wechat-service.ts` |
| 支付网关 | `src/services/payment/payment-gateway.ts` |
| 订阅服务 | `src/services/subscription/subscription-service.ts` |
| 支付路由 | `src/routes/payment.ts` |
| 订阅路由 | `src/routes/subscription.ts` |
| 数据库Schema | `prisma/schema.prisma` |
| 环境变量 | `.env.example` |
| API文档 | `PHASE_2_API_DOCUMENTATION.md` |
| 完成总结 | `PHASE_2_COMPLETE.md` |

---

## 测试

### 运行所有测试
```bash
npm test
```

### 运行特定测试文件
```bash
npm test -- tests/services/alipay-service.test.ts
npm test -- tests/services/wechat-service.test.ts
npm test -- tests/services/subscription-service.test.ts
```

### 测试覆盖率
```bash
npm test -- --coverage
```

---

## 常见问题

### Q: 支付宝沙箱如何使用？

A: 
1. 注册沙箱账号: https://openhome.alipay.com/platform/appDaily.htm
2. 在沙箱管理后台获取App ID和密钥
3. 使用支付宝沙箱账号进行测试
4. `NODE_ENV=development` 时自动使用沙箱

### Q: 微信支付如何配置？

A:
1. 申请微信支付商户号
2. 在微信支付后台获取所有必要信息
3. 配置.env文件中的微信参数
4. `NODE_ENV=development` 时可使用沙箱

### Q: 如何本地测试支付回调？

A:
使用 `ngrok` 暴露本地地址:
```bash
ngrok http 3000
```
然后在支付方后台配置回调URL为 `https://xxx.ngrok.io/api/payment/xxx/notify`

### Q: 如何调试签名验证失败？

A:
1. 检查.env中的密钥是否正确
2. 检查密钥格式（PEM格式）
3. 查看日志输出错误信息
4. 使用支付方提供的工具验证签名

### Q: 如何添加新的支付方式？

A:
1. 创建新的Service类，实现支付接口
2. 在PaymentGateway中添加条件分支
3. 在payment routes中添加新的端点
4. 编写对应的测试用例

---

## 性能优化建议

### 数据库查询优化
```typescript
// ❌ 不好
const subscriptions = await prisma.subscription.findMany({
  where: { user_id: userId }
});

// ✅ 好
const subscription = await prisma.subscription.findFirst({
  where: { user_id: userId },
  orderBy: { created_at: 'desc' }
});
```

### 缓存考虑
```typescript
// 使用Redis缓存计划信息
const planInfo = await redis.get(`plan:${plan}`);
if (!planInfo) {
  planInfo = subscriptionService.getPlanInfo(plan);
  await redis.set(`plan:${plan}`, planInfo, 'EX', 3600);
}
```

### 批量操作
```typescript
// 使用 prisma.subscription.createMany() 进行批量创建
const subscriptions = await prisma.subscription.createMany({
  data: [...]
});
```

---

## 安全建议

1. **定期轮换密钥**
   - 支付宝和微信定期更新密钥
   - 保持.env安全

2. **监控异常交易**
   - 设置支付金额告警
   - 监控退款比例

3. **日志记录**
   - 记录所有支付操作
   - 记录异常情况

4. **定期审计**
   - 检查签名验证日志
   - 审计金额验证日志

---

## 下一步 (Phase 3)

准备好开始Railway集成了吗？

Phase 3 将实现:
- ✅ Railway API客户端
- ✅ 自动部署流程
- ✅ 环境变量配置
- ✅ 实例管理APIs
- ✅ 部署日志监控

预计耗时: 5天

---

## 相关文档

- **完整API文档**: `PHASE_2_API_DOCUMENTATION.md`
- **完成总结**: `PHASE_2_COMPLETE.md`
- **Phase 1完成**: `PHASE_1_COMPLETE.md`
- **进度仪表板**: `DEVELOPMENT_PROGRESS.md`

---

**需要帮助？** 查看项目文档或查看测试文件了解具体用法！ 🚀
