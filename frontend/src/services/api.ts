import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface User {
  id: string
  name: string
  email: string
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
  createdAt: string
  status: 'active' | 'collecting' | 'completed'
  creatorId?: string
  heirId?: string
}

export interface InheritanceRequest {
  planId: string
  heirAddress: string
  heirEmail: string
  guardianSignatures: string[]
}

export const authApi = {
  register: async (data: { name: string; email: string; password: string }): Promise<{ success: boolean; message: string; userId?: string }> => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  sendVerificationCode: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/send-code', { email })
    return response.data
  },

  login: async (data: { email: string; password: string; verificationCode: string }): Promise<{ success: boolean; user?: User }> => {
    const response = await api.post('/auth/login', data)
    return response.data
  },

  getUser: async (userId: string): Promise<User | null> => {
    try {
      const response = await api.get(`/users/${userId}`)
      return response.data
    } catch {
      return null
    }
  },

  searchUsers: async (query: string): Promise<User[]> => {
    const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`)
    return response.data
  },
}

export const createLegacyPlan = async (data: any): Promise<LegacyPlan> => {
  try {
    const response = await api.post('/plans', data)
    return response.data
  } catch (error: any) {
    if (error.response && error.response.data && error.response.data.error) {
      throw new Error(error.response.data.error)
    } else {
      throw new Error('创建遗产计划失败，请重试')
    }
  }
}

export const getLegacyPlans = async (userId?: string): Promise<LegacyPlan[]> => {
  const url = userId ? `/plans?userId=${userId}` : '/plans'
  const response = await api.get(url)
  return response.data
}

export const getLegacyPlan = async (id: string): Promise<LegacyPlan> => {
  const response = await api.get(`/plans/${id}`)
  return response.data
}

export const initiateInheritance = async (data: InheritanceRequest): Promise<any> => {
  const response = await api.post('/inheritance/initiate', data)
  return response.data
}

export const getInheritanceStatus = async (planId: string): Promise<any> => {
  const response = await api.get(`/inheritance/${planId}`)
  return response.data
}

export const submitGuardianShare = async (data: {
  planId: string
  guardianId: string
  shareValue: string
}): Promise<any> => {
  const response = await api.post('/inheritance/share', data)
  return response.data
}

export const addPlanAsset = async (planId: string, asset: any): Promise<LegacyPlan> => {
  const response = await api.post(`/plans/${planId}/assets`, asset)
  return response.data
}

export const removePlanAsset = async (planId: string, assetIndex: number): Promise<LegacyPlan> => {
  const response = await api.delete(`/plans/${planId}/assets/${assetIndex}`)
  return response.data
}

export const addPlanGuardian = async (planId: string, guardian: any): Promise<LegacyPlan> => {
  const response = await api.post(`/plans/${planId}/guardians`, guardian)
  return response.data
}

export const removePlanGuardian = async (planId: string, guardianId: string): Promise<LegacyPlan> => {
  const response = await api.delete(`/plans/${planId}/guardians/${guardianId}`)
  return response.data
}

export const deleteLegacyPlan = async (planId: string): Promise<{ success: boolean }> => {
  const response = await api.delete(`/plans/${planId}`)
  return response.data
}

export default api
