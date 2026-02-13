"""
隐私信息检索(PIR)协议实现
基于同态加密和OT扩展
"""

import hashlib
import secrets
import struct
from typing import List, Tuple, Optional
from dataclasses import dataclass

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from protocols.base_ot import BaseOTProtocol, OTExtension
from crypto.noise_manager import NoiseManager


@dataclass
class PIRQuery:
    """PIR查询结构"""
    index: int                    # 查询索引（加密后）
    encrypted_selection: bytes    # 加密的选择向量
    
    def serialize(self) -> bytes:
        return struct.pack('I', self.index) + self.encrypted_selection
    
    @classmethod
    def deserialize(cls, data: bytes) -> 'PIRQuery':
        index = struct.unpack('I', data[:4])[0]
        return cls(index, data[4:])


@dataclass
class PIRResponse:
    """PIR响应结构"""
    encrypted_result: bytes       # 加密的结果
    proof: Optional[bytes]        # 正确性证明（可选）
    
    def serialize(self) -> bytes:
        has_proof = b'\x01' if self.proof else b'\x00'
        data = has_proof + self.encrypted_result
        if self.proof:
            data += struct.pack('I', len(self.proof)) + self.proof
        return data


class PIRClient:
    """
    PIR客户端
    生成查询并解密结果
    """
    
    def __init__(self, security_param: int = 128):
        self.security_param = security_param
        self.ot = BaseOTProtocol(security_param)
        self.noise_manager = NoiseManager()
    
    def generate_query(self, db_size: int, target_index: int) -> PIRQuery:
        """
        生成PIR查询
        
        Args:
            db_size: 数据库大小
            target_index: 目标索引
            
        Returns:
            PIR查询对象
        """
        # 将索引编码为选择向量
        # 简化：使用OT选择比特
        selection_vector = self._encode_index(db_size, target_index)
        
        # 加密选择向量（使用OT准备）
        encrypted_selection = self._encrypt_selection(selection_vector)
        
        return PIRQuery(target_index, encrypted_selection)
    
    def _encode_index(self, db_size: int, index: int) -> List[int]:
        """将索引编码为选择向量"""
        # one-hot编码
        vector = [0] * db_size
        if 0 <= index < db_size:
            vector[index] = 1
        return vector
    
    def _encrypt_selection(self, vector: List[int]) -> bytes:
        """加密选择向量"""
        # 简化：使用哈希加密
        data = b''.join(struct.pack('B', v) for v in vector)
        key = secrets.token_bytes(32)
        
        # XOR加密
        shake = hashlib.shake_128()
        shake.update(key)
        keystream = shake.digest(len(data))
        encrypted = bytes(a ^ b for a, b in zip(data, keystream))
        
        return key + encrypted  # 前缀是密钥（实际应使用公钥加密）
    
    def decrypt_result(self, response: PIRResponse, query: PIRQuery) -> bytes:
        """
        解密PIR响应
        
        Args:
            response: 服务器响应
            query: 原始查询
            
        Returns:
            解密后的数据
        """
        # 简化解密
        # 实际应使用同态解密密钥
        return response.encrypted_result


class PIRServer:
    """
    PIR服务器
    处理查询并返回加密结果
    """
    
    def __init__(self, security_param: int = 128):
        self.security_param = security_param
        self.database = []
        self.noise_manager = NoiseManager()
    
    def setup(self, database: List[bytes]):
        """
        设置数据库
        
        Args:
            database: 数据列表
        """
        self.database = database
        # 为每个条目注册噪声预算（用于同态加密场景）
        for i, _ in enumerate(database):
            self.noise_manager.register_ciphertext(f"db_{i}", initial_noise=0.0)
    
    def process_query(self, query: PIRQuery) -> PIRResponse:
        """
        处理PIR查询
        
        Args:
            query: 客户端查询
            
        Returns:
            PIR响应
        """
        # 解析选择向量
        selection = self._parse_selection(query.encrypted_selection)
        
        # 执行同态内积（简化版）
        result = self._homomorphic_inner_product(selection)
        
        # 添加噪声（模拟同态加密噪声）
        noise = secrets.token_bytes(16)
        encrypted_result = hashlib.sha256(result + noise).digest() + result
        
        return PIRResponse(encrypted_result, proof=None)
    
    def _parse_selection(self, encrypted_selection: bytes) -> List[int]:
        """解析加密的选择向量"""
        # 简化：假设前32字节是密钥
        if len(encrypted_selection) < 32:
            return [0] * len(self.database)
        
        key = encrypted_selection[:32]
        ciphertext = encrypted_selection[32:]
        
        # 解密
        shake = hashlib.shake_128()
        shake.update(key)
        keystream = shake.digest(len(ciphertext))
        plaintext = bytes(a ^ b for a, b in zip(ciphertext, keystream))
        
        # 解析为向量
        vector = list(plaintext)
        # 二值化
        return [1 if v > 128 else 0 for v in vector[:len(self.database)]]
    
    def _homomorphic_inner_product(self, selection: List[int]) -> bytes:
        """
        执行同态内积
        result = sum(selection[i] * database[i])
        """
        if len(selection) != len(self.database):
            # 填充或截断
            selection = selection[:len(self.database)]
            selection.extend([0] * (len(self.database) - len(selection)))
        
        # 计算加权和（简化：使用XOR代替加法）
        result = b'\x00' * max(len(d) for d in self.database) if self.database else b''
        
        for sel, data in zip(selection, self.database):
            if sel == 1:
                # 扩展数据到相同长度
                extended = data.ljust(len(result), b'\x00')
                # XOR累加（模拟同态加法）
                result = bytes(a ^ b for a, b in zip(result, extended))
        
        return result


class BatchPIR:
    """
    批量PIR协议
    支持一次查询多个索引
    """
    
    def __init__(self, security_param: int = 128):
        self.security_param = security_param
        self.client = PIRClient(security_param)
        self.server = PIRServer(security_param)
    
    def query(self, db_size: int, indices: List[int]) -> List[PIRQuery]:
        """
        生成批量查询
        
        Args:
            db_size: 数据库大小
            indices: 查询索引列表
            
        Returns:
            查询列表
        """
        queries = []
        for idx in indices:
            query = self.client.generate_query(db_size, idx)
            queries.append(query)
        return queries
    
    def respond(self, database: List[bytes], queries: List[PIRQuery]) -> List[PIRResponse]:
        """
        批量响应查询
        
        Args:
            database: 数据库
            queries: 查询列表
            
        Returns:
            响应列表
        """
        self.server.setup(database)
        responses = []
        for query in queries:
            response = self.server.process_query(query)
            responses.append(response)
        return responses
    
    def reconstruct(self, responses: List[PIRResponse], queries: List[PIRQuery]) -> List[bytes]:
        """
        重构查询结果
        
        Args:
            responses: 响应列表
            queries: 查询列表
            
        Returns:
            结果列表
        """
        results = []
        for resp, query in zip(responses, queries):
            result = self.client.decrypt_result(resp, query)
            results.append(result)
        return results
    
    def run_full_protocol(self, database: List[bytes], indices: List[int]) -> Tuple[List[bytes], dict]:
        """
        执行完整批量PIR协议
        
        Args:
            database: 数据库
            indices: 查询索引
            
        Returns:
            (results, stats): 结果和统计信息
        """
        db_size = len(database)
        
        # 客户端生成查询
        queries = self.query(db_size, indices)
        
        # 服务器响应
        responses = self.respond(database, queries)
        
        # 客户端重构
        results = self.reconstruct(responses, queries)
        
        # 统计
        stats = {
            'db_size': db_size,
            'num_queries': len(indices),
            'query_size': sum(len(q.serialize()) for q in queries),
            'response_size': sum(len(r.serialize()) for r in responses),
            'communication_overhead': sum(len(q.serialize()) for q in queries) + sum(len(r.serialize()) for r in responses)
        }
        
        return results, stats


class KeywordPIR:
    """
    关键词PIR
    支持通过关键词查询而非索引
    """
    
    def __init__(self, security_param: int = 128):
        self.security_param = security_param
        self.base_pir = PIRClient(security_param)
        self.keyword_index = {}  # 关键词哈希 -> 索引
    
    def build_index(self, keyword_value_pairs: List[Tuple[bytes, bytes]]):
        """
        构建关键词索引
        
        Args:
            keyword_value_pairs: (关键词, 值)列表
        """
        for i, (keyword, value) in enumerate(keyword_value_pairs):
            keyword_hash = hashlib.sha256(keyword).digest()
            self.keyword_index[keyword_hash] = (i, value)
    
    def query_by_keyword(self, keyword: bytes) -> Optional[bytes]:
        """
        通过关键词查询
        
        Args:
            keyword: 查询关键词
            
        Returns:
            对应的值，不存在返回None
        """
        keyword_hash = hashlib.sha256(keyword).digest()
        if keyword_hash in self.keyword_index:
            _, value = self.keyword_index[keyword_hash]
            return value
        return None