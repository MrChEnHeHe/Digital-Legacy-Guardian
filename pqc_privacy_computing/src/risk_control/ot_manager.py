"""
OT管理器
使用不经意传输协议安全查询风险等级
"""

from typing import Tuple
from .risk_database import RiskDatabase, RiskLevel
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from protocols.base_ot import BaseOTProtocol


class OTManager:
    """
    OT管理器
    使用不经意传输协议安全查询风险等级
    """
    
    def __init__(self, security_param: int = 128):
        self.security_param = security_param
        self.ot = BaseOTProtocol(security_param)
    
    def prepare_query(self, customer_hash: bytes) -> Tuple[Tuple[bytes, bytes], dict]:
        """
        客户端准备查询
        
        Args:
            customer_hash: 客户哈希值
            
        Returns:
            (pubkeys, private_state): 公钥对和私有状态
        """
        print(f"[OT] 客户端准备查询...")
        
        # 客户端选择查询自己的风险等级
        # 使用客户哈希的第一个字节作为选择比特
        choice = customer_hash[0] % 2
        
        # 准备OT查询
        pubkeys, private_state = self.ot.execute_receiver(choice)
        
        print(f"[OT] 查询准备完成，选择比特: {choice}")
        
        return pubkeys, private_state
    
    def respond_query(
        self,
        pubkeys: Tuple[bytes, bytes],
        risk_db: RiskDatabase,
        customer_hash: bytes
    ) -> Tuple[Tuple[bytes, bytes], Tuple[bytes, bytes]]:
        """
        银行响应查询
        
        Args:
            pubkeys: 客户端提供的公钥对
            risk_db: 风险数据库
            customer_hash: 客户哈希值
            
        Returns:
            (encrypted_messages, messages): 加密消息和原始消息
        """
        print(f"[OT] 银行响应查询...")
        
        # 查找客户信息
        customer = risk_db.get_risk_info_by_hash(customer_hash)
        
        if customer:
            # 准备两个消息
            # 消息0: 客户的真实风险等级
            message0 = customer.risk_level.value.encode()
            # 消息1: 填充消息
            message1 = b'normal'
        else:
            # 客户不存在，返回默认值
            message0 = b'unknown'
            message1 = b'unknown'
        
        # 确保消息长度相同
        max_len = max(len(message0), len(message1))
        message0 = message0.ljust(max_len, b'\x00')
        message1 = message1.ljust(max_len, b'\x00')
        
        # 使用OT协议响应
        encrypted_messages = self.ot.execute_sender(
            messages=(message0, message1),
            receiver_pubkeys=pubkeys
        )
        
        print(f"[OT] 响应完成，消息长度: {max_len}")
        
        return encrypted_messages, (message0, message1)
    
    def decrypt_result(
        self,
        encrypted_messages: Tuple,
        private_state: dict
    ) -> bytes:
        """
        客户端解密查询结果
        
        Args:
            encrypted_messages: 加密的消息对
            private_state: 私有状态
            
        Returns:
            解密后的风险等级
        """
        print(f"[OT] 客户端解密结果...")
        
        # 从私有状态获取选择比特
        choice = private_state['choice']
        
        # 解密选中的消息
        risk_level = self.ot.receiver_decrypt(
            choice=choice,
            messages=encrypted_messages,
            private_state=private_state
        )
        
        # 去除填充
        risk_level = risk_level.rstrip(b'\x00')
        
        print(f"[OT] 解密完成，风险等级: {risk_level.decode()}")
        
        return risk_level
    
    def query_risk_level(
        self,
        customer_hash: bytes,
        risk_db: RiskDatabase
    ) -> bytes:
        """
        完整的风险等级查询流程
        
        Args:
            customer_hash: 客户哈希值
            risk_db: 风险数据库
            
        Returns:
            风险等级
        """
        print(f"[OT] 开始风险等级查询...")
        
        # 1. 客户端准备查询
        pubkeys, private_state = self.prepare_query(customer_hash)
        
        # 2. 银行响应查询
        encrypted_messages, _ = self.respond_query(pubkeys, risk_db, customer_hash)
        
        # 3. 客户端解密结果
        risk_level = self.decrypt_result(encrypted_messages, private_state)
        
        print(f"[OT] 查询完成: {risk_level.decode()}")
        
        return risk_level
    
    def batch_query_risk_levels(
        self,
        customer_hashes: list,
        risk_db: RiskDatabase
    ) -> list:
        """
        批量查询风险等级
        
        Args:
            customer_hashes: 客户哈希列表
            risk_db: 风险数据库
            
        Returns:
            风险等级列表
        """
        print(f"[OT] 开始批量查询，客户数: {len(customer_hashes)}")
        
        results = []
        for i, customer_hash in enumerate(customer_hashes):
            print(f"[OT] 查询进度: {i+1}/{len(customer_hashes)}")
            risk_level = self.query_risk_level(customer_hash, risk_db)
            results.append(risk_level)
        
        print(f"[OT] 批量查询完成")
        
        return results
    
    def query_with_details(
        self,
        customer_hash: bytes,
        risk_db: RiskDatabase
    ) -> dict:
        """
        查询风险等级并返回详细信息
        
        Args:
            customer_hash: 客户哈希值
            risk_db: 风险数据库
            
        Returns:
            风险信息字典
        """
        print(f"[OT] 查询风险详细信息...")
        
        # 查询风险等级
        risk_level = self.query_risk_level(customer_hash, risk_db)
        
        # 查找所有匹配的客户详细信息（包括共享客户）
        customers = risk_db.get_all_risk_info_by_hash(customer_hash)
        
        if customers:
            # 如果有多个匹配的客户（共享客户），返回所有银行的信息
            result = {
                'risk_level': risk_level.decode(),
                'customers': []
            }
            
            for customer in customers:
                result['customers'].append({
                    'risk_score': customer.risk_score,
                    'report_date': customer.report_date,
                    'report_reason': customer.report_reason,
                    'bank_id': customer.bank_id
                })
            
            # 为了兼容性，保留第一个客户的信息作为主要信息
            result['risk_score'] = customers[0].risk_score
            result['report_date'] = customers[0].report_date
            result['report_reason'] = customers[0].report_reason
            result['bank_id'] = customers[0].bank_id
            result['is_shared'] = len(customers) > 1
            result['total_banks'] = len(customers)
        else:
            result = {
                'risk_level': risk_level.decode(),
                'risk_score': None,
                'report_date': None,
                'report_reason': None,
                'bank_id': None,
                'customers': [],
                'is_shared': False,
                'total_banks': 0
            }
        
        return result
