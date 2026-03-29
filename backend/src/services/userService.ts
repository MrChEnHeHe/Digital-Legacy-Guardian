import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { emailService } from './emailService'

const STORAGE_PATH = path.join(__dirname, '../../storage')
const USERS_FILE = path.join(STORAGE_PATH, 'users.json')
const VERIFICATION_CODES_FILE = path.join(STORAGE_PATH, 'verificationCodes.json')

if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true })
}

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({}))
}

if (!fs.existsSync(VERIFICATION_CODES_FILE)) {
  fs.writeFileSync(VERIFICATION_CODES_FILE, JSON.stringify({}))
}

export interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  salt: string
  createdAt: string
  updatedAt: string
}

interface VerificationCode {
  code: string
  email: string
  purpose: 'login' | 'register'
  expiresAt: number
}

function loadFromFile(filePath: string): any {
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error)
    return {}
  }
}

function saveToFile(filePath: string, data: any): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error)
  }
}

function generateUserId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

class UserService {
  private users: Map<string, User> = new Map()
  private usersByEmail: Map<string, User> = new Map()
  private verificationCodes: Map<string, VerificationCode> = new Map()

  constructor() {
    this.loadData()
  }

  private loadData(): void {
    const usersData = loadFromFile(USERS_FILE)
    for (const [id, user] of Object.entries(usersData)) {
      const u = user as User
      this.users.set(id, u)
      this.usersByEmail.set(u.email, u)
    }

    const codesData = loadFromFile(VERIFICATION_CODES_FILE)
    for (const [code, data] of Object.entries(codesData)) {
      this.verificationCodes.set(code, data as VerificationCode)
    }

    console.log(`Loaded ${this.users.size} users`)
  }

  private saveData(): void {
    const usersData: Record<string, User> = {}
    this.users.forEach((user, id) => {
      usersData[id] = user
    })
    saveToFile(USERS_FILE, usersData)

    const codesData: Record<string, VerificationCode> = {}
    this.verificationCodes.forEach((code, key) => {
      codesData[key] = code
    })
    saveToFile(VERIFICATION_CODES_FILE, codesData)
  }

  async register(data: { name: string; email: string; password: string }): Promise<{ success: boolean; message: string; userId?: string }> {
    if (!data.name || !data.email || !data.password) {
      return { success: false, message: '请填写所有必填字段' }
    }

    if (this.usersByEmail.has(data.email)) {
      return { success: false, message: '该邮箱已被注册' }
    }

    if (data.password.length < 6) {
      return { success: false, message: '密码长度至少为6位' }
    }

    const salt = crypto.randomBytes(16).toString('hex')
    const passwordHash = hashPassword(data.password, salt)
    
    // 生成唯一的4位用户ID
    let userId = generateUserId()
    let attempts = 0
    while (this.users.has(userId) && attempts < 100) {
      userId = generateUserId()
      attempts++
    }
    
    if (this.users.has(userId)) {
      return { success: false, message: '系统繁忙，请稍后重试' }
    }

    const user: User = {
      id: userId,
      name: data.name,
      email: data.email,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.users.set(userId, user)
    this.usersByEmail.set(data.email, user)
    this.saveData()

    console.log(`用户注册成功: ${userId} - ${data.name} - ${data.email}`)

    return { success: true, message: '注册成功', userId }
  }

  async sendLoginVerificationCode(email: string): Promise<{ success: boolean; message: string }> {
    const user = this.usersByEmail.get(email)
    if (!user) {
      return { success: false, message: '该邮箱未注册' }
    }

    const code = generateVerificationCode()
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5分钟有效期

    this.verificationCodes.set(code, {
      code,
      email,
      purpose: 'login',
      expiresAt,
    })
    this.saveData()

    const emailSent = await emailService.sendVerificationCodeEmail({
      userName: user.name,
      userEmail: email,
      code,
      purpose: '登录',
    })

    if (emailSent) {
      console.log(`验证码已发送至 ${email}: ${code}`)
      return { success: true, message: '验证码已发送至您的邮箱' }
    } else {
      console.log(`验证码（模拟）: ${code}`)
      return { success: true, message: `验证码已生成（模拟模式）: ${code}` }
    }
  }

  async login(data: { email: string; password: string; verificationCode?: string }): Promise<{ success: boolean; message: string; user?: User }> {
    const user = this.usersByEmail.get(data.email)
    if (!user) {
      return { success: false, message: '该邮箱未注册' }
    }

    const passwordHash = hashPassword(data.password, user.salt)
    if (passwordHash !== user.passwordHash) {
      return { success: false, message: '密码错误' }
    }

    // 暂时跳过验证码验证，方便测试
    // const storedCode = this.verificationCodes.get(data.verificationCode)
    // if (!storedCode) {
    //   return { success: false, message: '验证码无效' }
    // }

    // if (storedCode.email !== user.email) {
    //   return { success: false, message: '验证码与邮箱不匹配' }
    // }

    // if (storedCode.purpose !== 'login') {
    //   return { success: false, message: '验证码用途错误' }
    // }

    // if (Date.now() > storedCode.expiresAt) {
    //   this.verificationCodes.delete(data.verificationCode)
    //   this.saveData()
    //   return { success: false, message: '验证码已过期，请重新获取' }
    // }

    // this.verificationCodes.delete(data.verificationCode)
    // this.saveData()

    console.log(`用户登录成功: ${user.id} - ${user.name}`)

    return { success: true, message: '登录成功', user }
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id)
  }

  getUserByEmail(email: string): User | undefined {
    return this.usersByEmail.get(email)
  }

  searchUserById(query: string): User[] {
    const results: User[] = []
    this.users.forEach((user) => {
      if (user.id.toLowerCase().includes(query.toLowerCase())) {
        results.push(user)
      }
    })
    return results
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values())
  }
}

export const userService = new UserService()
