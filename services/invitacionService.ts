// ============================================
// Invitación Externa Service — canje público del token
// ============================================

import { apiClient } from '@/lib/api'

export interface InvitacionInfo {
  email_invitacion: string
  expediente: {
    numero: string
    source: 'invitacion'
  }
  inmueble: {
    codigo: string
    direccion: string
    ciudad: string
    valor_arriendo: number
  }
  propietario_invitante: {
    nombre_publico: string
    razon_social: string | null
  }
}

export interface CanjearResult {
  expediente: {
    id: string
    numero: string
    estado: string
    estudio_habilitado: boolean
    source: 'invitacion'
  }
  siguiente_paso: 'autorizar_estudio'
  redirect: string
}

export async function getInvitacionInfo(token: string): Promise<InvitacionInfo> {
  const res = await apiClient.get<InvitacionInfo>(`/public/invitacion/${token}`)
  return res.data
}

export async function canjearInvitacion(token: string): Promise<CanjearResult> {
  const res = await apiClient.post<CanjearResult>(`/public/invitacion/${token}/canjear`, {})
  return res.data
}
