#!/bin/bash
# 构建脚本 - 自动构建、提交并推送到 GitHub

# 进入项目目录
cd "$(dirname "$0")"

# 读取版本号
VERSION=$(grep -oP "VERSION = 'v\K[^']+" src/utils/version.ts)
BUILD_TIME=$(date "+%Y-%m-%d %H:%M")

echo "=========================================="
echo "  Minecraft 配方计算器 - 构建脚本"
echo "=========================================="
echo "  版本: $VERSION"
echo "  时间: $BUILD_TIME"
echo "=========================================="

# 更新版本时间（可选）
# sed -i "s/BUILD_TIME = .*/BUILD_TIME = '$BUILD_TIME'/" src/utils/version.ts

# 安装依赖
echo ""
echo "[1/4] 安装依赖..."
npm install

# 构建项目
echo ""
echo "[2/4] 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ 构建失败！"
    exit 1
fi

# Git 提交
echo ""
echo "[3/4] Git 提交..."
git add -A
git commit -m "$VERSION: 更新"

# 推送到 GitHub
echo ""
echo "[4/4] 推送到 GitHub..."
git push

echo ""
echo "=========================================="
echo "  ✅ 完成！"
echo "  版本: $VERSION"
echo "=========================================="
