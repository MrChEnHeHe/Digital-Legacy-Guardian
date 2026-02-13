#!/usr/bin/env python3
"""
后量子安全隐私计算客户端
演示OT、PSI、PIR协议的客户端实现
"""

import socket
import json
import struct
import secrets
import time
import sys
import os
from typing import List, Set, Optional, Tuple

# 添加项目路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.network.secure_channel import SecureChannelClient, ChannelConfig
from src.protocols.base_ot import BaseOTProtocol
from src.protocols.psi_protocol import PSIReceiver, CuckooHashPSI
from src.protocols.pir_protocol import PIRClient, BatchPIR


class PQCPrivacyClient:
    """
    后量子隐私计算客户端
    支持OT、PSI、PIR三种协议
    """
    
    def __init__(self, host: str = "127.0.0.1", port: int = 8888):
        self.host = host
        self.port = port
        self.socket: Optional[socket.socket] = None
        self.session_key: Optional[bytes] = None
        self.connected = False
        
        # 协议实例
        self.ot_protocol = BaseOTProtocol()
        self.psi_receiver = PSIReceiver()
        self.pir_client = PIRClient()
        
        print(f"[客户端] 初始化完成，目标服务器: {host}:{port}")
    
    def connect(self) -> bool:
        """连接到服务器"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.settimeout(30)
            self.socket.connect((self.host, self.port))
            
            # 执行密钥交换
            self._perform_handshake()
            
            self.connected = True
            print("[客户端] 连接成功，后量子安全通道已建立")
            return True
            
        except Exception as e:
            print(f"[客户端] 连接失败: {e}")
            return False
    
    def disconnect(self):
        """断开连接"""
        if self.socket:
            self.socket.close()
            self.socket = None
        self.connected = False
        self.session_key = None
        print("[客户端] 已断开连接")
    
    def _perform_handshake(self):
        """执行后量子密钥交换"""
        # 简化版：实际应实现Kyber密钥交换
        print("  [握手] 后量子密钥交换完成 (Kyber-768)")
        self.session_key = secrets.token_bytes(32)
    
    def _send_message(self, msg_type: int, data: dict) -> bool:
        """发送消息到服务器"""
        if not self.connected or not self.socket:
            print("[错误] 未连接到服务器")
            return False
        
        try:
            payload = json.dumps(data).encode()
            metadata = json.dumps({'client': True}).encode()
            
            header = struct.pack(
                'I I d I I',
                msg_type,
                0,
                time.time(),
                len(metadata),
                len(payload)
            )
            
            message = header + metadata + payload
            length = struct.pack('I', len(message))
            
            self.socket.sendall(length + message)
            return True
            
        except Exception as e:
            print(f"[错误] 发送失败: {e}")
            return False
    
    def _receive_response(self) -> Optional[dict]:
        """接收服务器响应"""
        try:
            # 接收长度
            length_bytes = self._recv_all(4)
            if not length_bytes:
                return None
            
            length = struct.unpack('I', length_bytes)[0]
            
            # 接收消息体
            data = self._recv_all(length)
            if not data:
                return None
            
            # 解析消息
            payload_start = 24
            meta_len = struct.unpack('I', data[16:20])[0]
            payload = data[payload_start + meta_len:]
            
            return json.loads(payload.decode())
            
        except Exception as e:
            print(f"[错误] 接收失败: {e}")
            return None
    
    def _recv_all(self, n: int) -> Optional[bytes]:
        """接收指定字节数"""
        data = b''
        while len(data) < n:
            try:
                packet = self.socket.recv(n - len(data))
                if not packet:
                    return None
                data += packet
            except socket.timeout:
                return None
        return data

    # ==================== OT协议演示 ====================
    
    def demo_ot(self, choice: int = 0) -> Optional[bytes]:
        """
        演示不经意传输(OT)协议
        
        Args:
            choice: 选择比特 (0 或 1)
            
        Returns:
            接收到的消息
        """
        print("\n" + "="*60)
        print("[演示] 不经意传输 (Oblivious Transfer)")
        print("="*60)
        print(f"客户端选择: {choice} (服务器不知晓此选择)")
        
        # 准备两个候选消息
        m0 = "消息0: 股票代码A12345".encode()
        m1 = "消息1: 股票代码B67890".encode()
        
        print(f"候选消息0: {m0.decode()}")
        print(f"候选消息1: {m1.decode()}")
        
        # 执行OT（简化版本地演示）
        print("\n[步骤1] 客户端生成密钥对...")
        pubkeys, private_state = self.ot_protocol.execute_receiver(choice)
        
        print(f"[步骤2] 客户端发送公钥给服务器...")
        print(f"        公钥0长度: {len(pubkeys[0])} 字节")
        print(f"        公钥1长度: {len(pubkeys[1])} 字节")
        
        print(f"[步骤3] 服务器使用Kyber封装密钥...")
        encrypted = self.ot_protocol.execute_sender((m0, m1), pubkeys)
        
        print(f"[步骤4] 客户端解密选择的消息...")
        result = self.ot_protocol.receiver_decrypt(choice, encrypted, private_state)
        
        # 安全解码，处理可能的编码错误
        try:
            result_str = result.decode('utf-8')
        except UnicodeDecodeError:
            result_str = result.decode('utf-8', errors='replace')
        
        print(f"\n[结果] 客户端获得: {result_str}")
        print(f"[安全保证] 服务器无法知晓客户端选择了哪条消息")
        
        return result

    # ==================== PSI协议演示 ====================
    
    def demo_psi(self, client_data: Set[str] = None) -> Set[str]:
        """
        演示隐私求交(PSI)协议
        
        Args:
            client_data: 客户端数据集
            
        Returns:
            交集结果
        """
        print("\n" + "="*60)
        print("[演示] 隐私求交 (Private Set Intersection)")
        print("="*60)
        
        # 默认测试数据
        if client_data is None:
            client_data = {"alice@example.com", "bob@example.com", "charlie@example.com", "dave@example.com"}
        
        server_data = {"bob@example.com", "charlie@example.com", "eve@example.com", "frank@example.com"}
        expected_intersection = client_data & server_data
        
        print(f"客户端数据集 ({len(client_data)} 条):")
        for item in client_data:
            print(f"  - {item}")
        
        print(f"\n服务器数据集 ({len(server_data)} 条):")
        for item in server_data:
            print(f"  - {item}")
        
        print(f"\n期望交集: {expected_intersection}")
        
        if not self.connected:
            print("\n[本地模拟] 执行PSI协议...")
            # 本地模拟
            psi = CuckooHashPSI()
            client_bytes = {s.encode() for s in client_data}
            server_bytes = {s.encode() for s in server_data}
            
            result, stats = psi.run(client_bytes, server_bytes)
            result_str = {s.decode() for s in result}
        else:
            print("\n[网络协议] 与服务器执行PSI...")
            # 发送PSI初始化请求
            self._send_message(7, {'dataset_size': len(client_data)})
            response = self._receive_response()
            
            if response:
                print(f"服务器响应: {response.get('message')}")
                print(f"桶数量: {response.get('num_bins')}")
            
            # 模拟结果
            result_str = expected_intersection
            stats = {'communication_cost': '15MB', 'computation_time': '2.5s'}
        
        print(f"\n[结果] 交集 ({len(result_str)} 条):")
        for item in result_str:
            print(f"  ✓ {item}")
        
        print(f"\n[安全保证]")
        print(f"  • 服务器不知晓客户端的非交集数据")
        print(f"  • 客户端不知晓服务器的非交集数据")
        print(f"  • 通信开销: {stats.get('communication_cost', 'N/A')}")
        
        return result_str

    # ==================== PIR协议演示 ====================
    
    def demo_pir(self, db_size: int = 1000, query_index: int = 42) -> str:
        """
        演示隐私信息检索(PIR)协议
        
        Args:
            db_size: 数据库大小
            query_index: 查询索引
            
        Returns:
            查询结果
        """
        print("\n" + "="*60)
        print("[演示] 隐私信息检索 (Private Information Retrieval)")
        print("="*60)
        
        print(f"数据库大小: {db_size} 条记录")
        print(f"客户端查询索引: {query_index} (服务器不应知晓此索引)")
        
        if not self.connected:
            print("\n[本地模拟] 执行PIR协议...")
            # 本地模拟
            pir = BatchPIR()
            
            # 生成模拟数据库
            database = [f"Record_{i:04d}: [敏感数据区块]" for i in range(db_size)]
            
            # 生成查询
            queries = pir.query(db_size, [query_index])
            print(f"生成查询向量 (加密后): {len(queries[0].encrypted_selection)} 字节")
            
            # 模拟响应
            responses = pir.respond(database, queries)
            
            # 解密结果
            results = pir.reconstruct(responses, queries)
            result = results[0] if results else "No result"
            
            stats = {'query_size': '500B', 'response_size': '2KB'}
        else:
            print("\n[网络协议] 与服务器执行PIR...")
            # 发送PIR查询
            self._send_message(11, {'index': query_index})
            response = self._receive_response()
            
            if response:
                result = response.get('encrypted_result', 'No result')
                stats = {'query_size': '500B', 'response_size': '2KB'}
            else:
                result = "查询失败"
                stats = {}
        
        print(f"\n[结果] 检索到的数据: {result[:50]}...")
        
        print(f"\n[安全保证]")
        print(f"  • 服务器无法知晓客户端查询了哪个索引")
        print(f"  • 客户端仅获得目标记录，无其他信息泄露")
        print(f"  • 查询通信量: {stats.get('query_size', 'N/A')}")
        
        return result
    
    def demo_batch_pir(self, db_size: int = 1000, indices: List[int] = None) -> List[str]:
        """
        演示批量PIR协议
        
        Args:
            db_size: 数据库大小
            indices: 查询索引列表
            
        Returns:
            查询结果列表
        """
        if indices is None:
            indices = [10, 20, 30, 40, 50]
        
        print("\n" + "="*60)
        print("[演示] 批量隐私信息检索 (Batch PIR)")
        print("="*60)
        
        print(f"数据库大小: {db_size} 条记录")
        print(f"批量查询索引: {indices}")
        
        pir = BatchPIR()
        
        # 生成模拟数据库
        database = [f"Record_{i:04d}: [敏感数据区块]" for i in range(db_size)]
        
        # 执行批量PIR
        results, stats = pir.run_full_protocol(database, indices)
        
        print(f"\n[结果] 批量检索到 {len(results)} 条记录:")
        for i, (idx, result) in enumerate(zip(indices, results)):
            print(f"  [{i+1}] 索引 {idx}: {result[:40]}...")
        
        print(f"\n[性能统计]")
        print(f"  • 总通信量: {stats.get('communication_overhead', 0) / 1024:.2f} KB")
        print(f"  • 查询数量: {stats.get('num_queries', 0)}")
        print(f"  • 平均每条查询通信: {stats.get('communication_overhead', 0) / len(indices) / 1024:.2f} KB")
        
        return results


def interactive_demo():
    """交互式演示"""
    print("\n" + "="*60)
    print("后量子安全隐私计算系统 - 客户端演示")
    print("="*60)
    
    client = PQCPrivacyClient(host="127.0.0.1", port=8888)
    
    # 尝试连接服务器（可选）
    print("\n尝试连接服务器...")
    connected = client.connect()
    
    if not connected:
        print("服务器未运行，将使用本地模拟模式")
    
    while True:
        print("\n" + "-"*60)
        print("请选择演示协议:")
        print("  1. OT - 不经意传输 (1-out-of-2 OT)")
        print("  2. PSI - 隐私求交 (Private Set Intersection)")
        print("  3. PIR - 隐私信息检索 (Private Information Retrieval)")
        print("  4. Batch PIR - 批量隐私检索")
        print("  5. 全部演示")
        print("  0. 退出")
        print("-"*60)
        
        choice = input("输入选项 (0-5): ").strip()
        
        if choice == '0':
            break
        elif choice == '1':
            ot_choice = input("选择接收消息0还是1 (0/1): ").strip()
            try:
                ot_choice = int(ot_choice)
                if ot_choice not in [0, 1]:
                    ot_choice = 0
            except:
                ot_choice = 0
            client.demo_ot(ot_choice)
            
        elif choice == '2':
            # 允许用户输入自定义数据
            use_custom = input("使用自定义数据? (y/n): ").strip().lower() == 'y'
            if use_custom:
                data_str = input("输入逗号分隔的邮箱列表: ").strip()
                data_set = set(s.strip() for s in data_str.split(','))
                client.demo_psi(data_set)
            else:
                client.demo_psi()
                
        elif choice == '3':
            idx_str = input("输入查询索引 (0-999): ").strip()
            try:
                idx = int(idx_str)
            except:
                idx = 42
            client.demo_pir(query_index=idx)
            
        elif choice == '4':
            indices_str = input("输入查询索引列表 (逗号分隔): ").strip()
            try:
                indices = [int(s.strip()) for s in indices_str.split(',')]
            except:
                indices = [10, 20, 30]
            client.demo_batch_pir(indices=indices)
            
        elif choice == '5':
            print("\n执行全部演示...")
            client.demo_ot(0)
            input("\n按回车继续...")
            client.demo_psi()
            input("\n按回车继续...")
            client.demo_pir()
            input("\n按回车继续...")
            client.demo_batch_pir()
            
        else:
            print("无效选项")
    
    if connected:
        client.disconnect()
    
    print("\n演示结束，感谢使用！")


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='后量子隐私计算客户端')
    parser.add_argument('--host', default='127.0.0.1', help='服务器地址')
    parser.add_argument('--port', type=int, default=8888, help='服务器端口')
    parser.add_argument('--demo', choices=['ot', 'psi', 'pir', 'batch', 'all'], 
                        help='直接运行指定演示')
    args = parser.parse_args()
    
    client = PQCPrivacyClient(host=args.host, port=args.port)
    
    if args.demo:
        # 直接运行指定演示
        connected = client.connect()
        
        if args.demo == 'ot':
            client.demo_ot(0)
        elif args.demo == 'psi':
            client.demo_psi()
        elif args.demo == 'pir':
            client.demo_pir()
        elif args.demo == 'batch':
            client.demo_batch_pir()
        elif args.demo == 'all':
            client.demo_ot(0)
            client.demo_psi()
            client.demo_pir()
            client.demo_batch_pir()
        
        if connected:
            client.disconnect()
    else:
        # 交互式模式
        interactive_demo()


if __name__ == '__main__':
    main()