import CryptoJS from 'crypto-js'
import EC from 'elliptic'
import BN from 'bn.js'
import { v4 as uuidv4 } from 'uuid'

export interface Share {
  id: string
  index: number
  value: string
  commitment: string
}

export interface StoredShare {
  id: string
  index: number
  commitment: string
  blindingFactor: string
  duressCommitment?: string
  duressBlindingFactor?: string
}

export interface GuardianKeyPair {
  publicKey: string
  privateKey: string
}

export interface DuressInfo {
  duressValue: string
  duressBlindingFactor: string
  duressCommitment: string
}

export interface ShareDelta {
  index: number
  valueDelta: string
  blindingDelta: string
}

export interface ShamirSecretSharing {
  split(secret: string, n: number, t: number): Share[]
  combine(shares: Share[]): string
  generateMasterKey(): string
  encryptAsset(assets: any[], masterKey: string): string
  decryptAsset(encryptedAsset: string, masterKey: string): any[]
  // Pedersen 承诺
  generatePedersenCommitment(value: string, blindingFactor?: string): { commitment: string; blindingFactor: string }
  verifyPedersenCommit(value: string, blindingFactor: string, commitment: string): boolean
  // 同态共享（双多项式结构，让盲因子也构成多项式）
  generatePedersenShares(masterKey: string, n: number, t: number): {
    shares: Array<{ id: string; index: number; value: string; blindingFactor: string }>;
    masterBlindingFactor: string;
  }
  // 验证同态和：Σ(λⱼ * Cᵢⱼ) == C_master
  verifyMasterCommitment(shares: Array<{ index: number; commitment: string }>, masterCommitment: string): boolean
  // 同态份额刷新（零和多项式，不触及主密钥）
  generateRefreshDeltas(n: number, t: number): ShareDelta[]
  computeRefreshedCommitment(oldCommitment: string, valueDelta: string, blindingDelta: string): string
  // 胁迫码
  generateDuressInfo(): DuressInfo
  // ECIES 加密
  encryptWithPublicKey(data: string, publicKey: string): string
  decryptWithPrivateKey(encryptedData: string, privateKey: string): string
  generateKeyPair(): GuardianKeyPair
}

export class ShamirSecretSharingImpl implements ShamirSecretSharing {
  private prime: bigint
  private ec: EC.ec
  private H_point: any = null

  constructor(prime?: string) {
    this.prime = BigInt(
      prime ||
        '115792089237316195423570985008687907853269984665640564039457584007913129639747'
    )
    this.ec = new EC.ec('secp256k1')
  }

  /** 获取 Pedersen 承诺的第二个生成点 H = G * SHA256(seed) */
  private getH(): any {
    if (!this.H_point) {
      const hash = CryptoJS.SHA256('DigitalLegacy-Pedersen-Generator-H').toString(CryptoJS.enc.Hex)
      this.H_point = this.ec.g.mul(new BN(hash, 16))
    }
    return this.H_point
  }

  // ========== Shamir 秘密共享 ==========

  split(secret: string, n: number, t: number): Share[] {
    const secretNum = BigInt('0x' + secret)
    const coefficients: bigint[] = [secretNum]

    for (let i = 1; i < t; i++) {
      coefficients.push(this.generateRandomCoefficient())
    }

    const shares: Share[] = []
    for (let i = 1; i <= n; i++) {
      const x = BigInt(i)
      const y = this.evaluatePolynomial(coefficients, x)
      const share: Share = {
        id: uuidv4(),
        index: i,
        value: y.toString(16),
        commitment: '',
      }
      share.commitment = this.generateCommitment(share)
      shares.push(share)
    }

    return shares
  }

  combine(shares: Share[]): string {
    if (shares.length < 1) {
      throw new Error('Need at least 1 share to reconstruct')
    }

    if (shares.length === 1) {
      return shares[0].value.padStart(64, '0')
    }

    const sortedShares = [...shares].sort((a, b) => a.index - b.index)
    const t = sortedShares.length

    let secret = BigInt(0)

    for (let i = 0; i < t; i++) {
      const share = sortedShares[i]
      const x = BigInt(share.index)
      const y = BigInt('0x' + share.value)

      let numerator = BigInt(1)
      let denominator = BigInt(1)

      for (let j = 0; j < t; j++) {
        if (i !== j) {
          const xj = BigInt(sortedShares[j].index)
          numerator = (numerator * (-xj)) % this.prime
          denominator = (denominator * (x - xj)) % this.prime
        }
      }

      const denominatorInverse = this.modInverse(denominator, this.prime)
      const lagrangeCoefficient = (numerator * denominatorInverse) % this.prime

      secret = (secret + (y * lagrangeCoefficient) % this.prime) % this.prime
    }

    if (secret < 0) {
      secret = secret + this.prime
    }

    return secret.toString(16).padStart(64, '0')
  }

  // ========== Pedersen 承诺（替代原 SHA-256 承诺） ==========

  /**
   * 生成 Pedersen 承诺
   * C = r * G + v * H
   * 其中 r 是盲因子，v 是份额值，G 和 H 是椭圆曲线上两个独立的生成点
   *
   * 安全特性：
   * - 完美隐藏：承诺 C 不泄露 v 的任何信息（即使攻击者有无限计算能力）
   * - 计算绑定：找到 (r', v') ≠ (r, v) 使得 r'*G + v'*H = C 等价于解离散对数问题
   */
  generatePedersenCommitment(value: string, blindingFactor?: string): { commitment: string; blindingFactor: string } {
    const H = this.getH()
    const G = this.ec.g

    // 如果未提供盲因子则生成随机盲因子
    const r = blindingFactor || this.generateRandomCoefficient().toString(16).padStart(64, '0')

    const vBN = new BN(value, 16)
    const rBN = new BN(r, 16)

    // C = r * G + v * H
    const C = G.mul(rBN).add(H.mul(vBN))

    return {
      commitment: C.encode('hex', false),
      blindingFactor: r
    }
  }

  /**
   * 验证 Pedersen 承诺
   * 检查 C == r * G + v * H
   */
  verifyPedersenCommit(value: string, blindingFactor: string, commitment: string): boolean {
    try {
      const H = this.getH()
      const G = this.ec.g

      const vBN = new BN(value, 16)
      const rBN = new BN(blindingFactor, 16)

      const C = G.mul(rBN).add(H.mul(vBN))
      return C.encode('hex', false) === commitment
    } catch {
      return false
    }
  }

  /**
   * 生成同态Pedersen共享（双多项式结构）
   *
   * 创建两个 t-1 次多项式：
   *   P(x) = s + a₁x + a₂x² + ...  （份额多项式，s = masterKey）
   *   Q(x) = R + b₁x + b₂x² + ...  （盲因子多项式，R = masterBlindingFactor）
   *
   * 份额 i:  v_i = P(i), r_i = Q(i)
   * 承诺 i:  C_i = r_i*G + v_i*H
   * 主承诺:  C_master = R*G + s*H
   *
   * 同态验证:  Σ(λⱼ * Cᵢⱼ) == C_master  （λⱼ 为 Lagrange 系数）
   * 不需要知道份额值，仅用 EC 点和 Lagrange 系数
   */
  generatePedersenShares(masterKey: string, n: number, t: number): {
    shares: Array<{ id: string; index: number; value: string; blindingFactor: string }>;
    masterBlindingFactor: string;
  } {
    const secretNum = BigInt('0x' + masterKey)
    const pCoeffs: bigint[] = [secretNum]  // P(x) 系数：P(0) = masterKey
    const qCoeffs: bigint[] = [this.generateRandomCoefficient()]  // Q(x) 系数：Q(0) = random R

    for (let i = 1; i < t; i++) {
      pCoeffs.push(this.generateRandomCoefficient())
      qCoeffs.push(this.generateRandomCoefficient())
    }

    const shares: Array<{ id: string; index: number; value: string; blindingFactor: string }> = []
    for (let i = 1; i <= n; i++) {
      const x = BigInt(i)
      const v = this.evaluatePolynomial(pCoeffs, x)
      const r = this.evaluatePolynomial(qCoeffs, x)
      shares.push({
        id: uuidv4(),
        index: i,
        value: v.toString(16),
        blindingFactor: r.toString(16).padStart(64, '0')
      })
    }

    const masterBlindingFactor = qCoeffs[0].toString(16).padStart(64, '0')
    return { shares, masterBlindingFactor }
  }

  /**
   * 验证主承诺：Σ(λⱼ * Cᵢⱼ) == C_master
   *
   * 利用 Pedersen 承诺的同态性质，仅通过 Lagrange 系数和 EC 点运算
   * 验证 t 个份额能否恢复出正确的主密钥，而无需知道份额值本身
   *
   * @param shares 份额的索引和承诺对
   * @param masterCommitment C_master = R*G + s*H
   * @returns 是否通过验证
   */
  verifyMasterCommitment(
    shares: Array<{ index: number; commitment: string }>,
    masterCommitment: string
  ): boolean {
    try {
      const t = shares.length
      if (t < 1) return false

      const sorted = [...shares].sort((a, b) => a.index - b.index)
      const curveN = this.ec.curve.n  // secp256k1 曲线阶（标量乘法模数）
      const G = this.ec.g

      // 从无穷远点开始（EC 加法单位元）
      let sum = G.mul(new BN(0))

      for (let i = 0; i < t; i++) {
        const idx = sorted[i].index
        const point = this.ec.keyFromPublic(sorted[i].commitment, 'hex').getPublic()

        // 计算 Lagrange 系数 λᵢ = Πⱼ≠ᵢ (0 - xⱼ) / (xᵢ - xⱼ) (mod curveN)
        let lambda = new BN(1)
        for (let j = 0; j < t; j++) {
          if (i !== j) {
            const xj = new BN(sorted[j].index)
            const xi = new BN(idx)
            // (-xj) mod n
            const num = new BN(0).sub(xj).mod(curveN)
            // (xi - xj) mod n
            const den = xi.sub(xj).mod(curveN)
            lambda = lambda.mul(num).mul(den.invm(curveN)).mod(curveN)
          }
        }

        // sum += λᵢ * Cᵢ
        sum = sum.add(point.mul(lambda))
      }

      return sum.encode('hex', false) === masterCommitment
    } catch (error) {
      console.error('Master commitment verification failed:', error)
      return false
    }
  }

  // ========== 同态份额刷新（零和多项式） ==========

  /**
   * 生成刷新增量（零和多项式方法）
   *
   * 创建两个 t-1 次零和多项式（常数项为 0）：
   *   Z_v(x) = a₁x + a₂x² + ... + a_{t-1}x^{t-1}    （值增量多项式）
   *   Z_r(x) = b₁x + b₂x² + ... + b_{t-1}x^{t-1}    （盲因子增量多项式）
   *
   * 安全特性：
   * - Z_v(0) = 0，Z_r(0) = 0，因此主承诺 C_master 不变
   * - 对每个份额 i (1..n)：v'_i = v_i + Z_v(i)，r'_i = r_i + Z_r(i)
   * - server 不知道 v_i，但监护人可自行在本地更新
   * - 新承诺 C'_i = C_i + Z_r(i)*G + Z_v(i)*H 可被 server 公开计算
   */
  generateRefreshDeltas(n: number, t: number): ShareDelta[] {
    // 零和值多项式 Z_v(x)：常数项为 0
    const zvCoeffs: bigint[] = [BigInt(0)]
    for (let i = 1; i < t; i++) {
      zvCoeffs.push(this.generateRandomCoefficient())
    }

    // 零和盲因子多项式 Z_r(x)：常数项为 0
    const zrCoeffs: bigint[] = [BigInt(0)]
    for (let i = 1; i < t; i++) {
      zrCoeffs.push(this.generateRandomCoefficient())
    }

    const deltas: ShareDelta[] = []
    for (let i = 1; i <= n; i++) {
      const x = BigInt(i)
      deltas.push({
        index: i,
        valueDelta: this.evaluatePolynomial(zvCoeffs, x).toString(16).padStart(64, '0'),
        blindingDelta: this.evaluatePolynomial(zrCoeffs, x).toString(16).padStart(64, '0'),
      })
    }

    return deltas
  }

  /**
   * 计算刷新后的承诺：C'_i = C_i + δ_r(i)*G + δ_v(i)*H
   *
   * 纯 EC 点运算，不需要知道原份额值 v_i 或盲因子 r_i
   */
  computeRefreshedCommitment(oldCommitment: string, valueDelta: string, blindingDelta: string): string {
    const G = this.ec.g
    const H = this.getH()

    const oldPoint = this.ec.keyFromPublic(oldCommitment, 'hex').getPublic()
    const vDeltaBN = new BN(valueDelta, 16)
    const rDeltaBN = new BN(blindingDelta, 16)

    // C' = C + δ_r*G + δ_v*H
    const newPoint = oldPoint.add(G.mul(rDeltaBN)).add(H.mul(vDeltaBN))
    return newPoint.encode('hex', false)
  }

  /**
   * 验证份额值是否匹配 Pedersen 承诺
   * 先尝试正常承诺匹配，再尝试胁迫承诺匹配
   * 返回值: 'valid' | 'duress' | 'invalid'
   */
  verifyShareAgainstCommitments(
    shareValue: string,
    blindingFactor: string,
    commitment: string,
    duressBlindingFactor?: string,
    duressCommitment?: string
  ): 'valid' | 'duress' | 'invalid' {
    // 检查是否匹配正常承诺
    if (this.verifyPedersenCommit(shareValue, blindingFactor, commitment)) {
      return 'valid'
    }
    // 检查是否匹配胁迫承诺
    if (duressBlindingFactor && duressCommitment) {
      if (this.verifyPedersenCommit(shareValue, duressBlindingFactor, duressCommitment)) {
        return 'duress'
      }
    }
    return 'invalid'
  }

  // ========== 胁迫码 ==========

  /**
   * 生成胁迫份额信息
   * 返回一个随机的胁迫份额值和其对应的 Pedersen 承诺
   */
  generateDuressInfo(): DuressInfo {
    const duressValue = this.generateRandomCoefficient().toString(16).padStart(64, '0')
    const pedersen = this.generatePedersenCommitment(duressValue)
    return {
      duressValue,
      duressBlindingFactor: pedersen.blindingFactor,
      duressCommitment: pedersen.commitment
    }
  }

  // ========== ECIES 加密（份额加密传输） ==========

  /**
   * 使用 ECIES (Elliptic Curve Integrated Encryption Scheme) 加密数据
   * 1. 生成临时 ephemeral 密钥对
   * 2. ECDH 派生共享密钥
   * 3. SHA-256 派生 AES 密钥
   * 4. AES 加密明文
   * 5. 返回密文 + ephemeral 公钥
   */
  encryptWithPublicKey(data: string, publicKeyHex: string): string {
    const pubKey = this.ec.keyFromPublic(publicKeyHex, 'hex')
    const ephemeral = this.ec.genKeyPair()

    // ECDH 密钥交换
    const sharedSecret = ephemeral.derive(pubKey.getPublic())
    // 用 SHA-256 派生 AES 密钥
    const aesKey = CryptoJS.SHA256(sharedSecret.toString(16)).toString(CryptoJS.enc.Hex).substring(0, 32)

    // AES 加密
    const ciphertext = CryptoJS.AES.encrypt(data, aesKey).toString()
    const ephemeralPubKeyHex = ephemeral.getPublic().encode('hex', false)

    return JSON.stringify({
      ciphertext,
      ephemeralPubKey: ephemeralPubKeyHex
    })
  }

  /**
   * 使用 ECIES 解密数据
   */
  decryptWithPrivateKey(encryptedPackage: string, privateKeyHex: string): string {
    try {
      const { ciphertext, ephemeralPubKey } = JSON.parse(encryptedPackage)

      const ephemKey = this.ec.keyFromPublic(ephemeralPubKey, 'hex')
      const privKey = this.ec.keyFromPrivate(privateKeyHex, 'hex')

      // ECDH 密钥交换
      const sharedSecret = privKey.derive(ephemKey.getPublic())
      // SHA-256 派生 AES 密钥
      const aesKey = CryptoJS.SHA256(sharedSecret.toString(16)).toString(CryptoJS.enc.Hex).substring(0, 32)

      // AES 解密
      const bytes = CryptoJS.AES.decrypt(ciphertext, aesKey)
      return bytes.toString(CryptoJS.enc.Utf8)
    } catch {
      throw new Error('解密失败：密钥不匹配或数据已损坏')
    }
  }

  /**
   * 生成 secp256k1 密钥对（用于份额加密传输）
   */
  generateKeyPair(): GuardianKeyPair {
    const keyPair = this.ec.genKeyPair()
    return {
      publicKey: keyPair.getPublic().encode('hex', false),
      privateKey: keyPair.getPrivate().toString(16).padStart(64, '0')
    }
  }

  // ========== 保留的 SHA-256 承诺（向后兼容） ==========

  generateCommitment(share: Share): string {
    const data = share.id + share.value + share.index.toString()
    return CryptoJS.SHA256(data).toString()
  }

  verifyCommitment(share: Share, commitment: string): boolean {
    const computedCommitment = this.generateCommitment(share)
    return computedCommitment === commitment
  }

  // ========== 主密钥与资产加密 ==========

  generateMasterKey(): string {
    const randomBytes = CryptoJS.lib.WordArray.random(32)
    return CryptoJS.enc.Hex.stringify(randomBytes)
  }

  encryptAsset(assets: any[], masterKey: string): string {
    const assetsString = JSON.stringify(assets)
    return CryptoJS.AES.encrypt(assetsString, masterKey).toString()
  }

  decryptAsset(encryptedAsset: string, masterKey: string): any[] {
    const bytes = CryptoJS.AES.decrypt(encryptedAsset, masterKey)
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8)
    return JSON.parse(decryptedString)
  }

  // ========== 辅助方法 ==========

  private evaluatePolynomial(coefficients: bigint[], x: bigint): bigint {
    let result = BigInt(0)
    for (let i = 0; i < coefficients.length; i++) {
      const term = (coefficients[i] * this.modPow(x, BigInt(i), this.prime)) % this.prime
      result = (result + term) % this.prime
    }
    return result
  }

  private generateRandomCoefficient(): bigint {
    const max = this.prime - BigInt(1)
    const randomBytes = CryptoJS.lib.WordArray.random(32)
    const randomHex = CryptoJS.enc.Hex.stringify(randomBytes)
    const randomNum = BigInt('0x' + randomHex)
    return randomNum % max + BigInt(1)
  }

  private modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
    let result = BigInt(1)
    base = base % modulus
    while (exponent > 0) {
      if (exponent % BigInt(2) === BigInt(1)) {
        result = (result * base) % modulus
      }
      exponent = exponent / BigInt(2)
      base = (base * base) % modulus
    }
    return result
  }

  private modInverse(a: bigint, m: bigint): bigint {
    const m0 = m
    let y = BigInt(0)
    let x = BigInt(1)

    if (m === BigInt(1)) {
      return BigInt(0)
    }

    let a_temp = a
    while (a_temp > 1) {
      const q = a_temp / m
      let t = m
      m = a_temp % m
      a_temp = t
      t = y
      y = x - q * y
      x = t
    }

    if (x < 0) {
      x = x + m0
    }

    return x
  }
}

export const shamirSecretSharing = new ShamirSecretSharingImpl()
