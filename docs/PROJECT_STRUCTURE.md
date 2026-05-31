# 数字遗产管家 (Digital Legacy Guardian)

基于门限密码与去中心化触发条件的数字资产继承协议

## 项目结构

```
digital_legacy/
├── frontend/              # React 前端应用
│   ├── src/
│   │   ├── components/   # React 组件
│   │   │   ├── AIAssistant/  # AI 助手组件
│   │   │   ├── Layout.tsx    # 主布局组件
│   │   │   └── Navbar.tsx     # 导航栏组件
│   │   ├── pages/        # 页面
│   │   │   ├── Home.tsx       # 首页
│   │   │   ├── CreatePlan.tsx # 创建计划页面
│   │   │   ├── EditPlan.tsx   # 编辑计划页面
│   │   │   ├── Dashboard.tsx  # 控制台
│   │   │   ├── Inheritance.tsx # 继承页面
│   │   │   ├── Guardian.tsx   # 监护人门户
│   │   │   └── AIHelper.tsx   # AI 助手页面
│   │   ├── services/     # API 服务
│   │   │   └── api.ts    # API 封装
│   │   ├── App.tsx       # 主应用组件
│   │   ├── main.tsx      # 应用入口
│   │   └── index.css     # 全局样式
│   ├── public/           # 静态资源
│   │   └── demo-template.json
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── backend/              # Node.js 后端服务
│   ├── src/
│   │   ├── crypto/       # 密码学模块
│   │   │   └── shamir.ts # Shamir 秘密共享实现
│   │   ├── services/     # 业务逻辑
│   │   │   ├── aiService.ts      # AI 服务
│   │   │   ├── emailService.ts   # 邮件服务
│   │   │   ├── legacyPlanService.ts  # 遗产计划服务
│   │   │   └── userService.ts    # 用户服务
│   │   └── index.ts      # API 入口
│   ├── storage/          # 数据存储（开发环境）
│   │   ├── plans.json
│   │   ├── requests.json
│   │   ├── users.json
│   │   └── verificationCodes.json
│   ├── package.json
│   └── tsconfig.json
├── contracts/            # 智能合约
│   ├── LegacyContract.sol    # 主合约
│   ├── hardhat.config.js
│   ├── scripts/
│   │   └── deploy.js         # 部署脚本
│   └── test/
│       └── LegacyContract.test.js  # 合约测试
├── docs/                 # 文档
│   ├── API.md            # API 文档
│   ├── ARCHITECTURE.md   # 架构文档
│   ├── DEPLOYMENT.md     # 部署文档
│   ├── PROJECT_STRUCTURE.md  # 项目结构说明
│   ├── PROJECT_SUMMARY.md    # 项目总结
│   ├── QUICKSTART.md     # 快速启动指南
│   └── ZKP_VERIFIABILITY.md  # ZKP 可验证性
└── package.json          # 根配置
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
- **存储**: JSON 文件（开发环境）
- **AI 助手**: AI 服务集成

## 核心功能

1. **资产托管** - 将私钥/密码分片加密，分发给多位监护人
2. **条件触发** - 时间锁、社会共识、混合模式三种触发机制
3. **隐私继承** - 零知识证明+门限签名，资产详情全程加密
4. **AI 助手** - 智能辅助资产管理和继承流程

## 使用说明

详细使用说明请参考 [docs/QUICKSTART.md](QUICKSTART.md) 和 [docs/DEPLOYMENT.md](DEPLOYMENT.md)

## 许可证

MIT License
