# config/__init__.py
"""
配置管理模块
提供YAML配置加载、环境切换、配置验证等功能
"""

import os
import yaml
from pathlib import Path
from typing import Any, Dict, Optional, Union
from dataclasses import dataclass, field


# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent
CONFIG_PATH = Path(__file__).parent / "settings.yaml"


@dataclass
class LatticeConfig:
    """格密码配置"""
    n: int = 256
    q: int = 3329
    eta: int = 2
    zeta: int = 17
    bit_reversal_table: list = field(default_factory=list)
    
    # Kyber参数
    kyber_k: int = 3
    kyber_eta1: int = 2
    kyber_eta2: int = 2
    kyber_du: int = 10
    kyber_dv: int = 4
    security_level: int = 3


@dataclass
class OTConfig:
    """OT协议配置"""
    security_param: int = 128
    base_ot_count: int = 128
    message_max_size: int = 4096
    batch_size: int = 1024


@dataclass
class PSIConfig:
    """PSI协议配置"""
    num_hashes: int = 3
    max_iterations: int = 500
    load_factor: float = 1.2
    stash_size: int = 10
    bins_multiplier: float = 2.0
    use_ot_extension: bool = True


@dataclass
class PIRConfig:
    """PIR协议配置"""
    db_chunk_size: int = 1024
    max_batch_size: int = 100
    use_homomorphic: bool = True
    compression: bool = True


@dataclass
class NetworkConfig:
    """网络配置"""
    host: str = "127.0.0.1"
    port: int = 8888
    max_connections: int = 100
    timeout: int = 30
    buffer_size: int = 65536
    use_post_quantum: bool = True


@dataclass
class LoggingConfig:
    """日志配置"""
    format: str = "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"
    date_format: str = "%Y-%m-%d %H:%M:%S"
    level: str = "INFO"
    file_rotation: bool = True
    audit_enabled: bool = True


class Config:
    """
    配置管理器
    支持从YAML加载、环境变量覆盖、动态获取配置
    """
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        """单例模式"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, env: Optional[str] = None, config_path: Optional[Path] = None):
        if self._initialized:
            return
        
        self.env = env or os.getenv("PQC_ENV", "development")
        self.config_path = config_path or CONFIG_PATH
        
        self._config: Dict[str, Any] = {}
        self._load_config()
        
        self._initialized = True
    
    def _load_config(self):
        """加载YAML配置文件"""
        if not self.config_path.exists():
            raise FileNotFoundError(f"配置文件不存在: {self.config_path}")
        
        with open(self.config_path, 'r', encoding='utf-8') as f:
            full_config = yaml.safe_load(f)
        
        # 获取基础配置
        base_config = full_config.get('default', {})
        
        # 获取环境特定配置并合并
        env_config = full_config.get(self.env, {})
        if env_config and 'default' in str(env_config):
            # 处理YAML锚点引用
            merged = self._deep_merge(base_config, env_config)
        else:
            merged = env_config or base_config
        
        self._config = merged
        
        # 应用环境变量覆盖
        self._apply_env_overrides()
    
    def _deep_merge(self, base: Dict, override: Dict) -> Dict:
        """深度合并字典"""
        result = base.copy()
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        return result
    
    def _apply_env_overrides(self):
        """应用环境变量覆盖"""
        # 支持 PQC_ 前缀的环境变量
        prefix = "PQC_"
        for key, value in os.environ.items():
            if key.startswith(prefix):
                # PQC_NETWORK_SERVER_PORT -> network.server.port
                config_key = key[len(prefix):].lower().replace('_', '.')
                self._set_nested_value(config_key, self._parse_env_value(value))
    
    def _parse_env_value(self, value: str) -> Union[str, int, float, bool]:
        """解析环境变量值"""
        # 尝试解析为布尔值
        if value.lower() in ('true', 'yes', '1'):
            return True
        if value.lower() in ('false', 'no', '0'):
            return False
        
        # 尝试解析为整数
        try:
            return int(value)
        except ValueError:
            pass
        
        # 尝试解析为浮点数
        try:
            return float(value)
        except ValueError:
            pass
        
        return value
    
    def _set_nested_value(self, key_path: str, value: Any):
        """设置嵌套配置值"""
        keys = key_path.split('.')
        target = self._config
        
        for key in keys[:-1]:
            if key not in target:
                target[key] = {}
            target = target[key]
        
        target[keys[-1]] = value
    
    def get(self, key_path: str, default: Any = None) -> Any:
        """
        获取配置值
        支持点号分隔的路径: config.get("network.server.port")
        """
        keys = key_path.split('.')
        value = self._config
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default
        
        return value
    
    def get_lattice_config(self) -> LatticeConfig:
        """获取格密码配置"""
        lattice = self._config.get('lattice', {})
        kyber = lattice.get('kyber', {})
        
        return LatticeConfig(
            n=lattice.get('n', 256),
            q=lattice.get('q', 3329),
            eta=lattice.get('eta', 2),
            zeta=lattice.get('zeta', 17),
            bit_reversal_table=lattice.get('bit_reversal_table', []),
            kyber_k=kyber.get('k', 3),
            kyber_eta1=kyber.get('eta1', 2),
            kyber_eta2=kyber.get('eta2', 2),
            kyber_du=kyber.get('du', 10),
            kyber_dv=kyber.get('dv', 4),
            security_level=kyber.get('security_level', 3)
        )
    
    def get_ot_config(self) -> OTConfig:
        """获取OT协议配置"""
        ot = self._config.get('protocols', {}).get('ot', {})
        return OTConfig(
            security_param=ot.get('security_param', 128),
            base_ot_count=ot.get('base_ot_count', 128),
            message_max_size=ot.get('message_max_size', 4096),
            batch_size=ot.get('batch_size', 1024)
        )
    
    def get_psi_config(self) -> PSIConfig:
        """获取PSI协议配置"""
        psi = self._config.get('protocols', {}).get('psi', {})
        cuckoo = psi.get('cuckoo', {})
        return PSIConfig(
            num_hashes=cuckoo.get('num_hashes', 3),
            max_iterations=cuckoo.get('max_iterations', 500),
            load_factor=cuckoo.get('load_factor', 1.2),
            stash_size=cuckoo.get('stash_size', 10),
            bins_multiplier=psi.get('simple_hash', {}).get('bins_multiplier', 2.0),
            use_ot_extension=psi.get('ot_extension', True)
        )
    
    def get_pir_config(self) -> PIRConfig:
        """获取PIR协议配置"""
        pir = self._config.get('protocols', {}).get('pir', {})
        return PIRConfig(
            db_chunk_size=pir.get('db_chunk_size', 1024),
            max_batch_size=pir.get('max_batch_size', 100),
            use_homomorphic=pir.get('use_homomorphic', True),
            compression=pir.get('compression', True)
        )
    
    def get_network_config(self) -> NetworkConfig:
        """获取网络配置"""
        net = self._config.get('network', {})
        server = net.get('server', {})
        security = net.get('security', {})
        return NetworkConfig(
            host=server.get('host', '127.0.0.1'),
            port=server.get('port', 8888),
            max_connections=server.get('max_connections', 100),
            timeout=server.get('timeout', 30),
            buffer_size=server.get('buffer_size', 65536),
            use_post_quantum=security.get('use_post_quantum', True)
        )
    
    def get_logging_config(self) -> LoggingConfig:
        """获取日志配置"""
        log = self._config.get('logging', {})
        return LoggingConfig(
            format=log.get('format', "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"),
            date_format=log.get('date_format', "%Y-%m-%d %H:%M:%S"),
            level=log.get('level', 'INFO'),
            file_rotation=log.get('file_rotation', True),
            audit_enabled=log.get('audit_enabled', True)
        )
    
    def get_system_info(self) -> Dict[str, Any]:
        """获取系统信息"""
        return self._config.get('system', {})
    
    def reload(self):
        """重新加载配置"""
        self._load_config()
    
    def to_dict(self) -> Dict[str, Any]:
        """导出为字典"""
        return self._config.copy()


# 全局配置实例
_config_instance: Optional[Config] = None


def get_config(env: Optional[str] = None) -> Config:
    """
    获取配置实例
    首次调用时初始化，后续返回缓存实例
    """
    global _config_instance
    
    if _config_instance is None or env is not None:
        _config_instance = Config(env=env)
    
    return _config_instance


def init_config(env: Optional[str] = None, config_path: Optional[Path] = None) -> Config:
    """
    初始化配置
    用于明确指定环境和配置文件路径
    """
    global _config_instance
    _config_instance = Config(env=env, config_path=config_path)
    return _config_instance


# 便捷访问函数
def get_lattice_params() -> LatticeConfig:
    """便捷获取格密码参数"""
    return get_config().get_lattice_config()


def get_ot_params() -> OTConfig:
    """便捷获取OT参数"""
    return get_config().get_ot_config()


def get_psi_params() -> PSIConfig:
    """便捷获取PSI参数"""
    return get_config().get_psi_config()


def get_pir_params() -> PIRConfig:
    """便捷获取PIR参数"""
    return get_config().get_pir_config()


def get_network_params() -> NetworkConfig:
    """便捷获取网络参数"""
    return get_config().get_network_config()


# 环境检测
def is_development() -> bool:
    """是否为开发环境"""
    return get_config().env == "development"


def is_production() -> bool:
    """是否为生产环境"""
    return get_config().env == "production"


def is_testing() -> bool:
    """是否为测试环境"""
    return get_config().env == "testing"