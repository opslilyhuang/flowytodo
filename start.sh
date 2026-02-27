#!/bin/bash

echo "🚀 启动 Flowy Todo..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未安装 Node.js"
    echo "请访问 https://nodejs.org 下载安装"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 启动服务器
echo "🌟 启动服务器..."
node server.js
