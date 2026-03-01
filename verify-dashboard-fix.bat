@echo off
chcp 65001 >nul
echo ==========================================
echo Dashboard修复部署验证
echo ==========================================
echo.

set API_URL=https://openclaw-subscription-site-production.up.railway.app/api
set FRONTEND_URL=https://openclaw-subscription-site-production.up.railway.app

echo 1. 检查API健康状态...
curl -s "%API_URL%/health" 2>nul | findstr /C:"status" /C:"timestamp" && echo ✅ API健康 || echo ❌ API健康检查失败
echo.

echo 2. 测试认证端点...
curl -s -X POST "%API_URL%/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@test.com\",\"password\":\"test\"}" ^
  -w "状态码: %%{http_code}%%n" 2>nul | findstr /C:"状态码"
echo.

echo 3. 检查前端构建...
curl -s -I "%FRONTEND_URL%" 2>nul | findstr /C:"HTTP/" && echo ✅ 前端可访问 || echo ❌ 前端不可访问
echo.

echo 4. 测试Dashboard页面...
curl -s "%FRONTEND_URL%/dashboard" 2>nul | findstr /C:"Dashboard" /C:"dashboard" >nul && (
    echo ✅ Dashboard页面可访问
) || (
    echo ❌ Dashboard页面加载失败
)
echo.

echo ==========================================
echo 验证完成！
echo ==========================================
echo.
echo 手动验证步骤：
echo 1. 打开浏览器访问: %FRONTEND_URL%
echo 2. 登录您的账户
echo 3. 访问 Dashboard 页面
echo 4. 检查控制台是否有错误日志
echo 5. 验证实例列表正常显示（应在1秒内加载）
echo.
echo 预期结果：
echo ✅ 无超时错误
echo ✅ 实例列表正常显示
echo ✅ 响应时间 < 1秒
echo ✅ 控制台无错误
echo.
pause
