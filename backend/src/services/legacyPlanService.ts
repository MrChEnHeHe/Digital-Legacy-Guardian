import { shamirSecretSharing, Share } from '../crypto/shamir'
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
  triggerMode: 'time' | 'consensus' | 'hybrid'
  timeLock: number
  masterKey: string
  shares: Share[]
  encryptedAssets: string
  createdAt: string
  updatedAt: string
  status: 'active' | 'collecting' | 'completed'
}

export interface InheritanceRequest {
  id: string
  planId: string
  heirAddress: string
  heirEmail?: string
  guardianSignatures: string[]
  sharesCollected: number
  submittedGuardians: string[]
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
    triggerMode: 'time' | 'consensus' | 'hybrid'
    timeLock: number
  }): LegacyPlan {
    const masterKey = shamirSecretSharing.generateMasterKey()
    const shares = shamirSecretSharing.split(masterKey, data.totalShares, data.threshold)
    const encryptedAssets = shamirSecretSharing.encryptAsset(data.assets, masterKey)

    const plan: LegacyPlan = {
      id: uuidv4(),
      name: data.name || `计划 ${this.plans.size + 1}`,
      assets: data.assets,
      guardians: data.guardians,
      threshold: data.threshold,
      totalShares: data.totalShares,
      triggerMode: data.triggerMode,
      timeLock: data.timeLock,
      masterKey,
      shares,
      encryptedAssets,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    }

    this.plans.set(plan.id, plan)
    this.saveData()

    this.sendShareEmails(plan)

    return plan
  }

  private async sendShareEmails(plan: LegacyPlan): Promise<void> {
    for (let i = 0; i < plan.guardians.length; i++) {
      const guardian = plan.guardians[i]
      const share = plan.shares[i]

      if (guardian.email && share) {
        await emailService.sendShareEmail({
          guardianName: guardian.name,
          guardianEmail: guardian.email,
          guardianId: guardian.id,
          planName: plan.name,
          planId: plan.id,
          shareId: share.id,
          shareIndex: share.index,
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
    share: string
  }): { success: boolean; message: string } {
    const plan = this.plans.get(data.planId)
    if (!plan) {
      return { success: false, message: 'Plan not found' }
    }

    const guardian = plan.guardians.find((g) => g.id === data.guardianId)
    if (!guardian) {
      return { success: false, message: 'Guardian not found' }
    }

    // 验证份额ID是否有效
    const share = plan.shares.find((s) => s.id === data.share)
    if (!share) {
      return { success: false, message: 'Invalid share ID' }
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
    // 检查监护人是否已经提交过份额
    if (!request.submittedGuardians.includes(data.guardianId)) {
      request.sharesCollected += 1
      request.submittedGuardians.push(data.guardianId)
      request.updatedAt = new Date().toISOString()

      if (request.sharesCollected >= plan.threshold) {
        request.status = 'verifying'
        plan.status = 'completed'
        plan.updatedAt = new Date().toISOString()
        
        // 发送继承成功邮件给继承人
        if (request.heirEmail) {
          this.sendHeirNotificationEmail(request, plan)
        }
      }

      this.saveData()

      // 发送成功提交份额的邮件给监护人
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

  private async sendHeirNotificationEmail(request: InheritanceRequest, plan: LegacyPlan): Promise<void> {
    await emailService.sendHeirNotification({
      heirName: request.heirAddress.slice(0, 10) + '...',
      heirEmail: request.heirEmail!,
      planName: plan.name,
      planId: plan.id,
      assets: plan.assets,
    })
  }

  async createDemoPlan(data: {
    name: string
    threshold: number
    totalShares: number
    triggerMode: 'time' | 'consensus' | 'hybrid'
    timeLock: number
    guardians: any[]
    assets: any[]
  }): Promise<LegacyPlan> {
    const masterKey = shamirSecretSharing.generateMasterKey()
    const shares = shamirSecretSharing.split(masterKey, data.totalShares, data.threshold)
    const encryptedAssets = shamirSecretSharing.encryptAsset(data.assets, masterKey)
    
    const plan: LegacyPlan = {
      id: data.name + '-' + Date.now(),
      name: data.name,
      assets: data.assets,
      guardians: data.guardians,
      threshold: data.threshold,
      totalShares: data.totalShares,
      triggerMode: data.triggerMode,
      timeLock: data.timeLock,
      masterKey,
      shares,
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

    await this.sendShareEmails(plan)

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

    const masterKey = shamirSecretSharing.combine(shares)
    const assets = shamirSecretSharing.decryptAsset(plan.encryptedAssets, masterKey)

    plan.status = 'completed'
    plan.updatedAt = new Date().toISOString()

    // 查找对应的继承请求，获取继承人信息
    const request = Array.from(this.inheritanceRequests.values()).find(
      (r) => r.planId === planId && r.status !== 'completed'
    )

    // 发送继承成功通知给继承人
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
