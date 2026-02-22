"""
格密码基础运算模块
实现多项式环、NTT变换等核心操作
"""

import numpy as np
from typing import List, Tuple, Optional
import hashlib

# Kyber-768参数
N = 256  # 多项式次数
Q = 3329  # 模数
ETA = 2  # 噪声参数

# NTT相关参数
ZETA = 17  # 原根
BIT_REVERSAL_TABLE = [0, 128, 64, 192, 32, 160, 96, 224, 16, 144, 80, 208, 48, 176, 112, 240,
                      8, 136, 72, 200, 40, 168, 104, 232, 24, 152, 88, 216, 56, 184, 120, 248,
                      4, 132, 68, 196, 36, 164, 100, 228, 20, 148, 84, 212, 52, 180, 116, 244,
                      12, 140, 76, 204, 44, 172, 108, 236, 28, 156, 92, 220, 60, 188, 124, 252,
                      2, 130, 66, 194, 34, 162, 98, 226, 18, 146, 82, 210, 50, 178, 114, 242,
                      10, 138, 74, 202, 42, 170, 106, 234, 26, 154, 90, 218, 58, 186, 122, 250,
                      6, 134, 70, 198, 38, 166, 102, 230, 22, 150, 86, 214, 54, 182, 118, 246,
                      14, 142, 78, 206, 46, 174, 110, 238, 30, 158, 94, 222, 62, 190, 126, 254,
                      1, 129, 65, 193, 33, 161, 97, 225, 17, 145, 81, 209, 49, 177, 113, 241,
                      9, 137, 73, 201, 41, 169, 105, 233, 25, 153, 89, 217, 57, 185, 121, 249,
                      5, 133, 69, 197, 37, 165, 101, 229, 21, 149, 85, 213, 53, 181, 117, 245,
                      13, 141, 77, 205, 45, 173, 109, 237, 29, 157, 93, 221, 61, 189, 125, 253,
                      3, 131, 67, 195, 35, 163, 99, 227, 19, 147, 83, 211, 51, 179, 115, 243,
                      11, 139, 75, 203, 43, 171, 107, 235, 27, 155, 91, 219, 59, 187, 123, 251,
                      7, 135, 71, 199, 39, 167, 103, 231, 23, 151, 87, 215, 55, 183, 119, 247,
                      15, 143, 79, 207, 47, 175, 111, 239, 31, 159, 95, 223, 63, 191, 127, 255]


class Polynomial:
    """多项式环 Z_Q[x]/(x^N + 1) 的实现"""
    
    def __init__(self, coefficients: np.ndarray = None, ntt_form: bool = False):
        """
        初始化多项式
        
        Args:
            coefficients: 系数数组，长度应为N
            ntt_form: 是否已经是NTT形式
        """
        if coefficients is None:
            self.coeffs = np.zeros(N, dtype=np.int32)
        else:
            self.coeffs = np.array(coefficients, dtype=np.int32) % Q
            if len(self.coeffs) != N:
                raise ValueError(f"多项式次数必须为{N}")
        self.ntt_form = ntt_form
    
    @classmethod
    def random(cls, eta: int = ETA) -> 'Polynomial':
        """生成中心二项分布的随机多项式"""
        # 中心二项分布: 采样范围为 [-eta, eta]
        coeffs = np.random.randint(0, 2*eta + 1, N) - eta
        return cls(coeffs)
    
    @classmethod
    def uniform(cls) -> 'Polynomial':
        """生成均匀分布的随机多项式"""
        coeffs = np.random.randint(0, Q, N)
        return cls(coeffs)
    
    @classmethod
    def from_seed(cls, seed: bytes, nonce: int) -> 'Polynomial':
        """从种子确定性生成多项式（扩展函数）"""
        # 使用SHAKE-128扩展种子
        from Crypto.Hash import SHAKE128
        shake = SHAKE128.new()
        shake.update(seed + nonce.to_bytes(1, 'little'))
        
        coeffs = []
        while len(coeffs) < N:
            buf = shake.read(3)
            d1 = buf[0] | (buf[1] << 8)
            d2 = buf[1] >> 8 | (buf[2] << 4)
            if d1 < Q:
                coeffs.append(d1)
            if len(coeffs) < N and d2 < Q:
                coeffs.append(d2)
        
        return cls(np.array(coeffs, dtype=np.int32))
    
    def to_ntt(self) -> 'Polynomial':
        """转换为NTT形式"""
        if self.ntt_form:
            return self
        
        coeffs = self.coeffs.copy()
        # 位反转置换
        coeffs = coeffs[BIT_REVERSAL_TABLE]
        
        # NTT蝶形运算
        m = 1
        while m < N:
            for i in range(m):
                j1 = 2 * i * (N // (2 * m))
                j2 = j1 + (N // (2 * m))
                zeta = pow(ZETA, BIT_REVERSAL_TABLE[m + i], Q)
                
                for j in range(j1, j2):
                    t = (zeta * coeffs[j + (N // (2 * m))]) % Q
                    coeffs[j + (N // (2 * m))] = (coeffs[j] - t) % Q
                    coeffs[j] = (coeffs[j] + t) % Q
            
            m *= 2
        
        result = Polynomial(coeffs, ntt_form=True)
        return result
    
    def from_ntt(self) -> 'Polynomial':
        """从NTT形式逆变换"""
        if not self.ntt_form:
            return self
        
        coeffs = self.coeffs.copy()
        
        # 逆NTT
        m = N // 2
        while m >= 1:
            for i in range(m):
                j1 = 2 * i * (N // (2 * m))
                j2 = j1 + (N // (2 * m))
                zeta = pow(ZETA, Q - 1 - BIT_REVERSAL_TABLE[m + i], Q)
                
                for j in range(j1, j2):
                    t = coeffs[j]
                    coeffs[j] = (t + coeffs[j + (N // (2 * m))]) % Q
                    coeffs[j + (N // (2 * m))] = (zeta * (t - coeffs[j + (N // (2 * m))])) % Q
            
            m //= 2
        
        # 位反转置换和归一化
        coeffs = coeffs[BIT_REVERSAL_TABLE]
        inv_n = pow(N, Q - 2, Q)  # N的模逆
        coeffs = (coeffs * inv_n) % Q
        
        return Polynomial(coeffs, ntt_form=False)
    
    def __add__(self, other: 'Polynomial') -> 'Polynomial':
        """多项式加法"""
        if self.ntt_form != other.ntt_form:
            raise ValueError("NTT形式不匹配")
        
        coeffs = (self.coeffs + other.coeffs) % Q
        return Polynomial(coeffs, self.ntt_form)
    
    def __sub__(self, other: 'Polynomial') -> 'Polynomial':
        """多项式减法"""
        if self.ntt_form != other.ntt_form:
            raise ValueError("NTT形式不匹配")
        
        coeffs = (self.coeffs - other.coeffs) % Q
        return Polynomial(coeffs, self.ntt_form)
    
    def __mul__(self, other: 'Polynomial') -> 'Polynomial':
        """多项式乘法（NTT域逐点乘）"""
        if not self.ntt_form or not other.ntt_form:
            raise ValueError("乘法必须在NTT域进行")
        
        coeffs = (self.coeffs * other.coeffs) % Q
        return Polynomial(coeffs, ntt_form=True)
    
    def __eq__(self, other) -> bool:
        if not isinstance(other, Polynomial):
            return False
        return np.array_equal(self.coeffs, other.coeffs) and self.ntt_form == other.ntt_form
    
    def compress(self, d: int) -> np.ndarray:
        """压缩多项式系数到d位"""
        scale = (1 << d) / Q
        compressed = np.round(self.coeffs * scale).astype(np.uint32) % (1 << d)
        return compressed
    
    def decompress(self, compressed: np.ndarray, d: int) -> 'Polynomial':
        """解压缩"""
        scale = Q / (1 << d)
        coeffs = np.round(compressed * scale).astype(np.int32) % Q
        return Polynomial(coeffs, self.ntt_form)
    
    def encode(self) -> bytes:
        """编码为字节串"""
        if self.ntt_form:
            # NTT形式使用12位编码
            coeffs = self.coeffs.astype(np.uint16)
            result = bytearray()
            for i in range(0, N, 2):
                result.extend([
                    coeffs[i] & 0xFF,
                    (coeffs[i] >> 8) | ((coeffs[i+1] & 0x0F) << 4),
                    coeffs[i+1] >> 4
                ])
            return bytes(result)
        else:
            # 普通形式使用压缩编码
            return self.compress(12).tobytes()
    
    def __repr__(self):
        return f"Polynomial(coeffs={self.coeffs[:5]}..., ntt={self.ntt_form})"


class Module:
    """多项式向量模块 R_Q^k"""
    
    def __init__(self, polynomials: List[Polynomial], k: int = 3):
        self.polys = polynomials
        self.k = k
        if len(polynomials) != k:
            raise ValueError(f"多项式数量必须为{k}")
    
    @classmethod
    def random_vector(cls, k: int = 3, eta: int = ETA) -> 'Module':
        """生成随机多项式向量"""
        polys = [Polynomial.random(eta) for _ in range(k)]
        return cls(polys, k)
    
    @classmethod
    def uniform_vector(cls, k: int = 3) -> 'Module':
        """生成均匀分布的多项式向量"""
        polys = [Polynomial.uniform() for _ in range(k)]
        return cls(polys, k)
    
    def to_ntt(self) -> 'Module':
        """所有多项式转NTT形式"""
        return Module([p.to_ntt() for p in self.polys], self.k)
    
    def from_ntt(self) -> 'Module':
        """所有多项式逆NTT变换"""
        return Module([p.from_ntt() for p in self.polys], self.k)
    
    def __add__(self, other: 'Module') -> 'Module':
        """向量加法"""
        if self.k != other.k:
            raise ValueError("维度不匹配")
        return Module([a + b for a, b in zip(self.polys, other.polys)], self.k)
    
    def dot_ntt(self, other: 'Module') -> Polynomial:
        """NTT域点积"""
        if self.k != other.k:
            raise ValueError("维度不匹配")
        
        result = Polynomial()
        result.ntt_form = True
        result.coeffs = np.zeros(N, dtype=np.int32)
        
        for a, b in zip(self.polys, other.polys):
            result = result + (a * b)
        
        return result
    
    def encode(self) -> bytes:
        """编码为字节串"""
        return b''.join(p.encode() for p in self.polys)


class NTTTransformer:
    """NTT变换工具类"""
    
    @staticmethod
    def generate_zetas() -> List[int]:
        """生成NTT所需的单位根幂次"""
        zetas = []
        for i in range(128):
            zetas.append(pow(ZETA, BIT_REVERSAL_TABLE[i], Q))
        return zetas
    
    @staticmethod
    def ntt_inplace(coeffs: np.ndarray):
        """原地NTT变换"""
        # 位反转置换
        coeffs[:] = coeffs[BIT_REVERSAL_TABLE]
        
        m = 1
        while m < N:
            for i in range(m):
                j1 = 2 * i * (N // (2 * m))
                j2 = j1 + (N // (2 * m))
                zeta = pow(ZETA, BIT_REVERSAL_TABLE[m + i], Q)
                
                for j in range(j1, j2):
                    t = (zeta * coeffs[j + (N // (2 * m))]) % Q
                    coeffs[j + (N // (2 * m))] = (coeffs[j] - t) % Q
                    coeffs[j] = (coeffs[j] + t) % Q
            
            m *= 2
    
    @staticmethod
    def inv_ntt_inplace(coeffs: np.ndarray):
        """原地逆NTT变换"""
        m = N // 2
        while m >= 1:
            for i in range(m):
                j1 = 2 * i * (N // (2 * m))
                j2 = j1 + (N // (2 * m))
                zeta = pow(ZETA, Q - 1 - BIT_REVERSAL_TABLE[m + i], Q)
                
                for j in range(j1, j2):
                    t = coeffs[j]
                    coeffs[j] = (t + coeffs[j + (N // (2 * m))]) % Q
                    coeffs[j + (N // (2 * m))] = (zeta * (t - coeffs[j + (N // (2 * m))])) % Q
            
            m //= 2
        
        coeffs[:] = coeffs[BIT_REVERSAL_TABLE]
        inv_n = pow(N, Q - 2, Q)
        coeffs[:] = (coeffs * inv_n) % Q