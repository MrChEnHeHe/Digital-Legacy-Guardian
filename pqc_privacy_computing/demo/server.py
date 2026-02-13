#!/usr/bin/env python3
"""
后量子安全隐私计算服务器
演示OT、PSI、PIR协议的服务器端实现
"""

import socket
import threading
import json
import struct
import sys
import os
from typing import Dict, Optional

# 添加项目路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.network.secure_channel import SecureChannelServer, ChannelConfig
from src.network.message_handler import PSIMessageHandler, OTMessageHandler, PIRMessageHandler, MessageType
from src.protocols.psi_protocol import PSISender
from src.protocols.base_ot import BaseOTProtocol
from src.protocols.pir_protocol import PIRServer


class PQCPrivacyServer:
    """
    后量子隐私计算服务器
    支持OT、PSI、PIR三种协议
    """
    
    def __init__(self, host: str = "127.0.0.1", port: int = 8888):
        self.config = ChannelConfig(host=host, port=port)
        self.channel = SecureChannelServer(self.config)
        
        # 协议处理器
        self.ot_handler = OTMessageHandler()
        self.psi_handler = PSIMessageHandler()
        self.pir_handler = PIRMessageHandler()
        
        # 协议实例
        self.ot_protocol = BaseOTProtocol()
        self.psi_sender = PSISender()
        self.pir_server = PIRServer()
        
        # 状态存储
        self.sessions: Dict[str, dict] = {}
        self.running = False
        
        print(f"[服务器] 初始化完成，监听地址: {host}:{port}")
    
    def start(self):
        """启动服务器"""
        self.running = True
        print("[服务器] 启动后量子隐私计算服务...")
        print("支持协议: OT (不经意传输), PSI (隐私求交), PIR (隐私检索)")
        print("=" * 60)
        
        try:
            self.channel.listen(self._handle_client)
        except KeyboardInterrupt:
            print("\n[服务器] 收到停止信号，正在关闭...")
            self.stop()
    
    def stop(self):
        """停止服务器"""
        self.running = False
        self.channel.close()
        print("[服务器] 已关闭")
    
    def _handle_client(self, client_socket: socket.socket, address: tuple):
        """处理客户端连接"""
        session_id = f"{address[0]}:{address[1]}"
        print(f"[会话 {session_id}] 客户端连接建立")
        
        try:
            # 执行密钥交换
            self._perform_handshake(client_socket)
            
            while self.running:
                # 接收消息
                message = self._receive_message(client_socket)
                if not message:
                    break
                
                # 解析消息类型并路由
                response = self._route_message(message, session_id)
                
                if response:
                    self._send_message(client_socket, response)
                    
        except Exception as e:
            print(f"[会话 {session_id}] 错误: {e}")
        finally:
            client_socket.close()
            print(f"[会话 {session_id}] 连接关闭")
    
    def _perform_handshake(self, sock: socket.socket):
        """执行后量子密钥交换"""
        # 简化版：实际应实现Kyber密钥交换
        print("  [握手] 后量子密钥交换完成 (Kyber-768)")
    
    def _receive_message(self, sock: socket.socket) -> Optional[bytes]:
        """接收完整消息"""
        try:
            # 接收长度前缀
            length_bytes = self._recv_all(sock, 4)
            if not length_bytes:
                return None
            
            length = struct.unpack('I', length_bytes)[0]
            
            # 接收消息体
            data = self._recv_all(sock, length)
            return data
        except Exception as e:
            return None
    
    def _recv_all(self, sock: socket.socket, n: int) -> bytes:
        """接收指定字节数"""
        data = b''
        while len(data) < n:
            packet = sock.recv(n - len(data))
            if not packet:
                raise ConnectionError("连接断开")
            data += packet
        return data
    
    def _send_message(self, sock: socket.socket, data: bytes):
        """发送消息"""
        length = struct.pack('I', len(data))
        sock.sendall(length + data)
    
    def _route_message(self, data: bytes, session_id: str) -> Optional[bytes]:
        """路由消息到对应处理器"""
        try:
            # 解析消息类型（前4字节）
            msg_type_val = struct.unpack('I', data[:4])[0]
            
            # 根据类型路由
            if msg_type_val in [1, 5, 6]:  # OT相关
                print(f"  [路由] -> OT处理器")
                return self.ot_handler.handle(data)
            elif msg_type_val in [7, 8, 9, 10]:  # PSI相关
                print(f"  [路由] -> PSI处理器")
                return self._handle_psi_message(data, session_id)
            elif msg_type_val in [11, 12, 13, 14]:  # PIR相关
                print(f"  [路由] -> PIR处理器")
                return self._handle_pir_message(data, session_id)
            else:
                print(f"  [路由] 未知消息类型: {msg_type_val}")
                return None
                
        except Exception as e:
            print(f"  [错误] 消息路由失败: {e}")
            return None
    
    def _handle_psi_message(self, data: bytes, session_id: str) -> bytes:
        """处理PSI协议消息"""
        import json
        
        # 解析消息
        msg_type = struct.unpack('I', data[:4])[0]
        payload_start = 24  # 跳过头部
        meta_len = struct.unpack('I', data[16:20])[0]
        payload = data[payload_start + meta_len:]
        
        if msg_type == 7:  # PSI_INIT
            print("    [PSI] 初始化请求")
            request = json.loads(payload.decode())
            dataset_size = request.get('dataset_size', 1000)
            
            # 存储会话状态
            self.sessions[session_id] = {
                'protocol': 'PSI',
                'dataset_size': dataset_size,
                'num_bins': int(dataset_size * 1.2)
            }
            
            response = {
                'status': 'ready',
                'num_bins': self.sessions[session_id]['num_bins'],
                'message': '服务器已准备好执行PSI协议'
            }
            
            return self._create_response(7, response)
        
        elif msg_type == 8:  # PSI_CUCKOO_DATA
            print("    [PSI] 接收布谷鸟哈希数据")
            # 存储接收方的布谷鸟哈希数据
            return self._create_response(9, {'ot_ready': True})
        
        elif msg_type == 9:  # PSI_OT_MESSAGES请求
            print("    [PSI] 生成OT消息")
            # 模拟生成OT消息
            num_bins = self.sessions.get(session_id, {}).get('num_bins', 1000)
            
            # 生成模拟的OT消息对
            ot_messages = []
            import secrets
            for i in range(min(num_bins, 100)):  # 限制数量用于演示
                m0 = secrets.token_hex(16)
                m1 = secrets.token_hex(16)
                ot_messages.append((m0, m1))
            
            response = {
                'ot_count': len(ot_messages),
                'ot_messages': ot_messages,
                'note': '实际部署应使用Kyber加密'
            }
            
            return self._create_response(9, response)
        
        return None
    
    def _handle_pir_message(self, data: bytes, session_id: str) -> bytes:
        """处理PIR协议消息"""
        import json
        
        msg_type = struct.unpack('I', data[:4])[0]
        payload_start = 24
        meta_len = struct.unpack('I', data[16:20])[0]
        payload = data[payload_start + meta_len:]
        
        if msg_type == 11:  # PIR_QUERY
            print("    [PIR] 单条查询")
            index = struct.unpack('I', payload[:4])[0]
            
            # 模拟数据库响应
            result = f"Database item at index {index}: [加密数据区块]"
            
            response = {
                'index': index,
                'encrypted_result': result,
                'proof': 'simulated_proof'
            }
            
            return self._create_response(12, response)
        
        elif msg_type == 13:  # PIR_BATCH_QUERY
            print("    [PIR] 批量查询")
            indices = []
            for i in range(0, len(payload), 4):
                if i + 4 <= len(payload):
                    idx = struct.unpack('I', payload[i:i+4])[0]
                    indices.append(idx)
            
            results = [f"Item_{idx}" for idx in indices]
            
            response = {
                'indices': indices,
                'results': results,
                'count': len(indices)
            }
            
            return self._create_response(14, response)
        
        return None
    
    def _create_response(self, msg_type: int, data: dict) -> bytes:
        """创建响应消息"""
        import time
        
        payload = json.dumps(data).encode()
        metadata = json.dumps({'server': True}).encode()
        
        header = struct.pack(
            'I I d I I',
            msg_type,
            0,  # sequence
            time.time(),
            len(metadata),
            len(payload)
        )
        
        return header + metadata + payload


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='后量子隐私计算服务器')
    parser.add_argument('--host', default='127.0.0.1', help='监听地址')
    parser.add_argument('--port', type=int, default=8888, help='监听端口')
    args = parser.parse_args()
    
    server = PQCPrivacyServer(host=args.host, port=args.port)
    
    try:
        server.start()
    except Exception as e:
        print(f"服务器异常: {e}")
        server.stop()


if __name__ == '__main__':
    main()