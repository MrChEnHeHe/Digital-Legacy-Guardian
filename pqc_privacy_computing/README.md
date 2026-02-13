# 后量子安全隐私计算系统 (PQC-Privacy-Computing)

基于NIST后量子密码标准（ML-KEM/Kyber）的隐私计算协议实现，包含不经意传输(OT)、隐私求交(PSI)和隐私信息检索(PIR)等核心功能。

## 🎯 项目亮点

- **后量子安全**：基于Kyber-768算法，抗量子计算攻击
- **隐私计算**：实现不经意传输(OT)、安全求交(PSI)等协议
- **高效实现**：使用NumPy优化格密码运算，支持批量处理
- **可视化演示**：提供交互式Web界面展示协议执行流程

## 📁 项目结构
pqc_privacy_computing/
├── src/                    # 核心源代码
│   ├── crypto/            # 密码学原语实现
│   │   ├── kyber_ot.py    # Kyber-based OT实现
│   │   ├── lattice_utils.py # 格运算工具
│   │   └── noise_manager.py # 噪声管理
│   ├── protocols/         # 隐私计算协议
│   │   ├── base_ot.py     # 基础OT协议
│   │   ├── psi_protocol.py # 隐私求交协议
│   │   └── pir_protocol.py # 隐私检索协议
│   ├── network/           # 网络通信层
│   └── utils/             # 工具函数
├── demo/                  # 演示脚本
├── tests/                 # 单元测试
└── docs/                  # 技术文档

## 🚀 快速开始

### 安装依赖

```bash
pip install -r config/requirements.txt
# 启动服务器
python demo/server.py

# 启动客户端（新终端）
python demo/client.py

# 或运行交互式演示
python run_demo.py

to 和溢位：
为了减少各位工作量，我写了一个配置虚拟环境的脚本，现在步骤如下
(先让终端走到工作目录 （cd .\pqc_privacy_computing\scripts\）)
1. 终端运行  python setup_env.py 安装依赖
2. 终端运行 python run_demo_venv.py 启动演示


