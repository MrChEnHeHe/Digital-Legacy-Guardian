import CryptoJS from 'crypto-js'
import EC from 'elliptic'
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
  // ❌ 不存储 value 字段
}

export interface ShamirSecretSharing {
  split(secret: string, n: number, t: number): Share[]
  combine(shares: Share[]): string
  generateCommitment(share: Share): string
  verifyCommitment(share: Share, commitment: string): boolean
}

export class ShamirSecretSharingImpl implements ShamirSecretSharing {
  private prime: bigint
  private ec: EC.ec

  constructor(prime?: string) {
    this.prime = BigInt(
      prime ||
        '115792089237316195423570985008687907853269984665640564039457584007913129639747'
    )
    this.ec = new EC.ec('secp256k1')
  }

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
    
    // 如果只有一个份额，直接返回该份额的值（门限为1的情况）
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

  generateCommitment(share: Share): string {
    // 使用份额ID和份额值生成确定性的承诺值
    // 这样可以在不存储份额值的情况下验证提交的值是否正确
    const data = share.id + share.value + share.index.toString()
    const commitment = CryptoJS.SHA256(data).toString()
    return commitment
  }

  verifyCommitment(share: Share, commitment: string): boolean {
    const computedCommitment = this.generateCommitment(share)
    return computedCommitment === commitment
  }

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

  generateMasterKey(): string {
    const randomBytes = CryptoJS.lib.WordArray.random(32)
    return CryptoJS.enc.Hex.stringify(randomBytes)
  }

  encryptAsset(asset: any, masterKey: string): string {
    const assetString = JSON.stringify(asset)
    return CryptoJS.AES.encrypt(assetString, masterKey).toString()
  }

  decryptAsset(encryptedAsset: string, masterKey: string): any {
    const bytes = CryptoJS.AES.decrypt(encryptedAsset, masterKey)
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8)
    return JSON.parse(decryptedString)
  }
}

export const shamirSecretSharing = new ShamirSecretSharingImpl()
