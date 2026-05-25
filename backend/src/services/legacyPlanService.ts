import { combineLegacyShares, shamirSecretSharing, Share, StoredShare } from '../crypto/shamir'
import { v4 as uuidv4 } from 'uuid'
import { emailService } from './emailService'
import * as fs from 'fs'
import * as path from 'path'

const STORAGE_PATH = path.join(__dirname, '../../storage')
const PLANS_FILE = path.join(STORAGE_PATH, 'plans.json')
const REQUESTS_FILE = path.join(STORAGE_PATH, 'requests.json')

// 确保存储目录存在
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true })
}

// 确保存储文件存在
if (!fs.existsSync(PLANS_FILE)) {
  fs.writeFileSync(PLANS_FILE, JSON.stringify({}))
}

if (!fs.existsSync(REQUESTS_FILE)) {
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify({}))
}

// 从文件加载数据
function loadFromFile(filePath: string): any {
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error)
    return {}
  }
}

// 保存数据到文件
function saveToFile(filePath: string, data: any): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error)
  }
}

export interface LegacyPlan {
  id: string
  name: string
  assets: any[]
  guardians: any[]
  threshold: number
  totalShares: number
  triggerMode: 'consensus' | 'timed'
  timeLock: number
  shares: StoredShare[]  // 使用 StoredShare，不存储份额值
  encryptedAssets: string
  createdAt: string
  updatedAt: string
  status: 'active' | 'collecting' | 'completed'
  creatorId?: string
  heirId?: string
}

export interface InheritanceRequest {
  id: string
  planId: string
  heirAddress: string
  heirEmail?: string
  guardianSignatures: string[]
  sharesCollected: number
  submittedGuardians: string[]
  submittedShares?: Share[]  // 存储提交的份额值（仅存在于内存中，不持久化）
  status: 'pending' | 'collecting' | 'verifying' | 'completed'
  createdAt: string
  updatedAt: string
}

class LegacyPlanService {
  private plans: Map<string, LegacyPlan> = new Map()
  private inheritanceRequests: Map<string, InheritanceRequest> = new Map()

  constructor() {
    // 从文件加载数据
    this.loadData()
  }

  private loadData(): void {
    // 加载计划数据
    const plansData = loadFromFile(PLANS_FILE)
    for (const [id, plan] of Object.entries(plansData)) {
      this.plans.set(id, plan as LegacyPlan)
    }

    // 加载继承请求数据
    const requestsData = loadFromFile(REQUESTS_FILE)
    for (const [id, request] of Object.entries(requestsData)) {
      this.inheritanceRequests.set(id, request as InheritanceRequest)
    }

    console.log(`Loaded ${this.plans.size} plans and ${this.inheritanceRequests.size} inheritance requests`)
  }

  private saveData(): void {
    // 保存计划数据
    const plansData: Record<string, LegacyPlan> = {}
    this.plans.forEach((plan, id) => {
      plansData[id] = plan
    })
    saveToFile(PLANS_FILE, plansData)

    // 保存继承请求数据
    const requestsData: Record<string, InheritanceRequest> = {}
    this.inheritanceRequests.forEach((request, id) => {
      requestsData[id] = request
    })
    saveToFile(REQUESTS_FILE, requestsData)
  }

  createPlan(data: {
    name?: string
    assets: any[]
    guardians: any[]
    threshold: number
    totalShares: number
    triggerMode: 'consensus' | 'timed'
    timeLock: number
    creatorId?: string
    heirId?: string
  }): LegacyPlan {
    try {
      // 验证输入数据
      if (!data.assets || data.assets.length === 0) {
        throw new Error('至少需要添加一个资产')
      }
      if (!data.guardians || data.guardians.length === 0) {
        throw new Error('至少需要添加一个监护人')
      }
      if (data.threshold < 1 || data.threshold > data.totalShares) {
        throw new Error('门限阈值必须在 1 到总份额数之间')
      }
      if (data.totalShares > data.guardians.length) {
        throw new Error('总份额数不能超过监护人数量')
      }

      const masterKey = shamirSecretSharing.generateMasterKey()
      const shares = shamirSecretSharing.split(masterKey, data.totalShares, data.threshold)
      const encryptedAssets = shamirSecretSharing.encryptAsset(data.assets, masterKey)

      // 将 Share 转换为 StoredShare（移除 value 字段）
      const storedShares: StoredShare[] = shares.map(share => ({
        id: share.id,
        index: share.index,
        commitment: share.commitment,
        proof: share.proof,
        polynomialCommitments: share.polynomialCommitments
      }))

      // 处理资产数据，只保留非敏感信息
      const processedAssets = data.assets.map(asset => {
        if (asset.type === 'file') {
          // 对于文件类型的资产，只保留基本信息
          return {
            type: asset.type,
            name: asset.name,
            description: asset.description || '',
            file: asset.file ? {
              name: asset.file.name,
              type: asset.file.type,
              size: asset.file.size
            } : undefined
          }
        } else {
          // 对于其他类型的资产，只保留基本信息
          return {
            type: asset.type,
            name: asset.name,
            description: asset.description || ''
          }
        }
      })

      const plan: LegacyPlan = {
        id: uuidv4(),
        name: data.name || `计划 ${this.plans.size + 1}`,
        assets: processedAssets, // 只存储资产的基本信息
        guardians: data.guardians,
        threshold: data.threshold,
        totalShares: data.totalShares,
        triggerMode: data.triggerMode,
        timeLock: data.timeLock,
        shares: storedShares,
        encryptedAssets,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        creatorId: data.creatorId,
        heirId: data.heirId,
      }

      this.plans.set(plan.id, plan)
      this.saveData()

      // 发送邮件时包含完整的份额值
      this.sendShareEmails(plan, shares)

      return plan
    } catch (error: any) {
      console.error('创建遗产计划失败:', error)
      throw new Error(error.message || '创建遗产计划失败')
    }
  }

  private async sendShareEmails(plan: LegacyPlan, sharesWithValue?: Share[]): Promise<void> {
    for (let i = 0; i < plan.guardians.length; i++) {
      const guardian = plan.guardians[i]
      const storedShare = plan.shares[i]
      const fullShare = sharesWithValue?.[i]

      if (guardian.email && storedShare && fullShare) {
        await emailService.sendShareEmail({
          guardianName: guardian.name,
          guardianEmail: guardian.email,
          guardianId: guardian.id,
          planName: plan.name,
          planId: plan.id,
          shareId: storedShare.id,
          shareIndex: storedShare.index,
          shareValue: fullShare.value,  // 发送份额值给监护人
          threshold: plan.threshold,
          totalShares: plan.totalShares,
        })
      }
    }
  }

  getPlan(id: string): LegacyPlan | undefined {
    return this.plans.get(id)
  }

  getAllPlans(): LegacyPlan[] {
    return Array.from(this.plans.values())
  }

  getUserPlans(userId: string): LegacyPlan[] {
    return Array.from(this.plans.values()).filter(plan => {
      if (plan.creatorId === userId) return true
      if (plan.heirId === userId) return true
      const isGuardian = plan.guardians.some((g: any) => g.id === userId)
      if (isGuardian) return true
      return false
    })
  }

  updatePlan(id: string, updates: Partial<LegacyPlan>): LegacyPlan | undefined {
    const plan = this.plans.get(id)
    if (!plan) return undefined

    const updatedPlan = { ...plan, ...updates, updatedAt: new Date().toISOString() }
    this.plans.set(id, updatedPlan)
    this.saveData()
    return updatedPlan
  }

  addAsset(planId: string, asset: any): LegacyPlan | undefined {
    const plan = this.plans.get(planId)
    if (!plan) return undefined

    plan.assets.push(asset)
    plan.updatedAt = new Date().toISOString()
    this.saveData()
    return plan
  }

  removeAsset(planId: string, assetIndex: number): LegacyPlan | undefined {
    const plan = this.plans.get(planId)
    if (!plan) return undefined

    if (assetIndex < 0 || assetIndex >= plan.assets.length) {
      return undefined
    }

    plan.assets.splice(assetIndex, 1)
    plan.updatedAt = new Date().toISOString()
    this.saveData()
    return plan
  }



  deletePlan(id: string): boolean {
    const result = this.plans.delete(id)
    if (result) {
      this.saveData()
    }
    return result
  }

  initiateInheritance(data: {
    planId: string
    heirAddress: string
    heirEmail: string
    guardianSignatures: string[]
  }): InheritanceRequest {
    const plan = this.plans.get(data.planId)
    if (!plan) {
      throw new Error('Plan not found')
    }

    if (plan.status !== 'active') {
      throw new Error('Plan is not active')
    }

    // 检查时间锁是否到期
    if (plan.triggerMode === 'timed') {
      if (plan.timeLock && plan.timeLock > 0) {
        const createdAt = new Date(plan.createdAt)
        const now = new Date()
        const totalMilliseconds = plan.timeLock * 24 * 60 * 60 * 1000
        const elapsedMilliseconds = now.getTime() - createdAt.getTime()
        
        if (elapsedMilliseconds < totalMilliseconds) {
          const remainingDays = Math.floor((totalMilliseconds - elapsedMilliseconds) / (24 * 60 * 60 * 1000))
          const remainingHours = Math.floor(((totalMilliseconds - elapsedMilliseconds) % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
          const remainingMinutes = Math.floor(((totalMilliseconds - elapsedMilliseconds) % (60 * 60 * 1000)) / (60 * 1000))
          const remainingSeconds = Math.floor(((totalMilliseconds - elapsedMilliseconds) % (60 * 1000)) / 1000)
          
          let remainingTime = ''
          if (remainingDays > 0) remainingTime += `${remainingDays}天 `
          if (remainingHours > 0) remainingTime += `${remainingHours}小时 `
          if (remainingMinutes > 0) remainingTime += `${remainingMinutes}分钟 `
          if (remainingSeconds > 0) remainingTime += `${remainingSeconds}秒`
          
          throw new Error(`时间锁未到期，剩余时间：${remainingTime.trim()}`)
        }
      }
    }

    const request: InheritanceRequest = {
      id: uuidv4(),
      planId: data.planId,
      heirAddress: data.heirAddress,
      heirEmail: data.heirEmail,
      guardianSignatures: data.guardianSignatures,
      sharesCollected: 0,
      submittedGuardians: [],
      status: 'collecting',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.inheritanceRequests.set(request.id, request)

    plan.status = 'collecting'
    plan.updatedAt = new Date().toISOString()
    this.saveData()

    this.notifyGuardians(plan, data.heirAddress)

    return request
  }

  private async notifyGuardians(plan: LegacyPlan, heirAddress: string): Promise<void> {
    for (const guardian of plan.guardians) {
      if (guardian.email) {
        await emailService.sendInheritanceNotification({
          guardianName: guardian.name,
          guardianEmail: guardian.email,
          planName: plan.name,
          planId: plan.id,
          heirAddress,
        })
      }
    }
  }

  getInheritanceRequest(id: string): InheritanceRequest | undefined {
    return this.inheritanceRequests.get(id)
  }

  submitGuardianShare(data: {
    planId: string
    guardianId: string
    shareValue: string
  }): { success: boolean; message: string } {
    const plan = this.plans.get(data.planId)
    if (!plan) {
      return { success: false, message: 'Plan not found' }
    }

    const guardianIndex = plan.guardians.findIndex((g) => g.id === data.guardianId)
    if (guardianIndex === -1) {
      return { success: false, message: 'Guardian not found' }
    }

    // 查找该监护人对应的份额（通过索引匹配）
    const storedShare = plan.shares[guardianIndex]
    if (!storedShare) {
      return { success: false, message: 'Share not found for this guardian' }
    }

    // 使用承诺值验证提交的份额值
    // 构造临时Share对象用于验证
    const tempShare: Share = {
      id: storedShare.id,
      index: storedShare.index,
      value: data.shareValue,
      commitment: storedShare.commitment
    }
    
    const isValid = shamirSecretSharing.verifyShareProof(tempShare, storedShare)
    if (!isValid) {
      return { success: false, message: 'Invalid share value or zero-knowledge proof' }
    }

    // 查找最新的继承请求（状态不是 completed）
    const request = Array.from(this.inheritanceRequests.values()).find(
      (r) => r.planId === data.planId && r.status !== 'completed'
    )

    if (!request) {
      return { success: false, message: 'No active inheritance request' }
    }

    // 确保 submittedGuardians 字段存在
    if (!request.submittedGuardians) {
      request.submittedGuardians = []
    }
    
    // 确保 submittedShares 字段存在（用于存储提交的份额值）
    if (!request.submittedShares) {
      request.submittedShares = []
    }
    
    // 检查监护人是否已经提交过份额
    if (!request.submittedGuardians.includes(data.guardianId)) {
      request.sharesCollected += 1
      request.submittedGuardians.push(data.guardianId)
      // 存储提交的份额值（用于后续恢复主密钥）
      request.submittedShares.push(tempShare)
      request.updatedAt = new Date().toISOString()

      if (request.sharesCollected >= plan.threshold) {
        request.status = 'verifying'
        plan.status = 'completed'
        plan.updatedAt = new Date().toISOString()
        
        // 从提交的份额恢复主密钥
        const masterKey = request.submittedShares.some((share) => {
          const storedShare = plan.shares.find((s) => s.id === share.id && s.index === share.index)
          return storedShare?.proof || storedShare?.polynomialCommitments?.length
        }) ? shamirSecretSharing.combine(request.submittedShares) : combineLegacyShares(request.submittedShares)
        
        // 使用主密钥解密资产
        const decryptedAssets = shamirSecretSharing.decryptAsset(plan.encryptedAssets, masterKey)
        
        // 发送继承成功邮件给继承人（包含解密后的资产）
        if (request.heirEmail) {
          this.sendHeirNotificationEmail(request, plan, decryptedAssets)
        }
      }

      this.saveData()

      // 发送成功提交份额的邮件给监护人
      const guardian = plan.guardians[guardianIndex]
      if (guardian.email) {
        this.sendGuardianShareSubmittedEmail(guardian, plan)
      }

      return { success: true, message: 'Share submitted successfully' }
    } else {
      return { success: false, message: 'Guardian has already submitted share' }
    }
  }

  private async sendGuardianShareSubmittedEmail(guardian: any, plan: LegacyPlan): Promise<void> {
    await emailService.sendGuardianShareSubmittedNotification({
      guardianName: guardian.name,
      guardianEmail: guardian.email,
      planName: plan.name,
      planId: plan.id,
      submittedAt: new Date(),
    })
  }

  private async sendHeirNotificationEmail(request: InheritanceRequest, plan: LegacyPlan, decryptedAssets: any[]): Promise<void> {
    await emailService.sendHeirNotification({
      heirName: request.heirAddress.slice(0, 10) + '...',
      heirEmail: request.heirEmail!,
      planName: plan.name,
      planId: plan.id,
      assets: decryptedAssets,
    })
  }

  async createDemoPlan(data: {
    name: string
    threshold: number
    totalShares: number
    triggerMode: 'consensus' | 'timed'
    timeLock: number
    guardians: any[]
    assets: any[]
  }): Promise<LegacyPlan> {
    if (!data.guardians || data.guardians.length === 0) {
      throw new Error('Demo plan requires at least one guardian')
    }
    if (data.threshold < 1 || data.threshold > data.totalShares) {
      throw new Error('Demo threshold must be between 1 and totalShares')
    }
    if (data.totalShares > data.guardians.length) {
      throw new Error('Demo totalShares cannot exceed guardian count')
    }

    const masterKey = shamirSecretSharing.generateMasterKey()
    const shares = shamirSecretSharing.split(masterKey, data.totalShares, data.threshold)
    const encryptedAssets = shamirSecretSharing.encryptAsset(data.assets, masterKey)
    
    // 将 Share 转换为 StoredShare（移除 value 字段）
    const storedShares: StoredShare[] = shares.map(share => ({
      id: share.id,
      index: share.index,
      commitment: share.commitment,
      proof: share.proof,
      polynomialCommitments: share.polynomialCommitments
    }))
    
    const plan: LegacyPlan = {
      id: data.name + '-' + Date.now(),
      name: data.name,
      assets: data.assets,
      guardians: data.guardians,
      threshold: data.threshold,
      totalShares: data.totalShares,
      triggerMode: data.triggerMode,
      timeLock: data.timeLock,
      shares: storedShares,
      encryptedAssets,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    }

    this.plans.set(plan.id, plan)
    this.saveData()

    console.log('=== 演示计划创建成功 ===')
    console.log('遗产计划信息:')
    console.log(`- 计划ID: ${plan.id}`)
    console.log(`- 计划名称: ${plan.name}`)
    console.log(`- 门限配置: ${plan.threshold}-of-${plan.totalShares}`)
    console.log(`- 触发模式: ${plan.triggerMode}`)
    console.log(`- 时间锁: ${plan.timeLock}天`)
    console.log('\n监护人信息:')
    data.guardians.forEach((g, i) => {
      console.log(`${i + 1}. ${g.name} (${g.role})`)
      console.log(`   - 监护人ID: ${g.id}`)
      console.log(`   - 邮箱: ${g.email}`)
    })
    console.log('\n资产信息:')
    data.assets.forEach((a, i) => {
      console.log(`${i + 1}. ${a.name} (${a.type})`)
      console.log(`   - 详情: ${a.value}`)
      console.log(`   - 描述: ${a.description}`)
    })

    await this.sendShareEmails(plan, shares)

    return plan
  }

  getInheritanceStatus(planId: string): any {
    const plan = this.plans.get(planId)
    if (!plan) {
      throw new Error('Plan not found')
    }

    const request = Array.from(this.inheritanceRequests.values()).find(
      (r) => r.planId === planId && r.status !== 'completed'
    )

    if (!request) {
      return {
        planId,
        status: 'no_request',
        threshold: plan.threshold,
        sharesCollected: 0,
        guardians: plan.guardians.map((g) => ({
          ...g,
          hasSubmitted: false,
        })),
        assets: plan.assets,
      }
    }

    // 确保 submittedGuardians 字段存在
    if (!request.submittedGuardians) {
      request.submittedGuardians = []
    }

    return {
      planId,
      status: request.status,
      threshold: plan.threshold,
      sharesCollected: request.sharesCollected,
      guardians: plan.guardians.map((g) => ({
        ...g,
        hasSubmitted: request.submittedGuardians.includes(g.id),
      })),
      assets: plan.assets,
    }
  }

  recoverAssets(planId: string, shares: Share[]): any {
    const plan = this.plans.get(planId)
    if (!plan) {
      throw new Error('Plan not found')
    }

    if (shares.length < plan.threshold) {
      throw new Error('Not enough shares to recover')
    }

    // 从份额恢复主密钥
    for (const share of shares) {
      const storedShare = plan.shares.find((s) => s.index === share.index && s.id === share.id)
      if (!storedShare || !shamirSecretSharing.verifyShareProof(share, storedShare)) {
        throw new Error(`Invalid share proof for share #${share.index}`)
      }
    }

    const masterKey = shares.some((share) => {
      const storedShare = plan.shares.find((s) => s.id === share.id && s.index === share.index)
      return storedShare?.proof || storedShare?.polynomialCommitments?.length
    }) ? shamirSecretSharing.combine(shares) : combineLegacyShares(shares)
    
    // 使用主密钥解密资产
    const assets = shamirSecretSharing.decryptAsset(plan.encryptedAssets, masterKey)

    plan.status = 'completed'
    plan.updatedAt = new Date().toISOString()

    // 查找对应的继承请求，获取继承人信息
    const request = Array.from(this.inheritanceRequests.values()).find(
      (r) => r.planId === planId && r.status !== 'completed'
    )

    // 发送继承成功通知给继承人（使用解密后的资产）
    if (request && request.heirAddress) {
      // 尝试从继承人地址中提取姓名和邮箱
      // 假设 heirAddress 是邮箱格式，如 "name <email@example.com>"
      let heirName = '继承人'
      let heirEmail = request.heirAddress

      // 简单的邮箱提取逻辑
      const emailRegex = /<([^>]+)>/
      const match = request.heirAddress.match(emailRegex)
      if (match) {
        heirEmail = match[1]
        heirName = request.heirAddress.replace(emailRegex, '').trim()
      } else if (request.heirAddress.includes('@')) {
        // 如果直接是邮箱，使用邮箱前缀作为姓名
        heirEmail = request.heirAddress
        heirName = request.heirAddress.split('@')[0]
      }

      emailService.sendHeirNotification({
        heirName,
        heirEmail,
        planName: plan.name,
        planId: plan.id,
        assets
      })

      // 更新继承请求状态
      request.status = 'completed'
      request.updatedAt = new Date().toISOString()
    }

    this.saveData()

    return assets
  }
}

export const legacyPlanService = new LegacyPlanService()
