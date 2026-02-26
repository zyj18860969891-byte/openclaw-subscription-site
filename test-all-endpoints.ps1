# OpenClaw Subscription Site - API 测试脚本
# 测试所有端点的连接和功能

$baseUrl = "http://localhost:3000/api"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OpenClaw API 端点测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 测试结果统计
$totalTests = 0
$passedTests = 0
$failedTests = 0

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Body = $null,
        [string]$Description
    )

    global:$totalTests
    global:$passedTests
    global:$failedTests

    $totalTests++

    Write-Host "测试: $Description" -ForegroundColor Yellow
    Write-Host "  $Method $Endpoint" -ForegroundColor Gray

    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri "$baseUrl$Endpoint" -Method $Method -Body $Body -Headers $headers -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri "$baseUrl$Endpoint" -Method $Method -Headers $headers -ErrorAction Stop
        }

        if ($response.success -eq $true) {
            Write-Host "  ✅ 成功" -ForegroundColor Green
            $passedTests++
        } else {
            Write-Host "  ⚠️  返回错误: $($response.message)" -ForegroundColor Orange
            $failedTests++
        }

        # 显示响应数据（截断）
        $responseStr = $response | ConvertTo-Json -Compress
        if ($responseStr.Length -gt 200) {
            $responseStr = $responseStr.Substring(0, 200) + "..."
        }
        Write-Host "  响应: $responseStr" -ForegroundColor Gray
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 404) {
            Write-Host "  ⚠️  端点不存在 (404)" -ForegroundColor Orange
        } elseif ($statusCode -eq 500) {
            Write-Host "  ❌ 服务器错误 (500)" -ForegroundColor Red
        } else {
            Write-Host "  ❌ 错误: $($_.Exception.Message)" -ForegroundColor Red
        }
        $failedTests++
    }

    Write-Host ""
    Start-Sleep -Milliseconds 500
}

# ========================================
# Phase 1: 认证端点测试
# ========================================
Write-Host "【Phase 1】认证系统端点" -ForegroundColor Magenta
Write-Host "----------------------------------------" -ForegroundColor Gray

Test-Endpoint -Method "GET" -Endpoint "/health" -Description "健康检查"
Test-Endpoint -Method "GET" -Endpoint "/auth/profile" -Description "获取用户信息 (需要认证)"
Test-Endpoint -Method "POST" -Endpoint "/auth/register" -Body '{"email":"test@example.com","password":"test123456","name":"Test User"}' -Description "用户注册"
Test-Endpoint -Method "POST" -Endpoint "/auth/login" -Body '{"email":"test@example.com","password":"test123456"}' -Description "用户登录"
Test-Endpoint -Method "POST" -Endpoint "/auth/logout" -Description "用户登出 (需要认证)"
Test-Endpoint -Method "POST" -Endpoint "/auth/refresh-token" -Body '{"refreshToken":"dummy"}' -Description "刷新令牌"

Write-Host ""

# ========================================
# Phase 2: 订阅计划端点
# ========================================
Write-Host "【Phase 2】订阅管理端点" -ForegroundColor Magenta
Write-Host "----------------------------------------" -ForegroundColor Gray

Test-Endpoint -Method "GET" -Endpoint "/subscription/plans" -Description "获取所有订阅计划"
Test-Endpoint -Method "GET" -Endpoint "/subscription/plans/BASIC" -Description "获取BASIC计划详情"
Test-Endpoint -Method "GET" -Endpoint "/subscription/plans/PRO" -Description "获取PRO计划详情"
Test-Endpoint -Method "GET" -Endpoint "/subscription/plans/ENTERPRISE" -Description "获取ENTERPRISE计划详情"
Test-Endpoint -Method "GET" -Endpoint "/subscription/current" -Description "获取当前订阅 (需要认证)"
Test-Endpoint -Method "GET" -Endpoint "/subscription/active" -Description "检查订阅状态 (需要认证)"

Write-Host ""

# ========================================
# Phase 2: 支付端点
# ========================================
Write-Host "【Phase 2】支付系统端点" -ForegroundColor Magenta
Write-Host "----------------------------------------" -ForegroundColor Gray

Test-Endpoint -Method "POST" -Endpoint "/payment/create" -Body '{"method":"alipay","amount":4900,"plan":"BASIC","orderId":"TEST_001"}' -Description "创建支付订单"
Test-Endpoint -Method "GET" -Endpoint "/payment/alipay/TEST_001" -Description "查询支付宝订单状态"
Test-Endpoint -Method "GET" -Endpoint "/payment/wechat/TEST_001" -Description "查询微信订单状态"
Test-Endpoint -Method "POST" -Endpoint "/payment/refund" -Body '{"method":"alipay","outTradeNo":"TEST_001","amount":4900,"reason":"测试退款"}' -Description "申请退款"

Write-Host ""

# ========================================
# Phase 3: Railway 部署端点
# ========================================
Write-Host "【Phase 3】Railway部署端点" -ForegroundColor Magenta
Write-Host "----------------------------------------" -ForegroundColor Gray

Test-Endpoint -Method "GET" -Endpoint "/railway/instances" -Description "获取所有实例 (需要认证)"
Test-Endpoint -Method "POST" -Endpoint "/railway/instances" -Body '{"subscriptionId":"test-sub-001","plan":"BASIC","channelConfig":{"feishu":{"appId":"test123"}}}' -Description "创建新实例 (需要认证)"
Test-Endpoint -Method "GET" -Endpoint "/railway/instances/TEST_INSTANCE_001" -Description "获取实例详情 (需要认证)"
Test-Endpoint -Method "PUT" -Endpoint "/railway/instances/TEST_INSTANCE_001" -Body '{"status":"STOPPED"}' -Description "更新实例 (需要认证)"
Test-Endpoint -Method "DELETE" -Endpoint "/railway/instances/TEST_INSTANCE_001" -Description "删除实例 (需要认证)"
Test-Endpoint -Method "POST" -Endpoint "/railway/instances/TEST_INSTANCE_001/deploy" -Description "触发部署 (需要认证)"
Test-Endpoint -Method "GET" -Endpoint "/railway/instances/TEST_INSTANCE_001/status" -Description "获取部署状态 (需要认证)"
Test-Endpoint -Method "POST" -Endpoint "/railway/instances/TEST_INSTANCE_001/stop" -Description "停止实例 (需要认证)"
Test-Endpoint -Method "GET" -Endpoint "/railway/instances/TEST_INSTANCE_001/logs" -Description "获取部署日志 (需要认证)"

Write-Host ""

# ========================================
# 测试总结
# ========================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  测试完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "总计测试: $totalTests" -ForegroundColor White
Write-Host "✅ 通过: $passedTests" -ForegroundColor Green
Write-Host "❌ 失败: $failedTests" -ForegroundColor Red
Write-Host ""

if ($failedTests -eq 0) {
    Write-Host "🎉 所有端点测试通过！" -ForegroundColor Green
} else {
    Write-Host "⚠️  有 $failedTests 个端点需要修复" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "注意:" -ForegroundColor Cyan
Write-Host "  - 需要认证的端点需要先登录获取token"
Write-Host "  - 部分端点需要数据库连接"
Write-Host "  - Railway端点需要API token配置"
Write-Host ""
