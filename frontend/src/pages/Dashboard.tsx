import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getLegacyPlans, getInheritanceStatus, deleteLegacyPlan } from '../services/api'
import { Activity, Shield, Clock, Users, AlertCircle, Edit, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [inheritanceStatus, setInheritanceStatus] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadPlans()
  }, [])

  useEffect(() => {
    if (selectedPlan) {
      loadInheritanceStatus(selectedPlan.id)
    }
  }, [selectedPlan])

  const loadPlans = async () => {
    try {
      const data = await getLegacyPlans()
      setPlans(data)
    } catch (error) {
      console.error('Failed to load plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadInheritanceStatus = async (planId: string) => {
    try {
      const status = await getInheritanceStatus(planId)
      setInheritanceStatus(status)
    } catch (error) {
      console.error('Failed to load inheritance status:', error)
      setInheritanceStatus(null)
    }
  }

  const handleDeletePlan = async (planId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定要删除这个遗产计划吗？此操作不可撤销。')) {
      return
    }

    try {
      await deleteLegacyPlan(planId)
      // 重新加载计划列表
      await loadPlans()
      // 如果删除的是当前选中的计划，清除选中状态
      if (selectedPlan && selectedPlan.id === planId) {
        setSelectedPlan(null)
        setInheritanceStatus(null)
      }
      alert('计划删除成功')
    } catch (error) {
      console.error('Failed to delete plan:', error)
      alert('删除计划失败')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'collecting':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '活跃'
      case 'collecting':
        return '继承中'
      case 'completed':
        return '已继承'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gradient mb-2">控制台</h1>
        <p className="text-gray-600">管理您的数字遗产计划</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">总计划数</p>
              <p className="text-3xl font-bold">{plans.length}</p>
            </div>
            <Shield className="h-8 w-8 text-primary-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">活跃计划</p>
              <p className="text-3xl font-bold">{plans.filter(p => p.status === 'active').length}</p>
            </div>
            <Activity className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">监护人总数</p>
              <p className="text-3xl font-bold">{plans.reduce((acc, p) => acc + p.guardians.length, 0)}</p>
            </div>
            <Users className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">继承中</p>
              <p className="text-3xl font-bold">{plans.filter(p => p.status === 'collecting').length}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">已继承</p>
              <p className="text-3xl font-bold">{plans.filter(p => p.status === 'completed').length}</p>
            </div>
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">遗产计划列表</h2>

        {plans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p>暂无遗产计划</p>
            <p className="text-sm">点击"创建计划"开始设置您的数字遗产</p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-primary-600" />
                    <div>
                      <h3 className="font-semibold">{plan.name || `计划 #${index + 1}`}</h3>
                      <p className="text-xs text-gray-400 font-mono">ID: {plan.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {plan.status === 'active' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/edit-plan/${plan.id}`)
                        }}
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
                        title="编辑计划"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {plan.status === 'completed' && (
                      <button
                        onClick={(e) => handleDeletePlan(plan.id, e)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors"
                        title="删除计划"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(plan.status)}`}>
                      {getStatusText(plan.status)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">资产数量</p>
                    <p className="font-medium">{plan.assets?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">监护人</p>
                    <p className="font-medium">{plan.guardians?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">门限配置</p>
                    <p className="font-medium">{plan.threshold}-of-{plan.totalShares}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">触发模式</p>
                    <p className="font-medium">
                      {plan.triggerMode === 'time' ? '时间锁' : 
                       plan.triggerMode === 'consensus' ? '社会共识' : '混合模式'}
                    </p>
                  </div>
                </div>

                {plan.triggerMode !== 'consensus' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-500">时间锁: </span>
                      <span className="font-medium ml-1">{plan.timeLock}天</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {selectedPlan && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">计划详情</h2>
            <button
              onClick={() => setSelectedPlan(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              关闭
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-800">遗产计划ID</h3>
                  <p className="text-sm text-blue-600 font-mono mt-1">{selectedPlan.id}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedPlan.id)
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  title="复制计划ID到剪贴板"
                >
                  复制ID
                </button>
              </div>
              <p className="text-xs text-blue-500 mt-2">
                此ID用于发起继承请求和监护人提交份额，请妥善保管
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">资产清单</h3>
              <div className="space-y-2">
                {selectedPlan.assets?.map((asset: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between">
                      <span className="font-medium">{asset.name}</span>
                      <span className="text-sm text-gray-500">{asset.type}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{asset.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <Users className="h-4 w-4 mr-2 text-primary-600" />
                监护人及份额信息
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                以下信息包含监护人的份额，实际应用中应通过邮件安全发送给各监护人
              </p>
              <div className="space-y-3">
                {selectedPlan.guardians?.map((guardian: any, index: number) => {
                  const share = selectedPlan.shares?.[index]
                  // 获取监护人的提交状态
                  const guardianStatus = inheritanceStatus?.guardians?.find((g: any) => g.id === guardian.id)
                  const hasSubmitted = guardianStatus?.hasSubmitted || false
                  return (
                    <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary-600" />
                          </div>
                          <div>
                            <span className="font-semibold text-gray-800">{guardian.name}</span>
                            <span className="text-xs text-gray-500 ml-2">({guardian.role})</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(guardian.id)
                            }}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors"
                            title="复制监护人ID到剪贴板"
                          >
                            复制监护人ID
                          </button>
                          {share && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(share.id)
                              }}
                              className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded hover:bg-yellow-300 transition-colors"
                              title="复制份额ID到剪贴板"
                            >
                              复制份额ID
                            </button>
                          )}
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            hasSubmitted 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {hasSubmitted ? '已提交' : '未提交'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-2">
                          <div className="p-2 bg-white rounded border">
                            <span className="text-gray-500 block mb-1">监护人ID</span>
                            <code className="text-gray-800 break-all">{guardian.id}</code>
                          </div>
                          {guardian.email && (
                            <div className="p-2 bg-white rounded border">
                              <span className="text-gray-500 block mb-1">邮箱</span>
                              <span className="text-primary-600">{guardian.email}</span>
                            </div>
                          )}
                        </div>
                        
                        {share && (
                          <div className="space-y-2">
                            <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                              <span className="text-yellow-700 block mb-1">份额ID（提交份额时使用）</span>
                              <code className="text-yellow-900 break-all">{share.id}</code>
                            </div>
                            <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                              <span className="text-yellow-700 block mb-1">份额值</span>
                              <code className="text-yellow-900 break-all">{share.value?.substring(0, 40)}...</code>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
