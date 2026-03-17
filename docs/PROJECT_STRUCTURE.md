# 数字遗产管家 (Digital Legacy Guardian)

基于门限密码与去中心化触发条件的数字资产继承协议

## 项目结构

```
digital_legacy/
├── frontend/              # React 前端应用
│   ├── src/
│   │   ├── components/   # React 组件
│   │   ├── pages/        # 页面
│   │   ├── services/     # API 服务
│   │   └── utils/        # 工具函数
│   ├── package.json
│   └── vite.config.ts
├── backend/              # Node.js 后端服务
│   ├── src/
│   │   ├── crypto/       # 密码学模块
│   │   ├── routes/       # API 路由
│   │   ├── models/       # 数据模型
│   │   └── utils/        # 工具函数
│   ├── package.json
│   └── tsconfig.json
├── contracts/            # 智能合约
│   ├── LegacyContract.sol
│   └── hardhat.config.js
├── docs/                 # 文档
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
└── README.md            # 项目说明
```

## 快速开始

### 安装依赖

```bash
npm run install:all
```

### 开发模式

```bash
npm run dev
```

这将同时启动前端（http://localhost:5173）和后端（http://localhost:3000）

### 构建生产版本

```bash
npm run build
```

## 技术栈

- **前端**: React 18 + TypeScript + Vite + TailwindCSS
- **后端**: Node.js + Express + TypeScript
- **密码学**: Shamir Secret Sharing + PVSS + 门限签名
- **智能合约**: Solidity + Hardhat
- **存储**: IPFS（模拟）
- **可视化**: React Flow + Chart.js

## 核心功能

1. **资产托管** - 将私钥/密码分片加密，分发给多位监护人
2. **条件触发** - 时间锁、社会共识、混合模式三种触发机制
3. **隐私继承** - 零知识证明+门限签名，资产详情全程加密

## 使用说明

详细使用说明请参考 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 许可证

MIT License
