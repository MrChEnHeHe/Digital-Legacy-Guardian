&lt;!-- docs/architecture.md --&gt;
# 后量子安全隐私计算系统 - 架构设计文档

## 1. 系统概述

### 1.1 设计目标

后量子安全隐私计算系统（PQC-Privacy-Computing）旨在构建一个**抗量子攻击**的隐私计算平台，解决传统隐私计算依赖RSA/ECC等易受Shor算法攻击的密码学基础问题。

**核心设计原则：**
- **后量子安全性**：基于NIST标准化的ML-KEM（Kyber）算法
- **协议级重构**：不仅替换加密原语，更重构OT/PSI/PIR协议底层逻辑
- **工程完整性**：从格密码运算到Web可视化的全栈实现
- **模块化设计**：分层架构，各层职责清晰，便于扩展和维护

### 1.2 技术栈

| 层级 | 技术组件 | 说明 |
|------|---------|------|
| 密码原语层 | NumPy, PyCryptodome | 格密码运算、哈希、对称加密 |
| 协议逻辑层 | 自研OT/PSI/PIR | 基于Kyber的协议实现 |
| 网络通信层 | Python Socket | 后量子安全通道 |
| 配置管理层 | PyYAML | 多环境配置 |
| 日志监控层 | 自研PQCLogger | 结构化日志、性能追踪 |
| 可视化层 | Streamlit | 交互式Web演示 |

## 2. 系统架构

### 2.1 分层架构图
┌─────────────────────────────────────────────────────────────┐
│                    应用层 (Application)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   OT Demo    │  │   PSI Demo   │  │   PIR Demo   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Streamlit Web Interface                   │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    协议层 (Protocol)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  BaseOT      │  │ CuckooHash   │  │  BatchPIR    │      │
│  │  OTExtension │  │ PSI Protocol │  │  KeywordPIR  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                    密码层 (Cryptography)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Kyber KEM   │  │  Polynomial  │  │  Noise       │      │
│  │  Kyber OT    │  │  NTT Transform│ │  Manager     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                    基础设施层 (Infrastructure)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │SecureChannel │  │ PQCDataPacket│  │  PQCLogger   │      │
│  │MessageHandler│  │  Serializer  │  │  Metrics     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘

### 2.2 模块职责

#### 2.2.1 密码原语层 (`src/crypto/`)

**`lattice_utils.py`** - 格密码基础运算
- 多项式环 $\mathbb{Z}_Q[x]/(x^N + 1)$ 的实现
- NTT（数论变换）快速乘法
- 中心二项分布噪声采样
- 多项式压缩/解压缩

**`kyber_ot.py`** - Kyber算法实现
- ML-KEM-768密钥封装机制（KEM）
- 基于Kyber的1-out-of-2 OT构造
- 批量OT扩展（IKNP-style）
- 密钥派生和封装/解封装

**`noise_manager.py`** - 噪声管理
- 同态加密噪声预算跟踪
- 模数切换（Modulus Switching）优化
- 自举（Bootstrapping）刷新策略
- 噪声增长估计和优化建议

#### 2.2.2 协议逻辑层 (`src/protocols/`)

**`base_ot.py`** - 不经意传输基础
- 基础1-out-of-2 OT实现
- OT扩展协议（将k个OT扩展为n个）
- 随机OT生成
- 与Kyber OT的集成接口

**`psi_protocol.py`** - 隐私求交协议
- 布谷鸟哈希（Cuckoo Hashing）实现
- 基于OT扩展的PSI协议
- 发送方/接收方角色分离
- 交集计算和统计信息

**`pir_protocol.py`** - 隐私信息检索
- 基于同态加密的PIR实现
- 批量PIR查询优化
- 关键词PIR（Keyword PIR）
- 查询生成和结果解密

#### 2.2.3 网络通信层 (`src/network/`)

**`secure_channel.py`** - 安全通道
- 基于Kyber的密钥交换
- 会话加密（AES-256-GCM简化版）
- 客户端/服务器模式支持
- 消息分片和重组

**`message_handler.py`** - 消息处理
- 协议消息类型定义
- 消息序列化/反序列化
- 消息路由和分发
- 协议专用处理器（OT/PSI/PIR）

#### 2.2.4 基础设施层 (`src/utils/`)

**`data_structure.py`** - 数据结构
- 统一数据包格式（PQCDataPacket）
- 协议专用数据包（OT/PSI/PIR）
- 大数据流分块传输
- 安全序列化（带认证）

**`logger.py`** - 日志系统
- 结构化日志（JSON/文本）
- 协议执行追踪
- 性能计时和统计
- 审计日志记录

## 3. 核心流程

### 3.1 OT协议执行流程

```mermaid
sequenceDiagram
    participant R as Receiver (Client)
    participant S as Sender (Server)
    
    Note over R,S: 1-out-of-2 OT based on Kyber-KEM
    
    R->>R: Generate two key pairs<br/>(pk₀, sk₀), (pk₁, sk₁)
    R->>S: Send (pk₀, pk₁)<br/>(order based on choice bit b)
    
    S->>S: Encapsulate to pk₀ → (ct₀, k₀)<br/>Encapsulate to pk₁ → (ct₁, k₁)
    S->>S: Encrypt m₀ with k₀ → e₀<br/>Encrypt m₁ with k₁ → e₁
    S->>R: Send (ct₀, e₀), (ct₁, e₁)
    
    R->>R: Decapsulate ct_b with sk_b → k_b
    R->>R: Decrypt e_b with k_b → m_b
    Note right of R: Receiver gets m_b<br/>but learns nothing about m₁₋ᵦ
    Note left of S: Sender learns nothing<br/>about choice bit b