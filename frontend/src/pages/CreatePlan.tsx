import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Save, Users, Clock, Shield, Search } from 'lucide-react'
import { createLegacyPlan, authApi } from '../services/api'

interface Asset {
  type: 'crypto' | 'cloud' | 'file' | 'contract'
  name: string
  value: string
  description: string
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
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({})
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
    if (newAsset.type && newAsset.name && newAsset.value) {
      setAssets([...assets, newAsset as Asset])
      setNewAsset({})
    }
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
    } catch (error) {
      alert('创建失败，请重试')
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

      <div className="flex justify-center space-x-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all duration-300 ${
              s <= step ? 'bg-primary-600 w-16' : 'bg-gray-300 w-8'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card space-y-6"
        >
          <h2 className="text-2xl font-semibold flex items-center">
            <Shield className="h-6 w-6 mr-2 text-primary-600" />
            添加数字资产
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              className="input-field"
              value={newAsset.type || ''}
              onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value as Asset['type'] })}
            >
              <option value="">选择资产类型</option>
              <option value="crypto">加密货币</option>
              <option value="cloud">云账号</option>
              <option value="file">加密文件</option>
              <option value="contract">智能合约</option>
            </select>

            <input
              type="text"
              className="input-field"
              placeholder="资产名称"
              value={newAsset.name || ''}
              onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
            />

            <input
              type="text"
              className="input-field"
              placeholder={newAsset.type ? assetTypePlaceholders[newAsset.type] : "资产价值/地址"}
              value={newAsset.value || ''}
              onChange={(e) => setNewAsset({ ...newAsset, value: e.target.value })}
            />

            <input
              type="text"
              className="input-field"
              placeholder="描述（可选）"
              value={newAsset.description || ''}
              onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
            />
          </div>

          <button onClick={addAsset} className="btn-primary w-full flex items-center justify-center">
            <Plus className="h-5 w-5 mr-2" />
            添加资产
          </button>

          {assets.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">已添加的资产：</h3>
              {assets.map((asset, index) => (
                <div
                  key={index}
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
                </div>
              ))}
            </div>
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

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">搜索已注册用户</h3>
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
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
              </div>
              {searching && (
                <div className="mt-2 text-sm text-gray-500">搜索中...</div>
              )}
              {searchResults.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => selectGuardian(user)}
                      className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">ID: {user.id} | {user.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
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

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">指定继承人（可选）</h3>
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
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
              </div>
              {heirSearching && (
                <div className="mt-2 text-sm text-gray-500">搜索中...</div>
              )}
              {heirSearchResults.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                  {heirSearchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => selectHeir(user)}
                      className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">ID: {user.id} | {user.email}</div>
                    </button>
                  ))}
                </div>
              )}
              {heirId && (
                <div className="mt-2 p-2 bg-green-100 rounded text-sm">
                  已选择继承人ID: {heirId}
                </div>
              )}
            </div>
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
                  {asset.name} ({asset.type}) - {asset.value}
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

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">安全提示</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• 您的私钥将被分割成 {totalShares} 个份额</li>
                <li>• 需要 {threshold} 位监护人协作才能恢复资产</li>
                <li>• 所有资产将在触发条件满足后自动转移</li>
                <li>• 请确保监护人值得信任并了解操作流程</li>
              </ul>
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
