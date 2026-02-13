"""
噪声预算管理模块
用于同态加密和隐私计算中的噪声控制
"""

import numpy as np
from dataclasses import dataclass
from typing import List, Tuple
from enum import Enum


class NoiseLevel(Enum):
    """噪声等级"""
    LOW = "low"           # < 20% 预算
    MEDIUM = "medium"     # 20-60% 预算
    HIGH = "high"         # 60-90% 预算
    CRITICAL = "critical" # > 90% 预算


@dataclass
class NoiseBudget:
    """噪声预算记录"""
    current: float          # 当前噪声水平
    max_budget: float       # 最大预算
    operation_count: int    # 操作计数
    last_refresh: int       # 上次刷新时的操作数
    
    @property
    def remaining(self) -> float:
        """剩余预算"""
        return max(0, self.max_budget - self.current)
    
    @property
    def ratio(self) -> float:
        """噪声比例"""
        return self.current / self.max_budget if self.max_budget > 0 else 0
    
    @property
    def level(self) -> NoiseLevel:
        """噪声等级"""
        r = self.ratio
        if r < 0.2:
            return NoiseLevel.LOW
        elif r < 0.6:
            return NoiseLevel.MEDIUM
        elif r < 0.9:
            return NoiseLevel.HIGH
        else:
            return NoiseLevel.CRITICAL


class NoiseManager:
    """
    噪声管理器
    跟踪和控制同态运算中的噪声增长
    """
    
    def __init__(self, max_budget: float = 100.0, refresh_threshold: float = 0.8):
        self.max_budget = max_budget
        self.refresh_threshold = refresh_threshold
        self.budgets = {}  # 密文ID -> NoiseBudget
        self.operation_log = []
    
    def register_ciphertext(self, ct_id: str, initial_noise: float = 0.0) -> NoiseBudget:
        """注册新密文"""
        budget = NoiseBudget(
            current=initial_noise,
            max_budget=self.max_budget,
            operation_count=0,
            last_refresh=0
        )
        self.budgets[ct_id] = budget
        return budget
    
    def estimate_add_noise(self, ct1_id: str, ct2_id: str) -> float:
        """
        估计加法操作的噪声增长
        加法噪声增长：n_new = n1 + n2 + epsilon
        """
        b1 = self.budgets.get(ct1_id, NoiseBudget(0, self.max_budget, 0, 0))
        b2 = self.budgets.get(ct2_id, NoiseBudget(0, self.max_budget, 0, 0))
        
        # 加法噪声是线性增长
        epsilon = 1.0  # 小常数噪声
        return b1.current + b2.current + epsilon
    
    def estimate_mul_noise(self, ct1_id: str, ct2_id: str) -> float:
        """
        估计乘法操作的噪声增长
        乘法噪声增长：n_new = n1 * n2 + n1 + n2 + epsilon
        """
        b1 = self.budgets.get(ct1_id, NoiseBudget(0, self.max_budget, 0, 0))
        b2 = self.budgets.get(ct2_id, NoiseBudget(0, self.max_budget, 0, 0))
        
        # 乘法噪声是指数增长
        epsilon = 2.0
        return b1.current * b2.current + b1.current + b2.current + epsilon
    
    def record_operation(self, op_type: str, ct_ids: List[str], result_id: str) -> NoiseBudget:
        """
        记录操作并更新噪声预算
        
        Args:
            op_type: "add", "mul", "refresh"
            ct_ids: 输入密文ID列表
            result_id: 输出密文ID
            
        Returns:
            更新后的噪声预算
        """
        if op_type == "add":
            new_noise = self.estimate_add_noise(ct_ids[0], ct_ids[1])
        elif op_type == "mul":
            new_noise = self.estimate_mul_noise(ct_ids[0], ct_ids[1])
        elif op_type == "refresh":
            new_noise = 0.0  # 刷新后噪声重置
        else:
            new_noise = self.budgets.get(ct_ids[0], NoiseBudget(0, 0, 0, 0)).current
        
        # 创建新的预算记录
        old_budget = self.budgets.get(ct_ids[0], NoiseBudget(0, 0, 0, 0))
        new_budget = NoiseBudget(
            current=min(new_noise, self.max_budget),
            max_budget=self.max_budget,
            operation_count=old_budget.operation_count + 1,
            last_refresh=old_budget.last_refresh if op_type != "refresh" else old_budget.operation_count + 1
        )
        
        self.budgets[result_id] = new_budget
        self.operation_log.append({
            "op": op_type,
            "inputs": ct_ids,
            "output": result_id,
            "noise": new_noise
        })
        
        return new_budget
    
    def check_refresh_needed(self, ct_id: str) -> bool:
        """检查是否需要刷新噪声"""
        budget = self.budgets.get(ct_id)
        if not budget:
            return False
        return budget.ratio > self.refresh_threshold
    
    def get_statistics(self) -> dict:
        """获取噪声统计信息"""
        if not self.budgets:
            return {}
        
        ratios = [b.ratio for b in self.budgets.values()]
        return {
            "total_ciphertexts": len(self.budgets),
            "avg_noise_ratio": np.mean(ratios),
            "max_noise_ratio": max(ratios),
            "critical_count": sum(1 for r in ratios if r > 0.9),
            "total_operations": len(self.operation_log)
        }
    
    def suggest_optimization(self, ct_id: str) -> List[str]:
        """提供优化建议"""
        budget = self.budgets.get(ct_id)
        if not budget:
            return []
        
        suggestions = []
        if budget.level == NoiseLevel.CRITICAL:
            suggestions.append("立即执行噪声刷新（Bootstrapping）")
            suggestions.append("考虑使用模数切换降低噪声")
        elif budget.level == NoiseLevel.HIGH:
            suggestions.append("规划噪声刷新操作")
            suggestions.append("减少连续乘法操作，使用批处理")
        elif budget.level == NoiseLevel.MEDIUM:
            suggestions.append("监控噪声增长趋势")
            suggestions.append("考虑使用重线性化技术")
        
        return suggestions


class ModulusSwitching:
    """
    模数切换技术
    用于降低噪声而不改变明文
    """
    
    def __init__(self, original_modulus: int, target_modulus: int):
        self.q_orig = original_modulus
        self.q_target = target_modulus
    
    def switch(self, coeffs: np.ndarray) -> np.ndarray:
        """
        执行模数切换
        公式: c' = round(c * q_target / q_orig) mod q_target
        """
        # 缩放并四舍五入
        scaled = np.round(coeffs * self.q_target / self.q_orig).astype(np.int64)
        # 取模
        result = scaled % self.q_target
        return result.astype(np.int32)
    
    def estimate_noise_reduction(self, current_noise: float) -> float:
        """估计噪声降低比例"""
        return current_noise * (self.q_target / self.q_orig)


class Bootstrapping:
    """
    自举（Bootstrapping）技术
    通过同态解密来刷新噪声
    """
    
    def __init__(self, noise_manager: NoiseManager):
        self.nm = noise_manager
    
    def refresh(self, ct_id: str, secret_key_hint: np.ndarray = None) -> str:
        """
        执行噪声刷新
        
        注意：这是简化版，实际Bootstrapping需要复杂的同态电路
        """
        # 模拟刷新过程
        new_id = f"{ct_id}_refreshed"
        
        # 记录刷新操作
        budget = self.nm.record_operation("refresh", [ct_id], new_id)
        
        return new_id
    
    def estimate_cost(self, ct_id: str) -> dict:
        """估计刷新操作的开销"""
        return {
            "computation": "high",  # 计算密集型
            "communication": "medium",
            "latency_ms": 500,  # 估计延迟
            "noise_reduction": "reset to initial"
        }