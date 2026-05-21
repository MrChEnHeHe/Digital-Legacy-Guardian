import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getLegacyPlans, getInheritanceStatus, deleteLegacyPlan } from '../services/api'
import { Activity, Shield, Clock, Users, AlertCircle, Edit, Trash2, LogOut, PlusCircle, Heart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlans, setSelectedPlans] = useState<any>({
    created: null,
    inheritor: null,
    guardian: null
  })
  const [inheritanceStatus, setInheritanceStatus] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [currentUser, setCurrentUser] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      setCurrentUser(user)
      loadPlans(user.id)
    } else {
      navigate('/login')
    }
  }, [navigate])

  useEffect(() => {
    // 检查所有类型的计划是否有选中的
    const selectedPlan = selectedPlans.created || selectedPlans.inheritor || selectedPlans.guardian
    if (selectedPlan) {
      loadInheritanceStatus(selectedPlan.id)
    }
  }, [selectedPlans])

  // 定期更新时间，用于实时显示时间锁剩余时间
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // 每秒更新一次，产生连续的倒计时效果

    return () => clearInterval(interval)
  }, [])

  const loadPlans = async (userId?: string) => {
    try {
      const data = await getLegacyPlans(userId)
      setPlans(data)
    } catch (error) {
      console.error('Failed to load plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
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
      const selectedPlan = selectedPlans.created || selectedPlans.inheritor || selectedPlans.guardian
      if (selectedPlan && selectedPlan.id === planId) {
        // 清除对应类型的选中状态
        if (selectedPlans.created?.id === planId) {
          setSelectedPlans(prev => ({ ...prev, created: null }))
        } else if (selectedPlans.inheritor?.id === planId) {
          setSelectedPlans(prev => ({ ...prev, inheritor: null }))
        } else if (selectedPlans.guardian?.id === planId) {
          setSelectedPlans(prev => ({ ...prev, guardian: null }))
        }
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
      case 'locked':
        return 'bg-gray-100 text-gray-800'
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
      case 'locked':
        return '锁定中'
      default:
        return status
    }
  }

  // 计算时间锁剩余时间
  const calculateTimeLockRemaining = (plan: any) => {
    if (plan.triggerMode === 'consensus' || !plan.timeLock || plan.timeLock <= 0) {
      return { remaining: 0, isExpired: true, display: '无时间限制' }
    }

    const createdAt = new Date(plan.createdAt)
    const now = currentTime
    const totalMilliseconds = plan.timeLock * 24 * 60 * 60 * 1000
    const elapsedMilliseconds = now.getTime() - createdAt.getTime()
    const remainingMilliseconds = totalMilliseconds - elapsedMilliseconds

    if (remainingMilliseconds <= 0) {
      return { remaining: 0, isExpired: true, display: '时间锁已到期' }
    }

    // 计算剩余天数、小时、分钟、秒
    const remainingDays = Math.floor(remainingMilliseconds / (24 * 60 * 60 * 1000))
    const remainingHours = Math.floor((remainingMilliseconds % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    const remainingMinutes = Math.floor((remainingMilliseconds % (60 * 60 * 1000)) / (60 * 1000))
    const remainingSeconds = Math.floor((remainingMilliseconds % (60 * 1000)) / 1000)

    let display = ''
    if (remainingDays > 0) {
      display += `${remainingDays}天 `
    }
    if (remainingHours > 0) {
      display += `${remainingHours}小时 `
    }
    if (remainingMinutes > 0) {
      display += `${remainingMinutes}分钟 `
    }
    if (remainingSeconds > 0) {
      display += `${remainingSeconds}秒`
    }

    return { 
      remaining: remainingMilliseconds, 
      isExpired: false, 
      display: display.trim() 
    }
  }

  // 获取计划的实际状态
  const getPlanStatus = (plan: any) => {
    if (plan.status !== 'active') {
      return plan.status
    }

    if (plan.triggerMode === 'timed') {
      const timeLockStatus = calculateTimeLockRemaining(plan)
      if (!timeLockStatus.isExpired) {
        return 'locked'
      }
    }

    return plan.status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // 分类计划
  const createdPlans = plans.filter(plan => plan.creatorId === currentUser?.id)
  const inheritorPlans = plans.filter(plan => plan.heirId === currentUser?.id)
  const guardianPlans = plans.filter(plan => plan.guardians?.some(guardian => guardian.id === currentUser?.id))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">个人信息</h1>
          <p className="text-gray-600">
            欢迎，{currentUser?.name || '用户'} 
            <span className="text-sm text-gray-400 ml-2">(ID: {currentUser?.id})</span>
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className="h-5 w-5" />
          退出登录
        </button>
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
              <p className="text-sm text-gray-600">创建的计划</p>
              <p className="text-3xl font-bold">{createdPlans.length}</p>
            </div>
            <PlusCircle className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">作为继承人</p>
              <p className="text-3xl font-bold">{inheritorPlans.length}</p>
            </div>
            <Heart className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">作为监护人</p>
              <p className="text-3xl font-bold">{guardianPlans.length}</p>
            </div>
            <Users className="h-8 w-8 text-purple-600" />
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
      </div>

      {/* 创建的遗产计划 */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">我的遗产计划</h2>

        {createdPlans.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>暂无创建的遗产计划</p>
            <p className="text-sm">点击"创建计划"开始设置您的数字遗产</p>
          </div>
        ) : (
          <div className="space-y-4">
            {createdPlans.map((plan, index) => (
              <div key={plan.id} className="space-y-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedPlans(prev => ({
                    ...prev,
                    created: prev.created?.id === plan.id ? null : plan
                  }))}
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
                      {plan.status === 'active' && (plan.triggerMode === 'consensus' || calculateTimeLockRemaining(plan).isExpired) && (
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
                      <button
                        onClick={(e) => handleDeletePlan(plan.id, e)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors"
                        title="删除计划"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(getPlanStatus(plan))}`}>
                        {getStatusText(getPlanStatus(plan))}
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
                        {plan.triggerMode === 'consensus' ? '社会共识' : '时间锁'}
                      </p>
                    </div>
                  </div>

                  {plan.triggerMode === 'timed' && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-500">时间锁: </span>
                        <span className="font-medium ml-1">{plan.timeLock}天</span>
                      </div>
                      <div className="flex items-center text-sm mt-1">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-500">剩余时间: </span>
                        <span className="font-medium ml-1">{calculateTimeLockRemaining(plan).display}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
                
                {/* 计划详情 - 显示在当前计划下方 */}
                {selectedPlans.created?.id === plan.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">计划详情</h3>
                      <button
                        onClick={() => setSelectedPlans(prev => ({ ...prev, created: null }))}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        关闭
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-blue-800">遗产计划ID</h4>
                            <p className="text-sm text-blue-600 font-mono mt-1">{plan.id}</p>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(plan.id)
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
                        <h4 className="font-semibold mb-2">资产清单</h4>
                        <div className="space-y-2">
                          {plan.assets?.map((asset: any, assetIndex: number) => (
                            <div key={assetIndex} className="p-3 bg-white rounded-lg border border-gray-100">
                              <div className="flex justify-between">
                                <span className="font-medium">{asset.name}</span>
                                <span className="text-sm text-gray-500">{asset.type}</span>
                              </div>

                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2 flex items-center">
                          <Users className="h-4 w-4 mr-2 text-primary-600" />
                          监护人信息
                        </h4>
                        <div className="space-y-3">
                          {plan.guardians?.map((guardian: any, guardianIndex: number) => (
                            <div key={guardianIndex} className="p-3 bg-white rounded-lg border border-gray-100">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                                  <Users className="h-3 w-3 text-primary-600" />
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-800">{guardian.name}</span>
                                  <span className="text-xs text-gray-500 ml-2">({guardian.role})</span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{guardian.email}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 作为继承人的遗产计划 */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">继承的遗产计划</h2>

        {inheritorPlans.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>暂无作为继承人的遗产计划</p>
            <p className="text-sm">当他人将您指定为继承人时，计划会显示在这里</p>
          </div>
        ) : (
          <div className="space-y-4">
            {inheritorPlans.map((plan, index) => (
              <div key={plan.id} className="space-y-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedPlans(prev => ({
                    ...prev,
                    inheritor: prev.inheritor?.id === plan.id ? null : plan
                  }))}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Heart className="h-5 w-5 text-red-600" />
                      <div>
                        <h3 className="font-semibold">{plan.name || `计划 #${index + 1}`}</h3>
                        <p className="text-xs text-gray-400 font-mono">ID: {plan.id}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(getPlanStatus(plan))}`}>
                      {getStatusText(getPlanStatus(plan))}
                    </span>
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
                        {plan.triggerMode === 'consensus' ? '社会共识' : '时间锁'}
                      </p>
                    </div>
                  </div>

                  {plan.triggerMode === 'timed' && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-500">时间锁: </span>
                        <span className="font-medium ml-1">{plan.timeLock}天</span>
                      </div>
                      <div className="flex items-center text-sm mt-1">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-500">剩余时间: </span>
                        <span className="font-medium ml-1">{calculateTimeLockRemaining(plan).display}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
                
                {/* 计划详情 - 显示在当前计划下方 */}
                {selectedPlans.inheritor?.id === plan.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">计划详情</h3>
                      <button
                        onClick={() => setSelectedPlans(prev => ({ ...prev, inheritor: null }))}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        关闭
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-blue-800">遗产计划ID</h4>
                            <p className="text-sm text-blue-600 font-mono mt-1">{plan.id}</p>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(plan.id)
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
                        <h4 className="font-semibold mb-2">资产清单</h4>
                        <div className="space-y-2">
                          {plan.assets?.map((asset: any, assetIndex: number) => (
                            <div key={assetIndex} className="p-3 bg-white rounded-lg border border-gray-100">
                              <div className="flex justify-between">
                                <span className="font-medium">{asset.name}</span>
                                <span className="text-sm text-gray-500">{asset.type}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2 flex items-center">
                          <Users className="h-4 w-4 mr-2 text-primary-600" />
                          监护人信息
                        </h4>
                        <div className="space-y-3">
                          {plan.guardians?.map((guardian: any, guardianIndex: number) => (
                            <div key={guardianIndex} className="p-3 bg-white rounded-lg border border-gray-100">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                                  <Users className="h-3 w-3 text-primary-600" />
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-800">{guardian.name}</span>
                                  <span className="text-xs text-gray-500 ml-2">({guardian.role})</span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{guardian.email}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 作为监护人的遗产计划 */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">监护的遗产计划</h2>

        {guardianPlans.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>暂无作为监护人的遗产计划</p>
            <p className="text-sm">当他人将您指定为监护人时，计划会显示在这里</p>
          </div>
        ) : (
          <div className="space-y-4">
            {guardianPlans.map((plan, index) => (
              <div key={plan.id} className="space-y-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedPlans(prev => ({
                    ...prev,
                    guardian: prev.guardian?.id === plan.id ? null : plan
                  }))}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-purple-600" />
                      <div>
                        <h3 className="font-semibold">{plan.name || `计划 #${index + 1}`}</h3>
                        <p className="text-xs text-gray-400 font-mono">ID: {plan.id}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(getPlanStatus(plan))}`}>
                      {getStatusText(getPlanStatus(plan))}
                    </span>
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
                        {plan.triggerMode === 'consensus' ? '社会共识' : '时间锁'}
                      </p>
                    </div>
                  </div>

                  {plan.triggerMode === 'timed' && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-500">时间锁: </span>
                        <span className="font-medium ml-1">{plan.timeLock}天</span>
                      </div>
                      <div className="flex items-center text-sm mt-1">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-500">剩余时间: </span>
                        <span className="font-medium ml-1">{calculateTimeLockRemaining(plan).display}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
                
                {/* 计划详情 - 显示在当前计划下方 */}
                {selectedPlans.guardian?.id === plan.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">计划详情</h3>
                      <button
                        onClick={() => setSelectedPlans(prev => ({ ...prev, guardian: null }))}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        关闭
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-blue-800">遗产计划ID</h4>
                            <p className="text-sm text-blue-600 font-mono mt-1">{plan.id}</p>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(plan.id)
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
                        <h4 className="font-semibold mb-2">资产清单</h4>
                        <div className="space-y-2">
                          {plan.assets?.map((asset: any, assetIndex: number) => (
                            <div key={assetIndex} className="p-3 bg-white rounded-lg border border-gray-100">
                              <div className="flex justify-between">
                                <span className="font-medium">{asset.name}</span>
                                <span className="text-sm text-gray-500">{asset.type}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2 flex items-center">
                          <Users className="h-4 w-4 mr-2 text-primary-600" />
                          监护人信息
                        </h4>
                        <div className="space-y-3">
                          {plan.guardians?.map((guardian: any, guardianIndex: number) => (
                            <div key={guardianIndex} className="p-3 bg-white rounded-lg border border-gray-100">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                                  <Users className="h-3 w-3 text-primary-600" />
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-800">{guardian.name}</span>
                                  <span className="text-xs text-gray-500 ml-2">({guardian.role})</span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{guardian.email}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </motion.div>
  )
}
