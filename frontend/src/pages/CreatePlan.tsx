import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Save, Users, Clock, Shield, Search, CheckCircle } from 'lucide-react'
import { createLegacyPlan, authApi } from '../services/api'

interface Asset {
  type: 'crypto' | 'cloud' | 'file' | 'contract'
  name: string
  value: string
  description: string
  file?: File // 用于存储上传的文件
}

interface Guardian {
  id: string
  name: string
  role: string
  email: string
  publicKey: string
}

const assetTypePlaceholders: Record<string, string> = {
  crypto: '钱包地址 (42位字符，以0x开头)',
  cloud: '云账号邮箱 (标准邮箱格式)',
  file: 'IPFS CID (以Qm开头)',
  contract: '智能合约地址 (42位字符，以0x开头)'
}

export default function CreatePlan() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [assets, setAssets] = useState<Asset[]>([])
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [threshold, setThreshold] = useState(3)
  const [totalShares, setTotalShares] = useState(5)
  const [enableTimeLock, setEnableTimeLock] = useState(false)
  const [timeLock, setTimeLock] = useState(180)
  const [currentAsset, setCurrentAsset] = useState<Partial<Asset>>({})
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0)
  const [newGuardian, setNewGuardian] = useState<Partial<Guardian>>({})
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [heirId, setHeirId] = useState('')
  const [heirSearchQuery, setHeirSearchQuery] = useState('')
  const [heirSearchResults, setHeirSearchResults] = useState<any[]>([])
  const [heirSearching, setHeirSearching] = useState(false)

  const getCurrentUser = () => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      return JSON.parse(userStr)
    }
    return null
  }

  const searchUsers = async (query: string, type: 'guardian' | 'heir') => {
    if (!query.trim()) {
      if (type === 'guardian') {
        setSearchResults([])
      } else {
        setHeirSearchResults([])
      }
      return
    }

    if (type === 'guardian') {
      setSearching(true)
    } else {
      setHeirSearching(true)
    }

    try {
      const results = await authApi.searchUsers(query)
      if (type === 'guardian') {
        setSearchResults(results)
      } else {
        setHeirSearchResults(results)
      }
    } catch (error) {
      console.error('搜索用户失败:', error)
    } finally {
      if (type === 'guardian') {
        setSearching(false)
      } else {
        setHeirSearching(false)
      }
    }
  }

  const selectGuardian = (user: any) => {
    setNewGuardian({
      id: user.id,
      name: user.name,
      email: user.email,
      role: '',
    })
    setSearchResults([])
    setSearchQuery('')
  }

  const selectHeir = (user: any) => {
    setHeirId(user.id)
    setHeirSearchResults([])
    setHeirSearchQuery('')
  }

  const addAsset = () => {
    if (currentAsset.type && currentAsset.name && currentAsset.value) {
      setAssets([...assets, currentAsset as Asset])
      setCurrentAsset({})
      setCurrentAssetIndex(currentAssetIndex + 1)
    }
  }

  const resetAssetForm = () => {
    setCurrentAsset({})
    setCurrentAssetIndex(0)
  }

  const removeAsset = (index: number) => {
    setAssets(assets.filter((_, i) => i !== index))
  }

  const addGuardian = () => {
    if (newGuardian.id && newGuardian.name && newGuardian.role && newGuardian.email) {
      // 检查监护人ID是否已存在
      const existingGuardian = guardians.find(g => g.id === newGuardian.id)
      if (existingGuardian) {
        alert('监护人ID已存在，请使用不同的ID')
        return
      }
      
      setGuardians([
        ...guardians,
        {
          id: newGuardian.id,
          name: newGuardian.name,
          role: newGuardian.role,
          email: newGuardian.email,
          publicKey: `0x${Math.random().toString(16).substr(2, 40)}`,
        } as Guardian,
      ])
      setNewGuardian({})
    } else {
      alert('请填写所有必填字段')
    }
  }

  const removeGuardian = (id: string) => {
    setGuardians(guardians.filter((g) => g.id !== id))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const currentUser = getCurrentUser()
      await createLegacyPlan({
        assets,
        guardians,
        threshold,
        totalShares,
        triggerMode: enableTimeLock ? 'timed' : 'consensus',
        timeLock: enableTimeLock ? timeLock : 0,
        creatorId: currentUser?.id,
        heirId: heirId || undefined,
      })
      alert('遗产计划创建成功！')
      navigate('/dashboard')
    } catch (error: any) {
      alert(`创建失败: ${error.message || '请重试'}`)
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
        <h1 className="text-3xl font-bold text-gradient mb-2">创建数字遗产计划</h1>
        <p className="text-gray-600">按照步骤设置您的数字资产继承方案</p>
      </div>

      <div className="flex justify-center space-x-8 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                s <= step
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s}
            </div>
            <div
              className={`w-16 h-1 bg-gray-300 absolute transform -translate-y-5 ${
                s < step ? 'bg-primary-600' : ''
              }`}
              style={{ marginLeft: s > 1 ? '40px' : '0' }}
            />
            <span className={`text-xs mt-2 transition-colors duration-300 ${
              s <= step ? 'text-primary-600 font-medium' : 'text-gray-500'
            }`}>
              {s === 1 ? '添加资产' : s === 2 ? '设置监护人' : s === 3 ? '触发条件' : '确认创建'}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-semibold flex items-center">
            <Shield className="h-6 w-6 mr-2 text-primary-600" />
            添加数字资产
          </h2>

          {/* 资产信息收集卡片 - 逐个弹出 */}
          <motion.div
            key={currentAssetIndex}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className="card space-y-6"
          >
            <h3 className="text-xl font-medium">资产 #{currentAssetIndex + 1}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">资产类型</label>
                <select
                  className="input-field"
                  value={currentAsset.type || ''}
                  onChange={(e) => setCurrentAsset({ ...currentAsset, type: e.target.value as Asset['type'] })}
                >
                  <option value="">选择资产类型</option>
                  <option value="crypto">加密货币</option>
                  <option value="cloud">云账号</option>
                  <option value="file">加密文件</option>
                  <option value="contract">智能合约</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">资产名称</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="资产名称"
                  value={currentAsset.name || ''}
                  onChange={(e) => setCurrentAsset({ ...currentAsset, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {currentAsset.type === 'file' ? '上传文件' : '资产价值/地址'}
                </label>
                {currentAsset.type === 'file' ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-600 transition-colors">
                    <input
                      type="file"
                      className="hidden"
                      id={`file-upload-${currentAssetIndex}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          // 限制文件大小为 10MB
                          const maxSize = 10 * 1024 * 1024 // 10MB
                          if (file.size > maxSize) {
                            alert('文件大小不能超过 10MB')
                            return
                          }
                          
                          // 限制文件类型
                          const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/json', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
                          if (!allowedTypes.includes(file.type)) {
                            alert('不支持的文件类型，请选择 PDF、图片、文本或文档文件')
                            return
                          }
                          
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const base64Content = event.target?.result as string
                            setCurrentAsset({ 
                              ...currentAsset, 
                              file, 
                              value: JSON.stringify({
                                name: file.name,
                                type: file.type,
                                size: file.size,
                                content: base64Content
                              })
                            })
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                    <label
                      htmlFor={`file-upload-${currentAssetIndex}`}
                      className="cursor-pointer flex flex-col items-center justify-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                        <Search className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 mb-1">点击或拖拽文件到此处</p>
                      <p className="text-xs text-gray-400">支持图片、文档、视频等多种格式</p>
                    </label>
                    {currentAsset.file && (
                      <div className="mt-4 p-2 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium">已选择文件:</p>
                        <p className="text-xs text-gray-600">{currentAsset.file.name}</p>
                        <p className="text-xs text-gray-500">{Math.round(currentAsset.file.size / 1024)} KB</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    className="input-field"
                    placeholder={currentAsset.type ? assetTypePlaceholders[currentAsset.type] : "资产价值/地址"}
                    value={currentAsset.value || ''}
                    onChange={(e) => setCurrentAsset({ ...currentAsset, value: e.target.value })}
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">描述（可选）</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="描述（可选）"
                  value={currentAsset.description || ''}
                  onChange={(e) => setCurrentAsset({ ...currentAsset, description: e.target.value })}
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button onClick={addAsset} className="btn-primary flex-1">
                添加资产
              </button>
              <button onClick={resetAssetForm} className="btn-secondary flex-1">
                重置
              </button>
            </div>
          </motion.div>

          {assets.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="card space-y-4"
            >
              <h3 className="font-semibold">已添加的资产：</h3>
              {assets.map((asset, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium">{asset.name}</span>
                    <span className="text-gray-500 text-sm ml-2">({asset.type})</span>
                  </div>
                  <button
                    onClick={() => removeAsset(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    删除
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={assets.length === 0}
            className="btn-secondary w-full disabled:opacity-50"
          >
            下一步
          </button>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card space-y-6"
        >
          <h2 className="text-2xl font-semibold flex items-center">
            <Users className="h-6 w-6 mr-2 text-primary-600" />
            设置监护人
          </h2>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 flex items-center">
              <Search className="h-5 w-5 mr-2 text-primary-600" />
              搜索已注册用户
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                className="input-field pl-10"
                placeholder="输入用户ID搜索已注册用户..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  searchUsers(e.target.value, 'guardian')
                }}
              />
            </div>
            {searching && (
              <div className="mt-2 text-sm text-gray-500">搜索中...</div>
            )}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => selectGuardian(user)}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                  >
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500">ID: {user.id} | {user.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">监护人ID</label>
              <input
                type="text"
                className="input-field bg-gray-50"
                placeholder="通过搜索选择"
                value={newGuardian.id || ''}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">监护人姓名</label>
              <input
                type="text"
                className="input-field bg-gray-50"
                placeholder="通过搜索选择"
                value={newGuardian.name || ''}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">角色</label>
              <input
                type="text"
                className="input-field"
                placeholder="角色（如：妻子、律师）"
                value={newGuardian.role || ''}
                onChange={(e) => setNewGuardian({ ...newGuardian, role: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">邮箱</label>
              <input
                type="email"
                className="input-field bg-gray-50"
                placeholder="通过搜索选择"
                value={newGuardian.email || ''}
                readOnly
              />
            </div>
          </div>

          <button onClick={addGuardian} className="btn-primary w-full flex items-center justify-center">
            <Plus className="h-5 w-5 mr-2" />
            添加监护人
          </button>

          {guardians.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">已添加的监护人：</h3>
              {guardians.map((guardian) => (
                <div
                  key={guardian.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium">{guardian.name}</span>
                    <span className="text-gray-500 text-sm ml-2">({guardian.role})</span>
                    <span className="text-primary-600 text-sm ml-2">{guardian.email}</span>
                    <span className="text-gray-400 text-xs ml-2">ID: {guardian.id}</span>
                  </div>
                  <button
                    onClick={() => removeGuardian(guardian.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 flex items-center">
              <Users className="h-5 w-5 mr-2 text-primary-600" />
              指定继承人（可选）
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                className="input-field pl-10"
                placeholder="输入用户ID搜索继承人..."
                value={heirSearchQuery}
                onChange={(e) => {
                  setHeirSearchQuery(e.target.value)
                  searchUsers(e.target.value, 'heir')
                }}
              />
            </div>
            {heirSearching && (
              <div className="mt-2 text-sm text-gray-500">搜索中...</div>
            )}
            {heirSearchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {heirSearchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => selectHeir(user)}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                  >
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500">ID: {user.id} | {user.email}</div>
                  </button>
                ))}
              </div>
            )}
            {heirId && (
              <div className="mt-2 p-3 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border border-primary-100 shadow-sm">
                <div className="flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 text-primary-600 mr-2" />
                  已选择继承人ID: {heirId}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">门限阈值 (t)</label>
              <input
                type="number"
                min="1"
                max={guardians.length}
                className="input-field"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-500 mt-1">需要多少监护人同意才能恢复</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">总份额数 (n)</label>
              <input
                type="number"
                min={threshold}
                max={guardians.length}
                className="input-field"
                value={totalShares}
                onChange={(e) => setTotalShares(parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-500 mt-1">总共生成多少个份额</p>
            </div>
          </div>

          <div className="flex space-x-4">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1">
              上一步
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={guardians.length < threshold}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              下一步
            </button>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card space-y-6"
        >
          <h2 className="text-2xl font-semibold flex items-center">
            <Clock className="h-6 w-6 mr-2 text-primary-600" />
            设置触发条件
          </h2>

          <div className="space-y-4">
            <label className="block text-sm font-medium">基础触发机制</label>
            <div className="p-4 rounded-lg border-2 border-primary-600 bg-primary-50">
              <div className="font-semibold mb-1">社会共识</div>
              <div className="text-sm text-gray-600">需要 {threshold} 位监护人提交份额表示同意</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">启用时间锁</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={enableTimeLock}
                  onChange={(e) => setEnableTimeLock(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            {enableTimeLock && (
              <div>
                <label className="block text-sm font-medium mb-2">时间锁期限（天）</label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  className="input-field"
                  value={timeLock}
                  onChange={(e) => setTimeLock(parseFloat(e.target.value))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  启用时间锁后，需要同时满足两个条件：
                  <br />
                  1. 达到门限数量的监护人同意
                  <br />
                  2. 时间锁期限已到期
                  <br />
                  测试阶段可使用小数值（如 0.001）快速检查
                </p>
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button onClick={() => setStep(2)} className="btn-secondary flex-1">
              上一步
            </button>
            <button onClick={() => setStep(4)} className="btn-primary flex-1">
              下一步
            </button>
          </div>
        </motion.div>
      )}

      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card space-y-6"
        >
          <h2 className="text-2xl font-semibold flex items-center">
            <Save className="h-6 w-6 mr-2 text-primary-600" />
            确认并创建
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">资产清单</h3>
              {assets.map((asset, index) => (
                <div key={index} className="text-sm py-1">
                  {asset.name} ({asset.type}) - {asset.type === 'file' ? (
                    asset.file ? `${asset.file.name} (${Math.round(asset.file.size / 1024)} KB)` : '已上传文件'
                  ) : (
                    asset.value
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">监护人配置</h3>
              <div className="text-sm">
                监护人数量: {guardians.length}
                <br />
                门限配置: {threshold}-of-{totalShares}
                <br />
                触发机制: 社会共识
                {enableTimeLock && <br />}
                {enableTimeLock && `时间锁: ${timeLock}天`}
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-100 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="bg-yellow-100 p-2 rounded-full">
                  <Shield className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-800 mb-2">安全提示</h3>
                  <p className="text-sm text-yellow-700">
                    您的私钥将被分割成 {totalShares} 个份额，需要 {threshold} 位监护人协作才能恢复资产。
                    所有资产将在触发条件满足后自动转移，请确保监护人值得信任并了解操作流程。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button onClick={() => setStep(3)} className="btn-secondary flex-1">
              上一步
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? '创建中...' : '确认创建'}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
