#!/bin/bash

# Railway 自动化部署测试脚本

echo "🚀 开始测试 Railway 自动化部署服务"
echo "======================================"

# 检查环境变量
echo "📋 检查环境变量..."
if [ -z "$RAILWAY_API_TOKEN" ]; then
    echo "❌ 错误: RAILWAY_API_TOKEN 未设置"
    exit 1
fi

if [ -z "$RAILWAY_TEMPLATE_PROJECT_ID" ]; then
    echo "❌ 错误: RAILWAY_TEMPLATE_PROJECT_ID 未设置"
    exit 1
fi

if [ -z "$RAILWAY_TEMPLATE_SERVICE_ID" ]; then
    echo "❌ 错误: RAILWAY_TEMPLATE_SERVICE_ID 未设置"
    exit 1
fi

if [ -z "$ENCRYPTION_KEY" ]; then
    echo "❌ 错误: ENCRYPTION_KEY 未设置"
    exit 1
fi

echo "✅ 环境变量检查通过"

# 测试 API 连接
echo ""
echo "📡 测试 API 连接..."
curl -f http://localhost:3000/api/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ API 服务运行正常"
else
    echo "❌ API 服务未运行，请先启动服务"
    exit 1
fi

# 测试健康检查端点
echo ""
echo "❤️  测试健康检查端点..."
curl -f http://localhost:3000/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 健康检查端点正常"
else
    echo "❌ 健康检查端点异常"
    exit 1
fi

# 测试部署监控端点
echo ""
echo "📊 测试部署监控端点..."
curl -f http://localhost:3000/api/deployment-monitor/stats > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 部署监控端点正常"
else
    echo "❌ 部署监控端点异常"
    exit 1
fi

# 测试 Railway 部署端点
echo ""
echo "🚀 测试 Railway 部署端点..."
curl -f http://localhost:3000/api/railway/deployment/instances > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Railway 部署端点正常"
else
    echo "❌ Railway 部署端点异常"
    exit 1
fi

# 测试数据库连接
echo ""
echo "🗄️  测试数据库连接..."
if command -v psql &> /dev/null; then
    if [ -n "$DATABASE_URL" ]; then
        psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "✅ 数据库连接正常"
        else
            echo "❌ 数据库连接失败"
            exit 1
        fi
    else
        echo "⚠️  跳过数据库测试 (DATABASE_URL 未设置)"
    fi
else
    echo "⚠️  跳过数据库测试 (psql 未安装)"
fi

# 测试 Railway API 连接
echo ""
echo "🌐 测试 Railway API 连接..."
if [ -n "$RAILWAY_API_TOKEN" ]; then
    response=$(curl -s -X POST https://api.railway.app/graphql \
        -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"query":"query { me { id } }"}' 2>/dev/null)
    
    if echo "$response" | grep -q '"id"'; then
        echo "✅ Railway API 连接正常"
    else
        echo "❌ Railway API 连接失败"
        echo "响应: $response"
        exit 1
    fi
else
    echo "⚠️  跳过 Railway API 测试 (RAILWAY_API_TOKEN 未设置)"
fi

# 测试模板项目
echo ""
echo "📦 测试模板项目..."
if [ -n "$RAILWAY_TEMPLATE_PROJECT_ID" ] && [ -n "$RAILWAY_API_TOKEN" ]; then
    response=$(curl -s -X POST https://api.railway.app/graphql \
        -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"query { project(id: \\\"$RAILWAY_TEMPLATE_PROJECT_ID\\\") { id name } }\"}" 2>/dev/null)
    
    if echo "$response" | grep -q '"id"'; then
        echo "✅ 模板项目可访问"
    else
        echo "❌ 模板项目不可访问"
        echo "响应: $response"
        exit 1
    fi
else
    echo "⚠️  跳过模板项目测试 (配置不完整)"
fi

echo ""
echo "======================================"
echo "✅ 所有测试通过！"
echo ""
echo "🎉 Railway 自动化部署服务准备就绪"
echo ""
echo "下一步："
echo "1. 配置前端界面调用部署 API"
echo "2. 测试完整部署流程"
echo "3. 监控部署状态"
echo ""
echo "API 端点："
echo "- 创建实例: POST /api/railway/deploy"
echo "- 查看实例: GET /api/railway/deployment/instances"
echo "- 查看状态: GET /api/deployment-monitor/status/:instanceId"
echo "- 查看日志: GET /api/deployment-monitor/logs/:instanceId"