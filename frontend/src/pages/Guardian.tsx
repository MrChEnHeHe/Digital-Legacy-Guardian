import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { submitGuardianShare } from '../services/api'
import { Shield, Key, CheckCircle, AlertCircle } from 'lucide-react'

export default function Guardian() {
  const navigate = useNavigate()
  const [, setCurrentUser] = useState<any>(null)
  const [planId, setPlanId] = useState('')
  const [guardianId, setGuardianId] = useState('')
  const [shareValue, setShareValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      navigate('/login')
      return
    }
    const user = JSON.parse(userStr)
    setCurrentUser(user)
    // 自动填充监护人ID为当前用户ID
    setGuardianId(user.id)
  }, [navigate])

  const handleSubmit = async () => {
    if (!planId || !guardianId || !shareValue) {
      alert('请填写所有必填字段')
      return
    }

    setLoading(true)
    try {
      const response = await submitGuardianShare({
        planId,
        guardianId,
        shareValue: shareValue.trim(),
      })
      
      if (response.success) {
        setSubmitted(true)
      } else {
        alert(response.message || '提交份额失败')
      }
    } catch (error) {
      alert('提交份额失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gradient mb-2">监护人门户</h1>
        <p className="text-gray-600">安全地提交您的份额以协助遗产继承</p>
      </div>

      {submitted ? (
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
            <h2 className="text-3xl font-bold text-green-600 mb-2">提交成功！</h2>
            <p className="text-gray-600">您的份额已安全提交</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg text-left">
            <h3 className="font-semibold mb-2">提交详情</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">计划ID</span>
                <span className="font-medium">{planId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">监护人ID</span>
                <span className="font-medium">{guardianId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">提交时间</span>
                <span className="font-medium">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setSubmitted(false)
              setPlanId('')
              setGuardianId('')
              setShareValue('')
            }}
            className="btn-secondary w-full"
          >
            提交新的份额
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card space-y-6"
        >
          <h2 className="text-2xl font-semibold">提交监护人份额</h2>

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
              <label className="block text-sm font-medium mb-2">监护人ID</label>
              <input
                type="text"
                className="input-field bg-gray-100"
                placeholder="输入您的监护人ID"
                value={guardianId}
                disabled
                title="已自动填充为当前登录用户ID"
              />
              <p className="text-xs text-gray-500 mt-1">已自动填充为当前登录用户ID</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">份额值</label>
              <textarea
                className="input-field min-h-[150px]"
                placeholder="输入您的份额值（由系统通过邮件发送给您的十六进制字符串）"
                value={shareValue}
                onChange={(e) => setShareValue(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                请确保您输入的是正确的份额ID，提交后无法修改
              </p>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">安全提示</p>
                  <ul className="space-y-1">
                    <li>• 请确认您是合法的监护人</li>
                    <li>• 确保继承请求是合法的</li>
                    <li>• 份额提交后无法撤回</li>
                    <li>• 请妥善保管您的私钥</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">隐私保护</h3>
                </div>
                <p className="text-sm text-blue-700">
                  您的份额通过零知识证明验证，不会暴露给其他监护人
                </p>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Key className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">安全加密</h3>
                </div>
                <p className="text-sm text-green-700">
                  所有通信都经过端到端加密，确保数据安全
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center disabled:opacity-50"
          >
            {loading ? '提交中...' : '提交份额'}
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
