# Phase 4 前端项目初始化指南

**日期**: 2026年2月25日  
**阶段**: Phase 4 - React 前端开发  
**目标完成**: 2026年3月4日 (5 天)

---

## 🚀 快速启动 (3 分钟)

### 步骤 1: 创建前端项目

```bash
# 进入工作目录
cd e:\MultiModel\moltbot-railway\openclaw-subscription-site

# 使用 Vite 创建 React + TypeScript 项目
npm create vite@latest frontend -- --template react-ts

# 进入前端目录
cd frontend

# 安装依赖
npm install
```

### 步骤 2: 安装必需的库

```bash
# UI 和样式
npm install tailwindcss postcss autoprefixer
npm install @shadcn/ui

# 路由和状态
npm install react-router-dom zustand

# HTTP 客户端和表单
npm install axios react-hook-form zod @hookform/resolvers

# 实用工具
npm install clsx date-fns
npm install -D @types/node
```

### 步骤 3: 配置 Tailwind CSS

```bash
# 初始化 Tailwind
npx tailwindcss init -p

# 配置 shadcn/ui
npx shadcn-ui@latest init
```

### 步骤 4: 启动开发服务器

```bash
npm run dev
# 访问 http://localhost:5173
```

---

## 📁 项目结构规划

```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── ForgotPasswordForm.tsx
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MainLayout.tsx
│   │   ├── subscription/
│   │   │   ├── PlanCard.tsx
│   │   │   ├── PlanComparison.tsx
│   │   │   └── SubscriptionForm.tsx
│   │   ├── railway/
│   │   │   ├── InstanceCard.tsx
│   │   │   ├── InstanceList.tsx
│   │   │   ├── CreateInstanceWizard.tsx
│   │   │   └── DeploymentProgress.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── Loading.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Plans.tsx
│   │   ├── Instances.tsx
│   │   └── NotFound.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── subscription.ts
│   │   └── railway.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useApi.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   └── subscriptionStore.ts
│   ├── types/
│   │   ├── auth.ts
│   │   ├── subscription.ts
│   │   └── railway.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── .env.example
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

---

## 🔧 配置文件示例

### vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### .env.example

```
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=OpenClaw
VITE_APP_VERSION=1.0.0
```

---

## 🎯 开发计划

### Day 1: 认证界面 (2 天)

**目标**: 完成用户登录/注册/忘记密码功能

**任务**:
- [ ] 创建基础项目结构和路由
- [ ] 配置 API 客户端和认证存储
- [ ] 开发 LoginForm 组件
- [ ] 开发 RegisterForm 组件
- [ ] 开发 ForgotPasswordForm 组件
- [ ] 实现 Session 管理
- [ ] 添加错误处理和加载状态

**API 端点**:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh-token

**完成标准**:
- 用户可以注册、登录、登出
- 刷新 Token 自动处理
- 错误提示友好清晰

---

### Day 3: 仪表板和订阅 (1.5 天)

**目标**: 完成仪表板和订阅管理界面

**任务**:
- [ ] 开发 MainLayout (导航栏和侧边栏)
- [ ] 开发 Dashboard 主页
- [ ] 开发 Plans 计划展示页
- [ ] 开发 PlanCard 计划卡片
- [ ] 实现计划对比功能
- [ ] 实现选择计划逻辑

**API 端点**:
- GET /api/subscription/plans
- GET /api/subscription/current

**完成标准**:
- 用户可以查看所有订阅计划
- 可以对比不同计划的功能
- 可以选择升级计划

---

### Day 4-5: 支付和实例管理 (2.5 天)

**目标**: 完成支付和 Railway 实例管理界面

**任务**:
- [ ] 开发支付流程 UI
- [ ] 开发实例列表页
- [ ] 开发创建实例向导
- [ ] 开发实例详情页
- [ ] 开发部署进度显示
- [ ] 实现实时状态轮询
- [ ] 开发日志查看器

**API 端点**:
- POST /api/payment/create
- POST /api/subscription/create
- GET /api/railway/instances
- GET /api/railway/instances/:id/status
- GET /api/railway/instances/:id/logs

**完成标准**:
- 用户可以完成支付流程
- 可以创建和管理实例
- 可以实时查看部署进度
- 可以查看完整的部署日志

---

## 💻 关键代码片段

### API 客户端 (services/api.ts)

```typescript
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// 添加请求拦截器
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 添加响应拦截器
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      // Token 过期，尝试刷新
      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken: localStorage.getItem('refreshToken'),
        })
        localStorage.setItem('accessToken', data.accessToken)
        return apiClient(error.config)
      } catch {
        // 刷新失败，重定向到登录
        window.location.href = '/login'
      }
    }
    throw error
  }
)

export default apiClient
```

### 认证存储 (store/authStore.ts)

```typescript
import { create } from 'zustand'
import apiClient from '@/services/api'

interface AuthState {
  user: any | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password })
    localStorage.setItem('accessToken', response.accessToken)
    localStorage.setItem('refreshToken', response.refreshToken)
    set({ user: response.user, isAuthenticated: true })
  },
  
  register: async (email, password, name) => {
    const response = await apiClient.post('/auth/register', { email, password, name })
    localStorage.setItem('accessToken', response.accessToken)
    set({ user: response.user, isAuthenticated: true })
  },
  
  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    set({ user: null, isAuthenticated: false })
  },
  
  checkAuth: async () => {
    try {
      const response = await apiClient.get('/auth/me')
      set({ user: response.user, isAuthenticated: true })
    } catch {
      set({ isAuthenticated: false })
    } finally {
      set({ loading: false })
    }
  },
}))
```

### 登录表单 (components/auth/LoginForm.tsx)

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 个字符'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [error, setError] = useState('')
  
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('')
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败')
    }
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && <div className="text-red-500">{error}</div>}
        
        <div>
          <label className="block text-sm font-medium mb-2">邮箱</label>
          <input
            type="email"
            {...form.register('email')}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">密码</label>
          <input
            type="password"
            {...form.register('password')}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="••••••"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          登录
        </button>
      </form>
    </div>
  )
}
```

---

## 📦 NPM 脚本

在 `package.json` 中配置:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx",
    "type-check": "tsc --noEmit",
    "test": "vitest"
  }
}
```

---

## ✅ 检查清单

### 项目初始化

- [ ] 使用 Vite + React + TypeScript 创建项目
- [ ] 安装所有必需的依赖
- [ ] 配置 Tailwind CSS
- [ ] 配置路由
- [ ] 配置 API 客户端代理

### 基础设施

- [ ] 创建基础文件夹结构
- [ ] 配置 TypeScript 严格模式
- [ ] 配置 ESLint 和 Prettier
- [ ] 配置环境变量

### 认证功能

- [ ] 实现登录页面
- [ ] 实现注册页面
- [ ] 实现忘记密码功能
- [ ] 实现 Session 管理
- [ ] 实现权限保护的路由

### 仪表板

- [ ] 设计布局框架
- [ ] 实现导航栏
- [ ] 实现侧边栏
- [ ] 实现主页仪表板

### 订阅管理

- [ ] 展示所有计划
- [ ] 实现计划卡片
- [ ] 实现计划对比
- [ ] 实现选择/升级流程

### 支付集成

- [ ] 集成支付宝
- [ ] 集成微信支付
- [ ] 显示支付进度
- [ ] 处理支付结果

### Railway 实例管理

- [ ] 列出用户实例
- [ ] 创建实例向导
- [ ] 显示实例详情
- [ ] 实时监控部署进度
- [ ] 查看部署日志
- [ ] 管理实例配置

### 测试和部署

- [ ] 单元测试覆盖 > 80%
- [ ] 集成测试覆盖主要流程
- [ ] E2E 测试覆盖关键用户操作
- [ ] 性能优化
- [ ] 部署到生产环境

---

## 📚 参考资源

- **React 文档**: https://react.dev
- **TypeScript 文档**: https://www.typescriptlang.org
- **React Router**: https://reactrouter.com
- **Tailwind CSS**: https://tailwindcss.com
- **shadcn/ui**: https://ui.shadcn.com
- **Zustand**: https://github.com/pmndrs/zustand
- **React Hook Form**: https://react-hook-form.com
- **Zod**: https://zod.dev

---

## 🎯 下周成就目标

完成 Phase 4，项目进度达到 **83% (5/6 phases)**

**最终交付**:
- 完整的 React 前端应用
- 所有页面功能完整
- 所有 API 集成完毕
- 响应式设计验证
- 单元和集成测试

---

**下一步**: 开始 Day 1 认证界面开发！

Let's build it! 🚀
