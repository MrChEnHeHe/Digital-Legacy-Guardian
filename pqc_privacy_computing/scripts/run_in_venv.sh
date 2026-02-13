#!/bin/bash
# Linux/macOS虚拟环境激活和启动脚本
# 自动激活虚拟环境并启动项目

echo "========================================"
echo "后量子安全隐私计算系统"
echo "========================================"
echo ""

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 检查虚拟环境是否存在
if [ ! -f "venv/bin/activate" ]; then
    echo "[错误] 虚拟环境不存在"
    echo "请先运行: python3 scripts/setup_venv.py"
    exit 1
fi

# 激活虚拟环境
echo "[激活] 虚拟环境..."
source venv/bin/activate

# 检查启动参数
case "$1" in
    "")
        echo ""
        echo "[启动] 交互式模式..."
        python run_demo.py
        ;;
    --web)
        echo ""
        echo "[启动] Web界面..."
        python run_demo.py --web
        ;;
    --server)
        echo ""
        echo "[启动] 服务器..."
        python run_demo.py --server
        ;;
    --client)
        echo ""
        echo "[启动] 客户端..."
        python run_demo.py --client
        ;;
    --test)
        echo ""
        echo "[启动] 测试..."
        python run_demo.py --test
        ;;
    --all)
        echo ""
        echo "[启动] 完整演示..."
        python run_demo.py --all
        ;;
    *)
        echo ""
        echo "[启动] 自定义参数..."
        python run_demo.py "$@"
        ;;
esac

echo ""
echo "========================================"
echo "项目已关闭"
echo "========================================"

# 退出虚拟环境
deactivate
