# OpenClaw 订阅网站 - 数据库设置指南

## 问题诊断

当前状态：
- ✅ 后端API服务器运行正常
- ✅ 基础端点工作正常（健康检查、订阅计划）
- ❌ 数据库连接失败 - PostgreSQL未启动
- ❌ 认证端点失败 - 无法访问数据库

## 解决方案

### 方案1: 使用Docker (推荐 - 最简单)

```bash
# 1. 启动PostgreSQL容器
docker run -d \
  --name openclaw-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=openclaw_subscription \
  -p 5432:5432 \
  postgres:15-alpine

# 2. 等待数据库启动 (约5秒)
Start-Sleep -Seconds 5

# 3. 运行数据库迁移
cd openclaw-subscription-site
npx prisma migrate dev --name init

# 4. 生成Prisma客户端
npx prisma generate

# 5. 重新测试API
node test-endpoints-detailed.js
```

### 方案2: 安装PostgreSQL到Windows

#### 2.1 下载并安装PostgreSQL

1. 访问 https://www.postgresql.org/download/windows/
2. 下载 PostgreSQL for Windows (推荐使用 EnterpriseDB 安装包)
3. 运行安装程序：
   - 选择安装目录 (默认: `C:\Program Files\PostgreSQL\15`)
   - 选择组件: PostgreSQL Server, pgAdmin, Stack Builder, Command Line Tools
   - 设置数据目录: `C:\Program Files\PostgreSQL\15\data`
   - 设置密码: `password` (或你选择的密码)
   - 端口: `5432`
   - 区域: 默认
   - 完成安装

#### 2.2 配置PostgreSQL

1. 打开 pgAdmin 4 (开始菜单)
2. 连接到本地服务器 (密码: 你设置的密码)
3. 创建数据库:
   - 右键 "Databases" → "Create" → "Database"
   - Database: `openclaw_subscription`
   - Owner: `postgres`
   - 点击 "Save"

#### 2.3 更新环境变量

编辑 `.env` 文件，确保数据库连接字符串正确：

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/openclaw_subscription"
```

#### 2.4 运行迁移

```bash
cd openclaw-subscription-site
npx prisma migrate dev --name init
npx prisma generate
```

### 方案3: 使用现有的PostgreSQL

如果已经安装了PostgreSQL但服务未启动：

```powershell
# 1. 启动PostgreSQL服务
Start-Service -Name postgresql15

# 2. 检查服务状态
Get-Service -Name postgresql15

# 3. 验证数据库是否存在
psql -U postgres -h localhost -c "\l"

# 4. 如果数据库不存在，创建它
createdb -U postgres openclaw_subscription

# 5. 运行迁移
cd openclaw-subscription-site
npx prisma migrate dev --name init
```

## 验证数据库设置

运行以下命令验证数据库连接：

```bash
# 检查Prisma连接
npx prisma studio

# 如果成功打开Prisma Studio界面，说明数据库连接正常
```

## 完整测试流程

数据库设置完成后，按顺序执行：

```bash
# 1. 确保后端服务器在运行
npm run dev

# 2. 在另一个终端，运行完整测试
node test-endpoints-detailed.js
```

预期结果：
- ✅ 基础端点 (2个)
- ✅ 订阅计划端点 (2个)
- ✅ 认证端点 (2个) - 注册和登录
- ✅ 需要认证的端点 (7个) - 需要先登录
- ✅ 支付端点 (4个)
- ✅ Railway部署端点 (8个)
- **总计**: 25个端点全部通过

## 快速启动脚本

创建 `setup-database.ps1` 脚本：

```powershell
# setup-database.ps1

Write-Host "========================================" -ForegroundColor Blue
Write-Host "  OpenClaw 数据库设置" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# 检查Docker是否安装
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "✅ Docker 已安装" -ForegroundColor Green
    
    # 检查PostgreSQL容器是否已存在
    $container = docker ps -a | Select-String "openclaw-postgres"
    if ($container) {
        Write-Host "📦 PostgreSQL容器已存在，正在启动..." -ForegroundColor Yellow
        docker start openclaw-postgres
    } else {
        Write-Host "📦 创建PostgreSQL容器..." -ForegroundColor Yellow
        docker run -d `
          --name openclaw-postgres `
          -e POSTGRES_PASSWORD=password `
          -e POSTGRES_DB=openclaw_subscription `
          -p 5432:5432 `
          postgres:15-alpine
    }
    
    Write-Host "⏳ 等待数据库启动..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    Write-Host "✅ PostgreSQL容器已启动" -ForegroundColor Green
} else {
    Write-Host "❌ Docker未安装，请手动安装PostgreSQL" -ForegroundColor Red
    exit 1
}

# 运行Prisma迁移
Write-Host ""
Write-Host "🔄 运行数据库迁移..." -ForegroundColor Yellow
cd openclaw-subscription-site
npx prisma migrate dev --name init
npx prisma generate

Write-Host ""
Write-Host "✅ 数据库设置完成！" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "1. 启动后端: npm run dev" -ForegroundColor White
Write-Host "2. 测试API: node test-endpoints-detailed.js" -ForegroundColor White
Write-Host ""
```

## 常见问题

### Q1: "Can't reach database server at localhost:5432"
**A**: PostgreSQL服务未启动。使用上面的方案启动数据库。

### Q2: "database openclaw_subscription does not exist"
**A**: 数据库未创建。运行 `createdb -U postgres openclaw_subscription` 或使用pgAdmin创建。

### Q3: "password authentication failed for user postgres"
**A**: 检查 `.env` 文件中的密码是否正确。确保与PostgreSQL安装时设置的密码一致。

### Q4: "port 5432 already in use"
**A**: 另一个PostgreSQL实例已在运行。停止它或更改端口：
```bash
# 停止现有服务
Stop-Service -Name postgresql15

# 或更改Docker容器端口
docker run -d -p 5433:5432 ...
```

## 下一步

数据库设置完成后：

1. ✅ 启动后端服务器: `npm run dev`
2. ✅ 测试所有端点: `node test-endpoints-detailed.js`
3. ✅ 启动前端: `cd frontend && npm run dev`
4. ✅ 访问前端: http://localhost:5173
5. ✅ 测试完整流程: 注册 → 登录 → 查看计划 → 创建订阅 → 支付

---

**需要帮助？** 查看 `openclaw-subscription-website-design.ipynb` 获取完整开发指南。
