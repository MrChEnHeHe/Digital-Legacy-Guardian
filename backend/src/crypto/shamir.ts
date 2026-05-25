import { randomBytes } from 'crypto'
import BN = require('bn.js')
import CryptoJS from 'crypto-js'
import EC from 'elliptic'
import { v4 as uuidv4 } from 'uuid'

const SCALAR_FIELD_ORDER_DEC =
  '115792089237316195423570985008687907852837564279074904382605163141518161494337'

const LEGACY_SHAMIR_FIELD_PRIME_DEC =
  '115792089237316195423570985008687907853269984665640564039457584007913129639747'

const HEX_SCALAR_LENGTH = 64

export interface ShareProof {
  nonceCommitment: string
  challenge: string
  response: string
}

export interface Share {
  id: string
  index: number
  value: string
  commitment: string
  proof?: ShareProof
  polynomialCommitments?: string[]
}

export interface StoredShare {
  id: string
  index: number
  commitment: string
  proof?: ShareProof
  polynomialCommitments?: string[]
}

export interface ShamirSecretSharing {
  split(secret: string, n: number, t: number): Share[]
  combine(shares: Share[]): string
  generateCommitment(share: Share): string
  verifyCommitment(share: Share, commitment: string): boolean
  verifyShareProof(share: Share, storedShare: StoredShare): boolean
}

export class ShamirSecretSharingImpl implements ShamirSecretSharing {
  private readonly ec: EC.ec
  private readonly fieldOrder: bigint
  private readonly groupOrder: bigint

  constructor() {
    this.ec = new EC.ec('secp256k1')
    this.groupOrder = BigInt(this.ec.curve.n.toString(10))
    this.fieldOrder = BigInt(SCALAR_FIELD_ORDER_DEC)

    if (this.fieldOrder !== this.groupOrder) {
      throw new Error('Feldman VSS field order must match the EC group order')
    }
  }

  split(secret: string, n: number, t: number): Share[] {
    const secretNum = this.parseScalar(secret)
    const coefficients: bigint[] = [secretNum]

    for (let i = 1; i < t; i++) {
      coefficients.push(this.generateRandomScalar())
    }

    const polynomialCommitments = coefficients.map((coefficient) =>
      this.pointToHex(this.scalarBaseMult(coefficient))
    )

    const shares: Share[] = []
    for (let i = 1; i <= n; i++) {
      const x = BigInt(i)
      const y = this.evaluatePolynomial(coefficients, x)
      const share: Share = {
        id: uuidv4(),
        index: i,
        value: this.formatScalar(y),
        commitment: '',
        polynomialCommitments,
      }

      share.commitment = this.generateCommitment(share)
      share.proof = this.generateShareProof(share, polynomialCommitments)
      shares.push(share)
    }

    return shares
  }

  combine(shares: Share[]): string {
    return combineSharesInField(shares, this.fieldOrder)
  }

  generateCommitment(share: Share): string {
    return this.pointToHex(this.scalarBaseMult(this.parseScalar(share.value)))
  }

  verifyCommitment(share: Share, commitment: string): boolean {
    if (this.isEcPointCommitment(commitment)) {
      return this.generateCommitment(share) === commitment
    }

    return this.generateLegacyCommitment(share) === commitment
  }

  verifyShareProof(share: Share, storedShare: StoredShare): boolean {
    if (!storedShare.proof || !storedShare.polynomialCommitments?.length) {
      return this.verifyCommitment(share, storedShare.commitment)
    }

    if (!this.verifyCommitment(share, storedShare.commitment)) {
      return false
    }

    if (!this.verifyPolynomialCommitment(share, storedShare)) {
      return false
    }

    return this.verifySchnorrProof(
      storedShare.id,
      storedShare.index,
      storedShare.commitment,
      storedShare.polynomialCommitments,
      storedShare.proof
    )
  }

  generateMasterKey(): string {
    return this.formatScalar(this.generateRandomScalar())
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

  private generateLegacyCommitment(share: Share): string {
    return CryptoJS.SHA256(share.id + share.value + share.index.toString()).toString()
  }

  private generateShareProof(share: Share, polynomialCommitments: string[]): ShareProof {
    const witness = this.parseScalar(share.value)
    const nonce = this.generateRandomScalar()
    const nonceCommitment = this.pointToHex(this.scalarBaseMult(nonce))
    const challenge = this.challengeForProof(
      share.id,
      share.index,
      share.commitment,
      polynomialCommitments,
      nonceCommitment
    )
    const response = this.modField(nonce + BigInt('0x' + challenge) * witness)

    return {
      nonceCommitment,
      challenge,
      response: this.formatScalar(response),
    }
  }

  private verifyPolynomialCommitment(share: Share, storedShare: StoredShare): boolean {
    try {
      const x = BigInt(share.index)
      const expectedPoint = storedShare.polynomialCommitments!.reduce<EC.curve.base.BasePoint | null>((point, commitment, degree) => {
        const multiplier = this.modPow(x, BigInt(degree), this.fieldOrder)
        const term = this.pointFromHex(commitment).mul(this.bigIntToBN(multiplier))
        return point ? point.add(term) : term
      }, null)

      if (!expectedPoint) {
        return false
      }

      const committedPoint = this.pointFromHex(storedShare.commitment)
      return expectedPoint.eq(committedPoint)
    } catch {
      return false
    }
  }

  private verifySchnorrProof(
    shareId: string,
    shareIndex: number,
    shareCommitment: string,
    polynomialCommitments: string[],
    proof: ShareProof
  ): boolean {
    try {
      const expectedChallenge = this.challengeForProof(
        shareId,
        shareIndex,
        shareCommitment,
        polynomialCommitments,
        proof.nonceCommitment
      )

      if (expectedChallenge !== proof.challenge) {
        return false
      }

      const responsePoint = this.scalarBaseMult(this.parseScalar(proof.response))
      const noncePoint = this.pointFromHex(proof.nonceCommitment)
      const sharePoint = this.pointFromHex(shareCommitment)
      const challenge = BigInt('0x' + proof.challenge)
      const expectedPoint = noncePoint.add(sharePoint.mul(this.bigIntToBN(challenge)))

      return responsePoint.eq(expectedPoint)
    } catch {
      return false
    }
  }

  private challengeForProof(
    shareId: string,
    shareIndex: number,
    shareCommitment: string,
    polynomialCommitments: string[],
    nonceCommitment: string
  ): string {
    const transcript = [
      'digital-legacy-sss-zkp-v1',
      shareId,
      shareIndex.toString(),
      shareCommitment,
      ...polynomialCommitments,
      nonceCommitment,
    ].join('|')
    const challenge = BigInt('0x' + CryptoJS.SHA256(transcript).toString()) % this.groupOrder
    return this.formatScalar(challenge)
  }

  private evaluatePolynomial(coefficients: bigint[], x: bigint): bigint {
    let result = BigInt(0)
    for (let i = 0; i < coefficients.length; i++) {
      const term = this.modField(coefficients[i] * this.modPow(x, BigInt(i), this.fieldOrder))
      result = this.modField(result + term)
    }
    return result
  }

  private generateRandomScalar(): bigint {
    const range = this.fieldOrder - BigInt(1)
    const bytesLength = Math.ceil(this.fieldOrder.toString(2).length / 8)
    const sampleSpace = BigInt(1) << BigInt(bytesLength * 8)
    const limit = sampleSpace - (sampleSpace % range)

    while (true) {
      const candidate = BigInt('0x' + randomBytes(bytesLength).toString('hex'))
      if (candidate < limit) {
        return (candidate % range) + BigInt(1)
      }
    }
  }

  private modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
    let result = BigInt(1)
    base = mod(base, modulus)

    while (exponent > 0) {
      if (exponent % BigInt(2) === BigInt(1)) {
        result = (result * base) % modulus
      }
      exponent = exponent / BigInt(2)
      base = (base * base) % modulus
    }

    return result
  }

  private modField(value: bigint): bigint {
    return mod(value, this.fieldOrder)
  }

  private parseScalar(value: string): bigint {
    if (!/^[0-9a-f]+$/i.test(value)) {
      throw new Error('Scalar must be hex encoded')
    }

    const scalar = BigInt('0x' + value)
    if (scalar < BigInt(0) || scalar >= this.fieldOrder) {
      throw new Error('Scalar is outside the field order')
    }

    return scalar
  }

  private formatScalar(value: bigint): string {
    return this.modField(value).toString(16).padStart(HEX_SCALAR_LENGTH, '0')
  }

  private isEcPointCommitment(commitment: string): boolean {
    return /^(02|03)[0-9a-f]{64}$/i.test(commitment) || /^04[0-9a-f]{128}$/i.test(commitment)
  }

  private scalarBaseMult(scalar: bigint): EC.curve.base.BasePoint {
    return this.ec.g.mul(this.bigIntToBN(scalar))
  }

  private pointFromHex(point: string): EC.curve.base.BasePoint {
    return this.ec.curve.decodePoint(point, 'hex')
  }

  private pointToHex(point: EC.curve.base.BasePoint): string {
    return point.encode('hex', true)
  }

  private bigIntToBN(value: bigint): BN {
    return new BN(mod(value, this.groupOrder).toString(16), 16)
  }
}

export function combineLegacyShares(shares: Share[]): string {
  return combineSharesInField(shares, BigInt(LEGACY_SHAMIR_FIELD_PRIME_DEC))
}

function combineSharesInField(shares: Share[], fieldOrder: bigint): string {
  if (shares.length < 1) {
    throw new Error('Need at least 1 share to reconstruct')
  }

  if (shares.length === 1) {
    return shares[0].value.padStart(HEX_SCALAR_LENGTH, '0')
  }

  const sortedShares = [...shares].sort((a, b) => a.index - b.index)
  let secret = BigInt(0)

  for (let i = 0; i < sortedShares.length; i++) {
    const share = sortedShares[i]
    const x = BigInt(share.index)
    const y = BigInt('0x' + share.value)

    let numerator = BigInt(1)
    let denominator = BigInt(1)

    for (let j = 0; j < sortedShares.length; j++) {
      if (i !== j) {
        const xj = BigInt(sortedShares[j].index)
        numerator = mod(numerator * -xj, fieldOrder)
        denominator = mod(denominator * (x - xj), fieldOrder)
      }
    }

    const lagrangeCoefficient = mod(numerator * modInverse(denominator, fieldOrder), fieldOrder)
    secret = mod(secret + mod(y * lagrangeCoefficient, fieldOrder), fieldOrder)
  }

  return secret.toString(16).padStart(HEX_SCALAR_LENGTH, '0')
}

function mod(value: bigint, modulus: bigint): bigint {
  return ((value % modulus) + modulus) % modulus
}

function modInverse(a: bigint, m: bigint): bigint {
  let oldR = m
  let r = mod(a, m)
  let oldS = BigInt(0)
  let s = BigInt(1)

  while (r !== BigInt(0)) {
    const quotient = oldR / r
    ;[oldR, r] = [r, oldR - quotient * r]
    ;[oldS, s] = [s, oldS - quotient * s]
  }

  if (oldR !== BigInt(1)) {
    throw new Error('Value has no modular inverse')
  }

  return mod(oldS, m)
}

export const shamirSecretSharing = new ShamirSecretSharingImpl()
