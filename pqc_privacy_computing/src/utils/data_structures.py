# src/utils/data_structure.py
"""
后量子隐私计算系统 - 数据结构与序列化工具
提供统一的数据包格式、序列化/反序列化、类型转换等功能
"""

import struct
import json
import hashlib
import secrets
from typing import Any, Dict, List, Optional, Tuple, Union, Callable
from dataclasses import dataclass, asdict, field
from enum import Enum, auto
from datetime import datetime
import base64
import io


class ProtocolType(Enum):
    """协议类型枚举"""
    OT = auto()           # 不经意传输
    PSI = auto()          # 隐私求交
    PIR = auto()          # 隐私信息检索
    KEY_EXCHANGE = auto() # 密钥交换
    CUSTOM = auto()       # 自定义协议


class MessageType(Enum):
    """消息类型枚举"""
    REQUEST = auto()      # 请求
    RESPONSE = auto()     # 响应
    HANDSHAKE = auto()    # 握手
    DATA = auto()         # 数据
    ERROR = auto()        # 错误
    ACK = auto()          # 确认


@dataclass
class PQCDataPacket:
    """
    后量子隐私计算统一数据包格式
    支持所有协议的消息封装和版本控制
    """
    # 头部信息
    version: int = 1                    # 协议版本
    protocol: ProtocolType = ProtocolType.CUSTOM
    msg_type: MessageType = MessageType.DATA
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    sequence_id: int = 0                # 序列号，用于排序和去重
    
    # 内容
    payload: bytes = b''                # 二进制载荷
    metadata: Dict[str, Any] = field(default_factory=dict)  # 元数据（JSON可序列化）
    
    # 安全
    checksum: Optional[bytes] = None    # 校验和
    signature: Optional[bytes] = None   # 数字签名（预留）
    
    def __post_init__(self):
        """初始化后自动计算校验和"""
        if self.checksum is None:
            self.checksum = self._compute_checksum()
    
    def _compute_checksum(self) -> bytes:
        """计算数据包校验和（SHA3-256）"""
        data = self._get_checksum_data()
        return hashlib.sha3_256(data).digest()
    
    def _get_checksum_data(self) -> bytes:
        """获取用于计算校验和的数据"""
        header_data = struct.pack(
            '!BBBfQ',
            self.version,
            self.protocol.value,
            self.msg_type.value,
            self.timestamp,
            self.sequence_id
        )
        # 元数据转为稳定的二进制表示
        meta_bytes = json.dumps(self.metadata, sort_keys=True, default=str).encode('utf-8')
        return header_data + self.payload + meta_bytes
    
    def verify_checksum(self) -> bool:
        """验证数据包完整性"""
        return self.checksum == self._compute_checksum()
    
    def serialize(self) -> bytes:
        """
        序列化为二进制格式
        格式: [Header][PayloadLength][Payload][MetadataLength][Metadata][Checksum]
        """
        # 序列化元数据
        meta_json = json.dumps(self.metadata, default=str).encode('utf-8')
        
        # 构建头部
        header = struct.pack(
            '!BBBfQ',  # !表示网络字节序
            self.version,
            self.protocol.value,
            self.msg_type.value,
            self.timestamp,
            self.sequence_id
        )
        
        # 构建主体
        payload_len = len(self.payload)
        meta_len = len(meta_json)
        
        body = struct.pack('!I', payload_len) + self.payload
        body += struct.pack('!I', meta_len) + meta_json
        body += self.checksum if self.checksum else b'\x00' * 32
        
        # 如果有签名，追加签名
        if self.signature:
            sig_len = len(self.signature)
            body += struct.pack('!I', sig_len) + self.signature
        else:
            body += struct.pack('!I', 0)
        
        return header + body
    
    @classmethod
    def deserialize(cls, data: bytes) -> 'PQCDataPacket':
        """从二进制反序列化"""
        if len(data) < 17:  # 最小头部大小
            raise ValueError("数据包太小，无法解析")
        
        offset = 0
        
        # 解析头部
        version, proto_val, msg_val, timestamp, seq_id = struct.unpack(
            '!BBBfQ', data[offset:offset+17]
        )
        offset += 17
        
        # 解析载荷
        payload_len = struct.unpack('!I', data[offset:offset+4])[0]
        offset += 4
        payload = data[offset:offset+payload_len]
        offset += payload_len
        
        # 解析元数据
        meta_len = struct.unpack('!I', data[offset:offset+4])[0]
        offset += 4
        meta_json = data[offset:offset+meta_len].decode('utf-8')
        metadata = json.loads(meta_json)
        offset += meta_len
        
        # 解析校验和
        checksum = data[offset:offset+32]
        offset += 32
        
        # 解析签名（可选）
        sig_len = struct.unpack('!I', data[offset:offset+4])[0]
        offset += 4
        signature = data[offset:offset+sig_len] if sig_len > 0 else None
        
        # 构建对象
        packet = cls(
            version=version,
            protocol=ProtocolType(proto_val),
            msg_type=MessageType(msg_val),
            timestamp=timestamp,
            sequence_id=seq_id,
            payload=payload,
            metadata=metadata,
            checksum=checksum,
            signature=signature
        )
        
        # 验证校验和
        if not packet.verify_checksum():
            raise ValueError("数据包校验和验证失败，数据可能损坏或被篡改")
        
        return packet
    
    def to_base64(self) -> str:
        """转为Base64字符串，便于传输"""
        return base64.b64encode(self.serialize()).decode('ascii')
    
    @classmethod
    def from_base64(cls, b64_str: str) -> 'PQCDataPacket':
        """从Base64字符串解析"""
        return cls.deserialize(base64.b64decode(b64_str))
    
    def get_size(self) -> int:
        """获取数据包总大小（字节）"""
        return len(self.serialize())
    
    def add_metadata(self, key: str, value: Any) -> 'PQCDataPacket':
        """链式添加元数据"""
        self.metadata[key] = value
        self.checksum = self._compute_checksum()  # 重新计算校验和
        return self


@dataclass
class OTDataPacket:
    """
    OT协议专用数据包封装
    与 base_ot.py 中的 OTMessage 兼容
    """
    ciphertext: bytes
    encrypted_payload: bytes
    choice_hint: Optional[int] = None  # 调试用，生产环境应移除
    
    def to_pqc_packet(self, protocol: ProtocolType = ProtocolType.OT) -> PQCDataPacket:
        """转换为统一数据包格式"""
        # 序列化OT特定数据
        payload = struct.pack(
            '!I', self.choice_hint if self.choice_hint is not None else 255
        )
        payload += struct.pack('!I', len(self.ciphertext)) + self.ciphertext
        payload += self.encrypted_payload
        
        return PQCDataPacket(
            protocol=protocol,
            msg_type=MessageType.DATA,
            payload=payload,
            metadata={
                'ciphertext_len': len(self.ciphertext),
                'payload_len': len(self.encrypted_payload)
            }
        )
    
    @classmethod
    def from_pqc_packet(cls, packet: PQCDataPacket) -> 'OTDataPacket':
        """从统一数据包解析"""
        data = packet.payload
        offset = 0
        
        choice_hint = struct.unpack('!I', data[offset:offset+4])[0]
        if choice_hint == 255:
            choice_hint = None
        offset += 4
        
        ct_len = struct.unpack('!I', data[offset:offset+4])[0]
        offset += 4
        ciphertext = data[offset:offset+ct_len]
        offset += ct_len
        
        encrypted_payload = data[offset:]
        
        return cls(
            ciphertext=ciphertext,
            encrypted_payload=encrypted_payload,
            choice_hint=choice_hint
        )


@dataclass
class PSIDataPacket:
    """
    PSI协议专用数据包封装
    与 psi_protocol.py 中的 PSIMessage 兼容
    """
    cuckoo_bins: List[bytes]
    stash: List[bytes]
    ot_messages: List[Tuple[bytes, bytes]]
    
    def to_pqc_packet(self) -> PQCDataPacket:
        """转换为统一数据包格式"""
        # 序列化布谷鸟哈希数据
        bins_data = b''.join(
            struct.pack('!I', len(b)) + b for b in self.cuckoo_bins
        )
        stash_data = b''.join(
            struct.pack('!I', len(s)) + s for s in self.stash
        )
        
        # 序列化OT消息对
        ot_data = b''
        for m0, m1 in self.ot_messages:
            ot_data += struct.pack('!I', len(m0)) + m0
            ot_data += struct.pack('!I', len(m1)) + m1
        
        # 构建载荷
        payload = struct.pack('!I', len(self.cuckoo_bins)) + bins_data
        payload += struct.pack('!I', len(self.stash)) + stash_data
        payload += struct.pack('!I', len(self.ot_messages)) + ot_data
        
        return PQCDataPacket(
            protocol=ProtocolType.PSI,
            msg_type=MessageType.DATA,
            payload=payload,
            metadata={
                'num_bins': len(self.cuckoo_bins),
                'stash_size': len(self.stash),
                'ot_pairs': len(self.ot_messages)
            }
        )
    
    @classmethod
    def from_pqc_packet(cls, packet: PQCDataPacket) -> 'PSIDataPacket':
        """从统一数据包解析"""
        data = packet.payload
        offset = 0
        
        # 解析bins
        num_bins = struct.unpack('!I', data[offset:offset+4])[0]
        offset += 4
        cuckoo_bins = []
        for _ in range(num_bins):
            length = struct.unpack('!I', data[offset:offset+4])[0]
            offset += 4
            cuckoo_bins.append(data[offset:offset+length])
            offset += length
        
        # 解析stash
        num_stash = struct.unpack('!I', data[offset:offset+4])[0]
        offset += 4
        stash = []
        for _ in range(num_stash):
            length = struct.unpack('!I', data[offset:offset+4])[0]
            offset += 4
            stash.append(data[offset:offset+length])
            offset += length
        
        # 解析OT消息对
        num_ot = struct.unpack('!I', data[offset:offset+4])[0]
        offset += 4
        ot_messages = []
        for _ in range(num_ot):
            len0 = struct.unpack('!I', data[offset:offset+4])[0]
            offset += 4
            m0 = data[offset:offset+len0]
            offset += len0
            
            len1 = struct.unpack('!I', data[offset:offset+4])[0]
            offset += 4
            m1 = data[offset:offset+len1]
            offset += len1
            
            ot_messages.append((m0, m1))
        
        return cls(cuckoo_bins=cuckoo_bins, stash=stash, ot_messages=ot_messages)


@dataclass
class PIRDataPacket:
    """
    PIR协议专用数据包封装
    支持 PIRQuery 和 PIRResponse
    """
    query_index: int
    encrypted_selection: bytes
    encrypted_result: Optional[bytes] = None
    proof: Optional[bytes] = None
    
    def to_query_packet(self) -> PQCDataPacket:
        """生成PIR查询数据包"""
        payload = struct.pack('!I', self.query_index)
        payload += struct.pack('!I', len(self.encrypted_selection)) + self.encrypted_selection
        
        return PQCDataPacket(
            protocol=ProtocolType.PIR,
            msg_type=MessageType.REQUEST,
            payload=payload,
            metadata={'query_type': 'index', 'has_proof': False}
        )
    
    def to_response_packet(self) -> PQCDataPacket:
        """生成PIR响应数据包"""
        if self.encrypted_result is None:
            raise ValueError("响应数据包必须有encrypted_result")
        
        payload = struct.pack('!I', len(self.encrypted_result)) + self.encrypted_result
        
        has_proof = self.proof is not None
        if has_proof:
            payload += struct.pack('!I', len(self.proof)) + self.proof
        
        return PQCDataPacket(
            protocol=ProtocolType.PIR,
            msg_type=MessageType.RESPONSE,
            payload=payload,
            metadata={
                'query_type': 'index',
                'has_proof': has_proof,
                'result_hash': hashlib.sha256(self.encrypted_result).hexdigest()[:16]
            }
        )
    
    @classmethod
    def from_packet(cls, packet: PQCDataPacket) -> 'PIRDataPacket':
        """从统一数据包解析"""
        data = packet.payload
        offset = 0
        
        if packet.msg_type == MessageType.REQUEST:
            # 解析查询
            query_index = struct.unpack('!I', data[offset:offset+4])[0]
            offset += 4
            sel_len = struct.unpack('!I', data[offset:offset+4])[0]
            offset += 4
            encrypted_selection = data[offset:offset+sel_len]
            
            return cls(
                query_index=query_index,
                encrypted_selection=encrypted_selection
            )
        else:
            # 解析响应
            res_len = struct.unpack('!I', data[offset:offset+4])[0]
            offset += 4
            encrypted_result = data[offset:offset+res_len]
            offset += res_len
            
            proof = None
            if offset < len(data):
                proof_len = struct.unpack('!I', data[offset:offset+4])[0]
                offset += 4
                proof = data[offset:offset+proof_len]
            
            return cls(
                query_index=packet.metadata.get('query_index', 0),
                encrypted_selection=b'',
                encrypted_result=encrypted_result,
                proof=proof
            )


class DataStream:
    """
    数据流管理器
    处理大数据的分块传输和重组
    """
    
    def __init__(self, chunk_size: int = 65536):
        self.chunk_size = chunk_size
        self.chunks: Dict[int, bytes] = {}
        self.total_size: int = 0
        self.received_chunks: int = 0
        self.stream_id: str = secrets.token_hex(16)
    
    def add_chunk(self, sequence: int, data: bytes, is_last: bool = False) -> bool:
        """
        添加数据块
        返回是否接收完成
        """
        self.chunks[sequence] = data
        self.received_chunks += 1
        
        if is_last:
            self.total_size = sum(len(self.chunks[i]) for i in range(sequence + 1))
        
        # 检查是否接收完成
        if self.total_size > 0:
            expected_chunks = (self.total_size + self.chunk_size - 1) // self.chunk_size
            return self.received_chunks >= expected_chunks
        return False
    
    def get_data(self) -> bytes:
        """重组完整数据"""
        if self.total_size == 0:
            raise ValueError("数据流尚未完成")
        
        # 按顺序重组
        result = b''.join(self.chunks[i] for i in sorted(self.chunks.keys()))
        return result
    
    def split_data(self, data: bytes) -> List[PQCDataPacket]:
        """将大数据分割为多个数据包"""
        packets = []
        total_chunks = (len(data) + self.chunk_size - 1) // self.chunk_size
        
        for i in range(total_chunks):
            start = i * self.chunk_size
            end = min(start + self.chunk_size, len(data))
            chunk = data[start:end]
            
            packet = PQCDataPacket(
                protocol=ProtocolType.CUSTOM,
                msg_type=MessageType.DATA,
                sequence_id=i,
                payload=chunk,
                metadata={
                    'stream_id': self.stream_id,
                    'chunk_index': i,
                    'total_chunks': total_chunks,
                    'is_last': i == total_chunks - 1
                }
            )
            packets.append(packet)
        
        return packets


class SecureSerializer:
    """
    安全序列化器
    提供防篡改的序列化机制
    """
    
    @staticmethod
    def secure_dump(obj: Any, key: Optional[bytes] = None) -> bytes:
        """
        安全序列化对象
        可选使用密钥进行认证加密
        """
        # 使用JSON序列化
        json_data = json.dumps(obj, default=str).encode('utf-8')
        
        if key:
            # 简单XOR加密（演示用，生产环境应使用AES-GCM）
            from hashlib import shake_128
            keystream = shake_128(key).digest(len(json_data))
            encrypted = bytes(a ^ b for a, b in zip(json_data, keystream))
            
            # 添加HMAC
            hmac = hashlib.sha3_256(key + encrypted).digest()
            return b'ENC:' + hmac + encrypted
        
        # 无加密，仅添加校验和
        checksum = hashlib.sha3_256(json_data).digest()
        return b'RAW:' + checksum + json_data
    
    @staticmethod
    def secure_load(data: bytes, key: Optional[bytes] = None) -> Any:
        """安全反序列化"""
        if not data.startswith(b'RAW:') and not data.startswith(b'ENC:'):
            raise ValueError("无效的数据格式")
        
        is_encrypted = data.startswith(b'ENC:')
        payload = data[4:]
        
        if is_encrypted:
            if key is None:
                raise ValueError("需要提供解密密钥")
            hmac = payload[:32]
            encrypted = payload[32:]
            
            # 验证HMAC
            expected_hmac = hashlib.sha3_256(key + encrypted).digest()
            if not secrets.compare_digest(hmac, expected_hmac):
                raise ValueError("数据认证失败，可能被篡改")
            
            # 解密
            keystream = hashlib.shake_128(key).digest(len(encrypted))
            json_data = bytes(a ^ b for a, b in zip(encrypted, keystream))
        else:
            checksum = payload[:32]
            json_data = payload[32:]
            
            # 验证校验和
            expected_checksum = hashlib.sha3_256(json_data).digest()
            if not secrets.compare_digest(checksum, expected_checksum):
                raise ValueError("数据校验失败")
        
        return json.loads(json_data.decode('utf-8'))


class MetricsCollector:
    """
    性能指标收集器
    用于收集协议执行的性能数据
    """
    
    def __init__(self):
        self.metrics: Dict[str, List[float]] = {}
        self.counters: Dict[str, int] = {}
        self.start_times: Dict[str, float] = {}
    
    def start_timer(self, name: str):
        """开始计时"""
        import time
        self.start_times[name] = time.perf_counter()
    
    def end_timer(self, name: str) -> float:
        """结束计时并记录"""
        import time
        if name not in self.start_times:
            raise ValueError(f"计时器 {name} 未启动")
        
        elapsed = time.perf_counter() - self.start_times[name]
        if name not in self.metrics:
            self.metrics[name] = []
        self.metrics[name].append(elapsed)
        del self.start_times[name]
        return elapsed
    
    def increment(self, name: str, value: int = 1):
        """增加计数器"""
        self.counters[name] = self.counters.get(name, 0) + value
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        stats = {
            'counters': self.counters.copy(),
            'timers': {}
        }
        
        for name, times in self.metrics.items():
            if times:
                stats['timers'][name] = {
                    'count': len(times),
                    'total': sum(times),
                    'avg': sum(times) / len(times),
                    'min': min(times),
                    'max': max(times)
                }
        
        return stats
    
    def reset(self):
        """重置所有指标"""
        self.metrics.clear()
        self.counters.clear()
        self.start_times.clear()


# 便捷函数
def create_handshake_packet(protocol: ProtocolType, params: Dict[str, Any]) -> PQCDataPacket:
    """创建握手包"""
    return PQCDataPacket(
        protocol=protocol,
        msg_type=MessageType.HANDSHAKE,
        payload=b'',
        metadata={
            'handshake': True,
            'params': params,
            'timestamp': datetime.now().isoformat()
        }
    )


def create_error_packet(error_msg: str, error_code: int = 500) -> PQCDataPacket:
    """创建错误包"""
    return PQCDataPacket(
        protocol=ProtocolType.CUSTOM,
        msg_type=MessageType.ERROR,
        payload=error_msg.encode('utf-8'),
        metadata={
            'error_code': error_code,
            'error_msg': error_msg
        }
    )


def estimate_communication_cost(packets: List[PQCDataPacket]) -> Dict[str, int]:
    """估算通信开销"""
    total_size = sum(p.get_size() for p in packets)
    return {
        'packet_count': len(packets),
        'total_bytes': total_size,
        'avg_packet_size': total_size // len(packets) if packets else 0,
        'overhead_bytes': sum(len(p.serialize()) - len(p.payload) for p in packets)
    }