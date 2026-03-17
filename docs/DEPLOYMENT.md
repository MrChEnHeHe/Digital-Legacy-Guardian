# 部署文档

## 系统要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd digital_legacy
```

### 2. 安装依赖

```bash
# 安装所有依赖
npm run install:all

# 或者分别安装
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 3. 配置环境变量

#### 后端配置

复制 `.env.example` 到 `.env`：

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件：

```env
PORT=3000
NODE_ENV=development

# 密码学配置
PRIME_NUMBER=115792089237316195423570985008687907853269984665640564039457584007913129639747
FIELD_SIZE=256

# 智能合约配置
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
CHAIN_ID=1

# IPFS配置（模拟）
IPFS_GATEWAY=https://ipfs.io/ipfs/
```

#### 前端配置

前端配置在 `vite.config.ts` 中，默认代理到 `http://localhost:3000`。

### 4. 启动开发服务器

#### 方式一：同时启动前后端

```bash
npm run dev
```

这将同时启动：
- 前端: http://localhost:5173
- 后端: http://localhost:3000

#### 方式二：分别启动

**启动后端：**
```bash
cd backend
npm run dev
```

**启动前端：**
```bash
cd frontend
npm run dev
```

### 5. 访问应用

打开浏览器访问：http://localhost:5173

---

## 生产部署

### 1. 构建前端

```bash
cd frontend
npm run build
```

构建产物将在 `frontend/dist` 目录中。

### 2. 构建后端

```bash
cd backend
npm run build
```

构建产物将在 `backend/dist` 目录中。

### 3. 部署后端

#### 使用 PM2

```bash
cd backend
npm install -g pm2
pm2 start dist/index.js --name digital-legacy-backend
pm2 save
pm2 startup
```

#### 使用 Docker

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

构建并运行：

```bash
docker build -t digital-legacy-backend .
docker run -p 3000:3000 -e PORT=3000 digital-legacy-backend
```

### 4. 部署前端

#### 使用 Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/digital-legacy/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 使用 Vercel/Netlify

直接将 `frontend` 目录连接到 Vercel 或 Netlify 即可。

---

## 智能合约部署

### 1. 安装 Hardhat

```bash
cd contracts
npm install
```

### 2. 编译合约

```bash
npx hardhat compile
```

### 3. 部署到本地网络

```bash
npx hardhat node
```

在另一个终端：

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 4. 部署到测试网

编辑 `hardhat.config.js`，添加测试网配置：

```javascript
require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

部署：

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

---

## 环境变量说明

### 后端环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 3000 |
| NODE_ENV | 运行环境 | development |
| PRIME_NUMBER | 素数（用于密码学） | - |
| FIELD_SIZE | 字段大小 | 256 |
| CONTRACT_ADDRESS | 智能合约地址 | - |
| CHAIN_ID | 链ID | 1 |
| IPFS_GATEWAY | IPFS网关地址 | https://ipfs.io/ipfs/ |

---

## 监控和日志

### PM2 监控

```bash
pm2 monit
pm2 logs digital-legacy-backend
```

### 日志配置

后端使用 `console.log` 输出日志，生产环境建议使用 Winston 或 Pino。

---

## 安全建议

1. **环境变量**：永远不要将 `.env` 文件提交到版本控制
2. **HTTPS**：生产环境必须使用 HTTPS
3. **CORS**：配置适当的 CORS 策略
4. **速率限制**：实施 API 速率限制
5. **输入验证**：所有输入都应进行验证和清理
6. **依赖更新**：定期更新依赖包以修复安全漏洞

---

## 故障排除

### 前端无法连接后端

检查：
1. 后端是否正在运行
2. 端口是否正确
3. CORS 配置是否正确
4. 防火墙是否阻止连接

### 密码学操作失败

检查：
1. 素数配置是否正确
2. 字段大小是否匹配
3. 输入数据格式是否正确

### 智能合约部署失败

检查：
1. Gas 费用是否足够
2. 私钥是否正确
3. 网络连接是否正常
4. 合约代码是否有语法错误

---

## 性能优化

### 前端优化

1. 启用代码分割
2. 使用懒加载
3. 优化图片和资源
4. 启用 Gzip 压缩

### 后端优化

1. 使用缓存（Redis）
2. 实施数据库索引
3. 使用连接池
4. 启用压缩

---

## 备份和恢复

### 数据备份

```bash
# 备份数据库
pg_dump dbname > backup.sql

# 备份配置文件
cp .env .env.backup
```

### 数据恢复

```bash
# 恢复数据库
psql dbname < backup.sql

# 恢复配置文件
cp .env.backup .env
```

---

## 更新和维护

### 更新依赖

```bash
# 检查过时的依赖
npm outdated

# 更新依赖
npm update

# 审计安全漏洞
npm audit
npm audit fix
```

### 版本升级

1. 备份当前版本
2. 拉取新版本代码
3. 安装依赖
4. 运行测试
5. 部署新版本
6. 监控日志和性能

---

## 联系支持

如有问题，请通过以下方式联系：
- GitHub Issues: [项目地址]/issues
- Email: support@example.com
