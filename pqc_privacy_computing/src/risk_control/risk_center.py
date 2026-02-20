"""
风控中心服务器
中央风控服务器，协调多家银行的隐私计算
"""

from typing import Dict, Set, List
from .risk_database import RiskDatabase, RiskCustomer
from .bank_client import BankClient
from .psi_manager import PSIManager
from .ot_manager import OTManager
from .pir_manager import PIRManager
import json
from pathlib import Path


class RiskCenterServer:
    """
    风控中心服务器
    提供跨银行隐私计算服务
    """
    
    def __init__(self, security_param: int = 128):
        self.security_param = security_param
        self.risk_db = RiskDatabase()
        self.banks: Dict[str, BankClient] = {}
        
        # 隐私计算管理器
        self.psi_manager = PSIManager(security_param)
        self.ot_manager = OTManager(security_param)
        self.pir_manager = PIRManager(security_param)
    
    def register_bank(self, bank_id: str, bank_client: BankClient):
        """
        注册银行
        
        Args:
            bank_id: 银行ID
            bank_client: 银行客户端
        """
        print(f"[风控中心] 注册银行: {bank_id}")
        self.banks[bank_id] = bank_client
    
    def load_bank_data(self, bank_id: str, filepath: str):
        """
        加载银行数据
        
        Args:
            bank_id: 银行ID
            filepath: 数据文件路径
        """
        print(f"[风控中心] 加载银行数据: {bank_id}")
        
        if bank_id in self.banks:
            self.banks[bank_id].load_risk_data(filepath)
            
            # 将数据合并到中心数据库
            bank_hashes = self.banks[bank_id].get_risk_customers()
            for customer_hash in bank_hashes:
                customer = self.banks[bank_id].risk_db.get_risk_info_by_hash(customer_hash)
                if customer:
                    self.risk_db.add_customer(customer)
        else:
            print(f"[风控中心] 错误: 银行 {bank_id} 未注册")
    
    def find_cross_bank_risks(self, bank_a_id: str, bank_b_id: str) -> Dict:
        """
        查找两家银行的交叉风险客户
        
        Args:
            bank_a_id: 银行A ID
            bank_b_id: 银行B ID
            
        Returns:
            PSI结果
        """
        print(f"[风控中心] 查找 {bank_a_id} 和 {bank_b_id} 的交叉风险客户")
        
        if bank_a_id not in self.banks or bank_b_id not in self.banks:
            return {'error': '银行未注册'}
        
        # 获取两家银行的客户哈希
        bank_a_hashes = self.banks[bank_a_id].get_risk_customers()
        bank_b_hashes = self.banks[bank_b_id].get_risk_customers()
        
        # 执行PSI
        intersection, stats = self.psi_manager.find_cross_bank_risks(
            bank_a_hashes,
            bank_b_hashes
        )
        
        # 分析交集
        analysis = self.psi_manager.analyze_intersection(intersection, self.risk_db)
        
        return {
            'bank_a': bank_a_id,
            'bank_b': bank_b_id,
            'intersection_size': len(intersection),
            'analysis': analysis,
            'stats': stats
        }
    
    def find_multi_bank_risks(self) -> Dict:
        """
        查找多家银行的交叉风险客户
        
        Returns:
            多银行PSI结果
        """
        print(f"[风控中心] 查找多家银行交叉风险客户")
        
        # 收集所有银行的客户哈希
        bank_hashes = {}
        for bank_id, bank_client in self.banks.items():
            bank_hashes[bank_id] = bank_client.get_risk_customers()
        
        # 执行多银行PSI
        intersections = self.psi_manager.find_multi_bank_risks(bank_hashes)
        
        # 生成报告
        report = self.psi_manager.generate_report(intersections, self.risk_db)
        
        return report
    
    def find_three_way_intersection(self, bank_a_id: str, bank_b_id: str, bank_c_id: str) -> Dict:
        """
        查找三家银行的交叉风险客户
        
        Args:
            bank_a_id: 银行A ID
            bank_b_id: 银行B ID
            bank_c_id: 银行C ID
            
        Returns:
            三方PSI结果
        """
        print(f"[风控中心] 查找三家银行交叉风险客户")
        
        if bank_a_id not in self.banks or bank_b_id not in self.banks or bank_c_id not in self.banks:
            return {'error': '银行未注册'}
        
        # 获取三家银行的客户哈希
        bank_a_hashes = self.banks[bank_a_id].get_risk_customers()
        bank_b_hashes = self.banks[bank_b_id].get_risk_customers()
        bank_c_hashes = self.banks[bank_c_id].get_risk_customers()
        
        # 执行三方PSI
        intersection = self.psi_manager.find_three_way_intersection(
            bank_a_hashes,
            bank_b_hashes,
            bank_c_hashes
        )
        
        # 分析交集
        analysis = self.psi_manager.analyze_intersection(intersection, self.risk_db)
        
        return {
            'bank_a': bank_a_id,
            'bank_b': bank_b_id,
            'bank_c': bank_c_id,
            'intersection_size': len(intersection),
            'analysis': analysis
        }
    
    def query_customer_risk(self, customer_id: str, bank_id: str = None) -> Dict:
        """
        查询客户风险等级（使用OT）
        
        Args:
            customer_id: 客户ID
            bank_id: 银行ID（可选）
            
        Returns:
            风险信息
        """
        print(f"[风控中心] 查询客户风险: {customer_id}")
        
        # 提取原始ID（支持多种格式）
        original_id = self.risk_db.extract_original_id(customer_id)
        print(f"[风控中心] 原始ID: {original_id}")
        
        # 计算客户哈希
        customer_hash = self.risk_db.get_customer_hash(original_id)
        
        # 使用OT查询
        risk_info = self.ot_manager.query_with_details(customer_hash, self.risk_db)
        
        # 如果查询结果为unknown，尝试通过原始ID查找（处理共享客户）
        if risk_info['risk_level'] == 'unknown':
            print(f"[风控中心] 直接查询失败，尝试通过原始ID查找: {original_id}")
            matching_customers = self.risk_db.find_customer_by_original_id(original_id)
            
            if matching_customers:
                print(f"[风控中心] 找到 {len(matching_customers)} 个匹配的客户")
                # 构建风险信息
                result = {
                    'risk_level': matching_customers[0].risk_level.value,
                    'customers': []
                }
                
                for customer in matching_customers:
                    result['customers'].append({
                        'risk_score': customer.risk_score,
                        'report_date': customer.report_date,
                        'report_reason': customer.report_reason,
                        'bank_id': customer.bank_id
                    })
                
                result['risk_score'] = matching_customers[0].risk_score
                result['report_date'] = matching_customers[0].report_date
                result['report_reason'] = matching_customers[0].report_reason
                result['bank_id'] = matching_customers[0].bank_id
                result['is_shared'] = len(matching_customers) > 1
                result['total_banks'] = len(matching_customers)
                
                risk_info = result
        
        return {
            'customer_id': customer_id,
            'bank_id': bank_id,
            'risk_info': risk_info
        }
    
    def batch_query_risks(self, customer_ids: List[str]) -> Dict:
        """
        批量查询客户风险（使用PIR）
        
        Args:
            customer_ids: 客户ID列表
            
        Returns:
            批量查询结果
        """
        print(f"[风控中心] 批量查询客户风险，数量: {len(customer_ids)}")
        
        # 提取原始ID（支持多种格式）
        original_ids = [self.risk_db.extract_original_id(cid) for cid in customer_ids]
        
        # 计算客户哈希
        customer_hashes = [
            self.risk_db.get_customer_hash(oid)
            for oid in original_ids
        ]
        
        # 使用PIR批量查询
        results = self.pir_manager.batch_query(customer_hashes, self.risk_db)
        
        # 检查是否有unknown结果，尝试通过原始ID查找
        updated_results = {}
        for cid, customer_hash in zip(customer_ids, customer_hashes):
            risk_info = results.get(customer_hash, {'risk_level': 'unknown'})
            
            if risk_info.get('risk_level') == 'unknown':
                print(f"[风控中心] PIR查询失败，尝试通过原始ID查找: {cid}")
                matching_customers = self.risk_db.find_customer_by_original_id(
                    self.risk_db.extract_original_id(cid)
                )
                
                if matching_customers:
                    print(f"[风控中心] 找到 {len(matching_customers)} 个匹配的客户")
                    # 构建更新后的风险信息
                    if len(matching_customers) > 1:
                        # 共享客户
                        updated_info = {
                            'customer_id': cid,
                            'risk_level': matching_customers[0].risk_level.value,
                            'is_shared': True,
                            'total_banks': len(matching_customers),
                            'customers': [
                                {
                                    'bank_id': c.bank_id,
                                    'risk_score': c.risk_score,
                                    'report_date': c.report_date,
                                    'report_reason': c.report_reason
                                }
                                for c in matching_customers
                            ]
                        }
                    else:
                        # 独特客户
                        updated_info = matching_customers[0].to_dict()
                        updated_info['is_shared'] = False
                        updated_info['total_banks'] = 1
                        updated_info['customers'] = []
                    
                    updated_results[customer_hash] = updated_info
                else:
                    updated_results[customer_hash] = risk_info
            else:
                updated_results[customer_hash] = risk_info
        
        # 生成报告
        report = self.pir_manager.generate_query_report(customer_hashes, self.risk_db)
        
        # 更新报告中的details，使用更新后的结果
        for i, (cid, customer_hash) in enumerate(zip(customer_ids, customer_hashes)):
            if i < len(report['details']):
                report['details'][i]['risk_info'] = updated_results.get(customer_hash, {'risk_level': 'unknown'})
        
        # 重新计算统计
        risk_stats = {'high': 0, 'medium': 0, 'low': 0, 'unknown': 0}
        shared_count = 0
        
        for risk_info in updated_results.values():
            risk_level = risk_info.get('risk_level', 'unknown')
            if risk_level in risk_stats:
                risk_stats[risk_level] += 1
            
            if risk_info.get('is_shared', False):
                shared_count += 1
        
        report['by_risk_level'] = risk_stats
        report['shared_customers'] = shared_count
        report['successful_queries'] = len([r for r in updated_results.values() if r.get('customer_id') != 'unknown'])
        
        return report
    
    def check_new_customer(self, customer_id: str) -> Dict:
        """
        检查新客户风险
        
        Args:
            customer_id: 新客户ID
            
        Returns:
            检查结果
        """
        print(f"[风控中心] 检查新客户: {customer_id}")
        
        # 查询风险信息
        risk_info = self.query_customer_risk(customer_id)
        
        # 决策逻辑
        if risk_info['risk_info']['risk_level'] in ['high', 'critical']:
            decision = 'reject'
            reason = '客户风险等级过高'
        elif risk_info['risk_info']['risk_level'] == 'medium':
            decision = 'review'
            reason = '客户风险等级中等，需要人工审核'
        else:
            decision = 'approve'
            reason = '客户风险等级正常'
        
        return {
            'customer_id': customer_id,
            'risk_info': risk_info['risk_info'],
            'decision': decision,
            'reason': reason
        }
    
    def generate_global_report(self) -> Dict:
        """
        生成全局报告
        
        Returns:
            全局报告
        """
        print(f"[风控中心] 生成全局报告")
        
        # 数据库统计
        db_stats = self.risk_db.get_statistics()
        
        # 银行统计
        bank_stats = {}
        for bank_id, bank_client in self.banks.items():
            bank_stats[bank_id] = bank_client.get_statistics()
        
        # 交叉风险统计
        cross_risks = self.find_multi_bank_risks()
        
        report = {
            'report_date': '2024-01-31',
            'database_stats': db_stats,
            'bank_stats': bank_stats,
            'cross_bank_risks': cross_risks['summary'],
            'recommendations': self._generate_recommendations(db_stats, cross_risks)
        }
        
        return report
    
    def _generate_recommendations(self, db_stats: Dict, cross_risks: Dict) -> List[str]:
        """生成建议"""
        recommendations = []
        
        # 分析高风险客户
        high_risk_count = db_stats['by_risk_level'].get('high', 0)
        critical_count = db_stats['by_risk_level'].get('critical', 0)
        
        if critical_count > 0:
            recommendations.append(f"发现{critical_count}个极高风险客户，建议立即采取风控措施")
        
        if high_risk_count > 100:
            recommendations.append(f"高风险客户数量较多({high_risk_count})，建议加强贷前审核")
        
        # 分析交叉风险
        total_cross_risks = cross_risks['summary'].get('total_customers', 0)
        if total_cross_risks > 50:
            recommendations.append(f"跨银行风险客户较多({total_cross_risks})，建议建立联合黑名单")
        
        if not recommendations:
            recommendations.append("整体风险水平正常，继续保持")
        
        return recommendations
    
    def save_report(self, report: Dict, filepath: str):
        """
        保存报告
        
        Args:
            report: 报告数据
            filepath: 保存路径
        """
        print(f"[风控中心] 保存报告到: {filepath}")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
    
    def get_server_status(self) -> Dict:
        """
        获取服务器状态
        
        Returns:
            服务器状态
        """
        return {
            'status': 'running',
            'security_param': self.security_param,
            'registered_banks': len(self.banks),
            'total_customers': self.risk_db.get_size(),
            'bank_ids': list(self.banks.keys())
        }
