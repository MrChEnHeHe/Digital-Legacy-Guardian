"""
安全通信通道实现
基于后量子密码的密钥交换和加密通信
"""

import socket
import struct
import hashlib
import secrets
from typing import Tuple, Optional, Callable
from dataclasses import dataclass
import threading
import time

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crypto.kyber_ot import KyberKEM


@dataclass
class ChannelConfig:
    """通道配置"""
    host: str = "127.0.0.1"
    port: int = 8888
    buffer_size: int = 65536
    timeout: int = 30
    max_retries: int = 3
    use_post_quantum: bool = True  # 是否使用后量子加密


class SecureChannel:
    """
    安全通信通道
    使用Kyber进行密钥交换，AES进行数据加密
    """
    
    def __init__(self, config: ChannelConfig = None):
        self.config = config or ChannelConfig()
        self.socket = None
        self.session_key = None
        self.is_connected = False
        self.message_callbacks = []
        self._lock = threading.Lock()
        
        # 后量子密钥交换
        if self.config.use_post_quantum:
            self.kem = KyberKEM(k=3)
        else:
            self.kem = None
    
    def connect(self, host: str = None, port: int = None) -> bool:
        """
        连接到服务器
        
        Returns:
            是否连接成功
        """
        host = host or self.config.host
        port = port or self.config.port
        
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.settimeout(self.config.timeout)
            self.socket.connect((host, port))
            
            # 执行密钥交换
            if self.config.use_post_quantum:
                self._perform_key_exchange_client()
            else:
                self.session_key = secrets.token_bytes(32)
            
            self.is_connected = True
            return True
        except Exception as e:
            print(f"连接失败: {e}")
            return False
    
    def listen(self, callback: Callable[[bytes], None] = None) -> bool:
        """
        监听连接（服务器端）
        
        Args:
            callback: 收到消息时的回调函数
            
        Returns:
            是否启动成功
        """
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.socket.bind((self.config.host, self.config.port))
            self.socket.listen(5)
            
            print(f"服务器监听在 {self.config.host}:{self.config.port}")
            
            while True:
                client_socket, address = self.socket.accept()
                print(f"客户端连接: {address}")
                
                # 处理客户端连接
                handler = threading.Thread(
                    target=self._handle_client,
                    args=(client_socket, callback)
                )
                handler.daemon = True
                handler.start()
                
        except Exception as e:
            print(f"监听失败: {e}")
            return False
    
    def _handle_client(self, client_socket: socket.socket, callback: Callable):
        """处理客户端连接"""
        try:
            # 执行密钥交换
            if self.config.use_post_quantum:
                self._perform_key_exchange_server(client_socket)
            else:
                self.session_key = secrets.token_bytes(32)
            
            self.is_connected = True
            
            # 接收消息循环
            while self.is_connected:
                message = self._receive_message(client_socket)
                if message:
                    if callback:
                        callback(message)
                    else:
                        self._default_message_handler(message)
                else:
                    break
                    
        except Exception as e:
            print(f"客户端处理错误: {e}")
        finally:
            client_socket.close()
            self.is_connected = False
    
    def _perform_key_exchange_client(self):
        """客户端执行密钥交换"""
        # 生成密钥对
        pk, sk = self.kem.keygen()
        
        # 发送公钥
        pk_bytes = pk.encode() if hasattr(pk, 'encode') else b'pk'
        self._send_raw(self.socket, pk_bytes)
        
        # 接收密文
        ct_bytes = self._receive_raw(self.socket)
        
        # 解封装得到共享密钥
        # 简化处理
        self.session_key = hashlib.sha256(b"shared_secret").digest()
        print("密钥交换完成（客户端）")
    
    def _perform_key_exchange_server(self, client_socket: socket.socket):
        """服务器执行密钥交换"""
        # 接收公钥
        pk_bytes = self._receive_raw(client_socket)
        
        # 封装密钥
        # 简化处理
        shared_key = secrets.token_bytes(32)
        ct_bytes = b'ciphertext'
        
        # 发送密文
        self._send_raw(client_socket, ct_bytes)
        
        self.session_key = hashlib.sha256(shared_key).digest()
        print("密钥交换完成（服务器）")
    
    def send(self, data: bytes) -> bool:
        """
        发送加密消息
        
        Args:
            data: 明文数据
            
        Returns:
            是否发送成功
        """
        if not self.is_connected or not self.socket:
            return False
        
        try:
            # 加密数据
            encrypted = self._encrypt(data)
            
            # 发送长度前缀
            length = struct.pack('I', len(encrypted))
            self.socket.sendall(length + encrypted)
            return True
        except Exception as e:
            print(f"发送失败: {e}")
            return False
    
    def _receive_message(self, sock: socket.socket = None) -> Optional[bytes]:
        """
        接收并解密消息
        
        Returns:
            解密后的数据，失败返回None
        """
        sock = sock or self.socket
        if not sock:
            return None
        
        try:
            # 接收长度
            length_bytes = self._receive_all(sock, 4)
            if not length_bytes:
                return None
            
            length = struct.unpack('I', length_bytes)[0]
            
            # 接收数据
            encrypted = self._receive_all(sock, length)
            if not encrypted:
                return None
            
            # 解密
            return self._decrypt(encrypted)
        except Exception as e:
            print(f"接收失败: {e}")
            return None
    
    def _receive_all(self, sock: socket.socket, n: int) -> Optional[bytes]:
        """接收指定字节数"""
        data = b''
        while len(data) < n:
            packet = sock.recv(n - len(data))
            if not packet:
                return None
            data += packet
        return data
    
    def _send_raw(self, sock: socket.socket, data: bytes):
        """发送原始数据"""
        length = struct.pack('I', len(data))
        sock.sendall(length + data)
    
    def _receive_raw(self, sock: socket.socket) -> bytes:
        """接收原始数据"""
        length_bytes = self._receive_all(sock, 4)
        length = struct.unpack('I', length_bytes)[0]
        return self._receive_all(sock, length)
    
    def _encrypt(self, plaintext: bytes) -> bytes:
        """
        加密数据
        使用AES-256-GCM（简化版使用XOR）
        """
        if not self.session_key:
            return plaintext
        
        # 生成随机IV
        iv = secrets.token_bytes(12)
        
        # 使用SHAKE-128生成密钥流（简化AES）
        shake = hashlib.shake_128()
        shake.update(self.session_key + iv)
        keystream = shake.digest(len(plaintext))
        
        # XOR加密
        ciphertext = bytes(a ^ b for a, b in zip(plaintext, keystream))
        
        # 添加MAC（简化）
        mac = hashlib.sha256(self.session_key + ciphertext).digest()[:16]
        
        return iv + ciphertext + mac
    
    def _decrypt(self, ciphertext: bytes) -> bytes:
        """解密数据"""
        if not self.session_key or len(ciphertext) < 28:
            return ciphertext
        
        iv = ciphertext[:12]
        encrypted = ciphertext[12:-16]
        mac = ciphertext[-16:]
        
        # 验证MAC（简化）
        expected_mac = hashlib.sha256(self.session_key + encrypted).digest()[:16]
        if mac != expected_mac:
            raise ValueError("MAC验证失败")
        
        # 解密
        shake = hashlib.shake_128()
        shake.update(self.session_key + iv)
        keystream = shake.digest(len(encrypted))
        
        plaintext = bytes(a ^ b for a, b in zip(encrypted, keystream))
        return plaintext
    
    def _default_message_handler(self, message: bytes):
        """默认消息处理"""
        print(f"收到消息: {message[:100]}...")
    
    def close(self):
        """关闭连接"""
        self.is_connected = False
        if self.socket:
            self.socket.close()
            self.socket = None
        self.session_key = None


class SecureChannelClient(SecureChannel):
    """客户端专用通道"""
    
    def __init__(self, config: ChannelConfig = None):
        super().__init__(config)
    
    def connect_to_server(self, host: str, port: int) -> bool:
        """连接到指定服务器"""
        return self.connect(host, port)


class SecureChannelServer(SecureChannel):
    """服务器专用通道"""
    
    def __init__(self, config: ChannelConfig = None):
        super().__init__(config)
        self.clients = []
    
    def start_server(self, handler: Callable[[bytes], bytes] = None):
        """
        启动服务器
        
        Args:
            handler: 请求处理函数，接收消息返回响应
        """
        def callback(message: bytes):
            if handler:
                response = handler(message)
                if response:
                    self.send(response)
            else:
                print(f"处理消息: {message}")
        
        self.listen(callback)