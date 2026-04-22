import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { initiateInheritance, getInheritanceStatus } from '../services/api'
import { Play, CheckCircle, Clock, AlertTriangle, Share2 } from 'lucide-react'

export default function Inheritance() {
  const navigate = useNavigate()
  const [, setCurrentUser] = useState<any>(null)
  const [planId, setPlanId] = useState('')
  const [heirAddress, setHeirAddress] = useState('')
  const [heirEmail, setHeirEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [step, setStep] = useState<'initiate' | 'collect' | 'verify' | 'complete'>('initiate')

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      navigate('/login')
      return
    }
    setCurrentUser(JSON.parse(userStr))
  }, [navigate])

  const handleInitiate = async () => {
    if (!planId || !heirAddress || !heirEmail) {
      alert('请填写所有必填字段')
      return
    }

    setLoading(true)
    try {
      const result = await initiateInheritance({
        planId,
        heirAddress,
        heirEmail,
        guardianSignatures: [],
      })
      setStatus(result)
      setStep('collect')
      // 发起请求后立即检查状态，确保获取完整的状态信息
      await handleCheckStatus()
    } catch (error) {
      alert('发起继承请求失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckStatus = async () => {
    if (!planId) return

    setLoading(true)
    try {
      const result = await getInheritanceStatus(planId)
      setStatus(result)
      
      if (result.sharesCollected >= result.threshold) {
        setStep('verify')
      }
    } catch (error) {
      console.error('Failed to check status:', error)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { id: 'initiate', icon: Play, label: '发起请求' },
    { id: 'collect', icon: Share2, label: '收集份额' },
    { id: 'verify', icon: CheckCircle, label: '验证恢复' },
    { id: 'complete', icon: CheckCircle, label: '完成继承' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gradient mb-2">数字遗产继承</h1>
        <p className="text-gray-600">按照流程安全地继承数字资产</p>
      </div>

      <div className="flex justify-center space-x-2 mb-8">
        {steps.map((s, index) => {
          const Icon = s.icon
          const isActive = step === s.id
          const isCompleted = steps.findIndex(st => st.id === step) > index
          
          return (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                  isActive
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : isCompleted
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 text-gray-400'
                }`}
              >
                <Icon className="h-6 w-6" />
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-1 mx-2 transition-all ${
                    isCompleted ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {step === 'initiate' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card space-y-6"
        >
          <h2 className="text-2xl font-semibold">发起继承请求</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">遗产计划ID</label>
              <input
                type="text"
                className="input-field"
                placeholder="输入遗产计划ID"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">继承人地址</label>
              <input
                type="text"
                className="input-field"
                placeholder="输入接收资产的地址"
                value={heirAddress}
                onChange={(e) => setHeirAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">继承人邮箱</label>
              <input
                type="email"
                className="input-field"
                placeholder="输入接收通知的邮箱地址"
                value={heirEmail}
                onChange={(e) => setHeirEmail(e.target.value)}
              />
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">注意事项</p>
                  <ul className="space-y-1">
                    <li>• 确保您是合法的继承人</li>
                    <li>• 需要足够数量的监护人同意</li>
                    <li>• 触发条件必须已满足</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleInitiate}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center disabled:opacity-50"
          >
            {loading ? '处理中...' : '发起请求'}
          </button>
        </motion.div>
      )}

      {step === 'collect' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card space-y-6"
        >
          <h2 className="text-2xl font-semibold">收集监护人份额</h2>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">等待监护人响应</p>
                  <p>需要 {status?.threshold || '加载中...'} 位监护人提供他们的份额</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>已收集份额</span>
                <span className="font-medium">
                  {status?.sharesCollected || 0} / {status?.threshold || '加载中...'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: status?.threshold ? `${((status?.sharesCollected || 0) / status.threshold) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">监护人列表</h3>
              <div className="space-y-2">
                {status?.guardians?.map((guardian: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          guardian.hasSubmitted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {guardian.hasSubmitted ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Clock className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{guardian.name}</p>
                        <p className="text-sm text-gray-500">{guardian.role}</p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        guardian.hasSubmitted
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {guardian.hasSubmitted ? '已提交' : '等待中'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleCheckStatus}
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? '检查中...' : '检查状态'}
            </button>
          </div>
        </motion.div>
      )}

      {step === 'verify' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card space-y-6"
        >
          <h2 className="text-2xl font-semibold">验证并恢复资产</h2>

          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-semibold mb-1">份额验证通过</p>
                  <p>所有监护人份额已验证，可以开始恢复资产</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">资产恢复进度</h3>
              <div className="space-y-2">
                {status?.assets?.map((asset: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-sm text-gray-500">{asset.type}</p>
                    </div>
                    <span className="text-green-600 font-medium">已恢复</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold mb-2 text-blue-800">交易哈希</h3>
              <p className="text-sm text-blue-600 font-mono break-all">
                0x{Math.random().toString(16).substr(2, 64)}
              </p>
            </div>
          </div>

          <button
            onClick={() => setStep('complete')}
            className="btn-primary w-full"
          >
            完成继承
          </button>
        </motion.div>
      )}

      {step === 'complete' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center space-y-6"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-green-600 mb-2">继承完成！</h2>
            <p className="text-gray-600">所有数字资产已成功转移</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg text-left">
            <h3 className="font-semibold mb-2">继承摘要</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">计划ID</span>
                <span className="font-medium">{planId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">接收地址</span>
                <span className="font-medium font-mono">{heirAddress.slice(0, 10)}...{heirAddress.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">资产数量</span>
                <span className="font-medium">{status?.assets?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">完成时间</span>
                <span className="font-medium">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setStep('initiate')
              setPlanId('')
              setHeirAddress('')
              setStatus(null)
            }}
            className="btn-secondary w-full"
          >
            发起新的继承请求
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
