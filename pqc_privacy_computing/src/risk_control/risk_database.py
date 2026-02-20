"""
风险数据库模块
管理银行风险客户数据
"""

import hashlib
import secrets
import random
from typing import Dict, Set, List, Tuple
from dataclasses import dataclass
from enum import Enum
import json
from pathlib import Path


class RiskLevel(Enum):
    """风险等级"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class RiskCustomer:
    """风险客户信息"""
    customer_id: str
    risk_level: RiskLevel
    risk_score: float
    report_date: str
    report_reason: str
    bank_id: str
    
    def to_dict(self, include_bank: bool = True) -> dict:
        result = {
            'customer_id': self.customer_id,
            'risk_level': self.risk_level.value,
            'risk_score': self.risk_score,
            'report_date': self.report_date,
            'report_reason': self.report_reason
        }
        if include_bank:
            result['bank_id'] = self.bank_id
        return result
    
    @classmethod
    def from_dict(cls, data: dict) -> 'RiskCustomer':
        return cls(
            customer_id=data['customer_id'],
            risk_level=RiskLevel(data['risk_level']),
            risk_score=data['risk_score'],
            report_date=data['report_date'],
            report_reason=data['report_reason'],
            bank_id=data['bank_id']
        )
    
    def get_hash(self) -> bytes:
        """获取客户ID的哈希值（用于隐私计算）"""
        # 使用原始customer_id计算哈希（用于PSI）
        original_id = getattr(self, '_original_customer_id', self.customer_id)
        return hashlib.sha256(original_id.encode()).digest()


class RiskDatabase:
    """
    风险数据库
    管理多家银行的风险客户数据
    """
    
    def __init__(self, db_path: str = None):
        self.db_path = Path(db_path) if db_path else None
        self.customers: Dict[str, RiskCustomer] = {}
        self.bank_customers: Dict[str, Set[str]] = {}
        self.risk_index: Dict[RiskLevel, Set[str]] = {
            RiskLevel.LOW: set(),
            RiskLevel.MEDIUM: set(),
            RiskLevel.HIGH: set(),
            RiskLevel.CRITICAL: set()
        }
    
    def add_customer(self, customer: RiskCustomer):
        """添加风险客户"""
        self.customers[customer.customer_id] = customer
        
        # 按银行索引
        if customer.bank_id not in self.bank_customers:
            self.bank_customers[customer.bank_id] = set()
        self.bank_customers[customer.bank_id].add(customer.customer_id)
        
        # 按风险等级索引
        self.risk_index[customer.risk_level].add(customer.customer_id)
    
    def delete_customer(self, customer_id: str):
        """删除风险客户"""
        if customer_id not in self.customers:
            return False
        
        customer = self.customers[customer_id]
        
        # 从主数据库删除
        del self.customers[customer_id]
        
        # 从银行索引删除
        if customer.bank_id in self.bank_customers:
            self.bank_customers[customer.bank_id].discard(customer_id)
        
        # 从风险等级索引删除
        self.risk_index[customer.risk_level].discard(customer_id)
        
        return True
    
    def get_customer(self, customer_id: str) -> RiskCustomer:
        """获取客户信息"""
        return self.customers.get(customer_id)
    
    def get_customer_hash(self, customer_id: str) -> bytes:
        """获取客户哈希（用于隐私计算）"""
        return hashlib.sha256(customer_id.encode()).digest()
    
    def extract_original_id(self, customer_id: str) -> str:
        """
        从客户ID中提取原始ID
        
        支持任意格式的客户ID，直接返回原始ID
        
        Args:
            customer_id: 客户ID
            
        Returns:
            原始客户ID
        """
        # 如果包含 _bank_，说明是唯一键，提取原始ID
        if '_bank_' in customer_id:
            return customer_id.split('_bank_')[0]
        
        # 否则直接返回原始ID
        return customer_id
    
    def find_customer_by_original_id(self, original_id: str) -> list:
        """通过原始客户ID查找所有匹配的客户（用于共享客户）"""
        matching_customers = []
        for customer_id, customer in self.customers.items():
            orig_id = getattr(customer, '_original_customer_id', customer.customer_id)
            if orig_id == original_id:
                matching_customers.append(customer)
        return matching_customers
    
    def get_bank_customers(self, bank_id: str) -> Set[str]:
        """获取指定银行的所有客户"""
        return self.bank_customers.get(bank_id, set())
    
    def get_risk_level_customers(self, risk_level: RiskLevel) -> Set[str]:
        """获取指定风险等级的客户"""
        return self.risk_index.get(risk_level, set())
    
    def get_all_customer_hashes(self) -> Set[bytes]:
        """获取所有客户的哈希值（用于PSI）"""
        return {self.get_customer_hash(cid) for cid in self.customers.keys()}
    
    def get_bank_customer_hashes(self, bank_id: str) -> Set[bytes]:
        """获取指定银行客户的哈希值"""
        customer_ids = self.get_bank_customers(bank_id)
        hashes = set()
        for cid in customer_ids:
            customer = self.get_customer(cid)
            if customer:
                # 使用原始customer_id计算哈希（用于PSI）
                original_id = getattr(customer, '_original_customer_id', customer.customer_id)
                hashes.add(hashlib.sha256(original_id.encode()).digest())
        return hashes
    
    def get_risk_info_by_hash(self, customer_hash: bytes) -> RiskCustomer:
        """通过哈希值查找客户信息"""
        for customer_id, customer in self.customers.items():
            # 使用原始customer_id计算哈希
            original_id = getattr(customer, '_original_customer_id', customer.customer_id)
            if hashlib.sha256(original_id.encode()).digest() == customer_hash:
                return customer
        return None
    
    def get_all_risk_info_by_hash(self, customer_hash: bytes) -> list:
        """通过哈希值查找所有匹配的客户信息（用于共享客户）"""
        matching_customers = []
        for customer_id, customer in self.customers.items():
            # 使用原始customer_id计算哈希
            original_id = getattr(customer, '_original_customer_id', customer.customer_id)
            if hashlib.sha256(original_id.encode()).digest() == customer_hash:
                matching_customers.append(customer)
        return matching_customers
    
    def get_risk_info_by_index(self, index: int) -> RiskCustomer:
        """通过索引获取客户信息（用于PIR）"""
        customer_ids = list(self.customers.keys())
        if 0 <= index < len(customer_ids):
            customer_id = customer_ids[index]
            return self.customers[customer_id]
        return None
    
    def get_index_by_hash(self, customer_hash: bytes) -> int:
        """通过哈希值获取索引（用于PIR）"""
        customer_ids = list(self.customers.keys())
        for i, customer_id in enumerate(customer_ids):
            customer = self.get_customer(customer_id)
            if customer:
                # 使用原始customer_id计算哈希
                original_id = getattr(customer, '_original_customer_id', customer.customer_id)
                if hashlib.sha256(original_id.encode()).digest() == customer_hash:
                    return i
        return -1
    
    def get_size(self) -> int:
        """获取数据库大小"""
        return len(self.customers)
    
    def get_statistics(self) -> dict:
        """获取统计信息"""
        stats = {
            'total_customers': len(self.customers),
            'total_banks': len(self.bank_customers),
            'by_risk_level': {
                level.value: len(customers)
                for level, customers in self.risk_index.items()
            },
            'by_bank': {
                bank_id: len(customers)
                for bank_id, customers in self.bank_customers.items()
            }
        }
        return stats
    
    def save_to_file(self, filepath: str):
        """保存到文件"""
        data = {
            'customers': [c.to_dict() for c in self.customers.values()]
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def load_from_file(self, filepath: str):
        """从文件加载"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for customer_data in data['customers']:
            customer = RiskCustomer.from_dict(customer_data)
            self.add_customer(customer)
    
    def generate_sample_data(self, num_banks: int = 3, customers_per_bank: int = 1000):
        """生成示例数据"""
        bank_ids = [f'bank_{i+1}' for i in range(num_banks)]
        
        # 生成共享客户ID（30%的客户是共享的）
        shared_count = int(customers_per_bank * 0.3)
        shared_customer_ids = []
        used_ids = set()
        for _ in range(shared_count):
            while True:
                num = random.randint(0, 99999)
                num_str = str(num).zfill(5)
                customer_id = num_str
                if customer_id not in used_ids:
                    shared_customer_ids.append(customer_id)
                    used_ids.add(customer_id)
                    break
        
        # 生成每个银行的独特客户ID（70%的客户是独特的）
        unique_count = customers_per_bank - shared_count
        bank_unique_ids = {}
        for bank_id in bank_ids:
            unique_ids = []
            bank_used_ids = used_ids.copy()
            for _ in range(unique_count):
                while True:
                    num = random.randint(0, 99999)
                    num_str = str(num).zfill(5)
                    customer_id = num_str
                    if customer_id not in bank_used_ids:
                        unique_ids.append(customer_id)
                        bank_used_ids.add(customer_id)
                        break
            bank_unique_ids[bank_id] = unique_ids
        
        # 为每个银行生成客户数据
        for bank_id in bank_ids:
            all_customer_ids = shared_customer_ids + bank_unique_ids[bank_id]
            
            for customer_id in all_customer_ids:
                risk_level = secrets.choice(list(RiskLevel))
                
                if risk_level == RiskLevel.LOW:
                    risk_score = random.uniform(0, 30)
                elif risk_level == RiskLevel.MEDIUM:
                    risk_score = random.uniform(30, 60)
                elif risk_level == RiskLevel.HIGH:
                    risk_score = random.uniform(60, 85)
                else:
                    risk_score = random.uniform(85, 100)
                
                reasons = [
                    '逾期还款',
                    '大额负债',
                    '频繁申请',
                    '异常交易',
                    '涉嫌欺诈',
                    '信用评分低',
                    '收入不稳定',
                    '其他风险'
                ]
                report_reason = secrets.choice(reasons)
                
                # 为所有客户使用唯一键：(customer_id, bank_id)
                # 这样每个银行都有自己的客户记录，但customer_id相同
                unique_key = f"{customer_id}_{bank_id}"
                
                customer = RiskCustomer(
                    customer_id=unique_key,  # 使用唯一键
                    risk_level=risk_level,
                    risk_score=round(risk_score, 2),
                    report_date='2024-01-15',
                    report_reason=report_reason,
                    bank_id=bank_id
                )
                
                # 存储原始customer_id用于PSI和查询
                customer._original_customer_id = customer_id
                
                self.add_customer(customer)
        
        print(f"[生成] {num_banks}家银行，每家{customers_per_bank}个客户（{shared_count}个共享，{unique_count}个独特），共{self.get_size()}个风险客户")
