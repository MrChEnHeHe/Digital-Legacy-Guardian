"""
跨银行联合风控系统 - Web界面
基于Streamlit的交互式界面
"""

import streamlit as st
import pandas as pd
import json
from pathlib import Path
import sys
import os
import random
import secrets

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from risk_control import (
    BankClient,
    RiskCenterServer,
    RiskDatabase,
    RiskCustomer,
    RiskLevel
)


def init_session_state():
    """初始化会话状态"""
    if 'risk_center' not in st.session_state:
        st.session_state.risk_center = RiskCenterServer(security_param=128)
    
    if 'banks' not in st.session_state:
        st.session_state.banks = {}
    
    if 'current_bank' not in st.session_state:
        st.session_state.current_bank = None
    
    if 'current_page' not in st.session_state:
        st.session_state.current_page = "🏠 系统概览"


def render_header():
    """渲染页面头部"""
    st.set_page_config(
        page_title="跨银行联合风控系统",
        page_icon="🔐",
        layout="wide"
    )
    
    st.title("🔐 跨银行联合风控系统")
    st.markdown("""
    基于后量子隐私计算的跨银行风险信息共享系统
    
    **核心功能：**
    - 🔒 **隐私求交 (PSI)**: 识别跨银行风险客户
    - 🔑 **不经意传输 (OT)**: 安全查询风险等级
    - 🔍 **隐私信息检索 (PIR)**: 批量风险查询
    
    **安全特性：**
    - ✅ 基于 Kyber 算法的后量子安全
    - ✅ 银行间不泄露客户数据
    - ✅ 客户查询不暴露身份
    - ✅ 服务器不知道查询内容
    """)


def render_sidebar():
    """渲染侧边栏"""
    st.sidebar.title("📋 功能导航")
    
    page = st.sidebar.radio(
        "选择功能",
        [
            "🏠 系统概览",
            "🏦 银行管理",
            "🔍 隐私求交 (PSI)",
            "🔑 不经意传输 (OT)",
            "📊 隐私检索 (PIR)",
            "📈 数据统计",
            "⚙️ 系统设置"
        ],
        index=[
            "🏠 系统概览",
            "🏦 银行管理",
            "🔍 隐私求交 (PSI)",
            "🔑 不经意传输 (OT)",
            "📊 隐私检索 (PIR)",
            "📈 数据统计",
            "⚙️ 系统设置"
        ].index(st.session_state.current_page)
    )
    
    st.session_state.current_page = page
    
    st.sidebar.markdown("---")
    st.sidebar.subheader("🔐 安全信息")
    st.sidebar.info(f"""
    **安全参数:** 128位
    
    **加密算法:** Kyber-768
    
    **安全等级:** NIST Level 3
    """)
    
    return page


def render_overview():
    """渲染系统概览页面"""
    st.header("🏠 系统概览")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            label="注册银行",
            value=len(st.session_state.banks),
            delta="0"
        )
    
    with col2:
        total_customers = sum(
            len(bank_client.get_risk_customers()) 
            for bank_client in st.session_state.banks.values()
        )
        st.metric(
            label="风险客户总数",
            value=total_customers,
            delta="0"
        )
    
    with col3:
        st.metric(
            label="系统状态",
            value="运行中",
            delta="正常"
        )
    
    st.markdown("---")
    
    st.subheader("📊 系统架构")
    
    st.markdown("""
    ```
    ┌─────────────────────────────────────────────────────┐
    │              跨银行联合风控系统                  │
    ├─────────────────────────────────────────────────────┤
    │                                                     │
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
    │  │  银行 A  │  │  银行 B  │  │  银行 C  │   │
    │  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
    │       │              │              │             │
    │       └──────────────┼──────────────┘             │
    │                      │                            │
    │              ┌───────▼────────┐                   │
    │              │  风控中心服务器  │                   │
    │              │  (后量子安全)   │                   │
    │              └───────┬────────┘                   │
    │                      │                            │
    │              ┌───────▼────────┐                   │
    │              │  客户查询接口   │                   │
    │              └────────────────┘                   │
    │                                                     │
    └─────────────────────────────────────────────────────┘
    ```
    """)
    
    st.markdown("---")
    
    st.subheader("🚀 快速开始")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("🔍 隐私求交", use_container_width=True):
            st.session_state.current_page = "🔍 隐私求交 (PSI)"
            st.rerun()
    
    with col2:
        if st.button("🔑 不经意传输", use_container_width=True):
            st.session_state.current_page = "🔑 不经意传输 (OT)"
            st.rerun()
    
    with col3:
        if st.button("📊 隐私检索", use_container_width=True):
            st.session_state.current_page = "📊 隐私检索 (PIR)"
            st.rerun()


def render_bank_management():
    """渲染银行管理页面"""
    st.header("🏦 银行管理")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("➕ 添加银行")
        
        bank_id = st.text_input("银行ID", placeholder="bank_1", key="new_bank_id")
        bank_name = st.text_input("银行名称", placeholder="工商银行", key="new_bank_name")
        
        if st.button("添加银行", use_container_width=True, key="add_bank"):
            if bank_id and bank_name:
                bank_client = BankClient(bank_id, security_param=128)
                st.session_state.banks[bank_id] = bank_client
                st.session_state.risk_center.register_bank(bank_id, bank_client)
                st.success(f"成功添加银行: {bank_name} ({bank_id})")
                st.rerun()
            else:
                st.error("请填写银行ID和名称")
    
    with col2:
        st.subheader("📋 已注册银行")
        
        if st.session_state.banks:
            bank_data = []
            for bank_id, bank_client in st.session_state.banks.items():
                stats = bank_client.get_statistics()
                bank_data.append({
                    '银行ID': bank_id,
                    '客户数': stats['total_customers'],
                    '极高风险': stats['by_risk_level'].get('critical', 0),
                    '高风险': stats['by_risk_level'].get('high', 0),
                    '中风险': stats['by_risk_level'].get('medium', 0),
                    '低风险': stats['by_risk_level'].get('low', 0)
                })
            
            df = pd.DataFrame(bank_data)
            st.dataframe(df, use_container_width=True)
        else:
            st.info("暂无注册银行")
    
    st.markdown("---")
    
    if st.session_state.banks:
        st.subheader("👤 客户管理")
        
        st.markdown("""
        **客户ID说明：**
        - 支持任意格式的客户ID（如：00001, customer_123, 张三, etc.）
        - 相同的客户ID在不同银行会被识别为同一客户
        - PSI求交和OT查询会基于客户ID查找所有银行的信息
        """)
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**添加客户**")
            
            selected_bank = st.selectbox(
                "选择银行",
                list(st.session_state.banks.keys()),
                key="select_bank_for_customer"
            )
            
            customer_id = st.text_input(
                "客户ID",
                placeholder="任意格式的客户ID（如：00001, customer_123）",
                key="new_customer_id"
            )
            
            risk_level = st.selectbox(
                "风险等级",
                ["low", "medium", "high", "critical"],
                format_func=lambda x: {"low": "低风险", "medium": "中风险", "high": "高风险", "critical": "极高风险"}[x],
                key="new_customer_risk_level"
            )
            
            risk_score = st.slider(
                "风险分数",
                min_value=0.0,
                max_value=100.0,
                value=50.0,
                step=0.1,
                key="new_customer_risk_score"
            )
            
            report_reason = st.text_input(
                "报告原因",
                placeholder="逾期还款",
                key="new_customer_reason"
            )
            
            if st.button("添加客户", use_container_width=True, key="add_customer"):
                if customer_id and report_reason:
                    from risk_control import RiskCustomer, RiskLevel
                    
                    # 所有客户都使用唯一键：(customer_id, bank_id)
                    unique_key = f"{customer_id}_{selected_bank}"
                    
                    customer = RiskCustomer(
                        customer_id=unique_key,
                        risk_level=RiskLevel(risk_level),
                        risk_score=risk_score,
                        report_date="2024-01-15",
                        report_reason=report_reason,
                        bank_id=selected_bank
                    )
                    
                    # 存储原始customer_id用于PSI和查询
                    customer._original_customer_id = customer_id
                    
                    bank_client = st.session_state.banks[selected_bank]
                    bank_client.add_risk_customer(customer)
                    
                    st.session_state.risk_center.risk_db.add_customer(customer)
                    
                    st.success(f"成功添加客户: {customer_id}")
                    st.rerun()
                else:
                    st.error("请填写客户ID和报告原因")
        
        with col2:
            st.markdown("**客户列表**")
            
            if selected_bank in st.session_state.banks:
                bank_client = st.session_state.banks[selected_bank]
                customers = bank_client.risk_db.customers
                
                if customers:
                    customer_data = []
                    for cid, customer in customers.items():
                        # 显示原始ID而不是唯一键
                        original_id = getattr(customer, '_original_customer_id', cid)
                        customer_data.append({
                            '客户ID': original_id,
                            '风险等级': customer.risk_level.value,
                            '风险分数': customer.risk_score,
                            '报告原因': customer.report_reason
                        })
                    
                    df = pd.DataFrame(customer_data)
                    st.dataframe(df, use_container_width=True, height=300)
                    
                    st.markdown("**删除客户**")
                    delete_customer_id = st.text_input(
                        "要删除的客户ID",
                        placeholder="任意格式的客户ID（如：00001, customer_123）",
                        key="delete_customer_id"
                    )
                    
                    if st.button("删除客户", use_container_width=True, key="delete_customer"):
                        if delete_customer_id:
                            # 删除该客户在所有银行的记录
                            matching_customers = st.session_state.risk_center.risk_db.find_customer_by_original_id(delete_customer_id)
                            
                            if matching_customers:
                                # 从所有银行删除该客户
                                for customer in matching_customers:
                                    bank_id = customer.bank_id
                                    unique_key = customer.customer_id
                                    
                                    # 从银行客户端删除
                                    if bank_id in st.session_state.banks:
                                        bank_client = st.session_state.banks[bank_id]
                                        bank_client.delete_risk_customer(unique_key)
                                    
                                    # 从风险数据库删除
                                    st.session_state.risk_center.risk_db.delete_customer(unique_key)
                                
                                st.success(f"成功删除客户: {delete_customer_id}（共{len(matching_customers)}条记录）")
                                st.rerun()
                            else:
                                st.error(f"客户 {delete_customer_id} 不存在")
                        else:
                            st.error("请输入要删除的客户ID")
                else:
                    st.info("该银行暂无客户")


def render_psi_page():
    """渲染PSI页面"""
    st.header("🔍 隐私求交 (PSI)")
    
    st.markdown("""
    **功能说明：**
    使用隐私求交协议识别跨银行风险客户，各银行不泄露自己的客户数据。
    
    **工作原理：**
    1. 银行A和银行B分别上传风险客户列表
    2. 使用PSI协议计算交集
    3. 双方只能获得交集结果，无法获取对方的完整客户列表
    
    **客户ID说明：**
    - 支持任意格式的客户ID
    - 相同的客户ID在不同银行会被识别为同一客户
    - PSI会基于客户ID计算交集
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📊 选择银行")
        
        bank_ids = list(st.session_state.banks.keys())
        
        if len(bank_ids) >= 2:
            bank_a = st.selectbox("银行A", bank_ids, index=0)
            bank_b = st.selectbox("银行B", bank_ids, index=1)
            
            if st.button("执行PSI", use_container_width=True):
                with st.spinner("正在执行隐私求交..."):
                    result = st.session_state.risk_center.find_cross_bank_risks(bank_a, bank_b)
                    
                    st.success("PSI执行完成！")
                    
                    st.subheader("📈 结果分析")
                    
                    col1, col2, col3 = st.columns(3)
                    
                    with col1:
                        st.metric(
                            label="交集客户数",
                            value=result['intersection_size']
                        )
                    
                    with col2:
                        st.metric(
                            label="高风险客户",
                            value=result['analysis']['by_risk_level'].get('high', 0)
                        )
                    
                    with col3:
                        st.metric(
                            label="通信开销",
                            value=f"{result['stats'].get('communication_cost', 0)} 字节"
                        )
                    
                    st.markdown("---")
                    
                    st.subheader("📋 交集客户详情")
                    
                    if result['analysis']['customers']:
                        # 展开显示每个客户在所有银行的风险信息
                        display_data = []
                        for customer in result['analysis']['customers']:
                            for bank_info in customer['banks']:
                                display_data.append({
                                    '客户ID': customer['customer_id'],
                                    '银行': bank_info['bank_id'],
                                    '风险等级': customer['risk_level'],
                                    '风险分数': bank_info['risk_score'],
                                    '报告原因': bank_info['report_reason']
                                })
                        
                        df = pd.DataFrame(display_data)
                        st.dataframe(df, use_container_width=True)
                    else:
                        st.info("未发现交叉风险客户")
        else:
            st.warning("请至少注册两家银行才能执行PSI")


def render_ot_page():
    """渲染OT页面"""
    st.header("🔑 不经意传输 (OT)")
    
    st.markdown("""
    **功能说明：**
    使用不经意传输协议安全查询风险等级，银行不知道查询的是哪个客户。
    
    **工作原理：**
    1. 客户端生成查询请求
    2. 银行响应两个加密消息
    3. 客户端只能解密自己选择的消息
    4. 银行不知道客户选择的是哪个
    
    **客户ID说明：**
    - 支持任意格式的客户ID
    - 相同的客户ID在不同银行会被识别为同一客户
    - 查询会返回该客户在所有银行的风险信息
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("🔍 客户查询")
        
        customer_id = st.text_input("客户ID", placeholder="任意格式的客户ID（如：00001, customer_123）")
        
        if st.button("查询风险等级", use_container_width=True):
            if customer_id:
                with st.spinner("正在查询风险等级..."):
                    result = st.session_state.risk_center.query_customer_risk(customer_id)
                    
                    st.success("查询完成！")
                    
                    st.subheader("📊 查询结果")
                    
                    risk_info = result['risk_info']
                    
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        st.metric(
                            label="风险等级",
                            value=risk_info['risk_level'].upper()
                        )
                    
                    with col2:
                        if risk_info['risk_score']:
                            st.metric(
                                label="风险分数",
                                value=f"{risk_info['risk_score']:.1f}"
                            )
                    
                    st.markdown("---")
                    
                    # 检查是否为共享客户
                    if risk_info.get('is_shared', False):
                        st.info(f"⚠️ 该客户在 {risk_info['total_banks']} 家银行有风险记录")
                        
                        st.subheader("🏦 各银行风险信息")
                        
                        for i, customer_info in enumerate(risk_info['customers'], 1):
                            with st.expander(f"银行 {i}: {customer_info['bank_id']}"):
                                st.markdown(f"""
                                **风险分数:** {customer_info['risk_score']:.1f}
                                
                                **报告日期:** {customer_info['report_date']}
                                
                                **报告原因:** {customer_info['report_reason']}
                                """)
                    else:
                        st.info(f"""
                        **报告日期:** {risk_info['report_date']}
                        
                        **报告原因:** {risk_info['report_reason']}
                        
                        **所属银行:** {risk_info['bank_id']}
                        """)
            else:
                st.error("请输入客户ID")


def render_pir_page():
    """渲染PIR页面"""
    st.header("📊 隐私信息检索 (PIR)")
    
    st.markdown("""
    **功能说明：**
    使用隐私信息检索协议批量查询风险信息，服务器不知道查询的是哪些客户。
    
    **工作原理：**
    1. 客户端生成批量查询
    2. 服务器批量响应
    3. 客户端解密结果
    4. 服务器无法知道查询的具体客户
    
    **客户ID说明：**
    - 支持任意格式的客户ID
    - 相同的客户ID在不同银行会被识别为同一客户
    - 批量查询会返回每个客户在所有银行的风险信息
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📋 批量查询")
        
        customer_ids_input = st.text_area(
            "客户ID列表（每行一个）",
            placeholder="00001\ncustomer_123\n张三",
            height=150
        )
        
        if st.button("批量查询", use_container_width=True):
            if customer_ids_input:
                customer_ids = [cid.strip() for cid in customer_ids_input.split('\n') if cid.strip()]
                
                with st.spinner(f"正在批量查询 {len(customer_ids)} 个客户..."):
                    result = st.session_state.risk_center.batch_query_risks(customer_ids)
                    
                    st.success(f"批量查询完成！")
                    
                    st.subheader("📈 查询统计")
                    
                    col1, col2, col3, col4, col5 = st.columns(5)
                    
                    with col1:
                        st.metric(
                            label="总查询数",
                            value=result['total_queries']
                        )
                    
                    with col2:
                        st.metric(
                            label="成功查询",
                            value=result['successful_queries']
                        )
                    
                    with col3:
                        st.metric(
                            label="共享客户",
                            value=result.get('shared_customers', 0)
                        )
                    
                    with col4:
                        st.metric(
                            label="高风险",
                            value=result['by_risk_level']['high']
                        )
                    
                    with col5:
                        st.metric(
                            label="中风险",
                            value=result['by_risk_level']['medium']
                        )
                    
                    st.markdown("---")
                    
                    st.subheader("📋 查询详情")
                    
                    if result['details']:
                        for detail in result['details']:
                            risk_info = detail['risk_info']
                            
                            if risk_info.get('is_shared', False):
                                with st.expander(f"🔍 {risk_info['customer_id']} (共享客户 - {risk_info['total_banks']}家银行)"):
                                    st.markdown(f"**风险等级:** {risk_info['risk_level'].upper()}")
                                    
                                    for i, bank_info in enumerate(risk_info['customers'], 1):
                                        st.markdown(f"""
                                        **银行 {i}:** {bank_info['bank_id']}
                                        - 风险分数: {bank_info['risk_score']:.1f}
                                        - 报告日期: {bank_info['report_date']}
                                        - 报告原因: {bank_info['report_reason']}
                                        """)
                            else:
                                with st.expander(f"🔍 {risk_info.get('customer_id', 'Unknown')}"):
                                    st.markdown(f"""
                                    **风险等级:** {risk_info.get('risk_level', 'Unknown').upper()}
                                    
                                    **风险分数:** {risk_info.get('risk_score', 'N/A')}
                                    
                                    **报告日期:** {risk_info.get('report_date', 'N/A')}
                                    
                                    **报告原因:** {risk_info.get('report_reason', 'N/A')}
                                    
                                    **所属银行:** {risk_info.get('bank_id', 'N/A')}
                                    """)
            else:
                st.error("请输入客户ID列表")


def render_statistics():
    """渲染数据统计页面"""
    st.header("📈 数据统计")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📊 全局统计")
        
        report = st.session_state.risk_center.generate_global_report()
        
        db_stats = report['database_stats']
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            total_customers = sum(
                len(bank_client.get_risk_customers()) 
                for bank_client in st.session_state.banks.values()
            )
            st.metric(
                label="总客户数",
                value=total_customers
            )
        
        with col2:
            st.metric(
                label="注册银行",
                value=db_stats['total_banks']
            )
        
        with col3:
            st.metric(
                label="高风险客户",
                value=db_stats['by_risk_level'].get('high', 0)
            )
    
    with col2:
        st.subheader("📊 风险等级分布")
        
        if db_stats['by_risk_level']:
            risk_data = {
                '风险等级': list(db_stats['by_risk_level'].keys()),
                '客户数': list(db_stats['by_risk_level'].values())
            }
            df = pd.DataFrame(risk_data)
            st.bar_chart(df.set_index('风险等级'))
    
    st.markdown("---")
    
    st.subheader("📋 银行统计")
    
    if report['bank_stats']:
        bank_data = []
        for bank_id, stats in report['bank_stats'].items():
            bank_data.append({
                '银行ID': bank_id,
                '客户数': stats['total_customers'],
                '极高风险': stats['by_risk_level'].get('critical', 0),
                '高风险': stats['by_risk_level'].get('high', 0),
                '中风险': stats['by_risk_level'].get('medium', 0),
                '低风险': stats['by_risk_level'].get('low', 0)
            })
        
        df = pd.DataFrame(bank_data)
        st.dataframe(df, use_container_width=True)


def render_settings():
    """渲染系统设置页面"""
    st.header("⚙️ 系统设置")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("🔐 安全参数")
        
        security_param = st.number_input(
            "安全参数（位）",
            min_value=64,
            max_value=256,
            value=128,
            step=64
        )
        
        if st.button("更新安全参数", use_container_width=True):
            st.session_state.risk_center = RiskCenterServer(security_param=security_param)
            st.success(f"安全参数已更新为 {security_param} 位")
    
    with col2:
        st.subheader("💾 数据管理")
        
        st.markdown("**生成示例数据**")
        num_banks = st.number_input(
            "银行数量",
            min_value=1,
            max_value=10,
            value=3,
            step=1
        )
        
        customers_per_bank = st.number_input(
            "每家银行客户数",
            min_value=10,
            max_value=1000,
            value=100,
            step=10
        )
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("生成示例数据", use_container_width=True):
                with st.spinner("正在生成示例数据..."):
                    # 清空现有数据
                    st.session_state.risk_center = RiskCenterServer()
                    st.session_state.banks = {}
                    
                    # 生成示例数据
                    st.session_state.risk_center.risk_db.generate_sample_data(
                        num_banks=num_banks,
                        customers_per_bank=customers_per_bank
                    )
                    
                    # 为每个银行创建客户端并同步数据
                    for bank_id, customer_ids in st.session_state.risk_center.risk_db.bank_customers.items():
                        bank_client = BankClient(bank_id, security_param=128)
                        st.session_state.banks[bank_id] = bank_client
                        st.session_state.risk_center.register_bank(bank_id, bank_client)
                        
                        # 同步该银行的所有客户数据
                        for customer_id in customer_ids:
                            customer = st.session_state.risk_center.risk_db.get_customer(customer_id)
                            if customer:
                                bank_client.add_risk_customer(customer)
                    
                    st.success(f"示例数据生成完成！共{num_banks}家银行，每家{customers_per_bank}个客户")
        
        with col2:
            if st.button("清空数据", use_container_width=True):
                st.session_state.risk_center = RiskCenterServer()
                st.session_state.banks = {}
                st.success("数据已清空！")


def main():
    """主函数"""
    init_session_state()
    render_header()
    
    page = render_sidebar()
    
    if page == "🏠 系统概览":
        render_overview()
    elif page == "🏦 银行管理":
        render_bank_management()
    elif page == "🔍 隐私求交 (PSI)":
        render_psi_page()
    elif page == "🔑 不经意传输 (OT)":
        render_ot_page()
    elif page == "📊 隐私检索 (PIR)":
        render_pir_page()
    elif page == "📈 数据统计":
        render_statistics()
    elif page == "⚙️ 系统设置":
        render_settings()


if __name__ == "__main__":
    main()
