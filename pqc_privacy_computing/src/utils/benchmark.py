"""
性能基准测试模块
测量密码学操作和协议执行的性能指标
"""

import time
import tracemalloc
import statistics
from typing import List, Dict, Callable, Any
from dataclasses import dataclass
import json


@dataclass
class BenchmarkResult:
    """基准测试结果"""
    operation: str
    iterations: int
    total_time_ms: float
    avg_time_ms: float
    min_time_ms: float
    max_time_ms: float
    memory_peak_mb: float
    throughput_ops_per_sec: float
    
    def to_dict(self) -> Dict:
        return {
            'operation': self.operation,
            'iterations': self.iterations,
            'total_time_ms': round(self.total_time_ms, 2),
            'avg_time_ms': round(self.avg_time_ms, 4),
            'min_time_ms': round(self.min_time_ms, 4),
            'max_time_ms': round(self.max_time_ms, 4),
            'memory_peak_mb': round(self.memory_peak_mb, 2),
            'throughput_ops_per_sec': round(self.throughput_ops_per_sec, 2)
        }


class PerformanceBenchmark:
    """性能基准测试器"""
    
    def __init__(self):
        self.results: List[BenchmarkResult] = []
    
    def measure(self, operation_name: str, func: Callable, *args, 
                iterations: int = 100, warmup: int = 10) -> BenchmarkResult:
        """
        测量函数执行性能
        
        Args:
            operation_name: 操作名称
            func: 待测函数
            args: 函数参数
            iterations: 迭代次数
            warmup: 预热次数
            
        Returns:
            BenchmarkResult
        """
        # 预热
        for _ in range(warmup):
            func(*args)
        
        # 开始内存追踪
        tracemalloc.start()
        
        # 测量执行时间
        times = []
        for _ in range(iterations):
            start = time.perf_counter()
            result = func(*args)
            end = time.perf_counter()
            times.append((end - start) * 1000)  # 转换为毫秒
        
        # 获取内存峰值
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        # 计算统计量
        total_time = sum(times)
        avg_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
        throughput = iterations / (total_time / 1000)  # 每秒操作数
        
        result = BenchmarkResult(
            operation=operation_name,
            iterations=iterations,
            total_time_ms=total_time,
            avg_time_ms=avg_time,
            min_time_ms=min_time,
            max_time_ms=max_time,
            memory_peak_mb=peak / 1024 / 1024,
            throughput_ops_per_sec=throughput
        )
        
        self.results.append(result)
        return result
    
    def compare(self, baseline: str, optimized: str) -> Dict:
        """对比两个操作的性能"""
        baseline_result = next((r for r in self.results if r.operation == baseline), None)
        optimized_result = next((r for r in self.results if r.operation == optimized), None)
        
        if not baseline_result or not optimized_result:
            return {'error': '找不到对比项'}
        
        speedup = baseline_result.avg_time_ms / optimized_result.avg_time_ms
        
        return {
            'baseline': baseline,
            'optimized': optimized,
            'speedup': round(speedup, 2),
            'improvement': f"{(speedup-1)*100:.1f}%",
            'baseline_time_ms': round(baseline_result.avg_time_ms, 4),
            'optimized_time_ms': round(optimized_result.avg_time_ms, 4)
        }
    
    def report(self) -> str:
        """生成测试报告"""
        lines = ["性能基准测试报告", "=" * 60]
        
        for result in self.results:
            lines.extend([
                f"\n操作: {result.operation}",
                f"  迭代次数: {result.iterations}",
                f"  总时间: {result.total_time_ms:.2f} ms",
                f"  平均时间: {result.avg_time_ms:.4f} ms",
                f"  最小/最大: {result.min_time_ms:.4f} / {result.max_time_ms:.4f} ms",
                f"  内存峰值: {result.memory_peak_mb:.2f} MB",
                f"  吞吐量: {result.throughput_ops_per_sec:.2f} ops/sec"
            ])
        
        return "\n".join(lines)
    
    def export_json(self, filename: str):
        """导出结果为JSON"""
        data = [r.to_dict() for r in self.results]
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)


class CryptoBenchmark(PerformanceBenchmark):
    """密码学操作专用基准测试"""
    
    def benchmark_kyber(self):
        """测试Kyber性能"""
        from src.crypto.kyber_ot import KyberKEM
        
        kem = KyberKEM(k=3)
        
        # 测试密钥生成
        print("测试Kyber密钥生成...")
        result_keygen = self.measure(
            'Kyber KeyGen',
            kem.keygen,
            iterations=100
        )
        
        # 准备密钥对用于封装测试
        pk, sk = kem.keygen()
        
        # 测试封装
        print("测试Kyber封装...")
        result_encaps = self.measure(
            'Kyber Encapsulate',
            kem.encapsulate,
            pk,
            iterations=100
        )
        
        # 测试解封装
        _, ct = kem.encapsulate(pk)
        print("测试Kyber解封装...")
        result_decaps = self.measure(
            'Kyber Decapsulate',
            kem.decapsulate,
            ct, sk,
            iterations=100
        )
        
        return {
            'keygen': result_keygen.to_dict(),
            'encaps': result_encaps.to_dict(),
            'decaps': result_decaps.to_dict()
        }
    
    def benchmark_ot(self):
        """测试OT性能"""
        from src.protocols.base_ot import BaseOTProtocol
        
        ot = BaseOTProtocol()
        m0, m1 = b'message0', b'message1'
        
        # 测试OT执行（端到端）
        def ot_full_cycle():
            pubkeys, state = ot.execute_receiver(0)
            encrypted = ot.execute_sender((m0, m1), pubkeys)
            result = ot.receiver_decrypt(0, encrypted, state)
            return result
        
        print("测试OT完整周期...")
        result = self.measure(
            'OT Full Cycle',
            ot_full_cycle,
            iterations=50
        )
        
        return result.to_dict()
    
    def benchmark_psi(self, sizes=[100, 1000, 10000]):
        """测试PSI性能"""
        from src.protocols.psi_protocol import CuckooHashPSI
        import secrets
        
        results = {}
        
        for size in sizes:
            print(f"测试PSI (数据集大小: {size})...")
            
            # 生成测试数据
            set_x = set(secrets.token_bytes(32) for _ in range(size))
            set_y = set(secrets.token_bytes(32) for _ in range(size))
            # 添加一些交集
            intersection = set(list(set_x)[:size//10])
            set_y.update(intersection)
            
            psi = CuckooHashPSI()
            
            def psi_run():
                return psi.run(set_x, set_y)
            
            result = self.measure(
                f'PSI-{size}',
                psi_run,
                iterations=5 if size >= 1000 else 20
            )
            
            results[f'psi_{size}'] = result.to_dict()
        
        return results


def run_full_benchmark():
    """运行完整基准测试"""
    print("启动密码学性能基准测试...")
    print("=" * 60)
    
    benchmark = CryptoBenchmark()
    
    # 测试Kyber
    print("\n[1/3] Kyber后量子密码测试")
    kyber_results = benchmark.benchmark_kyber()
    
    # 测试OT
    print("\n[2/3] 不经意传输测试")
    ot_results = benchmark.benchmark_ot()
    
    # 测试PSI
    print("\n[3/3] 隐私求交测试")
    psi_results = benchmark.benchmark_psi(sizes=[100, 1000])
    
    # 生成报告
    print("\n" + "=" * 60)
    print(benchmark.report())
    
    # 导出结果
    benchmark.export_json('benchmark_results.json')
    print("\n结果已导出到 benchmark_results.json")
    
    return {
        'kyber': kyber_results,
        'ot': ot_results,
        'psi': psi_results
    }


if __name__ == '__main__':
    run_full_benchmark()