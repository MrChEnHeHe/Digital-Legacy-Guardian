# setup.py
"""
后量子安全隐私计算系统 (PQC-Privacy-Computing)
安装配置脚本
"""

from setuptools import setup, find_packages
from pathlib import Path
import os

# 读取README
readme_path = Path(__file__).parent / "README.md"
long_description = ""
if readme_path.exists():
    long_description = readme_path.read_text(encoding='utf-8')

# 读取requirements
requirements_path = Path(__file__).parent / "config" / "requirements.txt"
install_requires = []
if requirements_path.exists():
    with open(requirements_path, 'r', encoding='utf-8') as f:
        install_requires = [
            line.strip() 
            for line in f 
            if line.strip() and not line.startswith('#')
        ]

setup(
    # 基本信息
    name="pqc-privacy-computing",
    version="1.0.0",
    author="和溢位",
    author_email="security@example.com",
    description="基于NIST ML-KEM (Kyber) 的后量子安全隐私计算系统",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourteam/pqc-privacy-computing",
    
    # 包配置
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    
    # 包含数据文件
    package_data={
        "": ["*.yaml", "*.yml", "*.json", "*.md"],
    },
    include_package_data=True,
    
    # 包含额外的非包文件
    scripts=[
        "run_demo.py",
    ],
    
    # 包含额外的数据文件
    data_files=[
        ("config", ["config/settings.yaml", "config/requirements.txt"]),
        ("demo", ["demo/server.py", "demo/client.py", "demo/interactive_demo.py"]),
    ],
    
    # 依赖
    python_requires=">=3.8",
    install_requires=install_requires or [
        "numpy>=1.21.0",
        "pycryptodome>=3.15.0",
        "pyyaml>=6.0",
        "pytest>=7.0.0",
        "streamlit>=1.20.0",
        "pandas>=1.3.0",
        "matplotlib>=3.5.0",
    ],
    
    # 可选依赖
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=3.0.0",
            "black>=22.0.0",
            "flake8>=4.0.0",
            "mypy>=0.950",
        ],
        "docs": [
            "sphinx>=4.5.0",
            "sphinx-rtd-theme>=1.0.0",
        ],
        "web": [
            "streamlit>=1.20.0",
            "pandas>=1.3.0",
            "matplotlib>=3.5.0",
        ],
    },
    
    # 入口点
    entry_points={
        "console_scripts": [
            "pqc-demo=pqc_privacy_computing.demo_cli:main",
            "pqc-server=pqc_privacy_computing.server_cli:main",
            "pqc-client=pqc_privacy_computing.client_cli:main",
        ],
    },
    
    # 分类信息
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Science/Research",
        "Intended Audience :: Developers",
        "Topic :: Security :: Cryptography",
        "Topic :: Scientific/Engineering :: Mathematics",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Operating System :: OS Independent",
    ],
    
    # 关键词
    keywords=[
        "post-quantum cryptography",
        "privacy-preserving computation",
        "lattice-based cryptography",
        "kyber",
        "oblivious transfer",
        "private set intersection",
        "private information retrieval",
        "ML-KEM",
        "homomorphic encryption",
    ],
    
    # 项目链接
    project_urls={
        "Bug Reports": "https://github.com/yourteam/pqc-privacy-computing/issues",
        "Source": "https://github.com/yourteam/pqc-privacy-computing",
        "Documentation": "https://pqc-privacy-computing.readthedocs.io",
    },
    
    # 是否压缩
    zip_safe=False,
)