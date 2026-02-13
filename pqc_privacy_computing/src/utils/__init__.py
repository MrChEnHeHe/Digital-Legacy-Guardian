# src/utils/__init__.py
"""
后量子安全隐私计算系统 - 工具模块
提供数据结构、日志记录、序列化、性能监控等通用功能
"""

# 数据结构相关
from .data_structure import (
    # 枚举类型
    ProtocolType,
    MessageType,
    
    # 数据包类
    PQCDataPacket,
    OTDataPacket,
    PSIDataPacket,
    PIRDataPacket,
    
    # 流管理和序列化
    DataStream,
    SecureSerializer,
    MetricsCollector,
    
    # 便捷函数
    create_handshake_packet,
    create_error_packet,
    estimate_communication_cost,
)

# 日志相关
from .logger import (
    # 日志级别
    LogLevel,
    
    # 主日志器
    PQCLogger,
    
    # 便捷函数
    get_logger,
    protocol_timer,
    
    # 协议适配器
    OTLoggerAdapter,
    PSILoggerAdapter,
    PIRLoggerAdapter,
)

# 版本信息
__version__ = "1.0.0"
__author__ = "PQC-Privacy-Computing Team"


# 便捷聚合导入函数
def create_default_logger(name: str = "PQC-System") -> PQCLogger:
    """
    创建默认配置的日志器
    适用于快速启动和测试
    """
    return get_logger(
        name=name,
        level="INFO",
        log_file=None
    )


def create_debug_logger(name: str = "PQC-Debug") -> PQCLogger:
    """
    创建调试模式日志器
    输出详细日志和性能指标
    """
    return get_logger(
        name=name,
        level="DEBUG",
        log_file=None
    )


def create_production_logger(log_file: str, name: str = "PQC-Production") -> PQCLogger:
    """
    创建生产环境日志器
    启用结构化JSON日志和审计功能
    """
    logger = PQCLogger(
        name=name,
        level=logging.INFO,
        log_file=log_file,
        enable_console=True,
        enable_file=True,
        structured=True
    )
    logger.enable_audit_logging(f"{log_file}.audit")
    return logger


# 常用工具函数
def get_system_info() -> dict:
    """获取系统运行信息"""
    import sys
    import platform
    
    return {
        "python_version": sys.version,
        "platform": platform.platform(),
        "processor": platform.processor(),
        "machine": platform.machine(),
        "utils_version": __version__
    }


# 重新导出logging模块常用内容，方便统一导入
import logging
DEBUG = logging.DEBUG
INFO = logging.INFO
WARNING = logging.WARNING
ERROR = logging.ERROR
CRITICAL = logging.CRITICAL

__all__ = [
    # 数据结构
    'ProtocolType',
    'MessageType',
    'PQCDataPacket',
    'OTDataPacket',
    'PSIDataPacket',
    'PIRDataPacket',
    'DataStream',
    'SecureSerializer',
    'MetricsCollector',
    
    # 日志
    'LogLevel',
    'PQCLogger',
    'get_logger',
    'protocol_timer',
    'OTLoggerAdapter',
    'PSILoggerAdapter',
    'PIRLoggerAdapter',
    
    # 便捷函数
    'create_default_logger',
    'create_debug_logger',
    'create_production_logger',
    'create_handshake_packet',
    'create_error_packet',
    'estimate_communication_cost',
    'get_system_info',
    
    # 日志级别常量
    'DEBUG',
    'INFO',
    'WARNING',
    'ERROR',
    'CRITICAL',
    
    # 元信息
    '__version__',
]