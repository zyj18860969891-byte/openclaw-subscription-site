# 📋 Phase 4 前端开发启动指南

**文档版本**: 1.0  
**创建日期**: 2026年2月25日  
**项目阶段**: Phase 4 预备 (前端 UI 开发)  
**目标完成日期**: 2026年3月4日 (5 天)

---

## 📌 当前项目状态

### Phase 1-3 已完成

✅ **Phase 1 (认证)** - 完成度 100%
- 用户注册/登录/注销
- JWT Token 管理
- 密码加密 (bcrypt)
- 权限验证中间件
- 7 个认证端点

✅ **Phase 2 (支付订阅)** - 完成度 100%
- Alipay PC/H5 支付
- WeChat H5/JSAPI 支付
- 3 层订阅计划 (BASIC/PRO/ENTERPRISE)
- 自动续费和升级
- 5 个支付端点 + 6 个订阅端点

✅ **Phase 3 (Railway 自动化)** - 完成度 100%
- Plan B (克隆服务) 实现
- 自动实例创建
- AES-256 凭证加密
- 实时部署监控
- 9 个 Railway 端点

**总体项目进度: 75% ✅**

---

## 🎯 Phase 4 目标

### 核心目标

开发完整的 React 前端应用，连接 Phase 1-3 的所有 API，提供用户友好的界面。

### 功能需求

#### 1. 用户认证界面 (2 天)

**页面清单**:
- [ ] 登录页面
- [ ] 注册页面
- [ ] 忘记密码页面
- [ ] 邮箱验证页面

**关键特性**:
- 表单验证
- 错误提示
- 重定向逻辑
- Session 管理

**API 集成**:
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token
POST   /api/auth/logout
```

#### 2. 仪表板和导航 (1.5 天)

**页面清单**:
- [ ] 主仪表板
- [ ] 顶部导航栏
- [ ] 侧边栏菜单
- [ ] 用户下拉菜单

**关键特性**:
- 响应式布局
- 菜单导航
- 用户信息展示
- 登出功能

#### 3. 订阅管理界面 (1.5 天)

**页面清单**:
- [ ] 计划选择页面
- [ ] 当前订阅页面
- [ ] 升级/降级页面
- [ ] 取消订阅确认

**关键特性**:
- 计划对比
- 特性展示
- 价格显示
- 行动按钮

**API 集成**:
```
GET    /api/subscription/plans
GET    /api/subscription/current
POST   /api/subscription/create
PUT    /api/subscription/upgrade
POST   /api/subscription/cancel
```

#### 4. 支付处理界面 (1 天)

**页面清单**:
- [ ] 支付方式选择
- [ ] 支付进度页面
- [ ] 支付结果页面
- [ ] 发票历史

**关键特性**:
- 支付宝集成
- 微信支付集成
- 订单查询
- 退款申请

**API 集成**:
```
POST   /api/payment/create
POST   /api/payment/alipay/notify
POST   /api/payment/wechat/notify
GET    /api/payment/:method/:outTradeNo
POST   /api/payment/refund
```

#### 5. 实例管理界面 (2.5 天)

**页面清单**:
- [ ] 实例列表页面
- [ ] 创建实例向导
- [ ] 实例详情页面
- [ ] 部署进度页面
- [ ] 实例配置页面
- [ ] 删除确认对话框

**关键特性**:
- 实例 CRUD
- 创建向导流程
- 实时进度显示
- 日志查看
- 配置编辑
- 重新部署

**API 集成**:
```
POST   /api/railway/instances
GET    /api/railway/instances
GET    /api/railway/instances/:id
GET    /api/railway/instances/:id/status
GET    /api/railway/instances/:id/logs
PUT    /api/railway/instances/:id
DELETE /api/railway/instances/:id
POST   /api/railway/instances/:id/redeploy
POST   /api/railway/instances/:id/channels
```

#### 6. 用户资料管理界面 (0.5 天)

**页面清单**:
- [ ] 资料编辑页面
- [ ] 修改密码页面
- [ ] 账户安全设置

**关键特性**:
- 信息编辑
- 密码更改
- 验证邮箱

**API 集成**:
```
GET    /api/auth/me
PUT    /api/auth/update-profile
POST   /api/auth/change-password
```

### 技术栈

```
前端框架: React 18.x + TypeScript
构建工具: Vite 4.x
样式: Tailwind CSS 3.x
UI 组件库: shadcn/ui 或 Ant Design
HTTP 客户端: axios 或 fetch API
状态管理: Zustand 或 Context API
路由: React Router 6.x
表单: React Hook Form + Zod
图表: Recharts 或 Chart.js
实时更新: WebSocket 或轮询
```

---

## 🏗️ Phase 4 项目结构规划

```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── ForgotPasswordForm.tsx
│   │   │   └── EmailVerification.tsx
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── MainLayout.tsx
│   │   ├── subscription/
│   │   │   ├── PlanCard.tsx
│   │   │   ├── PlanComparison.tsx
│   │   │   ├── SubscriptionForm.tsx
│   │   │   └── UpgradeDialog.tsx
│   │   ├── payment/
│   │   │   ├── PaymentMethodSelect.tsx
│   │   │   ├── PaymentProgress.tsx
│   │   │   └── PaymentResult.tsx
│   │   ├── railway/
│   │   │   ├── InstanceCard.tsx
│   │   │   ├── InstanceList.tsx
│   │   │   ├── CreateInstanceWizard.tsx
│   │   │   ├── InstanceDetails.tsx
│   │   │   ├── DeploymentProgress.tsx
│   │   │   ├── LogViewer.tsx
│   │   │   └── ConfigEditor.tsx
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Form.tsx
│   │   │   └── Loading.tsx
│   │   └── dashboard/
│   │       ├── Dashboard.tsx
│   │       ├── Stats.tsx
│   │       └── RecentActivity.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Plans.tsx
│   │   ├── Subscription.tsx
│   │   ├── Instances.tsx
│   │   ├── InstanceDetail.tsx
│   │   ├── Profile.tsx
│   │   └── NotFound.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── payment.ts
│   │   ├── subscription.ts
│   │   └── railway.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   └── usePagination.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── subscriptionStore.ts
│   │   └── railwayStore.ts
│   ├── utils/
│   │   ├── api-client.ts
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   ├── types/
│   │   ├── auth.ts
│   │   ├── payment.ts
│   │   ├── subscription.ts
│   │   └── railway.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── tailwind.config.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── public/
│   ├── logo.svg
│   └── favicon.ico
├── tests/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── utils/
├── .env.example
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── package.json
└── README.md
```

---

## 📝 API 集成清单

### 认证 API

```typescript
// 登录
POST /api/auth/login
Request: { email, password }
Response: { accessToken, refreshToken, user }

// 注册
POST /api/auth/register
Request: { email, password, name }
Response: { user, accessToken }

// 刷新 Token
POST /api/auth/refresh-token
Response: { accessToken, refreshToken }

// 登出
POST /api/auth/logout

// 获取用户信息
GET /api/auth/me
Response: { user }

// 更新资料
PUT /api/auth/update-profile
Request: { name, email, phone? }
Response: { user }

// 修改密码
POST /api/auth/change-password
Request: { oldPassword, newPassword }
```

### 支付 API

```typescript
// 创建支付
POST /api/payment/create
Request: { subscriptionPlan, paymentMethod, email }
Response: { orderId, paymentUrl }

// 查询订单
GET /api/payment/:method/:outTradeNo
Response: { orderId, status, amount, timestamp }

// 申请退款
POST /api/payment/refund
Request: { orderId, reason? }
Response: { refundId, status }
```

### 订阅 API

```typescript
// 获取计划列表
GET /api/subscription/plans
Response: { plans: [...] }

// 获取计划详情
GET /api/subscription/plans/:plan
Response: { plan }

// 获取当前订阅
GET /api/subscription/current
Response: { subscription }

// 创建订阅
POST /api/subscription/create
Request: { plan }
Response: { subscription }

// 升级订阅
PUT /api/subscription/upgrade
Request: { newPlan }
Response: { subscription }

// 取消订阅
POST /api/subscription/cancel
Response: { subscription }

// 续费订阅
POST /api/subscription/renew
Response: { subscription }

// 获取活跃订阅
GET /api/subscription/active
Response: { subscriptions }
```

### Railway API

```typescript
// 创建实例
POST /api/railway/instances
Request: { instanceName?, channelCredentials, customVariables? }
Response: { projectId, serviceId, deploymentId }

// 列出实例
GET /api/railway/instances
Response: { instances: [...] }

// 获取实例详情
GET /api/railway/instances/:id
Response: { instance }

// 获取实例状态
GET /api/railway/instances/:id/status
Response: { status, progress, deployment }

// 获取实例日志
GET /api/railway/instances/:id/logs?limit=100
Response: { logs: [...] }

// 更新配置
PUT /api/railway/instances/:id
Request: { channelCredentials?, customVariables? }
Response: { instance }

// 删除实例
DELETE /api/railway/instances/:id
Response: { success: true }

// 重新部署
POST /api/railway/instances/:id/redeploy
Response: { deploymentId }

// 配置通道
POST /api/railway/instances/:id/channels
Request: { channelType, credentials }
Response: { success: true }
```

---

## 🎨 UI/UX 设计指南

### 色彩方案

```
主要颜色:
  Primary:    #3B82F6 (蓝色)
  Success:    #10B981 (绿色)
  Warning:    #F59E0B (橙色)
  Danger:     #EF4444 (红色)
  Background: #F9FAFB (灰色)
  Text:       #1F2937 (深灰)
```

### 响应式设计

```
移动端:     320px - 768px
平板:       768px - 1024px
桌面:       1024px+

使用 Tailwind CSS 的 sm, md, lg, xl 断点
```

### 无障碍性 (A11y)

```
✓ 所有表单都有标签 (label)
✓ 使用语义化 HTML
✓ 键盘可导航
✓ 颜色对比度满足 WCAG AA
✓ 屏幕阅读器支持
```

---

## 🧪 测试计划

### 单元测试

```
组件测试:      使用 Vitest + React Testing Library
测试覆盖:      组件逻辑和交互
示例:          LoginForm.test.tsx, Button.test.tsx
```

### 集成测试

```
API 集成:      使用 Vitest + MSW (Mock Service Worker)
路由测试:      使用 Vitest + React Router
状态管理:      使用 Vitest + Zustand
```

### 端到端测试

```
E2E 测试:      使用 Cypress 或 Playwright
场景:          登录 → 选择计划 → 支付 → 创建实例
```

### 性能测试

```
页面加载:      < 3 秒 (首屏)
API 响应:      < 2 秒
交互反应:      < 100ms
```

---

## 📊 开发时间表

### 第 1-2 天 (认证 UI)

**Day 1**:
- 项目初始化 (Vite + React + TypeScript)
- 配置 Tailwind CSS 和基础组件库
- 开发登录表单和页面
- 集成登录 API

**Day 2**:
- 开发注册表单和页面
- 开发邮箱验证流程
- 实现 Session 管理
- 添加错误处理

**交付物**:
- LoginForm.tsx, RegisterForm.tsx
- 认证页面
- API 集成
- 基本单元测试

---

### 第 3 天 (仪表板 & 订阅)

**上午**:
- 开发主仪表板
- 开发顶部导航和侧边栏
- 开发用户下拉菜单

**下午**:
- 开发订阅计划展示页
- 开发计划卡片组件
- 开发选择计划流程

**交付物**:
- Dashboard.tsx
- Navbar.tsx, Sidebar.tsx
- Plans.tsx
- 页面路由

---

### 第 4 天 (支付 UI)

**上午**:
- 开发支付方式选择
- 开发支付进度显示
- 实现 Alipay 集成

**下午**:
- 实现 WeChat 支付集成
- 开发支付结果页面
- 开发发票历史

**交付物**:
- PaymentMethodSelect.tsx
- PaymentProgress.tsx
- 支付集成代码

---

### 第 5 天 (Railway 实例管理)

**Day 5**:
- 开发实例列表页
- 开发创建实例向导
- 开发实例详情页
- 开发部署进度显示
- 集成所有 Railway API

**交付物**:
- InstanceList.tsx
- CreateInstanceWizard.tsx
- InstanceDetails.tsx
- DeploymentProgress.tsx
- LogViewer.tsx

---

## ✅ 交付清单

### 代码交付

- [ ] React 项目完整搭建
- [ ] 所有页面开发完成
- [ ] 所有组件开发完成
- [ ] API 集成完整
- [ ] 路由配置完整
- [ ] 状态管理完整

### 测试交付

- [ ] 单元测试覆盖 > 80%
- [ ] 集成测试覆盖关键路径
- [ ] E2E 测试覆盖主要流程
- [ ] 性能测试通过

### 文档交付

- [ ] 组件文档
- [ ] 路由文档
- [ ] API 集成指南
- [ ] 部署指南
- [ ] 开发指南

### 质量检查

- [ ] 代码格式统一
- [ ] TypeScript 无错误
- [ ] ESLint 无警告
- [ ] 响应式设计验证
- [ ] 浏览器兼容性测试
- [ ] 无障碍性测试

---

## 🚀 启动 Phase 4 的准备工作

### 前置条件验证

```bash
# 检查 Node.js 版本
node --version  # 应 >= 18.0.0

# 检查 npm 版本
npm --version   # 应 >= 9.0.0

# 验证后端 API 可用
curl http://localhost:3000/api/health

# 验证数据库连接
npm run prisma:generate
```

### 项目初始化命令

```bash
# 创建 React 项目 (可选，如果使用单独的前端仓库)
npm create vite@latest frontend -- --template react-ts

# 或者在现有项目中
cd openclaw-subscription-site
mkdir frontend
cd frontend
npm create vite . -- --template react-ts

# 安装依赖
npm install

# 安装额外的库
npm install axios zustand react-router-dom react-hook-form zod
npm install -D tailwindcss postcss autoprefixer
npm install @shadcn/ui

# 配置 Tailwind
npx tailwindcss init -p

# 启动开发服务器
npm run dev
```

---

## 📚 参考资源

### 后端 API 文档

- `PHASE_3_API_DOCUMENTATION.md` - 所有 27 个端点的详细文档
- `PHASE_3_COMPLETE.md` - 架构和设计说明
- `PHASE_3_QUICK_REFERENCE.md` - 快速参考和示例

### 前端框架文档

- [React 18 官方文档](https://react.dev)
- [React Router 6 文档](https://reactrouter.com)
- [Tailwind CSS 文档](https://tailwindcss.com)
- [shadcn/ui 文档](https://ui.shadcn.com)
- [Zustand 文档](https://github.com/pmndrs/zustand)
- [React Hook Form 文档](https://react-hook-form.com)

### 测试框架文档

- [Vitest 文档](https://vitest.dev)
- [React Testing Library 文档](https://testing-library.com/react)
- [Cypress 文档](https://cypress.io)

---

## 🎯 Success Criteria

Phase 4 完成的标志：

1. ✅ 所有页面都已实现和测试
2. ✅ 所有 API 都已成功集成
3. ✅ 用户可以完成完整的业务流程（登录 → 选计划 → 支付 → 创建实例）
4. ✅ 测试覆盖率 > 80%
5. ✅ 性能指标符合要求
6. ✅ 文档完整
7. ✅ 无关键 Bug

---

## 📞 获取帮助

### 后端 API 问题

- 查看 `PHASE_3_API_DOCUMENTATION.md`
- 检查 `src/routes/` 文件了解实现细节
- 运行 `npm test` 查看集成示例

### 开发工具问题

- Vite 官方文档: https://vitejs.dev
- React 官方文档: https://react.dev
- TypeScript 官方文档: https://www.typescriptlang.org

---

## 🎉 Phase 4 开发开始!

现在所有的后端系统都已就绪，前端开发可以立即开始。

**目标**: 2026 年 3 月 4 日完成 Phase 4  
**进度**: 75% → 100% (第一周)

祝开发顺利！🚀

---

**文档更新时间**: 2026-02-25  
**下一阶段**: Phase 5 性能优化 (预计 2026-03-11)
