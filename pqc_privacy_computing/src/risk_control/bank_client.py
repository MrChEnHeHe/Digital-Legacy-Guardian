"""
银行客户端模块
银行端的风控系统客户端
"""

from typing import Set, Dict, List
from .risk_database import RiskDatabase, RiskCustomer
from .psi_manager import PSIManager
from .ot_manager import OTManager
from .pir_manager import PIRManager


class BankClient:
    """
    银行客户端
    提供银行端的风控功能
    """
    
    def __init__(self, bank_id: str, security_param: int = 128):
        self.bank_id = bank_id
        self.security_param = security_param
        self.risk_db = RiskDatabase()
        
        # 初始化隐私计算管理器
        self.psi_manager = PSIManager(security_param)
        self.ot_manager = OTManager(security_param)
        self.pir_manager = PIRManager(security_param)
    
    def load_risk_data(self, filepath: str):
        """
        加载风险数据
        
        Args:
            filepath: 数据文件路径
        """
        print(f"[银行{self.bank_id}] 加载风险数据...")
        self.risk_db.load_from_file(filepath)
        print(f"[银行{self.bank_id}] 加载完成，共{self.risk_db.get_size()}个风险客户")
    
    def add_risk_customer(self, customer: RiskCustomer):
        """
        添加风险客户
        
        Args:
            customer: 风险客户信息
        """
        print(f"[银行{self.bank_id}] 添加风险客户: {customer.customer_id}")
        self.risk_db.add_customer(customer)
    
    def delete_risk_customer(self, customer_id: str) -> bool:
        """
        删除风险客户
        
        Args:
            customer_id: 客户ID
            
        Returns:
            是否成功删除
        """
        print(f"[银行{self.bank_id}] 删除风险客户: {customer_id}")
        return self.risk_db.delete_customer(customer_id)
    
    def get_risk_customers(self) -> Set[bytes]:
        """
        获取本银行的风险客户哈希集合
        
        Returns:
            客户哈希集合
        """
        return self.risk_db.get_bank_customer_hashes(self.bank_id)
    
    def find_cross_bank_risks(self, other_bank_hashes: Set[bytes]) -> Dict:
        """
        查找与另一家银行的交叉风险客户
        
        Args:
            other_bank_hashes: 另一家银行的客户哈希集合
            
        Returns:
            PSI结果
        """
        print(f"[银行{self.bank_id}] 查找跨银行风险客户...")
        
        my_hashes = self.get_risk_customers()
        
        # 执行PSI
        intersection, stats = self.psi_manager.find_cross_bank_risks(
            my_hashes,
            other_bank_hashes
        )
        
        # 分析交集
        analysis = self.psi_manager.analyze_intersection(intersection, self.risk_db)
        
        return {
            'bank_id': self.bank_id,
            'intersection_size': len(intersection),
            'analysis': analysis,
            'stats': stats
        }
    
    def query_customer_risk(self, customer_id: str) -> Dict:
        """
        查询客户风险等级（使用OT）
        
        Args:
            customer_id: 客户ID
            
        Returns:
            风险信息
        """
        print(f"[银行{self.bank_id}] 查询客户风险: {customer_id}")
        
        # 计算客户哈希
        customer_hash = self.risk_db.get_customer_hash(customer_id)
        
        # 使用OT查询
        risk_info = self.ot_manager.query_with_details(customer_hash, self.risk_db)
        
        return risk_info
    
    def batch_query_risks(self, customer_ids: List[str]) -> Dict[bytes, dict]:
        """
        批量查询客户风险（使用PIR）
        
        Args:
            customer_ids: 客户ID列表
            
        Returns:
            客户哈希 -> 风险信息
        """
        print(f"[银行{self.bank_id}] 批量查询客户风险，数量: {len(customer_ids)}")
        
        # 计算客户哈希
        customer_hashes = [
            self.risk_db.get_customer_hash(cid)
            for cid in customer_ids
        ]
        
        # 使用PIR批量查询
        results = self.pir_manager.batch_query(customer_hashes, self.risk_db)
        
        return results
    
    def check_new_customer(self, customer_id: str) -> Dict:
        """
        检查新客户风险
        
        Args:
            customer_id: 新客户ID
            
        Returns:
            检查结果
        """
        print(f"[银行{self.bank_id}] 检查新客户: {customer_id}")
        
        # 查询风险信息
        risk_info = self.query_customer_risk(customer_id)
        
        # 决策逻辑
        if risk_info['risk_level'] == 'high' or risk_info['risk_level'] == 'critical':
            decision = 'reject'
            reason = '客户风险等级过高'
        elif risk_info['risk_level'] == 'medium':
            decision = 'review'
            reason = '客户风险等级中等，需要人工审核'
        else:
            decision = 'approve'
            reason = '客户风险等级正常'
        
        return {
            'customer_id': customer_id,
            'risk_info': risk_info,
            'decision': decision,
            'reason': reason
        }
    
    def generate_monthly_report(self) -> Dict:
        """
        生成月度报告
        
        Returns:
            月度报告
        """
        print(f"[银行{self.bank_id}] 生成月度报告...")
        
        stats = self.risk_db.get_statistics()
        
        report = {
            'bank_id': self.bank_id,
            'report_date': '2024-01-31',
            'total_customers': stats['total_customers'],
            'by_risk_level': stats['by_risk_level'],
            'recommendations': self._generate_recommendations(stats)
        }
        
        return report
    
    def _generate_recommendations(self, stats: Dict) -> List[str]:
        """生成建议"""
        recommendations = []
        
        high_risk_count = stats['by_risk_level'].get('high', 0)
        critical_count = stats['by_risk_level'].get('critical', 0)
        
        if critical_count > 0:
            recommendations.append(f"发现{critical_count}个极高风险客户，建议立即采取风控措施")
        
        if high_risk_count > 100:
            recommendations.append(f"高风险客户数量较多({high_risk_count})，建议加强贷前审核")
        
        total_customers = stats['total_customers']
        if total_customers > 0:
            high_risk_ratio = (high_risk_count + critical_count) / total_customers
            if high_risk_ratio > 0.1:
                recommendations.append(f"高风险客户占比{high_risk_ratio:.1%}，建议优化风控模型")
        
        if not recommendations:
            recommendations.append("风险水平正常，继续保持")
        
        return recommendations
    
    def export_data(self, filepath: str):
        """
        导出数据
        
        Args:
            filepath: 导出文件路径
        """
        print(f"[银行{self.bank_id}] 导出数据到: {filepath}")
        self.risk_db.save_to_file(filepath)
    
    def get_statistics(self) -> Dict:
        """
        获取统计信息
        
        Returns:
            统计信息
        """
        return self.risk_db.get_statistics()
