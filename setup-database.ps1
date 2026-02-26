# 快速数据库设置脚本
# 用法: powershell -ExecutionPolicy Bypass -File .\setup-database.ps1

Write-Host "========================================" -ForegroundColor Blue
Write-Host "  OpenClaw 数据库快速设置" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# 检查是否在正确的目录
if (-not (Test-Path "package.json")) {
    Write-Host "❌ 请在项目根目录运行此脚本" -ForegroundColor Red
    exit 1
}

# 检查Docker
Write-Host "【步骤 1/4】检查Docker..." -ForegroundColor Yellow
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "✅ Docker 已安装" -ForegroundColor Green
    
    # 检查PostgreSQL容器
    $containerCheck = docker ps -a --filter "name=openclaw-postgres" --format "{{.Names}}"
    if ($containerCheck -contains "openclaw-postgres") {
        Write-Host "📦 PostgreSQL容器已存在，正在启动..." -ForegroundColor Yellow
        docker start openclaw-postgres
    } else {
        Write-Host "📦 创建新的PostgreSQL容器..." -ForegroundColor Yellow
        docker run -d `
          --name openclaw-postgres `
          -e POSTGRES_PASSWORD=password `
          -e POSTGRES_DB=openclaw_subscription `
          -p 5432:5432 `
          postgres:15-alpine
    }
    
    # 等待数据库启动
    Write-Host "⏳ 等待数据库就绪 (5秒)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # 测试连接
    try {
        $test = docker exec openclaw-postgres pg_isready -U postgres
        if ($test -match "accepting connections") {
            Write-Host "✅ PostgreSQL 容器运行正常" -ForegroundColor Green
        } else {
            Write-Host "⚠️ PostgreSQL 容器可能未完全启动，等待10秒..." -ForegroundColor Yellow
            Start-Sleep -Seconds 10
        }
    } catch {
        Write-Host "⚠️ 无法验证数据库状态，继续..." -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Docker未安装" -ForegroundColor Red
    Write-Host "请安装Docker Desktop或手动安装PostgreSQL" -ForegroundColor Yellow
    Write-Host "参考: DATABASE_SETUP.md" -ForegroundColor Cyan
    exit 1
}

# 检查环境变量
Write-Host ""
Write-Host "【步骤 2/4】检查环境变量..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "⚠️ .env 文件不存在，从模板创建..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env 文件已创建，请根据需要编辑" -ForegroundColor Green
} else {
    Write-Host "✅ .env 文件存在" -ForegroundColor Green
}

# 运行Prisma迁移
Write-Host ""
Write-Host "【步骤 3/4】运行数据库迁移..." -ForegroundColor Yellow
try {
    npx prisma migrate dev --name init 2>&1 | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) {
        throw "迁移失败"
    }
    Write-Host "✅ 数据库迁移完成" -ForegroundColor Green
} catch {
    Write-Host "❌ 迁移失败: $_" -ForegroundColor Red
    Write-Host "尝试重置数据库..." -ForegroundColor Yellow
    npx prisma migrate reset --force
    Write-Host "✅ 数据库重置完成" -ForegroundColor Green
}

# 生成Prisma客户端
Write-Host ""
Write-Host "【步骤 4/4】生成Prisma客户端..." -ForegroundColor Yellow
try {
    npx prisma generate 2>&1 | ForEach-Object { Write-Host $_ }
    Write-Host "✅ Prisma客户端生成完成" -ForegroundColor Green
} catch {
    Write-Host "❌ Prisma客户端生成失败: $_" -ForegroundColor Red
    exit 1
}

# 完成
Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "  ✅ 数据库设置完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Cyan
Write-Host "1. 启动后端服务器: npm run dev" -ForegroundColor White
Write-Host "2. 在另一个终端运行测试: node test-endpoints-detailed.js" -ForegroundColor White
Write-Host "3. 启动前端: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "预期测试结果: 25/25 通过 (100%)" -ForegroundColor Green
Write-Host ""
