# 跨银行联合风控系统

基于后量子隐私计算的跨银行风险信息共享系统

## 系统概述

### 背景

多家银行希望联合建立风控系统，共享风险客户信息，但各家银行都不愿意泄露自己的客户数据。

### 目标

- 识别跨银行的风险客户
- 保护各家银行的客户隐私
- 提供安全的风险查询服务
- 防止数据泄露和滥用

### 核心功能

1. **隐私求交 (PSI)**: 识别跨银行风险客户
2. **不经意传输 (OT)**: 安全查询风险等级
3. **隐私信息检索 (PIR)**: 批量风险查询

### 安全特性

- ✅ 基于 Kyber 算法的后量子安全
- ✅ 银行间不泄露客户数据
- ✅ 客户查询不暴露身份
- ✅ 服务器不知道查询内容

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│              跨银行联合风控系统                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   银行 A     │  │   银行 B     │  │   银行 C     │   │
│  │  (100万客户) │  │  (80万客户)  │  │  (120万客户) │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│                   ┌───────▼────────┐                        │
│                   │  风控中心服务器  │                        │
│                   │  (后量子安全)   │                        │
│                   └───────┬────────┘                        │
│                           │                                 │
│                   ┌───────▼────────┐                        │
│                   │  客户查询接口   │                        │
│                   └────────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 安装和部署

### 1. 环境要求

- Python 3.8+
- 依赖包：见 `config/requirements.txt`

### 2. 安装依赖

```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate.bat
# Linux/macOS
source venv/bin/activate

# 安装依赖
pip install -r config/requirements.txt
```

### 3. 配置系统

编辑 `config/risk_control_config.yaml` 文件，根据需要调整配置。

### 4. 启动系统

#### 启动 Web 界面

```bash
# Windows
scripts\start_web.bat

# Linux/macOS
bash scripts/run_in_venv.sh --web
```

#### 启动服务器

```bash
python src/risk_control/risk_center.py
```

## 使用指南

### 1. 银行管理

#### 添加银行

1. 访问 Web 界面：http://localhost:8501
2. 进入"银行管理"页面
3. 填写银行ID和名称
4. 点击"添加银行"

#### 上传风险数据

```python
from risk_control import BankClient, RiskDatabase, RiskCustomer, RiskLevel

# 创建银行客户端
bank_client = BankClient('bank_1')

# 添加风险客户
customer = RiskCustomer(
    customer_id='customer_001',
    risk_level=RiskLevel.HIGH,
    risk_score=75.5,
    report_date='2024-01-15',
    report_reason='逾期还款',
    bank_id='bank_1'
)
bank_client.add_risk_customer(customer)

# 保存数据
bank_client.export_data('bank_1_risks.json')
```

### 2. 隐私求交 (PSI)

#### 查找跨银行风险客户

1. 进入"隐私求交 (PSI)"页面
2. 选择两家银行
3. 点击"执行PSI"
4. 查看交集结果

#### 编程接口

```python
from risk_control import BankClient

# 创建银行客户端
bank_a = BankClient('bank_1')
bank_b = BankClient('bank_2')

# 加载数据
bank_a.load_risk_data('bank_1_risks.json')
bank_b.load_risk_data('bank_2_risks.json')

# 查找交叉风险客户
result = bank_a.find_cross_bank_risks(bank_b.get_risk_customers())

# 查看结果
print(f"发现 {result['intersection_size']} 个共同风险客户")
```

### 3. 不经意传输 (OT)

#### 查询客户风险等级

1. 进入"不经意传输 (OT)"页面
2. 输入客户ID
3. 点击"查询风险等级"
4. 查看查询结果

#### 编程接口

```python
from risk_control import BankClient

# 创建银行客户端
bank_client = BankClient('bank_1')
bank_client.load_risk_data('bank_1_risks.json')

# 查询客户风险
risk_info = bank_client.query_customer_risk('customer_001')

# 查看结果
print(f"风险等级: {risk_info['risk_level']}")
print(f"风险分数: {risk_info['risk_score']}")
```

### 4. 隐私信息检索 (PIR)

#### 批量查询风险信息

1. 进入"隐私检索 (PIR)"页面
2. 输入客户ID列表（每行一个）
3. 点击"批量查询"
4. 查看查询结果

#### 编程接口

```python
from risk_control import BankClient

# 创建银行客户端
bank_client = BankClient('bank_1')
bank_client.load_risk_data('bank_1_risks.json')

# 批量查询
customer_ids = ['customer_001', 'customer_002', 'customer_003']
results = bank_client.batch_query_risks(customer_ids)

# 查看结果
for customer_hash, risk_info in results.items():
    print(f"风险等级: {risk_info['risk_level']}")
```

## 应用场景

### 场景 1：新客户开户风控

```python
# 场景：银行 A 有一个新客户申请开户
# 需要检查该客户在其他银行的风险记录

def new_customer_onboarding(customer_id):
    """
    新客户开户风控流程
    """
    # 查询该客户在风控中心的风险记录
    result = bank_client.check_new_customer(customer_id)
    
    # 根据风险信息决定是否开户
    if result['decision'] == 'reject':
        print("拒绝开户：客户风险等级过高")
        return False
    elif result['decision'] == 'review':
        print("需要人工审核：客户风险等级中等")
        return None
    else:
        print("批准开户：客户风险等级正常")
        return True
```

### 场景 2：定期风险联合检查

```python
# 场景：每月各银行联合检查风险客户

def monthly_risk_check():
    """
    月度风险联合检查
    """
    # 各银行上报本月新增风险客户
    new_risks_a = get_new_risk_customers('bank_1')
    new_risks_b = get_new_risk_customers('bank_2')
    new_risks_c = get_new_risk_customers('bank_3')
    
    # 使用 PSI 识别跨银行风险客户
    result = risk_center.find_three_way_intersection(
        'bank_1', 'bank_2', 'bank_3'
    )
    
    # 对跨银行风险客户进行标记
    for customer_hash in result['analysis']['customers']:
        mark_as_cross_bank_risk(customer_hash['customer_id'])
    
    # 生成报告
    print(f"发现 {result['intersection_size']} 个三方共同风险客户")
```

## 技术细节

### PSI 协议实现

- 使用布谷鸟哈希优化
- 支持多银行联合查询
- 基于后量子 Kyber 算法

### OT 协议实现

- 基于 1-out-of-2 OT
- 支持 OT 扩展
- 保护查询隐私

### PIR 协议实现

- 支持批量查询
- 基于同态加密
- 服务器不知道查询内容

## 性能指标

### PSI 性能

- 数据集大小：1000-10000
- 计算时间：< 5秒
- 通信开销：< 1MB

### OT 性能

- 单次查询：< 100ms
- 批量查询（100个）：< 5秒
- 通信开销：< 10KB/次

### PIR 性能

- 批量查询（100个）：< 10秒
- 通信开销：< 5MB

## 安全性分析

### 隐私保护

- 银行间不泄露客户数据
- 客户查询不暴露身份
- 服务器不知道查询内容

### 后量子安全

- 基于 Kyber-768 算法
- 抗量子计算攻击
- 符合 NIST 标准

### 前向安全

- 密钥轮换机制
- 会话密钥管理
- 完美前向保密

## 常见问题

### Q1: 如何添加新的银行？

A: 在 Web 界面的"银行管理"页面，填写银行ID和名称，点击"添加银行"即可。

### Q2: PSI 查询结果不准确？

A: 请检查：
1. 银行数据是否正确加载
2. 客户ID是否一致
3. 哈希函数是否相同

### Q3: 如何提高查询性能？

A: 可以：
1. 增加数据库分块大小
2. 使用批量查询
3. 优化网络连接

### Q4: 系统支持多少家银行？

A: 理论上支持无限家银行，建议不超过 10 家以保证性能。

## 技术支持

如有问题，请联系：
- 邮箱：support@example.com
- 文档：查看项目文档
- 问题反馈：提交 GitHub Issue

## 许可证

本项目仅用于演示和教育目的。

## 致谢

感谢以下开源项目的支持：
- Streamlit
- NumPy
- pycryptodome
