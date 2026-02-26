# 🚀 Phase 2 API 文档

本文档详细描述了支付宝、微信支付和订阅相关的所有API端点。

---

## 📋 API 概览

| 模块 | 端点数 | 说明 |
|-----|--------|------|
| **支付** | 5个 | 支付宝/微信支付整合 |
| **订阅** | 6个 | 订阅计划管理 |
| **总计** | 11个 | 完整的支付订阅系统 |

---

## 💳 支付 API

### 1. 创建支付订单

```http
POST /api/payment/create
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "subscriptionId": "string",
  "plan": "BASIC|PRO|ENTERPRISE",
  "method": "alipay|wechat",
  "amount": 49.00,
  "tradeType": "pc|h5|jsapi|app",
  "openId": "string (仅JSAPI支付需要)"
}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": "OK",
  "data": {
    "outTradeNo": "ALIPAY_1708876543_abc12345",
    "method": "alipay",
    "paymentUrl": "https://openapi.alipaydev.com/gateway.do?..."
  }
}
```

**支付宝电脑网站支付示例**:
```bash
curl -X POST http://localhost:3000/api/payment/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionId": "sub123",
    "plan": "BASIC",
    "method": "alipay",
    "amount": 49,
    "tradeType": "pc"
  }'
```

**微信H5支付示例**:
```bash
curl -X POST http://localhost:3000/api/payment/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionId": "sub123",
    "plan": "PRO",
    "method": "wechat",
    "amount": 149,
    "tradeType": "h5"
  }'
```

**微信JSAPI支付示例**:
```bash
curl -X POST http://localhost:3000/api/payment/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
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

---

### 2. 支付宝回调处理

```http
POST /api/payment/alipay/notify
Content-Type: application/json

{
  "notify_time": "2024-02-25 14:00:00",
  "notify_type": "trade_status_sync",
  "notify_id": "ac05099524730693a8b330c1bff294fc",
  "app_id": "2021001234567890",
  "charset": "UTF-8",
  "version": "1.0",
  "sign_type": "RSA2",
  "sign": "base64_signature",
  "trade_no": "2024022514000000001",
  "out_trade_no": "ALIPAY_1708876543_abc12345",
  "out_biz_no": null,
  "buyer_id": "2088512345678901",
  "buyer_email": "user@example.com",
  "seller_id": "2088123456789012",
  "seller_email": "seller@example.com",
  "trade_status": "TRADE_SUCCESS",
  "total_amount": "49.00",
  "receipt_amount": "49.00",
  "invoice_amount": "49.00",
  "buyer_pays_amount": "49.00",
  "point_amount": "0.00",
  "refund_amount": "0.00",
  "subject": "BASIC 订阅",
  "body": "购买 BASIC 订阅，可获得开通对应的功能和支持",
  "gmt_create": "2024-02-25 14:00:00",
  "gmt_payment": "2024-02-25 14:00:10",
  "gmt_close": null,
  "gmt_refund": null,
  "fund_bill_list": [
    {
      "amount": "49.00",
      "fund_channel": "ALIPAYACCOUNT"
    }
  ],
  "pass_through": ""
}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": "OK",
  "data": {
    "success": true
  }
}
```

---

### 3. 微信支付回调处理

```http
POST /api/payment/wechat/notify
Headers:
  - Wechat-Pay-Timestamp: 1708876543
  - Wechat-Pay-Nonce: abcdef123456
  - Wechat-Pay-Signature: base64_signature
Content-Type: application/json

{
  "id": "EV-2024022514000000001",
  "create_time": "2024-02-25T14:00:10+08:00",
  "event_type": "TRANSACTION.SUCCESS",
  "resource_type": "encrypt-resource",
  "resource": {
    "algorithm": "AEAD_AES_256_GCM",
    "ciphertext": "base64_encrypted_data",
    "associated_data": "",
    "nonce": "nonce_value"
  }
}
```

**解密后的resource数据**:
```json
{
  "transaction_id": "4200001596202402251400000001",
  "out_trade_no": "WECHAT_1708876543_abc12345",
  "mchid": "1234567890",
  "amount": {
    "total": 4900,
    "payer_total": 4900,
    "currency": "CNY",
    "payer_currency": "CNY"
  },
  "payer": {
    "openid": "oXxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  },
  "create_time": "2024-02-25T14:00:10+08:00",
  "update_time": "2024-02-25T14:00:15+08:00",
  "trade_state": "SUCCESS",
  "trade_state_desc": "支付成功",
  "success_time": "2024-02-25T14:00:15+08:00",
  "appid": "wx1234567890123456",
  "trade_type": "H5",
  "attach": "",
  "scene_info": {
    "device_id": ""
  }
}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": "OK",
  "data": {
    "success": true
  }
}
```

---

### 4. 查询订单状态

```http
GET /api/payment/:method/:outTradeNo
Authorization: Bearer <access_token>

例: GET /api/payment/alipay/ALIPAY_1708876543_abc12345
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": "OK",
  "data": {
    "outTradeNo": "ALIPAY_1708876543_abc12345",
    "tradeNo": "2024022514000000001",
    "tradeStatus": "TRADE_SUCCESS",
    "totalAmount": 49
  }
}
```

**示例**:
```bash
# 查询支付宝订单
curl -X GET http://localhost:3000/api/payment/alipay/ALIPAY_1708876543_abc12345 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 查询微信订单
curl -X GET http://localhost:3000/api/payment/wechat/WECHAT_1708876543_abc12345 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 5. 申请退款

```http
POST /api/payment/refund
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "method": "alipay|wechat",
  "outTradeNo": "ALIPAY_1708876543_abc12345",
  "amount": 49.00,
  "reason": "用户申请退款"
}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": "OK",
  "data": {
    "refundNo": "REFUND_abc123def456",
    "outTradeNo": "ALIPAY_1708876543_abc12345",
    "refundAmount": 49,
    "refundStatus": "SUCCESS"
  }
}
```

**示例**:
```bash
curl -X POST http://localhost:3000/api/payment/refund \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "alipay",
    "outTradeNo": "ALIPAY_1708876543_abc12345",
    "amount": 49,
    "reason": "用户要求退款"
  }'
```

---

## 📅 订阅 API

### 1. 获取所有订阅计划

```http
GET /api/subscription/plans
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": "OK",
  "data": [
    {
      "plan": "BASIC",
      "name": "Basic 基础版",
      "description": "适合个人和小型团队",
      "price": 49,
      "billingCycle": 1,
      "features": [
        "支持1个Railway实例",
        "基础技能支持",
        "社区技术支持",
        "每月5GB流量"
      ],
      "maxInstances": 1,
      "supportLevel": "community"
    },
    {
      "plan": "PRO",
      "name": "Pro 专业版",
      "description": "适合专业开发者和中型团队",
      "price": 149,
      "billingCycle": 1,
      "features": [
        "支持5个Railway实例",
        "全部高级技能",
        "优先技术支持 (24小时响应)",
        "每月50GB流量",
        "自定义脚本支持",
        "数据分析和报告"
      ],
      "maxInstances": 5,
      "supportLevel": "priority"
    },
    {
      "plan": "ENTERPRISE",
      "name": "Enterprise 企业版",
      "description": "为企业量身定制的完整解决方案",
      "price": 499,
      "billingCycle": 1,
      "features": [
        "无限Railway实例",
        "全部高级技能 + 定制开发",
        "24/7 VIP技术支持",
        "无限流量",
        "API访问权限",
        "专属技术顾问",
        "自定义集成",
        "独立部署支持"
      ],
      "maxInstances": 999,
      "supportLevel": "vip"
    }
  ]
}
```

---

### 2. 获取单个计划详情

```http
GET /api/subscription/plans/:plan

例: GET /api/subscription/plans/BASIC
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": "OK",
  "data": {
    "plan": "BASIC",
    "name": "Basic 基础版",
    "description": "适合个人和小型团队",
    "price": 49,
    "billingCycle": 1,
    "features": [
      "支持1个Railway实例",
      "基础技能支持",
      "社区技术支持",
      "每月5GB流量"
    ],
    "maxInstances": 1,
    "supportLevel": "community"
  }
}
```

---

### 3. 获取用户当前订阅

```http
GET /api/subscription/current
Authorization: Bearer <access_token>
```

**成功响应 (200) - 有有效订阅**:
```json
{
  "success": true,
  "code": "OK",
  "data": {
    "id": "sub123",
    "userId": "user123",
    "plan": "PRO",
    "status": "ACTIVE",
    "currentPeriodStart": "2024-01-25T00:00:00Z",
    "currentPeriodEnd": "2024-02-25T00:00:00Z",
    "autoRenew": true,
    "createdAt": "2024-01-25T10:30:45Z",
    "updatedAt": "2024-01-25T10:30:45Z"
  }
}
```

**成功响应 (200) - 无订阅**:
```json
{
  "success": true,
  "code": "OK",
  "data": null
}
```

---

### 4. 创建订阅

```http
POST /api/subscription/create
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "plan": "BASIC|PRO|ENTERPRISE",
  "autoRenew": true
}
```

**成功响应 (201)**:
```json
{
  "success": true,
  "code": "OK",
  "data": {
    "id": "sub123",
    "userId": "user123",
    "plan": "BASIC",
    "status": "ACTIVE",
    "currentPeriodStart": "2024-02-25T00:00:00Z",
    "currentPeriodEnd": "2024-03-25T00:00:00Z",
    "autoRenew": true,
    "createdAt": "2024-02-25T14:00:00Z",
    "updatedAt": "2024-02-25T14:00:00Z"
  }
}
```

**示例**:
```bash
curl -X POST http://localhost:3000/api/subscription/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "PRO",
    "autoRenew": true
  }'
```

---

### 5. 升级订阅计划

```http
PUT /api/subscription/upgrade
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "plan": "BASIC|PRO|ENTERPRISE"
}
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": "OK",
  "data": {
    "id": "sub123",
    "userId": "user123",
    "plan": "PRO",
    "status": "ACTIVE",
    "currentPeriodStart": "2024-01-25T00:00:00Z",
    "currentPeriodEnd": "2024-02-25T00:00:00Z",
    "autoRenew": true,
    "createdAt": "2024-01-25T10:30:45Z",
    "updatedAt": "2024-02-25T14:05:00Z"
  }
}
```

---

### 6. 取消订阅

```http
POST /api/subscription/cancel
Authorization: Bearer <access_token>
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": "OK",
  "data": {
    "success": true
  }
}
```

---

### 7. 续费订阅

```http
POST /api/subscription/renew
Authorization: Bearer <access_token>
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": "OK",
  "data": {
    "id": "sub123",
    "userId": "user123",
    "plan": "PRO",
    "status": "ACTIVE",
    "currentPeriodStart": "2024-01-25T00:00:00Z",
    "currentPeriodEnd": "2024-03-25T00:00:00Z",
    "autoRenew": true,
    "createdAt": "2024-01-25T10:30:45Z",
    "updatedAt": "2024-02-25T14:10:00Z"
  }
}
```

---

### 8. 检查订阅状态

```http
GET /api/subscription/active
Authorization: Bearer <access_token>
```

**成功响应 (200)**:
```json
{
  "success": true,
  "code": "OK",
  "data": {
    "active": true
  }
}
```

---

## 🔐 错误响应

所有API端点返回错误时使用标准格式：

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "错误描述信息"
}
```

**常见错误代码**:

| 状态码 | 错误代码 | 说明 |
|--------|---------|------|
| 400 | VALIDATION_ERROR | 参数验证失败 |
| 400 | INVALID_SIGNATURE | 签名验证失败 |
| 400 | SUBSCRIPTION_EXISTS | 用户已有有效订阅 |
| 401 | UNAUTHORIZED | 未授权，需要登录 |
| 404 | NOT_FOUND | 资源不存在 |
| 404 | ORDER_NOT_FOUND | 订单不存在 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

---

## 📊 支付流程示例

### 支付宝电脑网站支付流程

```
1. 用户选择支付宝支付
   ↓
2. 调用 POST /api/payment/create
   ↓
3. 获得 paymentUrl
   ↓
4. 重定向用户到支付宝页面
   ↓
5. 用户在支付宝完成支付
   ↓
6. 支付宝回调 POST /api/payment/alipay/notify
   ↓
7. 系统验证签名并更新订阅状态
   ↓
8. 用户被重定向到success页面
```

### 微信H5支付流程

```
1. 用户选择微信支付
   ↓
2. 调用 POST /api/payment/create (tradeType: h5)
   ↓
3. 获得 paymentUrl
   ↓
4. 重定向用户到微信支付页面
   ↓
5. 用户在微信完成支付
   ↓
6. 微信回调 POST /api/payment/wechat/notify
   ↓
7. 系统验证签名并更新订阅状态
   ↓
8. 用户被重定向到success页面
```

### 微信JSAPI支付流程

```
1. 用户在微信公众号/小程序内
   ↓
2. 前端获取用户openId
   ↓
3. 调用 POST /api/payment/create (tradeType: jsapi, openId: xxx)
   ↓
4. 获得 prepayInfo (prepayId, timeStamp, nonceStr, signature)
   ↓
5. 前端调用微信JSAPI发起支付 wx.requestPayment({...})
   ↓
6. 用户完成支付
   ↓
7. 微信回调 POST /api/payment/wechat/notify
   ↓
8. 系统验证签名并更新订阅状态
```

---

## 🧪 测试说明

### 支付宝沙箱测试

1. 注册支付宝沙箱账号: https://openhome.alipay.com/platform/appDaily.htm
2. 获取测试App ID、商户私钥、公钥
3. 配置.env文件中的支付宝相关参数
4. 使用沙箱测试账号进行支付测试

### 微信支付测试

1. 申请微信支付商户号: https://pay.weixin.qq.com
2. 在微信支付后台获取商户ID、API密钥、证书等
3. 配置.env文件中的微信支付相关参数
4. 使用微信支付沙箱进行测试

---

## 📞 支持

如有问题，请查看：
- 完整源代码: src/services/payment/
- 单元测试: tests/services/
- 数据库Schema: prisma/schema.prisma
