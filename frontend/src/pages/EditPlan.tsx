import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Shield, Trash2, ArrowLeft, Users } from 'lucide-react'
import { getLegacyPlan, addPlanAsset, removePlanAsset } from '../services/api'
import { useNavigate, useParams } from 'react-router-dom'

interface Asset {
  type: 'crypto' | 'cloud' | 'file' | 'contract'
  name: string
  value: string
  description: string
}

const assetTypePlaceholders: Record<string, string> = {
  crypto: '钱包地址 (42位字符，以0x开头)',
  cloud: '云账号邮箱 (标准邮箱格式)',
  file: 'IPFS CID (以Qm开头)',
  contract: '智能合约地址 (42位字符，以0x开头)'
}

export default function EditPlan() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPlan()
  }, [id])

  const loadPlan = async () => {
    try {
      const data = await getLegacyPlan(id!)
      setPlan(data)
    } catch (error) {
      alert('加载计划失败')
    } finally {
      setLoading(false)
    }
  }

  const addAsset = async () => {
    if (!newAsset.type || !newAsset.name || !newAsset.value) {
      alert('请填写完整的资产信息')
      return
    }

    setSaving(true)
    try {
      const updatedPlan = await addPlanAsset(id!, newAsset as Asset)
      setPlan(updatedPlan)
      setNewAsset({})
      alert('资产添加成功')
    } catch (error) {
      alert('添加资产失败')
    } finally {
      setSaving(false)
    }
  }

  const removeAsset = async (index: number) => {
    if (!confirm('确定要删除这个资产吗？')) return

    setSaving(true)
    try {
      const updatedPlan = await removePlanAsset(id!, index)
      setPlan(updatedPlan)
      alert('资产删除成功')
    } catch (error) {
      alert('删除资产失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">计划不存在</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            返回控制台
          </button>
        </div>
      </div>
    )
  }

  if (plan.status !== 'active') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center card p-8">
          <Shield className="h-16 w-16 mx-auto mb-4 text-yellow-600" />
          <h2 className="text-2xl font-bold mb-2">无法编辑计划</h2>
          <p className="text-gray-600 mb-4">
            该计划当前状态为：<span className="font-semibold text-yellow-600">
              {plan.status === 'collecting' ? '继承中' : '已继承'}
            </span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            只有活跃状态的计划才能进行编辑
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            返回控制台
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/dashboard')} className="btn-secondary flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gradient">编辑遗产计划</h1>
            <p className="text-gray-600">{plan.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">状态：</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            plan.status === 'active' ? 'bg-green-100 text-green-800' :
            plan.status === 'collecting' ? 'bg-yellow-100 text-yellow-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {plan.status === 'active' ? '活跃' :
             plan.status === 'collecting' ? '继承中' : '已继承'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card space-y-6"
        >
          <h2 className="text-2xl font-semibold flex items-center">
            <Shield className="h-6 w-6 mr-2 text-primary-600" />
            管理资产
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">资产类型</label>
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
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">资产名称</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="资产名称"
                  value={newAsset.name || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">资产价值/地址</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={newAsset.type ? assetTypePlaceholders[newAsset.type] : "资产价值/地址"}
                  value={newAsset.value || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, value: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">描述（可选）</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="描述（可选）"
                  value={newAsset.description || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          <button onClick={addAsset} disabled={saving} className="btn-primary w-full flex items-center justify-center">
            <Plus className="h-5 w-5 mr-2" />
            {saving ? '添加中...' : '添加资产'}
          </button>

          {plan.assets && plan.assets.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-primary-600" />
                已添加的资产
              </h3>
              <div className="space-y-3">
                {plan.assets.map((asset: Asset, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div>
                      <span className="font-medium text-gray-800">{asset.name}</span>
                      <span className="text-gray-500 text-sm ml-2">({asset.type})</span>
                      {asset.description && (
                        <div className="text-xs text-gray-400 mt-1">{asset.description}</div>
                      )}
                    </div>
                    <button
                      onClick={() => removeAsset(index)}
                      className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card space-y-6"
        >
          <h2 className="text-2xl font-semibold flex items-center">
            <Users className="h-6 w-6 mr-2 text-primary-600" />
            监护人信息
          </h2>

          <div className="p-4 bg-gradient-to-r from-blue-50 to-primary-50 rounded-xl border border-blue-100 shadow-sm">
            <p className="text-sm text-gray-700">
              监护人信息在计划创建时已经确定，无法在创建后添加或删除监护人。
              这是为了确保份额分配的安全性和一致性。
            </p>
          </div>

          {plan.guardians && plan.guardians.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 flex items-center">
                <Users className="h-5 w-5 mr-2 text-primary-600" />
                已添加的监护人
              </h3>
              <div className="space-y-3">
                {plan.guardians.map((guardian: any) => (
                  <motion.div
                    key={guardian.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-800">{guardian.name}</span>
                        <span className="text-gray-500 text-sm ml-2">({guardian.role})</span>
                      </div>
                    </div>
                    {guardian.email && (
                      <div className="text-xs text-gray-400 mt-1">{guardian.email}</div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
