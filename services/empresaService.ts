// ============================================
// Datos de la empresa (Cofianza) — editables por el administrador
// ============================================

import { apiClient } from '@/lib/api'

export interface EmpresaInfo {
  name: string
  nit: string
  address: string
  phone: string
  email: string
  website: string
  certificateValidityDays: number
}

export async function getEmpresa(): Promise<EmpresaInfo> {
  const res = await apiClient.get<EmpresaInfo>('/empresa')
  return res.data
}

export async function updateEmpresa(data: Partial<EmpresaInfo>): Promise<EmpresaInfo> {
  const res = await apiClient.put<EmpresaInfo>('/empresa', data)
  return res.data
}
