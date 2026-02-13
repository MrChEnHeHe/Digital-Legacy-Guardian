#!/usr/bin/env python3
"""
后量子隐私计算系统 - 一键启动脚本
提供便捷的演示启动方式
"""

import subprocess
import sys
import os
import time
import signal
import argparse
from pathlib import Path


def print_banner():
    """打印启动横幅"""
    banner = """
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║     🔐 后量子安全隐私计算系统 (PQC Privacy Computing)         ║
    ║                                                              ║
    ║     基于NIST ML-KEM (Kyber) 的隐私计算协议实现                ║
    ║                                                              ║
    ║     支持: OT | PSI | PIR                                    ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)


def check_dependencies():
    """检查依赖项"""
    print("[检查] 验证依赖项...")
    
    required_packages = [
        'numpy',
        'pycryptodome',
        'pyyaml',
        'pytest'
    ]
    
    missing = []
    for package in required_packages:
        try:
            # 特殊处理不同的包导入名称
            if package == 'pycryptodome':
                __import__('Crypto')
            elif package == 'pyyaml':
                __import__('yaml')
            else:
                __import__(package)
        except ImportError:
            missing.append(package)
    
    if missing:
        print(f"[警告] 缺少依赖: {', '.join(missing)}")
        print("[提示] 运行: pip install -r config/requirements.txt")
        return False
    
    print("[✓] 所有依赖已安装")
    return True


def run_server(host='127.0.0.1', port=8888):
    """启动服务器"""
    print(f"[启动] 服务器 ({host}:{port})...")
    
    server_process = subprocess.Popen(
        [sys.executable, 'demo/server.py', '--host', host, '--port', str(port)],
        cwd=Path(__file__).parent,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # 等待服务器启动
    time.sleep(2)
    
    if server_process.poll() is None:
        print("[✓] 服务器启动成功")
        return server_process
    else:
        stdout, stderr = server_process.communicate()
        print(f"[✗] 服务器启动失败:\n{stderr}")
        return None


def run_client_interactive(host='127.0.0.1', port=8888):
    """启动交互式客户端"""
    print("[启动] 交互式客户端...")
    
    try:
        subprocess.run(
            [sys.executable, 'demo/client.py', '--host', host, '--port', str(port)],
            cwd=Path(__file__).parent
        )
    except KeyboardInterrupt:
        print("\n[停止] 客户端已停止")


def run_web_interface():
    """启动Web界面"""
    print("[启动] Streamlit Web界面...")
    
    try:
        subprocess.run(
            ['streamlit', 'run', 'demo/interactive_demo.py', '--server.port', '8501'],
            cwd=Path(__file__).parent
        )
    except FileNotFoundError:
        print("[✗] 未找到streamlit，请先安装: pip install streamlit")
    except KeyboardInterrupt:
        print("\n[停止] Web界面已停止")


def run_tests():
    """运行测试"""
    print("[启动] 运行单元测试...")
    
    try:
        subprocess.run(
            ['pytest', 'tests/', '-v', '--tb=short'],
            cwd=Path(__file__).parent
        )
    except FileNotFoundError:
        print("[✗] 未找到pytest，请先安装: pip install pytest")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='后量子隐私计算系统启动器',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  python run_demo.py              # 交互式选择
  python run_demo.py --server      # 仅启动服务器
  python run_demo.py --client      # 仅启动客户端
  python run_demo.py --web         # 启动Web界面
  python run_demo.py --test        # 运行测试
  python run_demo.py --all         # 启动服务器+客户端
        """
    )
    
    parser.add_argument('--server', action='store_true', help='启动服务器')
    parser.add_argument('--client', action='store_true', help='启动客户端')
    parser.add_argument('--web', action='store_true', help='启动Web界面')
    parser.add_argument('--test', action='store_true', help='运行测试')
    parser.add_argument('--all', action='store_true', help='启动完整演示')
    parser.add_argument('--host', default='127.0.0.1', help='服务器地址')
    parser.add_argument('--port', type=int, default=8888, help='服务器端口')
    
    args = parser.parse_args()
    
    print_banner()
    
    # 如果没有指定参数，进入交互模式
    if not any([args.server, args.client, args.web, args.test, args.all]):
        print("请选择启动模式:")
        print("  1. 启动服务器")
        print("  2. 启动客户端")
        print("  3. 启动Web界面")
        print("  4. 运行测试")
        print("  5. 启动完整演示（服务器+客户端）")
        print("  0. 退出")
        
        choice = input("\n输入选项 (0-5): ").strip()
        
        if choice == '1':
            args.server = True
        elif choice == '2':
            args.client = True
        elif choice == '3':
            args.web = True
        elif choice == '4':
            args.test = True
        elif choice == '5':
            args.all = True
        else:
            print("退出")
            return
    
    # 检查依赖
    deps_ok = check_dependencies()
    if not deps_ok:
        # 如果使用命令行参数，自动继续；否则询问用户
        if any([args.server, args.client, args.web, args.test, args.all]):
            print("[提示] 继续执行，但可能缺少某些功能")
        else:
            if input("是否继续? (y/n): ").lower() != 'y':
                return
    
    server_process = None
    
    try:
        if args.all:
            # 启动完整演示
            server_process = run_server(args.host, args.port)
            if server_process:
                time.sleep(2)
                run_client_interactive(args.host, args.port)
        
        elif args.server:
            # 仅启动服务器
            server_process = run_server(args.host, args.port)
            if server_process:
                print("\n服务器正在运行，按Ctrl+C停止...")
                server_process.wait()
        
        elif args.client:
            # 仅启动客户端
            run_client_interactive(args.host, args.port)
        
        elif args.web:
            # 启动Web界面
            run_web_interface()
        
        elif args.test:
            # 运行测试
            run_tests()
    
    except KeyboardInterrupt:
        print("\n\n[停止] 收到中断信号，正在关闭...")
    
    finally:
        if server_process and server_process.poll() is None:
            print("[关闭] 停止服务器...")
            server_process.terminate()
            server_process.wait()
        
        print("[✓] 系统已关闭")


if __name__ == '__main__':
    main()