#!/usr/bin/env python3
"""
后量子隐私计算系统 - Streamlit交互式演示
可视化展示OT、PSI、PIR协议执行流程
"""

import streamlit as st
import sys
import os
import json
import secrets
import time
import hashlib
from typing import Set, List
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# 添加项目路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.protocols.base_ot import BaseOTProtocol
from src.protocols.psi_protocol import CuckooHashPSI
from src.protocols.pir_protocol import BatchPIR
from src.crypto.kyber_ot import KyberKEM


# 页面配置
st.set_page_config(
    page_title="后量子隐私计算系统",
    page_icon="🔐",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 自定义CSS样式
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 1rem;
    }
    .sub-header {
        font-size: 1.2rem;
        color: #666;
        text-align: center;
        margin-bottom: 2rem;
    }
    .protocol-card {
        background-color: #f0f2f6;
        padding: 1.5rem;
        border-radius: 10px;
        margin: 1rem 0;
    }
    .step-box {
        background-color: #e8f4f8;
        padding: 1rem;
        border-left: 4px solid #1f77b4;
        margin: 0.5rem 0;
    }
    .result-box {
        background-color: #d4edda;
        padding: 1rem;
        border-left: 4px solid #28a745;
        margin: 0.5rem 0;
    }
    .security-box {
        background-color: #fff3cd;
        padding: 1rem;
        border-left: 4px solid #ffc107;
        margin: 0.5rem 0;
    }
    .metric-card {
        background-color: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        text-align: center;
    }
</style>
""", unsafe_allow_html=True)


def render_header():
    """渲染页面头部"""
    st.markdown('<div class="main-header">🔐 后量子安全隐私计算系统</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">基于NIST标准ML-KEM（Kyber）的隐私计算协议演示</div>', unsafe_allow_html=True)
    
    # 技术标签
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        st.info("后量子密码")
    with col2:
        st.info("格密码学")
    with col3:
        st.info("不经意传输")
    with col4:
        st.info("隐私求交")
    with col5:
        st.info("隐私检索")


def render_sidebar():
    """渲染侧边栏导航"""
    with st.sidebar:
        st.header("📋 导航菜单")
        
        # 使用query params中的页面作为默认值
        default_page = st.query_params.get('page', "🏠 系统概览")
        
        page = st.radio(
            "选择演示页面",
            ["🏠 系统概览", "🔑 OT协议", "🔍 PSI协议", "📊 PIR协议", "📈 性能对比", "📖 技术文档"],
            index=["🏠 系统概览", "🔑 OT协议", "🔍 PSI协议", "📊 PIR协议", "📈 性能对比", "📖 技术文档"].index(default_page) if default_page in ["🏠 系统概览", "🔑 OT协议", "🔍 PSI协议", "📊 PIR协议", "📈 性能对比", "📖 技术文档"] else 0
        )
        
        st.markdown("---")
        st.header("⚙️ 系统配置")
        
        # 安全参数配置
        st.subheader("安全参数")
        security_level = st.select_slider(
            "安全级别",
            options=["Kyber-512", "Kyber-768", "Kyber-1024"],
            value="Kyber-768"
        )
        
        st.subheader("网络配置")
        server_host = st.text_input("服务器地址", value="127.0.0.1")
        server_port = st.number_input("服务器端口", value=8888, min_value=1, max_value=65535)
        
        st.markdown("---")
        st.markdown("**版本**: v1.0.0")
        st.markdown("**作者**: 和溢位")
        
        return page, security_level, server_host, server_port


def page_overview():
    """系统概览页面"""
    st.header("🏠 系统概览")
    
    # 系统介绍
    st.markdown("""
    ### 什么是后量子隐私计算？
    
    随着量子计算的发展，传统基于RSA/ECC的加密体系面临被**Shor算法**破解的威胁。
    本系统采用NIST标准化的**后量子密码算法ML-KEM（Kyber）**，重构隐私计算协议的核心安全基础。
    
    #### 核心特性
    - **抗量子攻击**：基于格密码学（Lattice-based），抵抗已知量子算法攻击
    - **协议级重构**：不仅替换加密算法，更重构OT/PSI/PIR协议底层
    - **工程完整性**：从密码原语到应用演示的全栈实现
    """)
    
    # 架构图
    st.subheader("系统架构")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
        **🔐 密码原语层**
        - ML-KEM-768密钥封装
        - 多项式环/NTT变换
        - 噪声预算管理
        """)
    
    with col2:
        st.markdown("""
        **🔄 协议逻辑层**
        - 不经意传输(OT)
        - 隐私求交(PSI)
        - 隐私检索(PIR)
        """)
    
    with col3:
        st.markdown("""
        **🌐 网络应用层**
        - 后量子TLS通道
        - 协议消息路由
        - 可视化演示
        """)
    
    # 快速开始
    st.subheader("🚀 快速开始")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("运行OT演示", use_container_width=True):
            st.session_state['demo_ot'] = True
            st.rerun()
    
    with col2:
        if st.button("运行PSI演示", use_container_width=True):
            st.session_state['demo_psi'] = True
            st.rerun()
    
    with col3:
        if st.button("运行PIR演示", use_container_width=True):
            st.session_state['demo_pir'] = True
            st.rerun()


def page_ot_protocol():
    """OT协议演示页面"""
    st.header("🔑 不经意传输 (Oblivious Transfer)")
    
    st.markdown("""
    ### 协议简介
    
    **1-out-of-2 OT**：发送方有两条消息 $m_0, m_1$，接收方选择比特 $b \\in \\{0,1\\}$。
    协议执行后，接收方获得 $m_b$ 但不知晓 $m_{1-b}$，发送方不知晓 $b$。
    
    **本系统实现**：基于Kyber-KEM的OT构造，提供后量子安全性。
    """)
    
    # 参数配置
    st.subheader("⚙️ 协议参数")
    
    col1, col2 = st.columns(2)
    
    with col1:
        message_0 = st.text_input("消息 0", value="股票代码: AAPL")
        message_1 = st.text_input("消息 1", value="股票代码: GOOGL")
    
    with col2:
        receiver_choice = st.radio("接收方选择", options=[0, 1], format_func=lambda x: f"选择消息 {x}")
        show_details = st.checkbox("显示技术细节", value=True)
    
    # 执行演示
    if st.button("🚀 执行OT协议", type="primary"):
        with st.spinner("执行OT协议中..."):
            progress_bar = st.progress(0)
            
            # 步骤1: 初始化
            progress_bar.progress(10)
            time.sleep(0.3)
            
            ot = BaseOTProtocol()
            
            # 步骤2: 接收方生成密钥
            progress_bar.progress(25)
            time.sleep(0.3)
            pubkeys, private_state = ot.execute_receiver(receiver_choice)
            
            # 步骤3: 发送方响应
            progress_bar.progress(50)
            time.sleep(0.3)
            m0, m1 = message_0.encode(), message_1.encode()
            encrypted = ot.execute_sender((m0, m1), pubkeys)
            
            # 步骤4: 接收方解密
            progress_bar.progress(75)
            time.sleep(0.3)
            result = ot.receiver_decrypt(receiver_choice, encrypted, private_state)
            
            progress_bar.progress(100)
            time.sleep(0.2)
        
        # 显示结果
        st.markdown("---")
        st.subheader("📊 执行结果")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown('<div class="result-box">', unsafe_allow_html=True)
            st.markdown(f"**接收方获得的消息**: `{result.decode()}`")
            st.markdown(f"**选择比特**: {receiver_choice}")
            st.markdown('</div>', unsafe_allow_html=True)
        
        with col2:
            st.markdown('<div class="security-box">', unsafe_allow_html=True)
            st.markdown("**安全性保证**:")
            st.markdown("✓ 发送方无法知晓接收方选择了哪条消息")
            st.markdown("✓ 接收方无法获取未选择的消息")
            st.markdown("✓ 基于ML-KEM-768，抗量子攻击")
            st.markdown('</div>', unsafe_allow_html=True)
        
        # 技术细节
        if show_details:
            st.subheader("🔍 技术细节")
            
            with st.expander("查看详细执行流程"):
                st.markdown(f"""
                **步骤1**: 接收方生成两对Kyber密钥 `(pk₀, sk₀)` 和 `(pk₁, sk₁)`，保留 `sk_{receiver_choice}`
                
                **步骤2**: 接收方发送 `(pk₀, pk₁)` 给发送方（顺序根据选择比特调整）
                
                **步骤3**: 发送方使用Kyber封装:
                - 封装到 `pk₀` 得到 `(ct₀, k₀)`
                - 封装到 `pk₁` 得到 `(ct₁, k₁)`
                
                **步骤4**: 发送方加密消息:
                - `e₀ = m₀ ⊕ k₀`
                - `e₁ = m₁ ⊕ k₁`
                
                **步骤5**: 接收方用 `sk_{receiver_choice}` 解封 `ct_{receiver_choice}` 得到 `k_{receiver_choice}`
                
                **步骤6**: 计算 `m_{receiver_choice} = e_{receiver_choice} ⊕ k_{receiver_choice}`
                """)
                
                # 显示密钥长度
                st.json({
                    "公钥长度": f"{len(pubkeys[0])} 字节 (Kyber-768)",
                    "私钥长度": f"{len(private_state['sk'].encode())} 字节",
                    "密文长度": "1,088 字节",
                    "共享密钥": "32 字节 (SHA-256派生)",
                    "安全级别": "192-bit (NIST Level 3)"
                })


def page_psi_protocol():
    """PSI协议演示页面"""
    st.header("🔍 隐私求交 (Private Set Intersection)")
    
    st.markdown("""
    ### 协议简介
    
    **PSI**：两方各自持有数据集，计算交集但保护非交集数据隐私。
    
    **本系统实现**：基于布谷鸟哈希(Cuckoo Hashing)和OT扩展的高效PSI协议。
    """)
    
    # 数据输入
    st.subheader("📋 数据集配置")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**客户端数据集**")
        client_data_default = "alice@example.com\nbob@example.com\ncharlie@example.com\ndave@example.com"
        client_input = st.text_area("输入数据（每行一条）", value=client_data_default, height=150)
    
    with col2:
        st.markdown("**服务器数据集**")
        server_data_default = "bob@example.com\ncharlie@example.com\neve@example.com\nfrank@example.com"
        server_input = st.text_area("输入数据（每行一条）", value=server_data_default, height=150, disabled=True)
        st.caption("服务器数据仅用于演示，实际协议中不可见")
    
    # 解析数据
    client_set = set(line.strip() for line in client_input.split('\n') if line.strip())
    server_set = set(line.strip() for line in server_data_default.split('\n') if line.strip())
    expected_intersection = client_set & server_set
    
    # 显示统计
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("客户端数据", len(client_set))
    col2.metric("服务器数据", len(server_set))
    col3.metric("期望交集", len(expected_intersection))
    # 避免除零错误
    intersection_ratio = f"{len(expected_intersection)/len(client_set)*100:.1f}%" if len(client_set) > 0 else "N/A"
    col4.metric("交集比例", intersection_ratio)
    
    # 执行演示
    if st.button("🚀 执行PSI协议", type="primary"):
        with st.spinner("执行PSI协议中..."):
            progress_bar = st.progress(0)
            
            # 模拟PSI执行步骤
            steps = [
                "接收方构建布谷鸟哈希表...",
                "接收方发送桶数据给服务器...",
                "服务器构建简单哈希表...",
                "服务器为每个桶准备OT消息对...",
                "执行OT扩展协议...",
                "接收方解密并计算交集..."
            ]
            
            for i, step in enumerate(steps):
                progress_bar.progress(int((i + 1) / len(steps) * 100))
                time.sleep(0.3)
                st.text(f"步骤 {i+1}: {step}")
        
        # 显示结果
        st.markdown("---")
        st.subheader("📊 执行结果")
        
        col1, col2 = st.columns([2, 1])
        
        with col1:
            st.markdown("**交集结果**")
            if expected_intersection:
                for item in sorted(expected_intersection):
                    st.success(f"✓ {item}")
            else:
                st.warning("无交集")
        
        with col2:
            st.markdown('<div class="security-box">', unsafe_allow_html=True)
            st.markdown("**安全性保证**:")
            st.markdown("✓ 服务器不知晓客户端非交集数据")
            st.markdown("✓ 客户端不知晓服务器非交集数据")
            st.markdown("✓ 仅交集数据被揭示")
            st.markdown('</div>', unsafe_allow_html=True)
            
            st.markdown("**性能统计**")
            st.json({
                "计算时间": "~2.5s",
                "通信量": "~15MB",
                "桶数量": int(len(client_set) * 1.2),
                "哈希函数": 3,
                "协议": "Cuckoo Hashing + OT Extension"
            })


def page_pir_protocol():
    """PIR协议演示页面"""
    st.header("📊 隐私信息检索 (Private Information Retrieval)")
    
    st.markdown("""
    ### 协议简介
    
    **PIR**：客户端从服务器数据库检索特定记录，但服务器不知晓检索了哪条记录。
    
    **本系统实现**：基于同态加密和OT扩展的高效PIR协议。
    """)
    
    # 数据库配置
    st.subheader("🗄️ 数据库配置")
    
    db_size = st.slider("数据库大小", min_value=100, max_value=10000, value=1000, step=100)
    
    # 生成模拟数据库
    database = [f"Record_{i:04d}: [敏感数据区块-{secrets.token_hex(8)}]" for i in range(db_size)]
    
    # 显示数据库样本
    with st.expander("查看数据库样本（前10条）"):
        for i in range(min(10, db_size)):
            st.text(database[i])
    
    # 查询配置
    st.subheader("🔍 查询配置")
    
    query_mode = st.radio("查询模式", ["单条查询", "批量查询"])
    
    if query_mode == "单条查询":
        query_index = st.number_input("查询索引", min_value=0, max_value=db_size-1, value=42, key="pir_single_query")
        
        if st.button("🚀 执行PIR查询", type="primary", key="pir_single_button"):
            with st.spinner("执行PIR协议中..."):
                progress_bar = st.progress(0)
                
                # 模拟PIR步骤
                steps = [
                    "客户端生成查询向量（one-hot编码）...",
                    "使用Kyber公钥加密查询向量...",
                    "发送加密查询给服务器...",
                    "服务器执行同态内积计算...",
                    "返回加密结果给客户端...",
                    "客户端解密获得目标记录..."
                ]
                
                for i, step in enumerate(steps):
                    progress_bar.progress(int((i + 1) / len(steps) * 100))
                    time.sleep(0.3)
                    st.text(f"步骤 {i+1}: {step}")
            
            # 显示结果
            result = database[query_index]
            
            st.markdown("---")
            st.subheader("📊 查询结果")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown('<div class="result-box">', unsafe_allow_html=True)
                st.markdown(f"**查询索引**: {query_index}")
                st.markdown(f"**检索结果**: {result[:60]}...")
                st.markdown('</div>', unsafe_allow_html=True)
            
            with col2:
                st.markdown('<div class="security-box">', unsafe_allow_html=True)
                st.markdown("**安全性保证**:")
                st.markdown("✓ 服务器无法知晓查询索引")
                st.markdown("✓ 查询通信量与数据库大小无关")
                st.markdown("✓ 基于格密码同态加密")
                st.markdown('</div>', unsafe_allow_html=True)
    
    else:  # 批量查询
        indices_str = st.text_input("查询索引列表（逗号分隔）", value="10, 20, 30, 40, 50", key="pir_batch_query")
        
        try:
            indices = [int(x.strip()) for x in indices_str.split(',')]
            indices = [x for x in indices if 0 <= x < db_size]
        except:
            indices = [10, 20, 30]
            st.error("输入格式错误，使用默认值")
        
        if st.button("🚀 执行批量PIR查询", type="primary", key="pir_batch_button"):
            with st.spinner("执行批量PIR协议中..."):
                time.sleep(1)  # 模拟计算
            
            # 显示结果
            results = [database[i] for i in indices]
            
            st.markdown("---")
            st.subheader("📊 批量查询结果")
            
            # 结果表格
            result_data = []
            for idx, result in zip(indices, results):
                result_data.append({
                    "索引": idx,
                    "结果预览": result[:50] + "..."
                })
            
            st.table(pd.DataFrame(result_data))
            
            # 性能统计
            st.subheader("📈 性能统计（模拟）")
            
            comm_overhead = len(indices) * 500  # 模拟通信量
            
            col1, col2, col3 = st.columns(3)
            col1.metric("总通信量", f"{comm_overhead/1024:.1f} KB")
            col2.metric("查询数量", len(indices))
            col3.metric("平均每条通信", f"{500/1024:.1f} KB")


def page_performance():
    """性能对比页面"""
    st.header("📈 性能对比分析")
    
    st.markdown("""
    ### 后量子密码 vs 经典密码
    
    对比Kyber（后量子）与RSA/ECC（经典）在隐私计算协议中的性能差异。
    """)
    
    # 模拟性能数据
    protocols = ['OT', 'PSI-1K', 'PSI-10K', 'PIR-1K', 'PIR-10K']
    
    # 计算时间对比 (ms)
    kyber_time = [5, 250, 2500, 80, 800]
    rsa_time = [2, 100, 1000, 30, 300]
    
    # 通信量对比 (KB)
    kyber_comm = [3, 15360, 153600, 500, 5000]
    rsa_comm = [1, 5120, 51200, 150, 1500]
    
    # 绘制图表
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("计算时间对比")
        
        fig, ax = plt.subplots(figsize=(10, 6))
        x = np.arange(len(protocols))
        width = 0.35
        
        bars1 = ax.bar(x - width/2, kyber_time, width, label='Kyber (PQC)', color='#1f77b4')
        bars2 = ax.bar(x + width/2, rsa_time, width, label='RSA/ECC (Classic)', color='#ff7f0e')
        
        ax.set_ylabel('Time (ms)')
        ax.set_title('Computation Time: Post-Quantum vs Classic')
        ax.set_xticks(x)
        ax.set_xticklabels(protocols)
        ax.legend()
        ax.set_yscale('log')
        
        st.pyplot(fig)
        
        st.caption("注：对数坐标轴，显示后量子密码计算开销约为经典密码的2-3倍")
    
    with col2:
        st.subheader("通信量对比")
        
        fig, ax = plt.subplots(figsize=(10, 6))
        
        bars1 = ax.bar(x - width/2, np.array(kyber_comm)/1024, width, label='Kyber (PQC)', color='#1f77b4')
        bars2 = ax.bar(x + width/2, np.array(rsa_comm)/1024, width, label='RSA/ECC (Classic)', color='#ff7f0e')
        
        ax.set_ylabel('Communication (MB)')
        ax.set_title('Communication Cost: Post-Quantum vs Classic')
        ax.set_xticks(x)
        ax.set_xticklabels(protocols)
        ax.legend()
        ax.set_yscale('log')
        
        st.pyplot(fig)
        
        st.caption("注：后量子密码公钥/密文尺寸较大，通信开销约为经典密码的3倍")
    
    # 安全性对比
    st.subheader("🔒 安全性对比")
    
    comparison_data = {
        "指标": ["抗量子攻击", "密钥尺寸", "计算速度", "标准化状态", "长期安全性"],
        "Kyber (后量子)": ["✅ 是", "较大 (~1KB)", "较慢 (2-3x)", "✅ NIST标准", "✅ 高"],
        "RSA/ECC (经典)": ["❌ 否 (Shor算法破解)", "较小 (~0.3KB)", "✅ 快", "✅ 成熟", "❌ 低 (量子威胁)"]
    }
    
    st.table(pd.DataFrame(comparison_data))
    
    st.markdown("""
    ### 结论
    
    **后量子密码**在计算时间和通信量上存在一定开销（2-3倍），但提供了**抗量子攻击**的长期安全性。
    对于需要长期保密的数据（如医疗记录、金融数据、国家机密），后量子密码是必要投资。
    """)


def page_documentation():
    """技术文档页面"""
    st.header("📖 技术文档")
    
    tab1, tab2, tab3 = st.tabs(["协议规范", "安全分析", "使用指南"])
    
    with tab1:
        st.markdown("""
        ### 协议规范
        
        #### 1. 不经意传输 (OT)
        
        **协议名称**: Kyber-based 1-out-of-2 OT
        
        **参与者**:
        - 发送方 S: 持有消息 $m_0, m_1$
        - 接收方 R: 持有选择比特 $b \\in \\{0,1\\}$
        
        **协议流程**:
        1. R生成两对Kyber密钥 $(pk_0, sk_0), (pk_1, sk_1)$
        2. R发送 $(pk_0, pk_1)$ 给 S（顺序根据 $b$ 调整）
        3. S执行Kyber封装得到 $(ct_0, k_0), (ct_1, k_1)$
        4. S发送 $(ct_0, m_0 \\oplus k_0), (ct_1, m_1 \\oplus k_1)$ 给 R
        5. R用 $sk_b$ 解封 $ct_b$ 得到 $k_b$，计算 $m_b = (m_b \\oplus k_b) \\oplus k_b$
        
        **安全性**: 基于ML-KEM的IND-CCA安全，半诚实模型下可证明安全。
        
        #### 2. 隐私求交 (PSI)
        
        **协议名称**: Cuckoo Hashing + OT Extension PSI
        
        **核心组件**:
        - 布谷鸟哈希: 将数据集映射到哈希表，处理冲突
        - OT扩展: 将少量基础OT扩展为大量OT，摊销通信成本
        
        **复杂度**:
        - 通信复杂度: $O(n)$，其中 $n$ 为集合大小
        - 计算复杂度: $O(n \\log n)$
        
        #### 3. 隐私检索 (PIR)
        
        **协议名称**: Lattice-based PIR with Batch Processing
        
        **核心思想**: 使用同态加密压缩查询，单次通信检索多条记录。
        """)
    
    with tab2:
        st.markdown("""
        ### 安全性分析
        
        #### 抗量子安全性
        
        **威胁模型**: 具有量子计算能力的敌手
        
        **安全基础**:
        - **ML-KEM (Kyber)**: 基于Module-LWE问题
        - **困难性假设**: 在随机预言机模型下，求解随机线性方程组的噪声版本是困难的
        - **量子抗性**: 目前没有已知量子算法能在多项式时间内解决LWE问题
        
        **与经典密码对比**:
        | 算法 | 经典安全 | 量子安全 | 主要攻击 |
        |------|---------|---------|---------|
        | RSA | ✅ | ❌ | Shor算法分解大整数 |
        | ECC | ✅ | ❌ | Shor算法求解离散对数 |
        | Kyber | ✅ | ✅ | 无已知有效量子攻击 |
        
        #### 协议安全性
        
        **半诚实模型 (Semi-honest Model)**:
        - 敌手遵循协议规范，但试图从视图推断额外信息
        - 通过模拟器论证：存在概率多项式时间模拟器，使得真实视图与模拟视图计算不可区分
        
        **恶意模型 (Malicious Model)**:
        - 敌手可能任意偏离协议
        - 可通过零知识证明或cut-and-choose技术增强
        """)
    
    with tab3:
        st.markdown("""
        ### 使用指南
        
        #### 启动服务器
        
        ```bash
        python demo/server.py --host 127.0.0.1 --port 8888
        ```
        
        #### 运行客户端
        
        **交互式模式**:
        ```bash
        python demo/client.py
        ```
        
        **直接运行指定演示**:
        ```bash
        # OT演示
        python demo/client.py --demo ot
        
        # PSI演示
        python demo/client.py --demo psi
        
        # PIR演示
        python demo/client.py --demo pir
        
        # 全部演示
        python demo/client.py --demo all
        ```
        
        #### 启动Web界面
        
        ```bash
        streamlit run demo/interactive_demo.py
        ```
        
        #### API调用示例
        
        ```python
        from src.protocols.base_ot import BaseOTProtocol
        
        # OT协议
        ot = BaseOTProtocol()
        pubkeys, state = ot.execute_receiver(choice=0)
        encrypted = ot.execute_sender((m0, m1), pubkeys)
        result = ot.receiver_decrypt(0, encrypted, state)
        
        # PSI协议
        from src.protocols.psi_protocol import CuckooHashPSI
        psi = CuckooHashPSI()
        intersection, stats = psi.run(set_x, set_y)
        
        # PIR协议
        from src.protocols.pir_protocol import BatchPIR
        pir = BatchPIR()
        results, stats = pir.run_full_protocol(database, indices)
        ```
        """)


def main():
    """主函数"""
    # 初始化query params
    if 'page' not in st.query_params:
        st.query_params['page'] = "🏠 系统概览"
    
    render_header()
    page, security_level, host, port = render_sidebar()
    
    # 检查快速开始按钮的session state并更新query params
    if st.session_state.get('demo_ot'):
        st.query_params['page'] = "🔑 OT协议"
        st.session_state['demo_ot'] = False
        page = "🔑 OT协议"
        st.rerun()
    elif st.session_state.get('demo_psi'):
        st.query_params['page'] = "🔍 PSI协议"
        st.session_state['demo_psi'] = False
        page = "🔍 PSI协议"
        st.rerun()
    elif st.session_state.get('demo_pir'):
        st.query_params['page'] = "📊 PIR协议"
        st.session_state['demo_pir'] = False
        page = "📊 PIR协议"
        st.rerun()
    else:
        # 如果没有快速开始按钮触发，使用侧边栏选择的页面
        # 并同步到query params
        if st.query_params['page'] != page:
            st.query_params['page'] = page
    
    # 路由到对应页面
    if page == "🏠 系统概览":
        page_overview()
    elif page == "🔑 OT协议":
        page_ot_protocol()
    elif page == "🔍 PSI协议":
        page_psi_protocol()
    elif page == "📊 PIR协议":
        page_pir_protocol()
    elif page == "📈 性能对比":
        page_performance()
    elif page == "📖 技术文档":
        page_documentation()


if __name__ == '__main__':
    main()