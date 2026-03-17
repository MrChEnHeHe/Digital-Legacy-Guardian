# API 文档

## 基础信息

- 基础URL: `http://localhost:3000/api`
- 数据格式: JSON

## 端点列表

### 1. 健康检查

**GET** `/health`

检查API服务状态。

**响应示例:**
```json
{
  "status": "ok",
  "message": "Digital Legacy Guardian API is running"
}
```

---

### 2. 创建遗产计划

**POST** `/plans`

创建新的数字遗产计划。

**请求体:**
```json
{
  "name": "我的遗产计划",
  "assets": [
    {
      "type": "crypto",
      "name": "比特币钱包",
      "value": "1.5 BTC",
      "description": "主钱包"
    }
  ],
  "guardians": [
    {
      "id": "guardian-1",
      "name": "张三",
      "role": "妻子",
      "publicKey": "0x..."
    }
  ],
  "threshold": 3,
  "totalShares": 5,
  "triggerMode": "hybrid",
  "timeLock": 180
}
```

**响应示例:**
```json
{
  "id": "plan-uuid",
  "name": "我的遗产计划",
  "assets": [...],
  "guardians": [...],
  "threshold": 3,
  "totalShares": 5,
  "triggerMode": "hybrid",
  "timeLock": 180,
  "masterKey": "...",
  "shares": [...],
  "encryptedAssets": "...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "status": "active"
}
```

---

### 3. 获取所有遗产计划

**GET** `/plans`

获取所有遗产计划列表。

**响应示例:**
```json
[
  {
    "id": "plan-uuid",
    "name": "我的遗产计划",
    "status": "active",
    ...
  }
]
```

---

### 4. 获取单个遗产计划

**GET** `/plans/:id`

获取指定ID的遗产计划详情。

**响应示例:**
```json
{
  "id": "plan-uuid",
  "name": "我的遗产计划",
  "assets": [...],
  "guardians": [...],
  "threshold": 3,
  "totalShares": 5,
  "triggerMode": "hybrid",
  "timeLock": 180,
  "status": "active"
}
```

---

### 5. 更新遗产计划

**PUT** `/plans/:id`

更新遗产计划信息。

**请求体:**
```json
{
  "name": "更新后的计划名称",
  "status": "triggered"
}
```

**响应示例:**
```json
{
  "id": "plan-uuid",
  "name": "更新后的计划名称",
  ...
}
```

---

### 6. 删除遗产计划

**DELETE** `/plans/:id`

删除指定的遗产计划。

**响应示例:**
```json
{
  "success": true
}
```

---

### 7. 发起继承请求

**POST** `/inheritance/initiate`

发起数字遗产继承请求。

**请求体:**
```json
{
  "planId": "plan-uuid",
  "heirAddress": "0x...",
  "guardianSignatures": []
}
```

**响应示例:**
```json
{
  "id": "request-uuid",
  "planId": "plan-uuid",
  "heirAddress": "0x...",
  "guardianSignatures": [],
  "sharesCollected": 0,
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 8. 获取继承状态

**GET** `/inheritance/:planId`

获取指定计划的继承状态。

**响应示例:**
```json
{
  "planId": "plan-uuid",
  "status": "collecting",
  "threshold": 3,
  "sharesCollected": 2,
  "guardians": [
    {
      "id": "guardian-1",
      "name": "张三",
      "role": "妻子",
      "hasSubmitted": true
    }
  ],
  "assets": [...]
}
```

---

### 9. 提交监护人份额

**POST** `/inheritance/share`

监护人提交其持有的份额。

**请求体:**
```json
{
  "planId": "plan-uuid",
  "guardianId": "guardian-1",
  "share": "share-uuid"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "Share submitted successfully"
}
```

---

### 10. 恢复资产

**POST** `/inheritance/recover`

使用收集到的份额恢复数字资产。

**请求体:**
```json
{
  "planId": "plan-uuid",
  "shares": [
    {
      "id": "share-1",
      "index": 1,
      "value": "...",
      "commitment": "..."
    }
  ]
}
```

**响应示例:**
```json
{
  "assets": [
    {
      "type": "crypto",
      "name": "比特币钱包",
      "value": "1.5 BTC",
      "privateKey": "..."
    }
  ]
}
```

---

## 错误响应

所有错误响应都遵循以下格式：

```json
{
  "error": "错误描述信息"
}
```

常见HTTP状态码：
- `200` - 成功
- `400` - 请求参数错误
- `404` - 资源未找到
- `500` - 服务器内部错误

---

## 数据类型

### TriggerMode
- `time` - 时间锁模式
- `consensus` - 社会共识模式
- `hybrid` - 混合模式

### PlanStatus
- `active` - 活跃状态
- `triggered` - 已触发
- `completed` - 已完成

### InheritanceStatus
- `pending` - 待处理
- `collecting` - 收集份额中
- `verifying` - 验证中
- `completed` - 已完成
