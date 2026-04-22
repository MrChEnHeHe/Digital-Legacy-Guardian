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
          className="card text-center space-y-8 p-8"
        >
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center shadow-md">
              <CheckCircle className="h-14 w-14 text-green-600" />
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-green-600 mb-2">提交成功！</h2>
            <p className="text-gray-600 text-lg">您的份额已安全提交</p>
          </div>

          <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl shadow-sm text-left">
            <h3 className="font-semibold text-lg mb-4 text-gray-800">提交详情</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                <span className="text-gray-600 font-medium">计划ID</span>
                <span className="font-semibold text-gray-800 truncate max-w-xs">{planId}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                <span className="text-gray-600 font-medium">监护人ID</span>
                <span className="font-semibold text-gray-800">{guardianId}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                <span className="text-gray-600 font-medium">提交时间</span>
                <span className="font-semibold text-gray-800">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>


        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card space-y-6"
        >
          <h2 className="text-2xl font-semibold">提交监护人份额</h2>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">遗产计划ID</label>
                <div className="relative">
                  <input
                    type="text"
                    className="input-field pl-10"
                    placeholder="输入遗产计划ID"
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">监护人ID</label>
                <div className="relative">
                  <input
                    type="text"
                    className="input-field bg-gray-50 pl-10"
                    placeholder="输入您的监护人ID"
                    value={guardianId}
                    disabled
                    title="已自动填充为当前登录用户ID"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 mt-1">已自动填充为当前登录用户ID</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">份额值</label>
              <div className="relative">
                <textarea
                  className="input-field min-h-[120px] pl-10"
                  placeholder="输入您的份额值（由系统通过邮件发送给您的十六进制字符串）"
                  value={shareValue}
                  onChange={(e) => setShareValue(e.target.value)}
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                请确保您输入的是正确的份额值，提交后无法修改
              </p>
            </div>

            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-100 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="bg-yellow-100 p-2 rounded-full">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-800 mb-2">安全提示</h3>
                  <p className="text-sm text-yellow-700">
                    请确认您是合法的监护人，确保继承请求是合法的。份额提交后无法撤回，请妥善保管您的份额信息。
                  </p>
                </div>
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
