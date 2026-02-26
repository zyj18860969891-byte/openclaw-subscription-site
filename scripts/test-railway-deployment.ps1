# OpenClaw 订阅网站 Railway 部署测试脚本
# 用法: .\test-railway-deployment.ps1 [-Environment <环境>]

param(
    [string]$Environment = "test"
)

$ErrorActionPreference = "Stop"

# 项目配置
$ProjectName = "openclaw-subscription-site"
$ProjectDir = Get-Location
$TestDomain = "https://$ProjectName.railway.app"

Write-Host "=== OpenClaw 订阅网站 Railway 部署测试 ===" -ForegroundColor Cyan
Write-Host "环境: $Environment"
Write-Host "测试域名: $TestDomain"
Write-Host ""

# 测试函数
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "🔍 测试 $Name..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri $Url -Method GET -TimeoutSec 30
        $status = $response.StatusCode
        if ($status -eq $ExpectedStatus) {
            Write-Host "✅ $Name 测试通过" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $Name 测试失败 - 期望状态码: $ExpectedStatus, 实际: $status" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ $Name 测试失败 - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 测试端点列表
$testEndpoints = @(
    @{ Name = "健康检查"; Url = "$TestDomain/health"; ExpectedStatus = 200 },
    @{ Name = "主页"; Url = "$TestDomain/"; ExpectedStatus = 200 },
    @{ Name = "API - 获取订阅计划"; Url = "$TestDomain/api/subscription/plans"; ExpectedStatus = 200 },
    @{ Name = "API - 获取认证配置"; Url = "$TestDomain/api/auth/profile"; ExpectedStatus = 401 } # 未认证应该返回401
)

# 执行测试
$passedTests = 0
$totalTests = $testEndpoints.Count

foreach ($endpoint in $testEndpoints) {
    if (Test-Endpoint @endpoint) {
        $passedTests++
    }
    Write-Host ""
}

# 显示测试结果
Write-Host "📊 测试结果:" -ForegroundColor Cyan
Write-Host "   通过: $passedTests / $totalTests" -ForegroundColor White

if ($passedTests -eq $totalTests) {
    Write-Host "🎉 所有测试通过！" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ 部分测试失败" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ 测试脚本执行完成" -ForegroundColor Green