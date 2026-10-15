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
  /** Persona que firma el Acta de Migración por Cofianza (spec migración §3.3). '' = sin configurar. */
  firmanteNombre: string
  firmanteTipoDocumento: string
  firmanteDocumento: string
  firmanteEmail: string
  firmanteCelular: string
}

export async function getEmpresa(): Promise<EmpresaInfo> {
  const res = await apiClient.get<EmpresaInfo>('/empresa')
  return res.data
}

/**
 * ¿Está completo el firmante del acta por Cofianza? Lo ven el administrador y el
 * operador (solo el booleano). Con la API anterior, que no tiene esta ruta, el
 * administrador lo calcula con /empresa; para los demás queda sin saberse.
 */
export async function firmanteConfigurado(): Promise<boolean> {
  try {
    const res = await apiClient.get<{ configurado: boolean }>('/empresa/firmante-configurado')
    return res.data.configurado
  } catch {
    const e = await getEmpresa()
    return [e.firmanteNombre, e.firmanteTipoDocumento, e.firmanteDocumento, e.firmanteEmail, e.firmanteCelular].every((c) => !!c?.trim())
  }
}

export async function updateEmpresa(data: Partial<EmpresaInfo>): Promise<EmpresaInfo> {
  const res = await apiClient.put<EmpresaInfo>('/empresa', data)
  return res.data
}
