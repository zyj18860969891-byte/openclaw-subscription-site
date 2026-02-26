# 🎯 Phase 2: 支付集成详细开发计划

**阶段**: 第2周  
**工期**: 5个工作日  
**目标**: 完整的支付宝 + 微信支付集成

---

## 📋 任务概览

```
Day 1-2: 支付宝集成
├─ AlipayService 实现
├─ 支付订单创建
├─ 回调处理
└─ 沙箱测试

Day 3-4: 微信支付集成  
├─ WechatService 实现
├─ H5和JSAPI支付
├─ 回调处理
└─ 沙箱测试

Day 5: 完整支付流程
├─ PaymentGateway 统一接口
├─ E2E测试
├─ 错误处理完善
└─ 文档补充
```

---

## 🔧 Day 1-2: 支付宝集成

### Task 1: AlipayService 实现

**文件**: `src/services/payment/alipay-service.ts`

```typescript
// 基本结构
class AlipayService {
  // 初始化AlipaySDK
  constructor()
  
  // 创建支付页面URL
  async createPagePayUrl(params: CreatePaymentParams): Promise<string>
  
  // 创建H5支付URL
  async createWapPayUrl(params: CreatePaymentParams): Promise<string>
  
  // 验证回调签名
  verifyNotify(params: any): boolean
  
  // 查询订单
  async queryOrder(outTradeNo: string): Promise<QueryResult>
  
  // 申请退款
  async refund(params: RefundParams): Promise<RefundResult>
}
```

**代码行数**: 约200行

**关键方法**:
- `createPagePayUrl()` - 电脑网站支付
- `createWapPayUrl()` - 手机网站支付  
- `verifyNotify()` - 签名验证
- `queryOrder()` - 订单查询

### Task 2: 支付宝API路由

**文件**: `src/routes/payment.ts`

```http
POST /api/payment/alipay
├─ 创建支付订单
├─ 返回支付页面URL
└─ 保存支付记录

POST /api/payment/alipay/notify
├─ 接收支付宝回调
├─ 验证签名
├─ 更新订阅状态
└─ 触发部署
```

**代码行数**: 约150行

### Task 3: 测试支付宝流程

**测试项**:
- ✅ 沙箱环境支付
- ✅ 回调签名验证
- ✅ 订单查询
- ✅ 异常处理

**测试命令**:
```bash
npm test -- payment.alipay.test.ts
```

---

## 🔧 Day 3-4: 微信支付集成

### Task 1: WechatService 实现

**文件**: `src/services/payment/wechat-service.ts`

```typescript
class WechatService {
  constructor()
  
  // H5支付
  async createH5Payment(params: H5PaymentParams): Promise<string>
  
  // JSAPI支付
  async createJsapiPayment(params: JsapiPaymentParams): Promise<JsapiResponse>
  
  // 验证回调
  async verifyNotify(body: string, signature: string): Promise<NotifyData>
  
  // 查询订单
  async queryOrder(outTradeNo: string): Promise<QueryResult>
  
  // 申请退款
  async refund(params: RefundParams): Promise<RefundResult>
}
```

**代码行数**: 约250行

**特点**:
- H5支付用于浏览器
- JSAPI用于微信内

### Task 2: 微信支付API路由

**文件**: `src/routes/payment.ts` (继续添加)

```http
POST /api/payment/wechat/h5
├─ 创建H5支付
└─ 返回支付链接

POST /api/payment/wechat/jsapi
├─ 创建JSAPI支付
└─ 返回前端支付参数

POST /api/payment/wechat/notify
├─ 接收微信回调
├─ 验证签名
└─ 更新状态
```

### Task 3: 测试微信支付流程

**测试项**:
- ✅ H5支付流程
- ✅ JSAPI支付流程
- ✅ 回调验证
- ✅ 订单查询

---

## 🔧 Day 5: 完整支付系统

### Task 1: PaymentGateway 统一接口

**文件**: `src/services/payment/payment-gateway.ts`

```typescript
class PaymentGateway {
  // 创建支付
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult>
  
  // 处理回调
  async handleCallback(data: CallbackData): Promise<void>
  
  // 查询支付状态
  async getPaymentStatus(orderId: string): Promise<PaymentStatus>
  
  // 申请退款
  async refund(orderId: string, amount: number): Promise<void>
}
```

**作用**: 统一不同支付方式的接口

### Task 2: 订阅管理服务

**文件**: `src/services/subscription/subscription-service.ts` (新建)

```typescript
class SubscriptionService {
  // 创建订阅
  async createSubscription(data: CreateSubParams): Promise<Subscription>
  
  // 获取订阅
  async getSubscription(id: string): Promise<Subscription>
  
  // 更新订阅状态
  async updateStatus(id: string, status: string): Promise<void>
  
  // 取消订阅
  async cancelSubscription(id: string): Promise<void>
  
  // 续费订阅
  async renewSubscription(id: string): Promise<void>
}
```

**代码行数**: 约200行

### Task 3: 支付订阅工作流

```
1. 用户选择计划 → 进入支付页面
2. 用户选择支付方式 (支付宝/微信)
3. 系统创建Payment记录
4. 用户完成支付
5. 支付方发送回调通知
6. 系统验证签名
7. 更新Payment状态为success
8. 创建Subscription记录
9. 更新User订阅信息
10. 触发Railway自动部署
11. 发送确认邮件
```

### Task 4: 完整的端到端测试

**测试场景**:

场景1: 支付宝支付完整流程
```
1. 创建支付订单
2. 验证返回URL
3. 模拟支付宝回调
4. 验证订阅已创建
5. 验证部署已触发
```

场景2: 微信H5支付
```
1. 创建H5支付
2. 验证返回链接
3. 模拟微信回调
4. 验证订阅状态
```

场景3: 支付异常处理
```
1. 签名验证失败
2. 订单重复支付
3. 支付超时
```

---

## 📦 依赖清单

```bash
# 支付SDK（已在package.json中）
npm install alipay-sdk wechatpay-node-sdk
```

**版本**:
- alipay-sdk: ^3.7.5
- wechatpay-node-sdk: ^1.20.0

---

## 🔐 安全要点

### 支付宝安全

✅ 签名验证 (必须)
  - 使用支付宝公钥验证
  - 防止伪造回调

✅ 金额验证 (必须)
  - 回调金额与订单金额对比
  - 防止篡改

✅ 交易号验证 (必须)
  - 验证alipay_trade_no唯一性
  - 防止重复处理

### 微信支付安全

✅ 签名验证 (必须)
  - 使用微信公钥验证
  - V3 API自动验证

✅ 幂等性 (必须)
  - 同一个transaction_id只处理一次
  - 防止重复

✅ 时间戳验证
  - 验证回调时间戳
  - 防止延迟回调重放

---

## 📝 API设计总结

### 新增的API端点（Phase 2）

```
POST /api/payment/alipay
POST /api/payment/alipay/notify
POST /api/payment/wechat/h5
POST /api/payment/wechat/jsapi
POST /api/payment/wechat/notify
GET  /api/payment/status/:orderId
POST /api/subscriptions
GET  /api/subscriptions/:id
PUT  /api/subscriptions/:id
POST /api/subscriptions/:id/cancel
```

### 数据库操作

**新增表**:
- payments: 支付记录
- subscriptions: 订阅记录
- channel_credentials: 通道配置

**更新表**:
- users: 添加订阅状态字段

---

## ⚙️ 环境变量配置

```env
# 支付宝
ALIPAY_APP_ID=your_app_id
ALIPAY_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
ALIPAY_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
ALIPAY_GATEWAY_URL=https://openapi.alipaydev.com/gateway.do
ALIPAY_NOTIFY_URL=https://yourdomain.com/api/payment/alipay/notify

# 微信
WECHAT_MCHID=your_mchid
WECHAT_API_SECRET=your_api_secret
WECHAT_API_CERT_PATH=/path/to/apiclient_cert.pem
WECHAT_API_KEY_PATH=/path/to/apiclient_key.pem
WECHAT_NOTIFY_URL=https://yourdomain.com/api/payment/wechat/notify
```

---

## 📊 工作量估算

| 任务 | 代码行数 | 工时 |
|------|--------|------|
| AlipayService | 200 | 4h |
| WechatService | 250 | 4h |
| API路由 | 300 | 3h |
| 订阅服务 | 200 | 2h |
| 单元测试 | 250 | 3h |
| E2E测试 | 150 | 2h |
| 文档 | 200 | 2h |
| **总计** | **1,350** | **20h** |

---

## ✅ 验收标准

- [ ] 所有支付方式都能创建订单
- [ ] 回调签名验证通过
- [ ] 订阅记录正确保存
- [ ] 支付异常妥善处理
- [ ] 所有API都有正确错误响应
- [ ] 单元测试覆盖≥80%
- [ ] 沙箱环境完整测试通过

---

## 📞 获取支付密钥

### 支付宝

1. 访问 https://open.alipay.com/
2. 创建应用 → 获取App ID
3. 配置应用 → 生成密钥对
4. 下载私钥和公钥
5. 配置回调URL

### 微信支付

1. 访问 https://pay.weixin.qq.com/
2. 商户号申请或登录
3. 生成API密钥 (v3)
4. 下载API证书
5. 配置回调URL

---

## 🚀 启动Phase 2

**准备步骤**:

```bash
# 1. 更新package.json和安装依赖
npm install

# 2. 配置支付SDK环境变量
cp .env.example .env
# 编辑 .env 添加支付密钥

# 3. 生成Prisma客户端（若修改schema）
npm run prisma:generate

# 4. 开始编码
npm run dev
```

---

**下一阶段**: Phase 3 (Railway自动化部署)  
**预计开始时间**: 2025年3月4日
