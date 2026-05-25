# 数字遗产管家（Digital Legacy Guardian）

## 基于门限密码与去中心化触发条件的数字资产继承协议

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)

---

## 📋 目录

- [项目概述](#项目概述)
- [核心功能](#核心功能)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [技术栈](#技术栈)
- [密码学方法](#密码学方法)
- [应用场景](#应用场景)
- [文档](#文档)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 项目概述

### 核心问题

数字时代，个人资产高度数字化（加密货币、云账号、加密文件等）。当持有者意外离世或失能时：

- **私钥单点风险**：加密货币私钥仅本人掌握，资产永久丢失（估算超2000亿美元）
- **云资产孤岛**：家人知晓账号但无密码，平台政策不透明，难以合法继承
- **传统方案失效**：公证处成本高、周期长，无法覆盖数字资产特性

### 解决方案

**用"数学分散"替代"信任集中"**——通过门限密码学将资产控制权分布式托管，设置可编程触发条件，实现无需信任任何单一机构的自动化、隐私化数字遗产继承。

---

## 核心功能

### 功能架构

| 功能模块 | 核心能力 | 用户价值 |
|---------|---------|---------|
| **资产托管** | 将私钥/密码分片加密，分发给多位监护人 | 消除单点故障，避免"一人失能，资产全失" |
| **条件触发** | 时间锁、社会共识、混合模式三种触发机制 | 自动化验证"继承条件"，防 premature 执行 |
| **隐私继承** | 零知识证明+门限签名，资产详情全程加密 | 继承前无人知晓资产规模，抗胁迫设计 |

### 覆盖资产类型

- **加密货币**：BTC、ETH等，通过门限签名直接链上转账
- **云账号凭证**：邮箱、网盘、社交账号密码，加密托管触发后释放
- **加密文件**：个人照片、视频、文档，解密密钥分片托管
- **智能合约权限**：DeFi协议、NFT所有权，多签权限转移

---

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
# 安装所有依赖
npm run install:all
```

### 启动开发服务器

```bash
# 同时启动前端和后端
npm run dev
```

这将启动：
- 前端：http://localhost:5173
- 后端：http://localhost:3000

### 访问应用

打开浏览器访问：http://localhost:5173

### 环境变量配置

> **注意**：环境变量配置文件不包含在GitHub源码中，需要手动创建。

#### 创建后端环境配置文件

在 `backend/.env` 文件中添加以下配置：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# Deepseek AI API配置（用于AI助手功能）
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_API_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# 密码学配置
PRIME_NUMBER=115792089237316195423570985008687907853269984665640564039457584007913129639747
FIELD_SIZE=256

# 智能合约配置
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
CHAIN_ID=1

# IPFS配置（模拟）
IPFS_GATEWAY=https://ipfs.io/ipfs/

# 邮件服务配置（用于发送份额通知和继承通知）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_FROM=your-email@example.com
```

#### 配置说明

| 配置项 | 说明 | 必填 |
|--------|------|------|
| `PORT` | 后端服务端口 | 是 |
| `DEEPSEEK_API_KEY` | Deepseek大模型API密钥 | AI助手功能需要 |
| `SMTP_HOST` | SMTP邮件服务器地址 | 邮件通知功能需要 |
| `SMTP_USER` | 邮件账号 | 邮件通知功能需要 |
| `SMTP_PASS` | 邮件密码/授权码 | 邮件通知功能需要 |

#### 获取API密钥

1. **Deepseek API**：访问 [Deepseek官网](https://platform.deepseek.com/) 注册获取API密钥

### 快速演示

1. **创建遗产计划**：添加数字资产、监护人，设置触发条件
2. **查看控制台**：管理所有遗产计划，查看详情
3. **发起继承**：输入计划ID，发起继承请求
4. **监护人门户**：提交监护人份额

详细使用说明请参考 [快速启动指南](./QUICKSTART.md)

---

## 项目结构

```
digital_legacy/
├── frontend/              # React 前端应用
│   ├── src/
│   │   ├── components/   # React 组件
│   │   │   └── Layout.tsx
│   │   ├── pages/        # 页面
│   │   │   ├── Home.tsx
│   │   │   ├── CreatePlan.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Inheritance.tsx
│   │   │   └── Guardian.tsx
│   │   ├── services/     # API 服务
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── backend/              # Node.js 后端服务
│   ├── src/
│   │   ├── crypto/       # 密码学模块
│   │   │   └── shamir.ts
│   │   ├── services/     # 业务逻辑
│   │   │   └── legacyPlanService.ts
│   │   └── index.ts      # API 入口
│   ├── package.json
│   └── tsconfig.json
├── contracts/            # 智能合约
│   ├── LegacyContract.sol
│   ├── hardhat.config.js
│   ├── scripts/
│   │   └── deploy.js
│   └── test/
│       └── LegacyContract.test.js
├── docs/                 # 文档
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
├── README.md            # 项目说明
├── QUICKSTART.md        # 快速启动指南
└── package.json         # 根配置
```

---

## 技术栈

### 前端

- **框架**：React 18 + TypeScript
- **构建工具**：Vite 5
- **样式**：TailwindCSS 3
- **路由**：React Router 6
- **HTTP客户端**：Axios
- **动画**：Framer Motion
- **图标**：Lucide React

### 后端

- **运行时**：Node.js 18+
- **框架**：Express 4
- **语言**：TypeScript 5
- **密码学**：crypto-js, elliptic
- **ID生成**：uuid

### 智能合约

- **语言**：Solidity 0.8.19
- **框架**：Hardhat
- **网络**：Ethereum / EVM兼容链

### 存储

- **开发环境**：内存存储
- **生产环境**：PostgreSQL（计划中）
- **去中心化存储**：IPFS（计划中）

---

## 密码学方法

### 核心技术：Shamir秘密共享（SSS）

**核心思想**：将秘密 S 拆分为 n 个份额，任意 t 个份额可恢复秘密，少于 t 个则信息论安全。

**数学实现**：
- 在有限域 Z_p 上构造 t-1 次多项式：
  f(x) = a_0 + a_1*x + a_2*x^2 + ... + a_{t-1}*x^{t-1} mod p
- 其中 a_0 = S（秘密），a_1...a_{t-1} 随机选择
- 计算 n 个点 (x_i, f(x_i)) 作为份额分发
- 恢复时使用拉格朗日插值：
  S = Σ(y_i * Π(x_j / (x_j - x_i))) mod p

**安全特性**：少于 t 个份额，数学上无法获得 S 的任何信息。

### 增强技术

| 技术 | 全称 | 作用 | 解决的问题 |
|------|------|------|-----------|
| **PVSS** | Publicly Verifiable Secret Sharing（可验证秘密共享） | 份额附带零知识证明 | 防止恶意监护人提交假份额导致恢复失败 |
| **DKG** | Distributed Key Generation（分布式密钥生成） | 多方共同生成密钥，无单一创建者 | 消除"上帝视角"风险，密钥从诞生即分散 |
| **门限签名** | Threshold Signature Scheme | t 方协作生成有效签名，无需重构私钥 | 区块链资产直接转移，私钥全程不暴露 |
| **时间锁加密** | Time-Lock Encryption | 密码学强制延迟解密 | 防 premature 执行，预留申诉期 |

---

## 应用场景

### 典型场景

**场景A：加密货币持有者**
- 持有10 BTC、50 ETH，分布在多钱包
- 设置3-of-5门限：妻子、两子女、律师、好友各持份额
- 触发条件：6个月无链上活动 + 3位监护人确认
- 意外去世后，子女发起请求，律师+好友+妻子确认，资产自动转移至预设地址

**场景B：数字内容创作者**
- 积累大量加密摄影作品、未发布手稿
- 设置时间锁触发（5年）+ 社会共识备份
- 若5年无活动，作品自动释放给指定博物馆/档案馆

**场景C：跨境家庭**
- 资产分布在不同国家平台，继承人分散多地
- 利用去中心化网络绕过单一司法管辖区限制
- 智能合约自动处理多币种、多平台资产分配

---

## 文档

- [快速启动指南](./docs/QUICKSTART.md) - 快速上手项目
- [API文档](./docs/API.md) - RESTful API详细说明
- [架构文档](./docs/ARCHITECTURE.md) - 系统架构设计
- [部署文档](./docs/DEPLOYMENT.md) - 生产环境部署指南

---

## 核心优势

### 与现有方案对比

| 维度 | 本开源方案 | Ledger Recover | 传统公证 | Safe{Wallet} |
|------|-----------|---------------|---------|-------------|
| **信任模型** | 数学（密码学） | Ledger公司+KYC机构 | 公证处 | 多签合约 |
| **中心化程度** | 去中心化P2P | 中心化服务 | 中心化机构 | 链上多签 |
| **隐私保护** | 零知识，全程加密 | 需KYC，公司可见 | 完全暴露 | 链上透明 |
| **通用资产** | Crypto+云+文件 | 仅Ledger设备 | 通用但慢 | 仅EVM生态 |
| **抗胁迫** | 胁迫码+延迟解锁 | 无 | 无 | 无 |
| **成本** | 仅Gas费 | $9.99/月 | 数千-数万元 | Gas费 |
| **开源可审计** | 全栈开源 | 闭源 | N/A | 部分开源 |

### 技术亮点

1. **无需信任任何单一实体**：包括项目方本身，纯密码学保障
2. **隐私最大化**：资产详情在继承前完全保密，继承过程零知识
3. **可编程灵活性**：触发条件、资产分配、执行逻辑完全可定制
4. **抗审查与持久性**：去中心化网络运行，无法被关闭或冻结

---

## 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范

- 遵循现有代码风格
- 添加必要的注释
- 编写单元测试
- 更新相关文档

### 报告问题

如果发现bug或有功能建议，请通过 [GitHub Issues](../../issues) 提交。

---

## 开源协议

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

### 核心密码学库：Apache-2.0 + MIT，促进广泛采用
### 智能合约：GPL-3.0，确保衍生作品开源
### 硬件设计：CERN-OHL，开放硬件生态

---

## 安全审计

- 内部审计：单元测试 + 模糊测试
- 社区审计：公开漏洞赏金计划
- 专业审计：Trail of Bits/OpenZeppelin（计划中）
- 形式化验证：Certora/Manticore（计划中）

---

## 联系方式

- 项目主页：[GitHub Repository](../../)
- 问题反馈：[GitHub Issues](../../issues)
- 邮箱：21532665643@qq.com

---

## 致谢

感谢所有为这个项目做出贡献的开发者和社区成员！

---

**数字遗产管家**是一个融合门限密码学、去中心化共识、隐私计算的开源基础设施，解决数字时代资产继承的关键痛点：

- **技术前沿**：PVSS、DKG、门限签名等高级密码学原语
- **社会价值**：保护万亿级数字资产，填补市场空白
- **开源伦理**：密码学基础设施应当透明可审计，符合安全社区价值观
- **完整方案**：覆盖"托管-触发-执行"全生命周期，具备实际部署能力

---

