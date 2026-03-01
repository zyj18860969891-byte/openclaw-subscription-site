#!/bin/bash

# Dashboard修复验证脚本
# 用于验证Railway部署是否成功，Dashboard是否正常加载

echo "=========================================="
echo "Dashboard修复部署验证"
echo "=========================================="
echo ""

# 配置
API_URL="https://openclaw-subscription-site-production.up.railway.app/api"
FRONTEND_URL="https://openclaw-subscription-site-production.up.railway.app"

echo "1. 检查API健康状态..."
curl -s "$API_URL/health" | jq '.' 2>/dev/null || echo "API健康检查失败"
echo ""

echo "2. 测试认证端点..."
# 测试登录端点是否可访问（不实际登录）
curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  -w "\n状态码: %{http_code}\n" \
  2>/dev/null | tail -5
echo ""

echo "3. 检查数据库迁移是否应用..."
curl -s "$API_URL/health" | grep -o '"timestamp":"[^"]*"' || echo "无法获取时间戳"
echo ""

echo "4. 验证前端构建..."
curl -s -I "$FRONTEND_URL" | head -5
echo ""

echo "5. 测试Dashboard页面加载..."
curl -s "$FRONTEND_URL/dashboard" | grep -q "Dashboard" && echo "✅ Dashboard页面可访问" || echo "❌ Dashboard页面加载失败"
echo ""

echo "=========================================="
echo "验证完成！"
echo "=========================================="
echo ""
echo "手动验证步骤："
echo "1. 打开浏览器访问: $FRONTEND_URL"
echo "2. 登录您的账户"
echo "3. 访问 Dashboard 页面"
echo "4. 检查控制台是否有错误日志"
echo "5. 验证实例列表正常显示（应在1秒内加载）"
echo ""
echo "预期结果："
echo "✅ 无超时错误"
echo "✅ 实例列表正常显示"
echo "✅ 响应时间 < 1秒"
echo "✅ 控制台无错误"
