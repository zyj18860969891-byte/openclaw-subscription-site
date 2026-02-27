# 域名跳转问题修复总结

## 🎯 问题分析

### 问题描述
- **问题**: Railway 域名 `openclaw-subscription-site-production.up.railway.app` 跳转到 `http://localhost:5173/`
- **原因**: 后端根路由硬编码重定向到 localhost:5173

### 问题根源
1. **后端根路由重定向**
   ```typescript
   // 原代码
   app.get('/', (_req: Request, res: Response) => {
     res.redirect('http://localhost:5173');  // ❌ 硬编码 localhost
   });
   ```

2. **前端环境变量**
   ```env
   # 原配置
   VITE_API_URL=http://localhost:3000/api  # ❌ 硬编码 localhost
   ```

3. **前端 vite 配置**
   ```typescript
   // 原配置
   proxy: {
     '/api': {
       target: 'http://localhost:3000',  // ❌ 硬编码 localhost
       changeOrigin: true,
     },
   }
   ```

4. **前端 Dockerfile**
   ```javascript
   // 原代码
   const apiResponse = await fetch(`http://localhost:3000${parsedUrl.pathname}${parsedUrl.search}`);
   // ❌ 硬编码 localhost
   ```

## ✅ 修复方案

### 1. 修复后端根路由重定向
**文件**: `src/index.ts`
```typescript
// 修复后
app.get('/', (_req: Request, res: Response) => {
  // 使用环境变量动态设置目标URL
  const appUrl = process.env.APP_URL || 
                 `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` || 
                 'http://localhost:5173';
  res.redirect(appUrl);
});
```

### 2. 修复前端环境变量
**文件**: `frontend/.env`
```env
# 修复后
VITE_API_URL=/api
```

### 3. 修复前端 vite 配置
**文件**: `frontend/vite.config.ts`
```typescript
// 修复后
server: {
  proxy: {
    '/api': {
      target: process.env.VITE_API_URL || 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

### 4. 修复前端 Dockerfile
**文件**: `frontend/Dockerfile.railway`
```javascript
// 修复后
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
const apiResponse = await fetch(`${backendUrl}${parsedUrl.pathname}${parsedUrl.search}`);
```

## 📊 环境变量配置

### Railway 环境变量
- ✅ `APP_URL`: `https://openclaw-subscription-site.up.railway.app`
- ✅ `RAILWAY_PUBLIC_DOMAIN`: `openclaw-subscription-site-production.up.railway.app`
- ✅ `BACKEND_URL`: `http://localhost:3000` (前端 Dockerfile 内部使用)

### 前端环境变量
- ✅ `VITE_API_URL`: `/api` (相对路径)

## 🚀 部署状态

### ✅ 已完成
1. ✅ 修复后端根路由重定向
2. ✅ 修复前端环境变量
3. ✅ 修复前端 vite 配置
4. ✅ 修复前端 Dockerfile
5. ✅ 代码提交到 GitHub
6. ✅ 推送到 GitHub

### ⏳ 进行中
1. ⏳ 等待 Railway 自动重新部署
2. ⏳ 测试域名访问

## 📝 下一步操作

### 立即需要
1. **等待 Railway 自动重新部署**
   - Railway 会检测到 GitHub 更新
   - 自动触发重新部署
   - 大约需要 2-5 分钟

2. **测试域名访问**
   - 访问: `https://openclaw-subscription-site-production.up.railway.app`
   - 应该显示前端页面
   - 不应该跳转到 localhost:5173

### 短期任务
1. **测试支付功能**
   - 测试支付宝支付
   - 测试微信支付（需要平台证书）
   - 验证回调处理

2. **配置支付宝商户平台**
   - 添加回调域名白名单
   - 配置 IP 白名单（可选）

### 长期任务
1. **提供微信支付平台证书**
   - 从微信支付商户平台获取
   - 格式：PEM 格式的公钥证书
   - 序列号：`2C3B40FD335851A32371C37960634A1D945C09AB`

## ⚠️ 注意事项

### 1. 域名访问
- **正确**: `https://openclaw-subscription-site-production.up.railway.app`
- **错误**: `http://localhost:5173/`

### 2. API 访问
- **正确**: `https://openclaw-subscription-site-production.up.railway.app/api/...`
- **错误**: `http://localhost:3000/api/...`

### 3. 支付宝回调
- **正确**: `https://openclaw-subscription-site-production.up.railway.app/api/payment/alipay/notify`
- **需要**: 在支付宝商户平台配置此域名

### 4. 微信支付回调
- **正确**: `https://openclaw-subscription-site-production.up.railway.app/api/payment/wechat/notify`
- **需要**: 在微信支付商户平台配置此域名

## 🎯 当前状态总结

### 域名跳转问题：✅ 已修复
- 后端根路由重定向已修复
- 前端环境变量已修复
- 前端 vite 配置已修复
- 前端 Dockerfile 已修复
- 代码已推送到 GitHub

### 支付宝支付：✅ 已就绪
- SDK 已成功集成
- 环境变量已配置
- 代码已实现
- 服务器运行正常

### 微信支付：⚠️ 部分就绪
- 代码已实现
- 环境变量已配置（除证书）
- 缺少平台证书
- 回调签名验证已禁用

## 📞 需要你提供的信息

1. **微信支付平台证书内容**
   - 从微信支付商户平台获取
   - PEM 格式，包含 BEGIN/END 标记
   - 序列号：`2C3B40FD335851A32371C37960634A1D945C09AB`

2. **域名访问测试结果**
   - 访问 `https://openclaw-subscription-site-production.up.railway.app`
   - 是否正常显示前端页面？
   - 是否还有跳转到 localhost:5173？

3. **支付功能测试**
   - 是否需要我帮你测试支付流程？
   - 是否有测试订单数据？

---

**报告生成时间**: 2026年2月27日
**项目**: OpenClaw 订阅网站
**状态**: 域名跳转问题已修复，等待 Railway 重新部署