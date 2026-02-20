"""
PIR管理器
使用隐私信息检索协议批量查询风险信息
"""

from typing import List, Dict
from .risk_database import RiskDatabase
import hashlib
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from protocols.pir_protocol import BatchPIR


class PIRManager:
    """
    PIR管理器
    使用隐私信息检索协议批量查询风险信息
    """
    
    def __init__(self, security_param: int = 128):
        self.security_param = security_param
        self.batch_pir = BatchPIR(security_param)
    
    def hash_to_index(self, customer_hash: bytes, db_size: int) -> int:
        """
        将客户哈希转换为数据库索引
        
        Args:
            customer_hash: 客户哈希值
            db_size: 数据库大小
            
        Returns:
            数据库索引
        """
        # 使用哈希的前4字节作为索引
        index = int.from_bytes(customer_hash[:4], 'big') % db_size
        return index
    
    def batch_query(
        self,
        customer_hashes: List[bytes],
        risk_db: RiskDatabase
    ) -> Dict[bytes, dict]:
        """
        批量查询客户风险信息
        
        Args:
            customer_hashes: 客户哈希列表
            risk_db: 风险数据库
            
        Returns:
            客户哈希 -> 风险信息
        """
        print(f"[PIR] 开始批量查询，客户数: {len(customer_hashes)}")
        
        db_size = risk_db.get_size()
        
        # 1. 客户端生成查询
        indices = [self.hash_to_index(h, db_size) for h in customer_hashes]
        queries = self.batch_pir.query(db_size, indices)
        
        print(f"[PIR] 查询生成完成")
        
        # 2. 服务器响应
        database = []
        for i in range(db_size):
            customer = risk_db.get_risk_info_by_index(i)
            if customer:
                # 获取所有匹配的客户（包括共享客户）
                original_id = getattr(customer, '_original_customer_id', customer.customer_id)
                all_customers = risk_db.get_all_risk_info_by_hash(
                    hashlib.sha256(original_id.encode()).digest()
                )
                
                if len(all_customers) > 1:
                    # 共享客户，返回所有银行的信息
                    record = {
                        'customer_id': original_id,
                        'risk_level': customer.risk_level.value,
                        'is_shared': True,
                        'total_banks': len(all_customers),
                        'customers': [
                            {
                                'bank_id': c.bank_id,
                                'risk_score': c.risk_score,
                                'report_date': c.report_date,
                                'report_reason': c.report_reason
                            }
                            for c in all_customers
                        ]
                    }
                else:
                    # 独特客户
                    record = customer.to_dict()
                    record['is_shared'] = False
                    record['total_banks'] = 1
                    record['customers'] = []
            else:
                record = {'customer_id': 'unknown', 'risk_level': 'unknown', 'is_shared': False, 'total_banks': 0, 'customers': []}
            
            database.append(record)
        
        # 将数据库转换为字节列表
        database_bytes = [
            self._dict_to_bytes(record)
            for record in database
        ]
        
        responses = self.batch_pir.respond(database_bytes, queries)
        
        print(f"[PIR] 服务器响应完成")
        
        # 3. 客户端重构
        results_bytes = self.batch_pir.reconstruct(responses, queries)
        
        # 4. 解析结果
        results = {}
        for customer_hash, result_bytes in zip(customer_hashes, results_bytes):
            risk_info = self._bytes_to_dict(result_bytes)
            results[customer_hash] = risk_info
        
        print(f"[PIR] 批量查询完成")
        
        return results
    
    def _dict_to_bytes(self, data: dict) -> bytes:
        """将字典转换为字节"""
        import json
        json_str = json.dumps(data, ensure_ascii=False)
        return json_str.encode('utf-8')
    
    def _bytes_to_dict(self, data: bytes) -> dict:
        """将字节转换为字典"""
        import json
        try:
            json_str = data.decode('utf-8')
            return json.loads(json_str)
        except:
            return {'customer_id': 'unknown', 'risk_level': 'unknown'}
    
    def query_new_customers(
        self,
        new_customer_hashes: List[bytes],
        risk_db: RiskDatabase
    ) -> Dict[str, List[bytes]]:
        """
        查询新客户的风险信息
        
        Args:
            new_customer_hashes: 新客户哈希列表
            risk_db: 风险数据库
            
        Returns:
            风险等级 -> 客户哈希列表
        """
        print(f"[PIR] 查询新客户风险，客户数: {len(new_customer_hashes)}")
        
        # 批量查询
        results = self.batch_query(new_customer_hashes, risk_db)
        
        # 按风险等级分类
        risk_customers = {
            'high': [],
            'medium': [],
            'low': [],
            'unknown': []
        }
        
        for customer_hash, risk_info in results.items():
            risk_level = risk_info.get('risk_level', 'unknown')
            if risk_level in risk_customers:
                risk_customers[risk_level].append(customer_hash)
        
        print(f"[PIR] 高风险客户: {len(risk_customers['high'])}")
        print(f"[PIR] 中风险客户: {len(risk_customers['medium'])}")
        print(f"[PIR] 低风险客户: {len(risk_customers['low'])}")
        
        return risk_customers
    
    def query_by_keyword(
        self,
        keyword: str,
        risk_db: RiskDatabase
    ) -> List[dict]:
        """
        通过关键词查询客户
        
        Args:
            keyword: 查询关键词
            risk_db: 风险数据库
            
        Returns:
            匹配的客户列表
        """
        print(f"[PIR] 关键词查询: {keyword}")
        
        # 使用关键词PIR
        from protocols.pir_protocol import KeywordPIR
        keyword_pir = KeywordPIR(self.security_param)
        
        # 构建关键词索引
        keyword_value_pairs = []
        for customer_id, customer in risk_db.customers.items():
            # 使用客户ID作为关键词
            keyword_value_pairs.append((customer_id.encode(), customer.to_dict()))
        
        keyword_pir.build_index(keyword_value_pairs)
        
        # 查询
        result = keyword_pir.query_by_keyword(keyword.encode())
        
        if result:
            return [result]
        else:
            return []
    
    def generate_query_report(
        self,
        customer_hashes: List[bytes],
        risk_db: RiskDatabase
    ) -> dict:
        """
        生成查询报告
        
        Args:
            customer_hashes: 客户哈希列表
            risk_db: 风险数据库
            
        Returns:
            查询报告
        """
        print(f"[PIR] 生成查询报告...")
        
        # 执行批量查询
        results = self.batch_query(customer_hashes, risk_db)
        
        # 统计信息
        risk_stats = {'high': 0, 'medium': 0, 'low': 0, 'unknown': 0}
        shared_count = 0
        
        for risk_info in results.values():
            risk_level = risk_info.get('risk_level', 'unknown')
            if risk_level in risk_stats:
                risk_stats[risk_level] += 1
            
            if risk_info.get('is_shared', False):
                shared_count += 1
        
        # 生成报告
        report = {
            'total_queries': len(customer_hashes),
            'successful_queries': len([r for r in results.values() if r.get('customer_id') != 'unknown']),
            'shared_customers': shared_count,
            'by_risk_level': risk_stats,
            'details': [
                {
                    'customer_hash': h.hex()[:16] + '...',
                    'risk_info': info
                }
                for h, info in list(results.items())[:10]  # 只显示前10个
            ]
        }
        
        print(f"[PIR] 报告生成完成")
        print(f"[PIR] 总查询: {report['total_queries']}")
        print(f"[PIR] 成功查询: {report['successful_queries']}")
        print(f"[PIR] 共享客户: {report['shared_customers']}")
        
        return report
