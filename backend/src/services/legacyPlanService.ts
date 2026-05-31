import { shamirSecretSharing, Share, StoredShare } from '../crypto/shamir'
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
  shares: StoredShare[]
  encryptedAssets: string
  masterCommitment: string     // C_master = R*G + s*H（同态验证用）
  createdAt: string
  updatedAt: string
  status: 'active' | 'collecting' | 'completed'
  creatorId?: string
}

export interface InheritanceRequest {
  id: string
  planId: string
  initiatorId: string  // 发起继承请求的用户ID
  heirEmail: string     // 继承人邮箱
  guardianSignatures: string[]
  sharesCollected: number
  submittedGuardians: string[]
  submittedShares?: Share[]  // 存储提交的份额值（仅存在于内存中，不持久化）
  hasDuress: boolean  // 是否检测到胁迫提交
  status: 'pending' | 'collecting' | 'verifying' | 'completed' | 'duress'
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

      // 使用双多项式结构生成份额和盲因子
      const pedersenShares = shamirSecretSharing.generatePedersenShares(masterKey, data.totalShares, data.threshold)
      const encryptedAssets = shamirSecretSharing.encryptAsset(data.assets, masterKey)

      // 计算主承诺 C_master = R*G + s*H
      const masterCommitmentObj = shamirSecretSharing.generatePedersenCommitment(masterKey, pedersenShares.masterBlindingFactor)

      // 生成存储份额和邮件数据
      const storedShares: StoredShare[] = []
      const shareEmailDataList: Array<{
        guardian: any
        shareValue: string
        blindingFactor: string
        duressValue: string
        duressBlindingFactor: string
        duressCommitment: string
      }> = []

      for (let i = 0; i < data.totalShares; i++) {
        const ps = pedersenShares.shares[i]
        const guardian = data.guardians[i]

        // 用已分配好的盲因子生成承诺
        const commitmentResult = shamirSecretSharing.generatePedersenCommitment(ps.value, ps.blindingFactor)

        // 生成胁迫码信息
        const duressInfo = shamirSecretSharing.generateDuressInfo()

        storedShares.push({
          id: ps.id,
          index: ps.index,
          commitment: commitmentResult.commitment,
          blindingFactor: ps.blindingFactor,
          duressCommitment: duressInfo.duressCommitment,
          duressBlindingFactor: duressInfo.duressBlindingFactor,
        })

        shareEmailDataList.push({
          guardian,
          shareValue: ps.value,
          blindingFactor: ps.blindingFactor,
          duressValue: duressInfo.duressValue,
          duressBlindingFactor: duressInfo.duressBlindingFactor,
          duressCommitment: duressInfo.duressCommitment,
        })
      }

      // 处理资产数据，只保留非敏感信息
      const processedAssets = data.assets.map(asset => {
        if (asset.type === 'file') {
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
        assets: processedAssets,
        guardians: data.guardians,
        threshold: data.threshold,
        totalShares: data.totalShares,
        triggerMode: data.triggerMode,
        timeLock: data.timeLock,
        shares: storedShares,
        encryptedAssets,
        masterCommitment: masterCommitmentObj.commitment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        creatorId: data.creatorId,
      }

      this.plans.set(plan.id, plan)
      this.saveData()

      this.sendShareEmails(plan, shareEmailDataList)

      return plan
    } catch (error: any) {
      console.error('创建遗产计划失败:', error)
      throw new Error(error.message || '创建遗产计划失败')
    }
  }

  /**
   * 刷新计划份额（零和多项式方法，不涉及主密钥）
   *
   * 利用 Pedersen 承诺的同态加法性质：
   * - 生成两个 t-1 次零和多项式 Z_v(x)、Z_r(x)，满足 Z_v(0)=Z_r(0)=0
   * - 新份额值 v'_i = v_i + Z_v(i)，新盲因子 r'_i = r_i + Z_r(i)
   * - 新承诺 C'_i = C_i + Z_r(i)*G + Z_v(i)*H（纯 EC 点运算）
   * - 主承诺 C_master 不变（因为 Z_v(0)=Z_r(0)=0）
   *
   * server 全程不接触主密钥，仅通过 EC 点运算更新承诺
   */
  refreshPlanShares(planId: string): LegacyPlan {
    const plan = this.plans.get(planId)
    if (!plan) {
      throw new Error('Plan not found')
    }
    if (plan.status !== 'active') {
      throw new Error('只有活跃状态的计划才能刷新份额')
    }

    const n = plan.guardians.length
    const t = plan.threshold

    // 生成零和多项式增量
    const deltas = shamirSecretSharing.generateRefreshDeltas(n, t)

    const storedShares: StoredShare[] = []
    for (let i = 0; i < n; i++) {
      const guardian = plan.guardians[i]
      const existingShare = plan.shares[i]
      const delta = deltas[i]

      // 利用同态计算新承诺：C' = C + δ_r*G + δ_v*H
      const newCommitment = shamirSecretSharing.computeRefreshedCommitment(
        existingShare.commitment,
        delta.valueDelta,
        delta.blindingDelta
      )

      // 生成新的胁迫码
      const duressInfo = shamirSecretSharing.generateDuressInfo()

      // 保存刷新后的份额信息
      storedShares.push({
        id: existingShare.id,
        index: existingShare.index,
        commitment: newCommitment,
        blindingFactor: existingShare.blindingFactor, // 保持不变，存储用
        duressCommitment: duressInfo.duressCommitment,
        duressBlindingFactor: duressInfo.duressBlindingFactor,
      })

      // 发送刷新邮件（包含增量值和新的胁迫码）
      emailService.sendRefreshEmail({
        guardianName: guardian.name,
        guardianEmail: guardian.email,
        guardianId: guardian.id,
        planName: plan.name,
        planId: plan.id,
        shareIndex: existingShare.index,
        valueDelta: delta.valueDelta,
        blindingDelta: delta.blindingDelta,
        duressValue: duressInfo.duressValue,
        duressBlindingFactor: duressInfo.duressBlindingFactor,
        duressCommitment: duressInfo.duressCommitment,
        threshold: t,
        totalShares: n,
      })
    }

    // 更新计划（主承诺不变！）
    plan.shares = storedShares
    plan.updatedAt = new Date().toISOString()

    this.saveData()

    return plan
  }

  /**
   * 添加监护人 — 因 server 不存储主密钥，无法为新份额分配有效值，已禁用
   */
  addGuardianWithRefresh(planId: string, guardianData: any): LegacyPlan {
    throw new Error('server 不存储主密钥，无法在计划创建后修改监护人。请在创建计划时设置好所有监护人。')
  }

  /**
   * 删除监护人 — 因 server 不存储主密钥，无法重新分配份额，已禁用
   */
  removeGuardianWithRefresh(planId: string, guardianId: string): LegacyPlan {
    throw new Error('server 不存储主密钥，无法在计划创建后修改监护人。请在创建计划时设置好所有监护人。')
  }

  private async sendShareEmails(
    plan: LegacyPlan,
    emailDataList: Array<{
      guardian: any
      shareValue: string
      blindingFactor: string
      duressValue: string
      duressBlindingFactor: string
      duressCommitment: string
    }>
  ): Promise<void> {
    for (let i = 0; i < plan.guardians.length; i++) {
      const guardian = plan.guardians[i]
      const storedShare = plan.shares[i]
      const emailData = emailDataList[i]

      if (guardian.email && storedShare && emailData) {
        await emailService.sendShareEmail({
          guardianName: guardian.name,
          guardianEmail: guardian.email,
          guardianId: guardian.id,
          planName: plan.name,
          planId: plan.id,
          shareId: storedShare.id,
          shareIndex: storedShare.index,
          shareValue: emailData.shareValue,
          duressValue: emailData.duressValue,
          duressBlindingFactor: emailData.duressBlindingFactor,
          duressCommitment: emailData.duressCommitment,
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
      const isGuardian = plan.guardians.some((g: any) => g.id === userId)
      if (isGuardian) return true
      return false
    })
  }

  getPlansByInheritanceInitiator(userId: string): LegacyPlan[] {
    const planIds = new Set<string>()
    for (const request of this.inheritanceRequests.values()) {
      if (request.initiatorId === userId) {
        planIds.add(request.planId)
      }
    }
    return Array.from(planIds).map(id => this.plans.get(id)).filter(Boolean) as LegacyPlan[]
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
    initiatorId: string
    heirEmail: string
    guardianSignatures: string[]
  }): InheritanceRequest {
    const plan = this.plans.get(data.planId)
    if (!plan) {
      throw new Error('Plan not found')
    }

    if (plan.status === 'completed') {
      throw new Error('该计划已完成继承，不能再发起新的继承请求')
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
      initiatorId: data.initiatorId,
      heirEmail: data.heirEmail,
      guardianSignatures: data.guardianSignatures,
      sharesCollected: 0,
      submittedGuardians: [],
      hasDuress: false,
      status: 'collecting',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.inheritanceRequests.set(request.id, request)
    plan.updatedAt = new Date().toISOString()
    this.saveData()

    // 只有首次继承请求时通知监护人，避免重复通知
    const existingRequests = Array.from(this.inheritanceRequests.values()).filter(
      (r) => r.planId === data.planId && r.id !== request.id
    )
    if (existingRequests.length === 0) {
      this.notifyGuardians(plan, data.heirEmail)
    }

    return request
  }

  private async notifyGuardians(plan: LegacyPlan, heirEmail: string): Promise<void> {
    for (const guardian of plan.guardians) {
      if (guardian.email) {
        await emailService.sendInheritanceNotification({
          guardianName: guardian.name,
          guardianEmail: guardian.email,
          planName: plan.name,
          planId: plan.id,
          heirAddress: heirEmail,
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

    // 验证份额值不为空
    if (!data.shareValue || data.shareValue.trim() === '') {
      return { success: false, message: '份额值不能为空' }
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

    // 使用 Pedersen 承诺验证提交的份额值（支持正常承诺和胁迫承诺）
    const verificationResult = shamirSecretSharing.verifyShareAgainstCommitments(
      data.shareValue,
      storedShare.blindingFactor,
      storedShare.commitment,
      storedShare.duressBlindingFactor,
      storedShare.duressCommitment
    )

    if (verificationResult === 'invalid') {
      return { success: false, message: '份额值无效，请检查后重新提交' }
    }

    // 查找最新的继承请求（状态不是 completed 或 duress）
    const request = Array.from(this.inheritanceRequests.values()).find(
      (r) => r.planId === data.planId && r.status !== 'completed' && r.status !== 'duress'
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
      // 如果是胁迫提交，标记请求
      if (verificationResult === 'duress') {
        request.hasDuress = true
      }

      request.sharesCollected += 1
      request.submittedGuardians.push(data.guardianId)

      // 构建临时 Share 对象存储提交的份额值
      const tempShare: Share = {
        id: storedShare.id,
        index: storedShare.index,
        value: data.shareValue,
        commitment: storedShare.commitment
      }
      request.submittedShares.push(tempShare)
      request.updatedAt = new Date().toISOString()

      if (request.sharesCollected >= plan.threshold) {
        if (request.hasDuress) {
          // 检测到胁迫提交：不恢复资产，通知所有监护人
          request.status = 'duress'
          this.sendDuressAlerts(plan)
        } else {
          request.status = 'verifying'
          plan.status = 'completed'
          plan.updatedAt = new Date().toISOString()

          // 将该计划下的其他继承请求标记为已完成（避免堆积）
          for (const otherRequest of this.inheritanceRequests.values()) {
            if (otherRequest.planId === data.planId && otherRequest.id !== request.id && otherRequest.status !== 'completed') {
              otherRequest.status = 'completed'
            }
          }

          // 从提交的份额恢复主密钥
          const masterKey = shamirSecretSharing.combine(request.submittedShares)

          // 使用主密钥解密资产
          const decryptedAssets = shamirSecretSharing.decryptAsset(plan.encryptedAssets, masterKey)

          // 发送继承成功邮件给继承人（包含解密后的资产）
          if (request.heirEmail) {
            this.sendHeirNotificationEmail(request, plan, decryptedAssets)
          }
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
    const heirName = request.heirEmail.split('@')[0] || '继承人'
    await emailService.sendHeirNotification({
      heirName,
      heirEmail: request.heirEmail,
      planName: plan.name,
      planId: plan.id,
      assets: decryptedAssets,
    })
  }

  private async sendDuressAlerts(plan: LegacyPlan): Promise<void> {
    for (const guardian of plan.guardians) {
      if (guardian.email) {
        await emailService.sendDuressAlert({
          guardianName: guardian.name,
          guardianEmail: guardian.email,
          planName: plan.name,
          planId: plan.id,
          triggeredAt: new Date(),
        })
      }
    }
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
    const masterKey = shamirSecretSharing.combine(shares)
    
    // 使用主密钥解密资产
    const assets = shamirSecretSharing.decryptAsset(plan.encryptedAssets, masterKey)

    plan.status = 'completed'
    plan.updatedAt = new Date().toISOString()

    // 查找对应的继承请求，获取继承人信息
    const request = Array.from(this.inheritanceRequests.values()).find(
      (r) => r.planId === planId && r.status !== 'completed'
    )

    // 发送继承成功通知给继承人（使用解密后的资产）
    if (request && request.heirEmail) {
      const heirName = request.heirEmail.split('@')[0] || '继承人'

      emailService.sendHeirNotification({
        heirName,
        heirEmail: request.heirEmail,
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
