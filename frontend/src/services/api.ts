import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

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
}

export interface InheritanceRequest {
  planId: string
  heirAddress: string
  guardianSignatures: string[]
}

export const createLegacyPlan = async (data: any): Promise<LegacyPlan> => {
  const response = await api.post('/plans', data)
  return response.data
}

export const getLegacyPlans = async (): Promise<LegacyPlan[]> => {
  const response = await api.get('/plans')
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
  share: string
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
