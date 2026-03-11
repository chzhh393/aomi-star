#!/bin/bash
# 部署脚本 - aomi-star 小程序

set -e

echo "=========================================="
echo "  奥米之星小程序 - 自动化部署脚本"
echo "=========================================="
echo ""

# 项目路径
PROJECT_DIR="/Users/shulie/Desktop/SynologyDrive/个人/cursor/aomi-star"
WECHAT_CLI="/Applications/wechatwebdevtools.app/Contents/MacOS/cli"
ENV_ID="cloud1-0g9rnpap8488905b"

# 检查微信开发者工具
if [ ! -f "$WECHAT_CLI" ]; then
    echo "❌ 未找到微信开发者工具"
    echo "请安装微信开发者工具: https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html"
    exit 1
fi

echo "✅ 找到微信开发者工具"
echo ""

# 部署云函数
echo "📦 开始部署云函数..."
echo ""

CLOUD_FUNCTIONS=("admin" "admin-api" "candidate" "login" "user" "scout")

for func in "${CLOUD_FUNCTIONS[@]}"; do
    echo "正在部署: $func"
    $WECHAT_CLI cloud functions deploy \
        --env "$ENV_ID" \
        --project "$PROJECT_DIR" \
        --names "$func" \
        --remote-npm-install \
        || echo "⚠️  $func 部署失败，请手动部署"
    echo ""
done

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "📝 接下来的步骤："
echo "1. 打开微信开发者工具"
echo "2. 在 云开发 -> 云函数 中检查部署状态"
echo "3. 上传管理后台到静态托管（见下方说明）"
echo "4. 上传小程序代码（点击工具栏的'上传'按钮）"
echo ""
echo "管理后台已构建在: admin-web/dist/"
echo ""
