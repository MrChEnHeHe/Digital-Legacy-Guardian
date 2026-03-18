const fs = require('fs');
const path = require('path');

const STORAGE_PATH = path.join(__dirname, 'storage');
const PLANS_FILE = path.join(STORAGE_PATH, 'plans.json');
const REQUESTS_FILE = path.join(STORAGE_PATH, 'requests.json');

// 确保存储目录存在
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

// 清空计划文件
fs.writeFileSync(PLANS_FILE, JSON.stringify({}));
console.log('已清空计划文件:', PLANS_FILE);

// 清空请求文件
fs.writeFileSync(REQUESTS_FILE, JSON.stringify({}));
console.log('已清空请求文件:', REQUESTS_FILE);

console.log('所有存储数据已清空');