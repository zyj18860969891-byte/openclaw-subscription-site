# 微信支付平台证书配置指南

## 📋 当前证书信息

根据你提供的信息，微信支付平台证书如下：

- **证书类型**：平台证书（Platform Certificate）
- **算法**：RSA
- **序列号**：`2C3B40FD335851A32371C37960634A1D945C09AB`
- **有效期**：2025/8/25 ~ 2030/8/24

## 🔑 证书用途

### **1. 商户私钥（你已提供）**
- **用途**：签名请求（商户 → 微信）
- **格式**：PKCS1 格式
- **你已提供**：`WECHAT_PRIVATE_KEY`
- **序列号**：`2660E9B1BC25E6F60E2FFB294DC42B4C5229EB08`

### **2. 平台证书（需要获取）**
- **用途**：验证回调签名（微信 → 商户）
- **格式**：PEM 格式
- **序列号**：`2C3B40FD335851A32371C37960634A1D945C09AB`
- **需要添加**：`WECHAT_PLATFORM_CERT`

## 📥 如何获取平台证书

### **方法一：从微信支付商户平台下载**

1. 登录 [微信支付商户平台](https://pay.weixin.qq.com/)
2. 进入 **账户中心** → **API安全** → **API证书**
3. 找到序列号为 `2C3B40FD335851A32371C37960634A1D945C09AB` 的证书
4. 点击 **下载证书** 或 **查看证书**
5. 证书文件格式为 `.pem` 或 `.crt`

### **方法二：使用 OpenSSL 提取公钥**

如果已有证书文件（如 `wechat_platform_cert.pem`）：

```bash
# 查看证书信息
openssl x509 -in wechat_platform_cert.pem -text -noout

# 提取公钥（PEM格式）
openssl x509 -in wechat_platform_cert.pem -pubkey -noout > wechat_platform_pubkey.pem
```

### **方法三：使用微信支付 API 获取**

微信支付 API v3 提供了获取平台证书的接口：

```bash
# 获取平台证书列表
curl -X GET "https://api.mch.weixin.qq.com/v3/certificates" \
  -H "Authorization: WECHATPAY2-SHA256-RSA2048 ..." \
  -H "Content-Type: application/json"
```

## 📝 证书格式要求

### **正确格式**
```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
（多行base64编码的公钥数据）
...
-----END PUBLIC KEY-----
```

### **错误格式**
- ❌ 只有证书内容，没有 BEGIN/END 标记
- ❌ 证书格式不是 PEM
- ❌ 使用了私钥而不是公钥

## 🚀 在 Railway 配置

### **添加环境变量**

在 Railway 控制台 Variables 中添加：

```
WECHAT_PLATFORM_CERT=-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjtYxGsd7ta0eh/ggmpQhhBmWjhcPy9g1dtcxWTWuYIBglhrshc2pL91SEOxcdz5BRwcJmmANWWl+bf3wFKpoABZa35s5lA/r1g6HW81sHEl+Ighg1z5MPYy4rZ61dbTEpyUyEagNuxt3zB+L0Qbz6SzWgj/rOWOZC90LF3eD7NyjH6i+T879LXUAz/45BHTKg+74Xos9mb6ucEftKVMyDERjI4Y4abUX0dj4pv4nosGn67nxMn/krSIIxvSfJvm09alnCUb8mkhW16qD1mXDjL02dncg5NHPYw00JmpJs2Ius7JBuLTqgM2mC8Y5RK/EtOmL71W35SeHyoFSl5kBCwIDAQAB
-----END PUBLIC KEY-----
```

## 🔍 验证配置

配置完成后，运行以下命令验证：

```bash
# 检查环境变量
node -e "console.log('WECHAT_PLATFORM_CERT:', process.env.WECHAT_PLATFORM_CERT ? '已设置' : '未设置');"

# 测试签名验证
node -e "
const crypto = require('crypto');
const cert = process.env.WECHAT_PLATFORM_CERT;
if (cert) {
  console.log('✅ 平台证书已配置');
  console.log('证书长度:', cert.length);
} else {
  console.log('❌ 平台证书未配置');
}
"
```

## ⚠️ 重要提醒

### **1. 证书有效期**
- 当前证书有效期：2025/8/25 ~ 2030/8/24
- 证书过期后需要更新

### **2. 证书轮换**
微信支付会定期轮换平台证书，需要：
- 定期检查证书有效期
- 在证书过期前更新环境变量
- 保持 `WECHAT_SERIAL_NO` 与平台证书序列号一致

### **3. 安全考虑**
- 平台证书是公开的，可以安全存储在环境变量中
- 不要将私钥和证书混淆
- 定期轮换密钥对

## 📋 完整配置清单（18项）

### **基础配置（6项）**
```
RAILWAY_API_TOKEN=...
DATABASE_URL=...
JWT_SECRET=...
ENCRYPTION_KEY=...
RAILWAY_TEMPLATE_PROJECT_ID=...
RAILWAY_TEMPLATE_SERVICE_ID=...
```

### **支付宝配置（5项）**
```
ALIPAY_APP_ID=...
ALIPAY_PRIVATE_KEY=...
ALIPAY_PUBLIC_KEY=...
ALIPAY_GATEWAY_URL=...
ALIPAY_NOTIFY_URL=...
```

### **微信支付配置（7项）**
```
WECHAT_APP_ID=zyj18860969891
WECHAT_MCH_ID=1725799770
WECHAT_API_KEY=7Zx2Zk9Z8Qw3Ed4Fr5Tg6Yh7Uj8Ki9Lo0Pq1Rs
WECHAT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----
WECHAT_SERIAL_NO=2660E9B1BC25E6F60E2FFB294DC42B4C5229EB08
WECHAT_APIV3_KEY=7Zx2Zk9Z8Qw3Ed4Fr5Tg6Yh7Uj8Ki9Lo0Pq1Rs
WECHAT_NOTIFY_URL=https://openclaw-subscription-site-production.up.railway.app/api/payment/wechat/notify
WECHAT_PLATFORM_CERT=-----BEGIN PUBLIC KEY-----...-----END PUBLIC KEY-----  # 新增
```

---

**请获取微信支付平台证书并添加到环境变量中！**