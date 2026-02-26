# OpenClaw 订阅网站 Railway 部署脚本
# 用法: .\deploy-railway.ps1 [-Environment <环境>] [-DryRun]

param(
    [string]$Environment = "production",
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

# 项目配置
$ProjectName = "openclaw-subscription-site"
$ProjectDir = Get-Location
$RailwayConfig = "$ProjectDir\railway.toml"
$Dockerfile = "$ProjectDir\frontend\Dockerfile.railway"

Write-Host "=== OpenClaw 订阅网站 Railway 部署 ===" -ForegroundColor Cyan
Write-Host "环境: $Environment"
Write-Host "项目目录: $ProjectDir"
Write-Host ""

# 检查必要文件
Write-Host "📋 检查必要文件..." -ForegroundColor Yellow

if (-not (Test-Path $RailwayConfig)) {
    Write-Host "❌ Railway 配置文件不存在: $RailwayConfig" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Railway 配置文件: $RailwayConfig" -ForegroundColor Green

if (-not (Test-Path $Dockerfile)) {
    Write-Host "❌ Dockerfile 不存在: $Dockerfile" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dockerfile: $Dockerfile" -ForegroundColor Green

# 检查 Railway CLI
Write-Host "📋 检查 Railway CLI..." -ForegroundColor Yellow
try {
    $railwayVersion = railway --version
    Write-Host "✅ Railway CLI 已安装: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI 未安装，请运行: npm install -g @railway/cli" -ForegroundColor Red
    exit 1
}

# 检查登录状态
Write-Host "📋 检查 Railway 登录状态..." -ForegroundColor Yellow
try {
    $railwayStatus = railway status
    Write-Host "✅ 已登录 Railway" -ForegroundColor Green
} catch {
    Write-Host "⚠️  未登录 Railway，请运行: railway login" -ForegroundColor Yellow
    if (-not $DryRun) {
        Read-Host "按 Enter 继续，或 Ctrl+C 取消"
    }
}

# 检查环境变量
Write-Host "📋 检查必要的环境变量..." -ForegroundColor Yellow
$requiredEnvVars = @(
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "DATABASE_URL",
    "ALIPAY_APP_ID",
    "ALIPAY_PRIVATE_KEY",
    "ALIPAY_PUBLIC_KEY",
    "WECHAT_MCHID",
    "WECHAT_API_V3_KEY"
)

$missingEnvVars = @()
foreach ($var in $requiredEnvVars) {
    if ([string]::IsNullOrEmpty($env:$var)) {
        $missingEnvVars += $var
    }
}

if ($missingEnvVars.Count -gt 0) {
    Write-Host "❌ 缺少必要的环境变量:" -ForegroundColor Red
    foreach ($var in $missingEnvVars) {
        Write-Host "   - $var" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "请在 Railway 项目中设置这些环境变量，或在本地 .env 文件中配置" -ForegroundColor Yellow
    if (-not $DryRun) {
        Read-Host "按 Enter 继续，或 Ctrl+C 取消"
    }
} else {
    Write-Host "✅ 所有必要的环境变量已设置" -ForegroundColor Green
}

# 构建和部署
Write-Host "🚀 开始部署..." -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "🔍 干运行模式 - 不实际执行部署" -ForegroundColor Cyan
    Write-Host "下一步将执行以下命令:" -ForegroundColor Cyan
    Write-Host "   railway init" -ForegroundColor White
    Write-Host "   railway up" -ForegroundColor White
    Write-Host "   railway status" -ForegroundColor White
    exit 0
}

try {
    # 初始化 Railway 项目（如果需要）
    Write-Host "📋 初始化 Railway 项目..." -ForegroundColor Yellow
    railway init | Out-Host
    
    # 构建和部署
    Write-Host "📋 构建和部署应用..." -ForegroundColor Yellow
    railway up | Out-Host
    
    # 检查部署状态
    Write-Host "📋 检查部署状态..." -ForegroundColor Yellow
    $status = railway status
    Write-Host $status -ForegroundColor Green
    
    # 显示部署信息
    Write-Host ""
    Write-Host "🎉 部署完成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 部署信息:" -ForegroundColor Cyan
    Write-Host "   项目名称: $ProjectName" -ForegroundColor White
    Write-Host "   环境: $Environment" -ForegroundColor White
    Write-Host "   部署时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
    Write-Host ""
    Write-Host "🔗 访问地址:" -ForegroundColor Cyan
    Write-Host "   主页: https://$ProjectName.railway.app" -ForegroundColor White
    Write-Host "   健康检查: https://$ProjectName.railway.app/health" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 管理命令:" -ForegroundColor Cyan
    Write-Host "   查看日志: railway logs --follow" -ForegroundColor White
    Write-Host "   重启服务: railway restart" -ForegroundColor White
    Write-Host "   查看状态: railway status" -ForegroundColor White
    
} catch {
    Write-Host "❌ 部署失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 故障排除建议:" -ForegroundColor Yellow
    Write-Host "   1. 检查网络连接" -ForegroundColor White
    Write-Host "   2. 确认 Railway 账户已登录" -ForegroundColor White
    Write-Host "   3. 检查环境变量配置" -ForegroundColor White
    Write-Host "   4. 查看详细日志: railway logs" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "✅ 部署脚本执行完成" -ForegroundColor Green