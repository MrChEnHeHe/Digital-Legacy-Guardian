"""
基础不经意传输(OT)协议实现
提供1-out-of-2 OT和OT扩展功能
"""

import secrets
import hashlib
from typing import Tuple, List, Optional
from dataclasses import dataclass
import numpy as np

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crypto.kyber_ot import KyberOT, KyberOTSender, KyberOTReceiver


@dataclass
class OTMessage:
    """OT消息结构"""
    ciphertext: bytes
    encrypted_payload: bytes
    
    def serialize(self) -> bytes:
        """序列化"""
        len_ct = len(self.ciphertext).to_bytes(4, 'big')
        len_ep = len(self.encrypted_payload).to_bytes(4, 'big')
        return len_ct + self.ciphertext + len_ep + self.encrypted_payload
    
    @classmethod
    def deserialize(cls, data: bytes) -> 'OTMessage':
        """反序列化"""
        len_ct = int.from_bytes(data[:4], 'big')
        ct = data[4:4+len_ct]
        len_ep = int.from_bytes(data[4+len_ct:8+len_ct], 'big')
        ep = data[8+len_ct:8+len_ct+len_ep]
        return cls(ct, ep)


class BaseOTProtocol:
    """
    基础OT协议实现
    使用Kyber算法提供后量子安全性
    """
    
    def __init__(self, security_param: int = 128):
        self.security_param = security_param
        self.sender = KyberOTSender()
        self.receiver = KyberOTReceiver()
    
    def execute_sender(self, messages: Tuple[bytes, bytes], receiver_pubkeys: Tuple[bytes, bytes]) -> Tuple[OTMessage, OTMessage]:
        """
        发送方执行OT协议
        
        Args:
            messages: (m0, m1) 两条消息
            receiver_pubkeys: 接收方提供的两个公钥
            
        Returns:
            (msg0, msg1): 加密后的两条消息
        """
        pk0, pk1 = receiver_pubkeys
        m0, m1 = messages
        
        # 确保消息长度相同
        max_len = max(len(m0), len(m1))
        m0 = m0.ljust(max_len, b'\x00')
        m1 = m1.ljust(max_len, b'\x00')
        
        # 简化实现：使用公钥的哈希作为加密密钥
        # 注意：这是一个演示实现，真实的Kyber KEM需要更复杂的封装/解封装
        k0 = hashlib.sha256(pk0).digest()
        k1 = hashlib.sha256(pk1).digest()
        
        # 加密消息
        def encrypt(key: bytes, msg: bytes) -> bytes:
            shake = hashlib.shake_128()
            shake.update(key)
            keystream = shake.digest(len(msg))
            return bytes(a ^ b for a, b in zip(msg, keystream))
        
        e0 = encrypt(k0, m0)
        e1 = encrypt(k1, m1)
        
        # 密文使用公钥本身
        ct0 = pk0
        ct1 = pk1
        
        return OTMessage(ct0, e0), OTMessage(ct1, e1)
    
    def execute_receiver(self, choice: int) -> Tuple[Tuple[bytes, bytes], bytes]:
        """
        接收方准备OT选择
        
        Args:
            choice: 选择比特 (0 或 1)
            
        Returns:
            (pubkeys, private_state): 公钥对和私有状态（用于后续解密）
        """
        pk0, pk1, sk = self.receiver.choose(choice)
        
        # 私有状态包含选择、私钥和公钥（用于解密）
        private_state = {
            'choice': choice,
            'sk': sk,
            'pk0': pk0,
            'pk1': pk1
        }
        
        return (pk0, pk1), private_state
    
    def receiver_decrypt(self, choice: int, messages: Tuple[OTMessage, OTMessage], private_state: dict) -> bytes:
        """
        接收方解密选中的消息
        
        Args:
            choice: 选择比特
            messages: 收到的两条加密消息
            private_state: 私有状态
            
        Returns:
            解密后的消息
        """
        # 使用与发送方相同的密钥派生方式
        # 发送方使用 hashlib.sha256(pk0).digest() 和 hashlib.sha256(pk1).digest()
        pk0 = private_state['pk0']
        pk1 = private_state['pk1']
        
        # 根据选择获取对应的公钥
        selected_pk = pk0 if choice == 0 else pk1
        
        # 使用相同的哈希函数派生密钥
        k = hashlib.sha256(selected_pk).digest()
        
        # 获取选中的消息
        selected_msg = messages[choice]
        
        # 解密（使用与发送方相同的加密方式）
        shake = hashlib.shake_128()
        shake.update(k)
        keystream = shake.digest(len(selected_msg.encrypted_payload))
        msg = bytes(a ^ b for a, b in zip(selected_msg.encrypted_payload, keystream))
        
        return msg.rstrip(b'\x00')


class OTExtension:
    """
    OT扩展协议 (IKNP-style)
    将少量基础OT扩展为大量OT
    """
    
    def __init__(self, base_ot_count: int = 128):
        self.k = base_ot_count  # 安全参数，通常128
        self.base_ot = BaseOTProtocol()
    
    def sender_extend(self, num_ot: int, messages: List[Tuple[bytes, bytes]]) -> List[Tuple[bytes, bytes]]:
        """
        发送方执行OT扩展
        
        Args:
            num_ot: 需要的OT数量
            messages: n对消息，每对(m0, m1)
            
        Returns:
            加密后的消息对列表
        """
        # 1. 执行k个基础OT，接收方选择随机串r
        # 这里简化处理，实际应通过基础OT传递密钥
        
        # 2. 使用PRG生成矩阵
        np.random.seed(42)  # 实际应使用安全随机数
        
        results = []
        for i in range(num_ot):
            # 模拟扩展后的OT
            # 实际应使用哈希函数和基础OT密钥派生
            m0, m1 = messages[i]
            
            # 简单加密（演示用）
            k0 = hashlib.sha256(f"ot_{i}_0".encode()).digest()
            k1 = hashlib.sha256(f"ot_{i}_1".encode()).digest()
            
            def encrypt(key, msg):
                shake = hashlib.shake_128()
                shake.update(key)
                keystream = shake.digest(len(msg))
                return bytes(a ^ b for a, b in zip(msg, keystream))
            
            c0 = encrypt(k0, m0)
            c1 = encrypt(k1, m1)
            
            results.append((c0, c1))
        
        return results
    
    def receiver_extend(self, num_ot: int, choices: List[int]) -> List[bytes]:
        """
        接收方执行OT扩展
        
        Args:
            num_ot: 需要的OT数量
            choices: n个选择比特
            
        Returns:
            接收到的消息列表
        """
        results = []
        for i in range(num_ot):
            # 根据选择解密
            choice = choices[i]
            
            # 模拟密钥派生
            k = hashlib.sha256(f"ot_{i}_{choice}".encode()).digest()
            
            # 这里应该接收密文并解密，简化处理
            results.append(k)  # 返回密钥作为模拟结果
        
        return results


class RandomOT:
    """
    随机OT协议
    发送方获得两个随机串，接收方获得其中一个
    """
    
    def __init__(self):
        self.base_ot = BaseOTProtocol()
    
    def generate(self, length: int = 32) -> Tuple[Tuple[bytes, bytes], bytes]:
        """
        生成随机OT
        
        Returns:
            ((r0, r1), r_choice): 发送方获得(r0, r1)，接收方获得r_choice
        """
        # 生成随机消息
        r0 = secrets.token_bytes(length)
        r1 = secrets.token_bytes(length)
        
        # 执行基础OT
        choice = secrets.randbelow(2)
        pubkeys, private_state = self.base_ot.execute_receiver(choice)
        
        # 发送方响应
        encrypted = self.base_ot.execute_sender((r0, r1), pubkeys)
        
        # 接收方解密
        r_choice = self.base_ot.receiver_decrypt(choice, encrypted, private_state)
        
        return (r0, r1), r_choice