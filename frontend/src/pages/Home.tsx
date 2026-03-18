import { motion } from 'framer-motion'
import { Shield, Lock, Users, Clock, Zap, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { createDemoPlan } from '../services/api'

const features = [
  {
    icon: Shield,
    title: '资产托管',
    description: '将私钥/密码分片加密，分发给多位监护人，消除单点故障',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: Clock,
    title: '条件触发',
    description: '时间锁、社会共识、混合模式三种触发机制，自动化验证继承条件',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    icon: Lock,
    title: '隐私继承',
    description: '零知识证明+门限签名，资产详情全程加密，抗胁迫设计',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    icon: Users,
    title: '分布式信任',
    description: '无需信任任何单一实体，纯密码学保障安全',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  {
    icon: Zap,
    title: '自动执行',
    description: '智能合约确保条件满足后自动执行，无需人工干预',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  {
    icon: ShieldCheck,
    title: '安全审计',
    description: '全栈开源，代码可审计，经过专业安全审计',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const [demoData, setDemoData] = useState<any>(null)

  const generateDemoData = async () => {
    try {
      const response = await fetch('/demo-template.json')
      const template = await response.json()
      
      console.log('=== 演示模板文件位置 ===')
      console.log('文件路径: c:/Users/36083/Desktop/digital_legacy/frontend/public/demo-template.json')
      console.log('\n模板内容:')
      console.log(JSON.stringify(template, null, 2))
      
      const planInfo = {
        name: template.plan.name,
        threshold: template.plan.threshold,
        totalShares: template.plan.totalShares,
        triggerMode: template.plan.triggerMode,
        timeLock: template.plan.timeLock,
        guardians: template.guardians,
        assets: template.assets,
      }

      console.log('\n=== 准备创建演示计划 ===')
      console.log('遗产计划信息:')
      console.log(`- 计划名称: ${planInfo.name}`)
      console.log(`- 门限配置: ${planInfo.threshold}-of-${planInfo.totalShares}`)
      console.log(`- 触发模式: ${planInfo.triggerMode}`)
      console.log(`- 时间锁: ${planInfo.timeLock}天`)
      console.log('\n监护人信息:')
      planInfo.guardians.forEach((g, i) => {
        console.log(`${i + 1}. ${g.name} (${g.role})`)
        console.log(`   - 监护人ID: ${g.id}`)
        console.log(`   - 邮箱: ${g.email}`)
      })
      console.log('\n资产信息:')
      planInfo.assets.forEach((a, i) => {
        console.log(`${i + 1}. ${a.name} (${a.type})`)
        console.log(`   - 详情: ${a.value}`)
        console.log(`   - 描述: ${a.description}`)
      })

      const createdPlan = await createDemoPlan(planInfo)
      console.log('\n=== 演示计划创建成功 ===')
      console.log(`- 计划ID: ${createdPlan.id}`)
      navigate('/dashboard')
    } catch (error) {
      console.error('读取模板或创建演示计划失败:', error)
      alert('读取模板或创建演示计划失败，请检查控制台了解详情')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-12"
    >
      <div className="text-center space-y-4">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-5xl font-bold text-gradient"
        >
          数字遗产管家
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-gray-600 max-w-3xl mx-auto"
        >
          基于门限密码与去中心化触发条件的数字资产继承协议
          <br />
          用"数学分散"替代"信任集中"
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center space-x-4"
        >
          <Link to="/create-plan" className="btn-primary text-lg px-8 py-3">
            创建遗产计划
          </Link>
          <button
            onClick={generateDemoData}
            className="btn-secondary text-lg px-8 py-3"
          >
            生成演示数据
          </button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="card hover:shadow-xl transition-shadow duration-300"
            >
              <div className={`${feature.bgColor} ${feature.color} p-3 rounded-lg w-fit mb-4`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          )
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg p-8 text-white"
      >
        <h2 className="text-3xl font-bold mb-4">为什么选择数字遗产管家？</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">技术前沿</h3>
            <p className="text-white/90">
              PVSS、DKG、门限签名等高级密码学原语，确保最高级别的安全性
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">开源透明</h3>
            <p className="text-white/90">
              全栈开源，代码可审计，符合安全社区价值观
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">社会价值</h3>
            <p className="text-white/90">
              保护万亿级数字资产，填补市场空白，解决数字时代资产继承难题
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">完整方案</h3>
            <p className="text-white/90">
              覆盖"托管-触发-执行"全生命周期，具备实际部署能力
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
