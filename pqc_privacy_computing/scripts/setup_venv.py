#!/usr/bin/env python3
"""
虚拟环境设置脚本
自动创建虚拟环境并安装所有依赖
"""

import subprocess
import sys
import os
from pathlib import Path


def get_project_root():
    """获取项目根目录"""
    return Path(__file__).parent.parent


def run_command(cmd, cwd=None):
    """执行命令"""
    print(f"[执行] {cmd}")
    result = subprocess.run(
        cmd,
        shell=True,
        cwd=cwd or get_project_root(),
        capture_output=True,
        text=True
    )
    
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    
    return result.returncode == 0


def create_venv():
    """创建虚拟环境"""
    print("=" * 60)
    print("后量子安全隐私计算系统 - 虚拟环境设置")
    print("=" * 60)
    
    project_root = get_project_root()
    venv_path = project_root / "venv"
    
    # 检查虚拟环境是否已存在
    if venv_path.exists():
        print(f"\n[提示] 虚拟环境已存在于: {venv_path}")
        response = input("是否重新创建虚拟环境？(y/n): ").lower()
        if response != 'y':
            print("[跳过] 使用现有虚拟环境")
            return True
        
        print("\n[删除] 删除现有虚拟环境...")
        import shutil
        shutil.rmtree(venv_path)
    
    # 创建虚拟环境
    print(f"\n[创建] 虚拟环境: {venv_path}")
    if not run_command(f"{sys.executable} -m venv {venv_path}"):
        print("[错误] 虚拟环境创建失败")
        return False
    
    print("[成功] 虚拟环境创建成功")
    return True


def install_dependencies():
    """安装依赖"""
    project_root = get_project_root()
    
    # 确定pip路径
    if os.name == 'nt':  # Windows
        pip_path = project_root / "venv" / "Scripts" / "pip.exe"
    else:  # Linux/macOS
        pip_path = project_root / "venv" / "bin" / "pip"
    
    print(f"\n[安装] 使用pip: {pip_path}")
    
    # 升级pip
    print("\n[步骤 1/3] 升级pip...")
    if not run_command(f'"{pip_path}" install --upgrade pip'):
        print("[警告] pip升级失败，继续安装依赖...")
    
    # 安装依赖 - 使用国内镜像源和预编译包
    print("\n[步骤 2/3] 安装项目依赖...")
    requirements_path = project_root / "config" / "requirements.txt"
    
    # 使用清华镜像源
    mirror_url = "https://pypi.tuna.tsinghua.edu.cn/simple"
    print(f"[提示] 使用镜像源: {mirror_url}")
    print(f"[提示] 使用预编译包以加快安装速度")
    
    # 构建安装命令
    install_cmd = f'"{pip_path}" install -r "{requirements_path}" -i {mirror_url} --prefer-binary --timeout 300'
    
    if not run_command(install_cmd):
        print("[错误] 依赖安装失败")
        print("\n[提示] 如果安装失败，可以尝试以下方法：")
        print("  1. 检查网络连接")
        print("  2. 手动安装依赖:")
        print("     venv\\Scripts\\activate.bat")
        print(f"     pip install -r config\\requirements.txt -i {mirror_url}")
        return False
    
    print("[成功] 所有依赖安装完成")
    return True


def verify_installation():
    """验证安装"""
    project_root = get_project_root()
    
    # 确定python路径
    if os.name == 'nt':  # Windows
        python_path = project_root / "venv" / "Scripts" / "python.exe"
    else:  # Linux/macOS
        python_path = project_root / "venv" / "bin" / "python"
    
    print(f"\n[验证] 使用Python: {python_path}")
    
    # 测试导入关键依赖
    print("\n[步骤 3/3] 验证依赖安装...")
    test_packages = [
        ('yaml', 'pyyaml'),
        ('numpy', 'numpy'),
        ('Crypto', 'pycryptodome'),
        ('streamlit', 'streamlit'),
        ('pandas', 'pandas'),
        ('matplotlib', 'matplotlib')
    ]
    
    all_ok = True
    for module_name, package_name in test_packages:
        try:
            result = subprocess.run(
                [str(python_path), "-c", f"import {module_name}; print('✓ {module_name}')"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                print(result.stdout.strip())
            else:
                print(f"✗ {module_name} ({package_name}) - 导入失败")
                all_ok = False
        except subprocess.TimeoutExpired:
            print(f"✗ {module_name} ({package_name}) - 导入超时")
            all_ok = False
        except Exception as e:
            print(f"✗ {module_name} ({package_name}) - {e}")
            all_ok = False
    
    if all_ok:
        print("\n[成功] 所有依赖验证通过！")
    else:
        print("\n[警告] 部分依赖验证失败，请检查安装")
    
    return all_ok


def create_activation_guide():
    """创建激活指南"""
    print("\n" + "=" * 60)
    print("虚拟环境设置完成！")
    print("=" * 60)
    
    print("\n激活虚拟环境:")
    
    if os.name == 'nt':  # Windows
        print("  Windows:")
        print("    venv\\Scripts\\activate.bat")
        print("  或运行启动脚本:")
        print("    scripts\\run_in_venv.bat")
    else:  # Linux/macOS
        print("  Linux/macOS:")
        print("    source venv/bin/activate")
        print("  或运行启动脚本:")
        print("    bash scripts/run_in_venv.sh")
    
    print("\n启动项目:")
    print("  Web界面: python run_demo.py --web")
    print("  服务器:   python run_demo.py --server")
    print("  客户端: python run_demo.py --client")
    print("  交互式: python run_demo.py")
    
    print("\n退出虚拟环境:")
    print("  deactivate")
    
    print("\n" + "=" * 60)


def main():
    """主函数"""
    # 创建虚拟环境
    if not create_venv():
        print("[失败] 虚拟环境设置失败")
        sys.exit(1)
    
    # 安装依赖
    if not install_dependencies():
        print("[失败] 依赖安装失败")
        sys.exit(1)
    
    # 验证安装
    if not verify_installation():
        print("[警告] 部分依赖验证失败")
    
    # 创建激活指南
    create_activation_guide()
    
    print("\n[完成] 虚拟环境设置完成！")
    print("\n下一步:")
    print("  1. 激活虚拟环境（见上方指南）")
    print("  2. 运行: python run_demo.py --web")
    print("=" * 60)


if __name__ == "__main__":
    main()
