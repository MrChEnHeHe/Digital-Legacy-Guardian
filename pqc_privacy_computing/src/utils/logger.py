# src/utils/logger.py
"""
后量子隐私计算系统 - 日志与调试工具
提供结构化日志、性能监控、协议追踪等功能
"""

import logging
import sys
import json
import time
import functools
import inspect
from typing import Any, Dict, Optional, Callable, List
from datetime import datetime
from pathlib import Path
from enum import Enum
import threading
import queue
import traceback


class LogLevel(Enum):
    """自定义日志级别"""
    DEBUG = logging.DEBUG
    INFO = logging.INFO
    WARNING = logging.WARNING
    ERROR = logging.ERROR
    CRITICAL = logging.CRITICAL
    PROTOCOL = 25  # 介于INFO和WARNING之间，用于协议事件
    SECURITY = 35  # 安全相关事件


# 注册自定义级别
logging.addLevelName(LogLevel.PROTOCOL.value, 'PROTOCOL')
logging.addLevelName(LogLevel.SECURITY.value, 'SECURITY')


class PQCLogger:
    """
    后量子隐私计算专用日志器
    支持结构化日志、性能追踪、协议审计
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, *args, **kwargs):
        """单例模式确保全局只有一个日志器实例"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(
        self,
        name: str = "PQC-Privacy-Computing",
        level: int = logging.DEBUG,
        log_file: Optional[str] = None,
        enable_console: bool = True,
        enable_file: bool = False,
        structured: bool = False
    ):
        if self._initialized:
            return
        
        self.name = name
        self.level = level
        self.structured = structured  # 是否输出JSON格式
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)
        self.logger.handlers = []  # 清除已有处理器
        
        # 上下文信息
        self.context: Dict[str, Any] = {}
        self._context_lock = threading.Lock()
        
        # 性能追踪
        self._timers: Dict[str, float] = {}
        self._counters: Dict[str, int] = {}
        self._perf_lock = threading.Lock()
        
        # 协议审计日志（用于安全分析）
        self._audit_queue: queue.Queue = queue.Queue()
        self._audit_thread: Optional[threading.Thread] = None
        self._enable_audit = False
        
        # 设置处理器
        if enable_console:
            self._add_console_handler()
        if enable_file and log_file:
            self._add_file_handler(log_file)
        
        self._initialized = True
    
    def _add_console_handler(self):
        """添加控制台处理器"""
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(self.level)
        
        if self.structured:
            formatter = logging.Formatter(
                '%(message)s'  # JSON格式单独处理
            )
        else:
            formatter = logging.Formatter(
                '[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
        
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)
    
    def _add_file_handler(self, log_file: str):
        """添加文件处理器"""
        Path(log_file).parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(self.level)
        
        if self.structured:
            formatter = logging.Formatter('%(message)s')
        else:
            formatter = logging.Formatter(
                '[%(asctime)s] [%(levelname)s] [%(name)s] [%(filename)s:%(lineno)d] %(message)s'
            )
        
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)
    
    def _format_message(self, msg: str, extra: Optional[Dict] = None) -> str:
        """格式化日志消息"""
        # 合并上下文
        with self._context_lock:
            context = self.context.copy()
        if extra:
            context.update(extra)
        
        if self.structured:
            # JSON格式
            log_entry = {
                'timestamp': datetime.now().isoformat(),
                'logger': self.name,
                'message': msg,
                'context': context
            }
            return json.dumps(log_entry, ensure_ascii=False, default=str)
        else:
            # 文本格式
            if context:
                context_str = ' | '.join(f"{k}={v}" for k, v in context.items())
                return f"{msg} [{context_str}]"
            return msg
    
    def _log(self, level: int, msg: str, extra: Optional[Dict] = None, exc_info: bool = False):
        """内部日志方法"""
        formatted_msg = self._format_message(msg, extra)
        
        if self.structured:
            self.logger.log(level, formatted_msg, exc_info=exc_info)
        else:
            self.logger.log(level, formatted_msg, exc_info=exc_info)
        
        # 审计日志
        if self._enable_audit and level >= LogLevel.PROTOCOL.value:
            self._audit_queue.put({
                'timestamp': time.time(),
                'level': level,
                'message': msg,
                'extra': extra or {}
            })
    
    # 标准日志接口
    def debug(self, msg: str, **kwargs):
        self._log(logging.DEBUG, msg, kwargs)
    
    def info(self, msg: str, **kwargs):
        self._log(logging.INFO, msg, kwargs)
    
    def warning(self, msg: str, **kwargs):
        self._log(logging.WARNING, msg, kwargs)
    
    def error(self, msg: str, **kwargs):
        self._log(logging.ERROR, msg, kwargs)
    
    def critical(self, msg: str, **kwargs):
        self._log(logging.CRITICAL, msg, kwargs)
    
    # 专用接口
    def protocol(self, msg: str, protocol_type: str = "", step: str = "", **kwargs):
        """记录协议事件"""
        extra = {
            'event_type': 'protocol',
            'protocol': protocol_type,
            'step': step,
            **kwargs
        }
        self._log(LogLevel.PROTOCOL.value, msg, extra)
    
    def security(self, msg: str, event_type: str = "", **kwargs):
        """记录安全事件"""
        extra = {
            'event_type': 'security',
            'security_event': event_type,
            **kwargs
        }
        self._log(LogLevel.SECURITY.value, msg, extra)
    
    def crypto_op(self, operation: str, algorithm: str, duration_ms: float, **kwargs):
        """记录密码学操作"""
        self.protocol(
            f"Crypto operation: {operation}",
            protocol_type="CRYPTO",
            step=operation,
            algorithm=algorithm,
            duration_ms=round(duration_ms, 3),
            **kwargs
        )
    
    def network(self, direction: str, size_bytes: int, peer: str = "", **kwargs):
        """记录网络通信"""
        extra = {
            'event_type': 'network',
            'direction': direction,  # 'send' 或 'recv'
            'size_bytes': size_bytes,
            'peer': peer,
            **kwargs
        }
        self._log(LogLevel.PROTOCOL.value, f"Network {direction}: {size_bytes} bytes", extra)
    
    # 上下文管理
    def set_context(self, **kwargs):
        """设置全局上下文"""
        with self._context_lock:
            self.context.update(kwargs)
    
    def clear_context(self):
        """清除上下文"""
        with self._context_lock:
            self.context.clear()
    
    def context_scope(self, **kwargs):
        """上下文管理器，用于临时设置上下文"""
        class ContextScope:
            def __init__(scope_self, logger, new_context):
                scope_self.logger = logger
                scope_self.new_context = new_context
                scope_self.old_context = {}
            
            def __enter__(scope_self):
                with scope_self.logger._context_lock:
                    scope_self.old_context = scope_self.logger.context.copy()
                    scope_self.logger.context.update(scope_self.new_context)
                return scope_self.logger
            
            def __exit__(scope_self, exc_type, exc_val, exc_tb):
                with scope_self.logger._context_lock:
                    scope_self.logger.context = scope_self.old_context
                return False
        
        return ContextScope(self, kwargs)
    
    # 性能监控
    def start_timer(self, name: str):
        """开始计时"""
        with self._perf_lock:
            self._timers[name] = time.perf_counter()
    
    def end_timer(self, name: str, log: bool = True) -> float:
        """结束计时"""
        with self._perf_lock:
            if name not in self._timers:
                self.warning(f"Timer '{name}' not started")
                return 0.0
            
            elapsed = (time.perf_counter() - self._timers[name]) * 1000  # 转为毫秒
            del self._timers[name]
            
            if name not in self._counters:
                self._counters[name] = 0
            self._counters[name] += 1
            
            if log:
                self.debug(f"Timer '{name}': {elapsed:.3f}ms", timer_name=name, duration_ms=round(elapsed, 3))
            
            return elapsed
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """获取性能统计"""
        with self._perf_lock:
            return {
                'active_timers': list(self._timers.keys()),
                'counters': self._counters.copy()
            }
    
    def reset_stats(self):
        """重置统计"""
        with self._perf_lock:
            self._timers.clear()
            self._counters.clear()
    
    # 装饰器
    def timed(self, name: Optional[str] = None, log_level: int = logging.DEBUG):
        """函数计时装饰器"""
        def decorator(func: Callable) -> Callable:
            timer_name = name or func.__name__
            
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                self.start_timer(timer_name)
                try:
                    result = func(*args, **kwargs)
                    return result
                finally:
                    elapsed = self.end_timer(timer_name, log=False)
                    if log_level >= self.level:
                        self._log(
                            log_level,
                            f"Function '{func.__name__}' executed in {elapsed:.3f}ms",
                            {'function': func.__name__, 'duration_ms': round(elapsed, 3)}
                        )
            return wrapper
        return decorator
    
    def logged(self, msg: Optional[str] = None, level: int = logging.INFO):
        """函数调用日志装饰器"""
        def decorator(func: Callable) -> Callable:
            log_msg = msg or f"Calling {func.__name__}"
            
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                self._log(level, log_msg, {'function': func.__name__, 'args_count': len(args)})
                try:
                    result = func(*args, **kwargs)
                    self._log(level, f"{log_msg} - Success", {'function': func.__name__})
                    return result
                except Exception as e:
                    self._log(
                        logging.ERROR,
                        f"{log_msg} - Failed: {str(e)}",
                        {'function': func.__name__, 'error': str(e)},
                        exc_info=True
                    )
                    raise
            return wrapper
        return decorator
    
    # 协议专用追踪
    def trace_ot(self, role: str, step: str, choice: Optional[int] = None, **kwargs):
        """追踪OT协议执行"""
        extra = {
            'protocol': 'OT',
            'role': role,  # 'sender' 或 'receiver'
            'step': step,
            'choice': choice,
            **kwargs
        }
        self.protocol(f"OT {role} - {step}", **extra)
    
    def trace_psi(self, role: str, step: str, set_size: Optional[int] = None, **kwargs):
        """追踪PSI协议执行"""
        extra = {
            'protocol': 'PSI',
            'role': role,
            'step': step,
            'set_size': set_size,
            **kwargs
        }
        self.protocol(f"PSI {role} - {step}", **extra)
    
    def trace_pir(self, role: str, step: str, db_size: Optional[int] = None, **kwargs):
        """追踪PIR协议执行"""
        extra = {
            'protocol': 'PIR',
            'role': role,
            'step': step,
            'db_size': db_size,
            **kwargs
        }
        self.protocol(f"PIR {role} - {step}", **extra)
    
    # 审计功能
    def enable_audit_logging(self, audit_file: str):
        """启用审计日志"""
        self._enable_audit = True
        
        def audit_worker():
            with open(audit_file, 'a', encoding='utf-8') as f:
                while self._enable_audit:
                    try:
                        record = self._audit_queue.get(timeout=1)
                        f.write(json.dumps(record, default=str) + '\n')
                        f.flush()
                    except queue.Empty:
                        continue
                    except Exception as e:
                        print(f"Audit logging error: {e}", file=sys.stderr)
        
        self._audit_thread = threading.Thread(target=audit_worker, daemon=True)
        self._audit_thread.start()
    
    def disable_audit_logging(self):
        """禁用审计日志"""
        self._enable_audit = False
        if self._audit_thread:
            self._audit_thread.join(timeout=2)


# 便捷函数
def get_logger(
    name: str = "PQC-Privacy-Computing",
    level: str = "DEBUG",
    log_file: Optional[str] = None
) -> PQCLogger:
    """获取配置好的日志器实例"""
    level_map = {
        'DEBUG': logging.DEBUG,
        'INFO': logging.INFO,
        'WARNING': logging.WARNING,
        'ERROR': logging.ERROR,
        'CRITICAL': logging.CRITICAL
    }
    
    return PQCLogger(
        name=name,
        level=level_map.get(level.upper(), logging.DEBUG),
        log_file=log_file,
        enable_console=True,
        enable_file=log_file is not None
    )


def protocol_timer(protocol_type: str, step: str):
    """协议步骤计时上下文管理器"""
    logger = PQCLogger()
    
    class ProtocolTimer:
        def __enter__(self):
            logger.start_timer(f"{protocol_type}_{step}")
            logger.protocol(f"{protocol_type} {step} started", protocol_type=protocol_type, step=f"{step}_start")
            return self
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            elapsed = logger.end_timer(f"{protocol_type}_{step}", log=False)
            status = "completed" if exc_type is None else "failed"
            logger.protocol(
                f"{protocol_type} {step} {status}",
                protocol_type=protocol_type,
                step=f"{step}_{status}",
                duration_ms=round(elapsed, 3),
                error=str(exc_val) if exc_val else None
            )
            return False
    
    return ProtocolTimer()


# 与现有代码集成的适配器
class OTLoggerAdapter:
    """OT协议日志适配器"""
    
    def __init__(self, logger: Optional[PQCLogger] = None):
        self.logger = logger or PQCLogger()
    
    def log_sender_prepare(self, msg_count: int):
        self.logger.trace_ot('sender', 'prepare', message_count=msg_count)
    
    def log_sender_respond(self, pubkeys_received: int):
        self.logger.trace_ot('sender', 'respond', pubkeys_received=pubkeys_received)
    
    def log_receiver_choose(self, choice: int):
        self.logger.trace_ot('receiver', 'choose', choice=choice)
    
    def log_receiver_decrypt(self, success: bool):
        self.logger.trace_ot('receiver', 'decrypt', success=success)


class PSILoggerAdapter:
    """PSI协议日志适配器"""
    
    def __init__(self, logger: Optional[PQCLogger] = None):
        self.logger = logger or PQCLogger()
    
    def log_cuckoo_insert(self, items_count: int, stash_size: int):
        self.logger.trace_psi('receiver', 'cuckoo_insert', 
                            set_size=items_count, 
                            stash_size=stash_size)
    
    def log_hash_table_build(self, bins_count: int):
        self.logger.trace_psi('sender', 'hash_table_build', bins_count=bins_count)
    
    def log_intersection_result(self, intersection_size: int):
        self.logger.trace_psi('receiver', 'intersection_complete', 
                            intersection_size=intersection_size)


class PIRLoggerAdapter:
    """PIR协议日志适配器"""
    
    def __init__(self, logger: Optional[PQCLogger] = None):
        self.logger = logger or PQCLogger()
    
    def log_query_generation(self, db_size: int, target_index: int):
        self.logger.trace_pir('client', 'query_generation', 
                            db_size=db_size, 
                            target_index=target_index)
    
    def log_server_process(self, query_size: int):
        self.logger.trace_pir('server', 'process_query', query_size_bytes=query_size)
    
    def log_client_decrypt(self, result_size: int):
        self.logger.trace_pir('client', 'decrypt_result', result_size_bytes=result_size)