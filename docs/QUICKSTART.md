# 快速启动指南

## 前置要求

确保已安装以下软件：
- Node.js >= 18.0.0
- npm >= 9.0.0

## 安装步骤

### 1. 安装所有依赖

```bash
npm run install:all
```

这将安装根目录、前端和后端的所有依赖。

### 2. 启动开发服务器

```bash
npm run dev
```

这将同时启动：
- 前端开发服务器：http://localhost:5173
- 后端API服务器：http://localhost:3000

### 3. 访问应用

打开浏览器访问：http://localhost:5173

## 功能演示

### 创建遗产计划

1. 点击"创建遗产计划"按钮
2. 添加数字资产（加密货币、云账号、加密文件等）
3. 添加监护人（姓名、角色）
4. 设置门限参数（如3-of-5）
5. 选择触发模式（时间锁、社会共识、混合模式）
6. 确认并创建计划

### 查看控制台

1. 点击"控制台"菜单
2. 查看所有遗产计划
3. 查看计划详情
4. 查看资产和监护人信息

### 发起继承

1. 点击"继承"菜单
2. 输入遗产计划ID和继承人地址
3. 发起继承请求
4. 等待监护人提交份额
5. 验证并恢复资产

### 监护人门户

1. 点击"监护人"菜单
2. 输入遗产计划ID和监护人ID
3. 提交加密份额
4. 确认提交成功

## API测试

可以使用以下curl命令测试API：

### 健康检查
```bash
curl http://localhost:3000/api/health
```

### 创建计划
```bash
curl -X POST http://localhost:3000/api/plans \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试计划",
    "assets": [
      {
        "type": "crypto",
        "name": "比特币",
        "value": "1.0 BTC"
      }
    ],
    "guardians": [
      {
        "id": "guardian-1",
        "name": "张三",
        "role": "妻子",
        "publicKey": "0x123..."
      }
    ],
    "threshold": 3,
    "totalShares": 5,
    "triggerMode": "hybrid",
    "timeLock": 180
  }'
```

### 获取所有计划
```bash
curl http://localhost:3000/api/plans
```

## 停止服务器

按 `Ctrl + C` 停止开发服务器。

## 常见问题

### 端口被占用

如果端口3000或5173被占用，可以修改配置：

**后端端口**：编辑 `backend/.env` 文件，修改 `PORT` 值

**前端端口**：编辑 `frontend/vite.config.ts` 文件，修改 `server.port` 值

### 依赖安装失败

尝试清除缓存后重新安装：

```bash
rm -rf node_modules package-lock.json
npm install
```

### 前端无法连接后端

检查：
1. 后端是否正在运行
2. 端口配置是否正确
3. CORS配置是否正确

## 下一步

- 阅读 [API文档](./docs/API.md) 了解更多API详情
- 阅读 [部署文档](./docs/DEPLOYMENT.md) 了解生产环境部署
- 阅读 [架构文档](./docs/ARCHITECTURE.md) 了解系统架构

## 技术支持

如有问题，请查看：
- GitHub Issues
- 项目文档
- 代码注释
