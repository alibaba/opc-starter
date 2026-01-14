#!/bin/bash

# 环境配置快速设置脚本
# 用途：快速创建 .env.development 和 .env.test 文件

set -e

echo "🚀 Photo Wall 环境配置脚本"
echo "================================"
echo ""

# 检查是否已存在配置文件
if [ -f ".env.development" ] || [ -f ".env.test" ]; then
    echo "⚠️  检测到已存在的环境配置文件："
    [ -f ".env.development" ] && echo "  - .env.development"
    [ -f ".env.test" ] && echo "  - .env.test"
    echo ""
    read -p "是否覆盖现有文件？(y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "❌ 已取消"
        exit 0
    fi
fi

echo ""
echo "📝 请选择配置模式："
echo "  1) 完整配置（Supabase + MSW）"
echo "  2) 仅配置 Supabase 模式"
echo "  3) 仅配置 MSW 模式"
echo ""
read -p "请选择 (1/2/3): " mode

case $mode in
    1|2)
        echo ""
        echo "🔧 配置 Supabase 信息"
        echo "================================"
        echo ""
        echo "请从 Supabase Dashboard → Settings → API 获取以下信息："
        echo ""
        read -p "Supabase Project URL: " supabase_url
        read -p "Supabase Anon Key: " supabase_key
        
        # 创建 .env.development
        cat > .env.development << EOF
# 开发环境配置 - 连接真实 Supabase 后端
# 创建时间: $(date)

# MSW Mock 开关 - 关闭
VITE_ENABLE_MSW=false

# Supabase 配置
VITE_SUPABASE_URL=$supabase_url
VITE_SUPABASE_ANON_KEY=$supabase_key

# API 基础路径
VITE_API_BASE_URL=/api

# Mock 数据配置（开发环境不启用）
VITE_MOCK_DATA_ENABLED=false
EOF
        echo "✅ 已创建 .env.development"
        ;;
esac

case $mode in
    1|3)
        # 创建 .env.test
        cat > .env.test << 'EOF'
# 测试环境配置 - 使用 MSW Mock 数据
# 创建时间: $(date)

# MSW Mock 开关 - 启用
VITE_ENABLE_MSW=true

# Supabase 配置（测试环境不需要真实值）
VITE_SUPABASE_URL=https://placeholder.supabase.co
VITE_SUPABASE_ANON_KEY=placeholder-key

# API 基础路径
VITE_API_BASE_URL=/api

# 测试用户信息
TEST_USER_EMAIL=test@example.com
TEST_USER_PWD=Test123456

# Mock 数据配置
VITE_MOCK_DATA_ENABLED=true
EOF
        echo "✅ 已创建 .env.test"
        ;;
esac

echo ""
echo "🎉 环境配置完成！"
echo "================================"
echo ""
echo "📚 使用方法："
echo ""

case $mode in
    1)
        echo "  Supabase 模式:"
        echo "    npm run dev"
        echo ""
        echo "  MSW 模式:"
        echo "    npm run dev:test"
        ;;
    2)
        echo "  Supabase 模式:"
        echo "    npm run dev"
        ;;
    3)
        echo "  MSW 模式:"
        echo "    npm run dev:test"
        ;;
esac

echo ""
echo "📖 更多信息请查看:"
echo "  - ENV_SETUP_GUIDE.md"
echo "  - SUPABASE_QUICKSTART.md"
echo ""

