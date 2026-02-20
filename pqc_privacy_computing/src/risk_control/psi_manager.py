"""
PSI管理器
使用隐私求交协议识别跨银行风险客户
"""

from typing import Set, Tuple, Dict
from .risk_database import RiskDatabase
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from protocols.psi_protocol import CuckooHashPSI


class PSIManager:
    """
    PSI管理器
    使用隐私求交协议识别跨银行风险客户
    """
    
    def __init__(self, security_param: int = 128):
        self.security_param = security_param
        self.psi = CuckooHashPSI(security_param)
    
    def find_cross_bank_risks(
        self,
        bank_a_customers: Set[bytes],
        bank_b_customers: Set[bytes]
    ) -> Tuple[Set[bytes], dict]:
        """
        查找两家银行的风险客户交集
        
        Args:
            bank_a_customers: 银行A的客户哈希集合
            bank_b_customers: 银行B的客户哈希集合
            
        Returns:
            (intersection, stats): 交集和统计信息
        """
        print(f"[PSI] 开始查找跨银行风险客户...")
        print(f"[PSI] 银行A客户数: {len(bank_a_customers)}")
        print(f"[PSI] 银行B客户数: {len(bank_b_customers)}")
        
        # 执行PSI协议
        intersection, stats = self.psi.run(bank_a_customers, bank_b_customers)
        
        print(f"[PSI] 发现 {len(intersection)} 个共同风险客户")
        print(f"[PSI] 通信开销: {stats.get('communication_cost', 0)} 字节")
        
        return intersection, stats
    
    def find_multi_bank_risks(
        self,
        bank_customers: Dict[str, Set[bytes]]
    ) -> Dict[str, Set[bytes]]:
        """
        查找多家银行的风险客户交集
        
        Args:
            bank_customers: 银行ID -> 客户哈希集合
            
        Returns:
            intersections: 银行对 -> 交集
        """
        print(f"[PSI] 开始查找多家银行风险客户交集...")
        
        bank_ids = list(bank_customers.keys())
        intersections = {}
        
        # 两两比较
        for i in range(len(bank_ids)):
            for j in range(i + 1, len(bank_ids)):
                bank_a = bank_ids[i]
                bank_b = bank_ids[j]
                
                print(f"[PSI] 比较 {bank_a} 和 {bank_b}...")
                intersection, stats = self.find_cross_bank_risks(
                    bank_customers[bank_a],
                    bank_customers[bank_b]
                )
                
                key = f"{bank_a}_{bank_b}"
                intersections[key] = intersection
        
        return intersections
    
    def find_three_way_intersection(
        self,
        bank_a_customers: Set[bytes],
        bank_b_customers: Set[bytes],
        bank_c_customers: Set[bytes]
    ) -> Set[bytes]:
        """
        查找三家银行的风险客户交集
        
        Args:
            bank_a_customers: 银行A的客户哈希集合
            bank_b_customers: 银行B的客户哈希集合
            bank_c_customers: 银行C的客户哈希集合
            
        Returns:
            三方交集
        """
        print(f"[PSI] 开始查找三方风险客户交集...")
        
        # A和B的交集
        intersection_ab, _ = self.find_cross_bank_risks(
            bank_a_customers,
            bank_b_customers
        )
        
        # (A∩B)和C的交集
        intersection_abc, _ = self.find_cross_bank_risks(
            intersection_ab,
            bank_c_customers
        )
        
        print(f"[PSI] 三方共同风险客户数: {len(intersection_abc)}")
        
        return intersection_abc
    
    def analyze_intersection(
        self,
        intersection: Set[bytes],
        risk_db: RiskDatabase
    ) -> dict:
        """
        分析交集客户风险信息
        
        Args:
            intersection: 交集客户哈希
            risk_db: 风险数据库
            
        Returns:
            分析结果
        """
        print(f"[PSI] 分析交集客户风险信息...")
        
        customer_info = []
        risk_levels = {'low': 0, 'medium': 0, 'high': 0, 'critical': 0}
        seen_hashes = set()
        
        for customer_hash in intersection:
            if customer_hash in seen_hashes:
                continue  # 跳过重复的哈希
            
            # 获取该客户在所有银行的记录
            all_customers = risk_db.get_all_risk_info_by_hash(customer_hash)
            
            if all_customers:
                # 获取原始ID
                original_id = getattr(all_customers[0], '_original_customer_id', all_customers[0].customer_id)
                
                # 构建客户信息，包含所有银行的风险信息
                customer_data = {
                    'customer_id': original_id,
                    'risk_level': all_customers[0].risk_level.value,
                    'banks': []
                }
                
                # 添加每个银行的风险信息
                for customer in all_customers:
                    customer_data['banks'].append({
                        'bank_id': customer.bank_id,
                        'risk_score': customer.risk_score,
                        'report_reason': customer.report_reason
                    })
                
                customer_info.append(customer_data)
                risk_levels[all_customers[0].risk_level.value] += 1
                seen_hashes.add(customer_hash)
        
        analysis = {
            'total': len(customer_info),
            'by_risk_level': risk_levels,
            'customers': customer_info
        }
        
        print(f"[PSI] 分析完成: {analysis['total']}个客户")
        print(f"[PSI] 风险等级分布: {risk_levels}")
        
        return analysis
    
    def generate_report(
        self,
        intersections: Dict[str, Set[bytes]],
        risk_db: RiskDatabase
    ) -> dict:
        """
        生成PSI报告
        
        Args:
            intersections: 银行对 -> 交集
            risk_db: 风险数据库
            
        Returns:
            报告
        """
        print(f"[PSI] 生成PSI报告...")
        
        report = {
            'summary': {
                'total_intersections': len(intersections),
                'total_customers': sum(len(s) for s in intersections.values())
            },
            'by_bank_pair': {}
        }
        
        for bank_pair, intersection in intersections.items():
            analysis = self.analyze_intersection(intersection, risk_db)
            report['by_bank_pair'][bank_pair] = analysis
        
        return report
