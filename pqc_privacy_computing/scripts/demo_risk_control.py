"""
跨银行联合风控系统 - 演示脚本
展示完整的系统功能
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src'))

from risk_control import (
    BankClient,
    RiskCenterServer,
    RiskDatabase,
    RiskCustomer,
    RiskLevel
)
import time


def print_section(title):
    """打印章节标题"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60 + "\n")


def demo_psi():
    """演示PSI功能"""
    print_section("隐私求交 (PSI) 演示")
    
    # 创建风控中心
    risk_center = RiskCenterServer(security_param=128)
    
    # 创建三家银行
    print("[1/4] 创建银行客户端...")
    bank_a = BankClient('bank_a', security_param=128)
    bank_b = BankClient('bank_b', security_param=128)
    bank_c = BankClient('bank_c', security_param=128)
    
    # 注册银行
    print("[2/4] 注册银行...")
    risk_center.register_bank('bank_a', bank_a)
    risk_center.register_bank('bank_b', bank_b)
    risk_center.register_bank('bank_c', bank_c)
    
    # 生成示例数据
    print("[3/4] 生成示例数据...")
    for i in range(100):
        customer = RiskCustomer(
            customer_id=f'bank_a_customer_{i:06d}',
            risk_level=RiskLevel.MEDIUM,
            risk_score=50.0,
            report_date='2024-01-15',
            report_reason='测试',
            bank_id='bank_a'
        )
        bank_a.add_risk_customer(customer)
    
    for i in range(80):
        customer = RiskCustomer(
            customer_id=f'bank_b_customer_{i:06d}',
            risk_level=RiskLevel.HIGH,
            risk_score=75.0,
            report_date='2024-01-15',
            report_reason='测试',
            bank_id='bank_b'
        )
        bank_b.add_risk_customer(customer)
    
    for i in range(120):
        customer = RiskCustomer(
            customer_id=f'bank_c_customer_{i:06d}',
            risk_level=RiskLevel.LOW,
            risk_score=25.0,
            report_date='2024-01-15',
            report_reason='测试',
            bank_id='bank_c'
        )
        bank_c.add_risk_customer(customer)
    
    # 合并到中心数据库
    for bank_id, bank_client in [('bank_a', bank_a), ('bank_b', bank_b), ('bank_c', bank_c)]:
        for customer_hash in bank_client.get_risk_customers():
            customer = bank_client.risk_db.get_risk_info_by_hash(customer_hash)
            if customer:
                risk_center.risk_db.add_customer(customer)
    
    print(f"[4/4] 数据准备完成，共{risk_center.risk_db.get_size()}个风险客户\n")
    
    # 执行PSI
    print("[PSI] 开始查找跨银行风险客户...")
    time.sleep(1)
    
    result = risk_center.find_cross_bank_risks('bank_a', 'bank_b')
    
    print(f"\n[PSI] 查找完成！")
    print(f"      银行A和银行B的共同风险客户: {result['intersection_size']}个")
    print(f"      高风险客户: {result['analysis']['by_risk_level'].get('high', 0)}个")
    print(f"      中风险客户: {result['analysis']['by_risk_level'].get('medium', 0)}个")
    print(f"      通信开销: {result['stats'].get('communication_cost', 0)}字节")
    
    # 三方PSI
    print("\n[PSI] 查找三家银行共同风险客户...")
    time.sleep(1)
    
    result_abc = risk_center.find_three_way_intersection('bank_a', 'bank_b', 'bank_c')
    
    print(f"\n[PSI] 三方共同风险客户: {result_abc['intersection_size']}个")
    
    return risk_center


def demo_ot(risk_center):
    """演示OT功能"""
    print_section("不经意传输 (OT) 演示")
    
    # 选择一个客户
    customer_id = 'bank_a_customer_000001'
    
    print(f"[1/3] 查询客户风险等级: {customer_id}")
    time.sleep(0.5)
    
    # 查询风险等级
    print("[2/3] 执行OT查询...")
    time.sleep(1)
    
    result = risk_center.query_customer_risk(customer_id)
    
    print(f"\n[3/3] 查询完成！")
    print(f"      客户ID: {result['customer_id']}")
    print(f"      风险等级: {result['risk_info']['risk_level']}")
    print(f"      风险分数: {result['risk_info']['risk_score']}")
    print(f"      报告日期: {result['risk_info']['report_date']}")
    print(f"      报告原因: {result['risk_info']['report_reason']}")
    print(f"      所属银行: {result['risk_info']['bank_id']}")
    
    # 新客户开户检查
    print("\n[OT] 新客户开户风控检查...")
    new_customer_id = 'bank_a_customer_000999'
    
    check_result = risk_center.check_new_customer(new_customer_id)
    
    print(f"\n      客户ID: {check_result['customer_id']}")
    print(f"      决策: {check_result['decision']}")
    print(f"      原因: {check_result['reason']}")


def demo_pir(risk_center):
    """演示PIR功能"""
    print_section("隐私信息检索 (PIR) 演示")
    
    # 批量查询
    customer_ids = [
        'bank_a_customer_000001',
        'bank_a_customer_000002',
        'bank_a_customer_000003',
        'bank_a_customer_000004',
        'bank_a_customer_000005'
    ]
    
    print(f"[1/3] 批量查询{len(customer_ids)}个客户...")
    time.sleep(0.5)
    
    # 执行批量查询
    print("[2/3] 执行PIR批量查询...")
    time.sleep(2)
    
    result = risk_center.batch_query_risks(customer_ids)
    
    print(f"\n[3/3] 查询完成！")
    print(f"      总查询数: {result['total_queries']}")
    print(f"      成功查询: {result['successful_queries']}")
    print(f"      高风险客户: {result['by_risk_level']['high']}")
    print(f"      中风险客户: {result['by_risk_level']['medium']}")
    print(f"      低风险客户: {result['by_risk_level']['low']}")
    
    # 显示查询详情
    print("\n[PIR] 查询详情（前5个）:")
    for detail in result['details']:
        print(f"      - {detail['customer_hash']}: {detail['risk_info']['risk_level']}")


def demo_statistics(risk_center):
    """演示统计功能"""
    print_section("数据统计演示")
    
    print("[1/2] 生成全局报告...")
    time.sleep(1)
    
    report = risk_center.generate_global_report()
    
    print(f"\n[2/2] 报告生成完成！")
    
    print("\n[统计] 数据库统计:")
    print(f"      总客户数: {report['database_stats']['total_customers']}")
    print(f"      注册银行: {report['database_stats']['total_banks']}")
    
    print("\n[统计] 风险等级分布:")
    for level, count in report['database_stats']['by_risk_level'].items():
        print(f"      {level}: {count}个")
    
    print("\n[统计] 跨银行风险:")
    print(f"      交叉风险客户: {report['cross_bank_risks']['total_customers']}个")
    
    print("\n[统计] 建议:")
    for i, recommendation in enumerate(report['recommendations'], 1):
        print(f"      {i}. {recommendation}")


def main():
    """主函数"""
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║     🔐 跨银行联合风控系统演示                            ║
    ║                                                              ║
    ║     基于后量子隐私计算的跨银行风险信息共享系统            ║
    ║                                                              ║
    ║     支持: PSI | OT | PIR                                    ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    print("本演示将展示以下功能：")
    print("  1. 隐私求交 (PSI) - 识别跨银行风险客户")
    print("  2. 不经意传输 (OT) - 安全查询风险等级")
    print("  3. 隐私信息检索 (PIR) - 批量风险查询")
    print("  4. 数据统计 - 生成全局报告")
    
    input("\n按 Enter 键开始演示...")
    
    try:
        # 演示PSI
        risk_center = demo_psi()
        input("\n按 Enter 键继续...")
        
        # 演示OT
        demo_ot(risk_center)
        input("\n按 Enter 键继续...")
        
        # 演示PIR
        demo_pir(risk_center)
        input("\n按 Enter 键继续...")
        
        # 演示统计
        demo_statistics(risk_center)
        
        print("\n" + "="*60)
        print("  演示完成！")
        print("="*60)
        print("\n感谢使用跨银行联合风控系统！")
        print("\n下一步：")
        print("  1. 启动Web界面: scripts/start_risk_control.bat")
        print("  2. 访问系统: http://localhost:8501")
        print("  3. 查看文档: docs/RISK_CONTROL_README.md")
        print("="*60)
        
    except KeyboardInterrupt:
        print("\n\n演示已取消")
    except Exception as e:
        print(f"\n\n演示过程中发生错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
