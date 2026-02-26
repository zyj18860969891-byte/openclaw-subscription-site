#!/bin/bash

# OpenClaw 订阅网站 Railway 部署脚本
# 用法: ./deploy-railway.sh [environment] [--dry-run]

set -e

# 默认参数
ENVIRONMENT="production"
DRY_RUN=false

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            ENVIRONMENT="$1"
            shift
            ;;
    esac
done

# 项目配置
PROJECT_NAME="openclaw-subscription-site"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RAILWAY_CONFIG="$PROJECT_DIR/railway.toml"
DOCKERFILE="$PROJECT_DIR/frontend/Dockerfile.railway"

echo "=== OpenClaw 订阅网站 Railway 部署 ==="
echo "环境: $ENVIRONMENT"
echo "项目目录: $PROJECT_DIR"
echo ""

# 检查必要文件
echo "📋 检查必要文件..."

if [[ ! -f "$RAILWAY_CONFIG" ]]; then
    echo "❌ Railway 配置文件不存在: $RAILWAY_CONFIG"
    exit 1
fi
echo "✅ Railway 配置文件: $RAILWAY_CONFIG"

if [[ ! -f "$DOCKERFILE" ]]; then
    echo "❌ Dockerfile 不存在: $DOCKERFILE"
    exit 1
fi
echo "✅ Dockerfile: $DOCKERFILE"

# 检查 Railway CLI
echo "📋 检查 Railway CLI..."
if command -v railway &> /dev/null; then
    RAILWAY_VERSION=$(railway --version)
    echo "✅ Railway CLI 已安装: $RAILWAY_VERSION"
else
    echo "❌ Railway CLI 未安装，请运行: npm install -g @railway/cli"
    exit 1
fi

# 检查登录状态
echo "📋 检查 Railway 登录状态..."
if railway status &> /dev/null; then
    echo "✅ 已登录 Railway"
else
    echo "⚠️  未登录 Railway，请运行: railway login"
    if [[ "$DRY_RUN" == "false" ]]; then
        read -p "按 Enter 继续，或 Ctrl+C 取消"
    fi
fi

# 检查环境变量
echo "📋 检查必要的环境变量..."
REQUIRED_ENV_VARS=(
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "DATABASE_URL"
    "ALIPAY_APP_ID"
    "ALIPAY_PRIVATE_KEY"
    "ALIPAY_PUBLIC_KEY"
    "WECHAT_MCHID"
    "WECHAT_API_V3_KEY"
)

MISSING_ENV_VARS=()
for var in "${REQUIRED_ENV_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        MISSING_ENV_VARS+=("$var")
    fi
done

if [[ ${#MISSING_ENV_VARS[@]} -gt 0 ]]; then
    echo "❌ 缺少必要的环境变量:"
    for var in "${MISSING_ENV_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "请在 Railway 项目中设置这些环境变量，或在本地 .env 文件中配置"
    if [[ "$DRY_RUN" == "false" ]]; then
        read -p "按 Enter 继续，或 Ctrl+C 取消"
    fi
else
    echo "✅ 所有必要的环境变量已设置"
fi

# 构建和部署
echo "🚀 开始部署..."

if [[ "$DRY_RUN" == "true" ]]; then
    echo "🔍 干运行模式 - 不实际执行部署"
    echo "下一步将执行以下命令:"
    echo "   railway init"
    echo "   railway up"
    echo "   railway status"
    exit 0
fi

# 初始化 Railway 项目（如果需要）
echo "📋 初始化 Railway 项目..."
railway init

# 构建和部署
echo "📋 构建和部署应用..."
railway up

# 检查部署状态
echo "📋 检查部署状态..."
railway status

# 显示部署信息
echo ""
echo "🎉 部署完成！"
echo ""
echo "📊 部署信息:"
echo "   项目名称: $PROJECT_NAME"
echo "   环境: $ENVIRONMENT"
echo "   部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "🔗 访问地址:"
echo "   主页: https://$PROJECT_NAME.railway.app"
echo "   健康检查: https://$PROJECT_NAME.railway.app/health"
echo ""
echo "📋 管理命令:"
echo "   查看日志: railway logs --follow"
echo "   重启服务: railway restart"
echo "   查看状态: railway status"

echo ""
echo "✅ 部署脚本执行完成"