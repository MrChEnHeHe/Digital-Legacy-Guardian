"""
消息处理器模块
定义消息类型和处理逻辑
"""

import struct
import json
from enum import Enum, auto
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass, asdict


class MessageType(Enum):
    """消息类型枚举"""
    # 控制消息
    HANDSHAKE = auto()
    HEARTBEAT = auto()
    ERROR = auto()
    CLOSE = auto()
    
    # OT协议消息
    OT_REQUEST = auto()
    OT_RESPONSE = auto()
    OT_BATCH_REQUEST = auto()
    OT_BATCH_RESPONSE = auto()
    
    # PSI协议消息
    PSI_INIT = auto()
    PSI_CUCKOO_DATA = auto()
    PSI_OT_MESSAGES = auto()
    PSI_RESULT = auto()
    
    # PIR协议消息
    PIR_QUERY = auto()
    PIR_RESPONSE = auto()
    PIR_BATCH_QUERY = auto()
    PIR_BATCH_RESPONSE = auto()
    
    # 数据消息
    ENCRYPTED_DATA = auto()
    PLAIN_DATA = auto()


@dataclass
class Message:
    """通用消息结构"""
    msg_type: MessageType
    payload: bytes
    metadata: Dict[str, Any] = None
    timestamp: float = None
    sequence: int = 0
    
    def __post_init__(self):
        import time
        if self.timestamp is None:
            self.timestamp = time.time()
        if self.metadata is None:
            self.metadata = {}
    
    def serialize(self) -> bytes:
        """序列化消息"""
        # 消息头: [类型(4字节) | 序列号(4字节) | 时间戳(8字节) | 元数据长度(4字节) | 负载长度(4字节)]
        header = struct.pack(
            'I I d I I',
            self.msg_type.value,
            self.sequence,
            self.timestamp,
            len(json.dumps(self.metadata).encode()),
            len(self.payload)
        )
        
        metadata_bytes = json.dumps(self.metadata).encode()
        return header + metadata_bytes + self.payload
    
    @classmethod
    def deserialize(cls, data: bytes) -> 'Message':
        """反序列化消息"""
        # 解析头部
        header_size = 24  # 4+4+8+4+4
        msg_type_val, sequence, timestamp, meta_len, payload_len = struct.unpack(
            'I I d I I',
            data[:header_size]
        )
        
        msg_type = MessageType(msg_type_val)
        
        # 解析元数据
        meta_start = header_size
        meta_end = meta_start + meta_len
        metadata = json.loads(data[meta_start:meta_end].decode())
        
        # 解析负载
        payload = data[meta_end:meta_end + payload_len]
        
        return cls(msg_type, payload, metadata, timestamp, sequence)


class MessageHandler:
    """
    消息处理器
    路由和处理不同类型的消息
    """
    
    def __init__(self):
        self.handlers: Dict[MessageType, Callable[[Message], Optional[Message]]] = {}
        self.sequence_counter = 0
        self.message_log = []
    
    def register_handler(self, msg_type: MessageType, handler: Callable[[Message], Optional[Message]]):
        """
        注册消息处理器
        
        Args:
            msg_type: 消息类型
            handler: 处理函数，接收Message返回Message（可选）
        """
        self.handlers[msg_type] = handler
    
    def handle(self, data: bytes) -> Optional[Message]:
        """
        处理原始消息数据
        
        Args:
            data: 原始字节数据
            
        Returns:
            响应消息（如果有）
        """
        try:
            message = Message.deserialize(data)
            self.message_log.append({
                'type': message.msg_type.name,
                'timestamp': message.timestamp,
                'size': len(data)
            })
            
            handler = self.handlers.get(message.msg_type)
            if handler:
                return handler(message)
            else:
                print(f"未找到处理器: {message.msg_type}")
                return None
        except Exception as e:
            print(f"消息处理错误: {e}")
            return self._create_error_message(str(e))
    
    def create_message(self, msg_type: MessageType, payload: bytes, metadata: Dict = None) -> Message:
        """创建新消息"""
        self.sequence_counter += 1
        return Message(
            msg_type=msg_type,
            payload=payload,
            metadata=metadata or {},
            sequence=self.sequence_counter
        )
    
    def _create_error_message(self, error_msg: str) -> Message:
        """创建错误消息"""
        return self.create_message(
            MessageType.ERROR,
            error_msg.encode(),
            {'error': True}
        )
    
    def get_statistics(self) -> Dict:
        """获取消息统计"""
        from collections import Counter
        type_counts = Counter(msg['type'] for msg in self.message_log)
        
        return {
            'total_messages': len(self.message_log),
            'type_distribution': dict(type_counts),
            'avg_message_size': sum(m['size'] for m in self.message_log) / len(self.message_log) if self.message_log else 0
        }


class OTMessageHandler(MessageHandler):
    """OT协议专用消息处理器"""
    
    def __init__(self):
        super().__init__()
        self._setup_handlers()
    
    def _setup_handlers(self):
        """设置OT协议处理器"""
        self.register_handler(MessageType.OT_REQUEST, self._handle_ot_request)
        self.register_handler(MessageType.OT_RESPONSE, self._handle_ot_response)
        self.register_handler(MessageType.OT_BATCH_REQUEST, self._handle_batch_request)
    
    def _handle_ot_request(self, message: Message) -> Message:
        """处理OT请求"""
        # 解析请求
        data = json.loads(message.payload.decode())
        pubkeys = data.get('pubkeys', [])
        
        # 模拟响应
        response_data = {
            'ciphertexts': ['ct0', 'ct1'],
            'encrypted_messages': ['enc0', 'enc1']
        }
        
        return self.create_message(
            MessageType.OT_RESPONSE,
            json.dumps(response_data).encode()
        )
    
    def _handle_ot_response(self, message: Message) -> Optional[Message]:
        """处理OT响应"""
        data = json.loads(message.payload.decode())
        print(f"收到OT响应: {data.keys()}")
        return None
    
    def _handle_batch_request(self, message: Message) -> Message:
        """处理批量OT请求"""
        data = json.loads(message.payload.decode())
        num_ot = data.get('num_ot', 1)
        
        # 批量响应
        response_data = {
            'batch_size': num_ot,
            'responses': [f'resp_{i}' for i in range(num_ot)]
        }
        
        return self.create_message(
            MessageType.OT_BATCH_RESPONSE,
            json.dumps(response_data).encode()
        )


class PSIMessageHandler(MessageHandler):
    """PSI协议专用消息处理器"""
    
    def __init__(self):
        super().__init__()
        self._setup_handlers()
    
    def _setup_handlers(self):
        self.register_handler(MessageType.PSI_INIT, self._handle_psi_init)
        self.register_handler(MessageType.PSI_CUCKOO_DATA, self._handle_cuckoo)
        self.register_handler(MessageType.PSI_OT_MESSAGES, self._handle_ot_messages)
    
    def _handle_psi_init(self, message: Message) -> Message:
        """处理PSI初始化"""
        data = json.loads(message.payload.decode())
        dataset_size = data.get('dataset_size', 0)
        
        response = {
            'status': 'ready',
            'num_bins': dataset_size * 2
        }
        
        return self.create_message(
            MessageType.PSI_INIT,
            json.dumps(response).encode()
        )
    
    def _handle_cuckoo(self, message: Message) -> Message:
        """处理布谷鸟哈希数据"""
        # 处理布谷鸟桶数据
        return self.create_message(
            MessageType.PSI_OT_MESSAGES,
            json.dumps({'ot_ready': True}).encode()
        )
    
    def _handle_ot_messages(self, message: Message) -> Message:
        """处理OT消息"""
        # 计算并返回交集
        return self.create_message(
            MessageType.PSI_RESULT,
            json.dumps({'intersection': []}).encode()
        )


class PIRMessageHandler(MessageHandler):
    """PIR协议专用消息处理器"""
    
    def __init__(self):
        super().__init__()
        self._setup_handlers()
    
    def _setup_handlers(self):
        self.register_handler(MessageType.PIR_QUERY, self._handle_pir_query)
        self.register_handler(MessageType.PIR_BATCH_QUERY, self._handle_batch_query)
    
    def _handle_pir_query(self, message: Message) -> Message:
        """处理PIR查询"""
        # 解析查询索引
        index = struct.unpack('I', message.payload[:4])[0]
        
        # 模拟数据库响应
        result = f"data_at_index_{index}"
        
        return self.create_message(
            MessageType.PIR_RESPONSE,
            result.encode()
        )
    
    def _handle_batch_query(self, message: Message) -> Message:
        """处理批量PIR查询"""
        # 解析多个索引
        indices = struct.unpack(f'{len(message.payload)//4}I', message.payload)
        
        # 批量响应
        results = b''.join(f"data_{i}".encode() for i in indices)
        
        return self.create_message(
            MessageType.PIR_BATCH_RESPONSE,
            results
        )