/**
 * Servicio de Autorizacion Habeas Data (HP-334)
 */

import { apiClient, ApiClient } from '@/lib/api'
import type {
  IAutorizacion,
  IAutorizacionPublicData,
  IEnviarEnlaceResponse,
  IFirmarInput,
  IFirmarResponse,
  IRevocarInput,
  IRevocarResponse,
  IOtpResponse,
  IVerificarOtpResponse,
} from '@/types/autorizacion'

// ============================================
// Authenticated endpoints
// ============================================

export const autorizacionService = {
  async getStatus(expedienteId: string): Promise<IAutorizacion | null> {
    const res = await apiClient.get<IAutorizacion | null>(
      `/expedientes/${expedienteId}/autorizacion-riesgo`
    )
    return res.data
  },

  async enviarEnlace(expedienteId: string): Promise<IEnviarEnlaceResponse> {
    const res = await apiClient.post<IEnviarEnlaceResponse>(
      `/expedientes/${expedienteId}/autorizacion-riesgo/enviar-enlace`
    )
    return res.data
  },

  async revocar(expedienteId: string, input: IRevocarInput): Promise<IRevocarResponse> {
    const res = await apiClient.patch<IRevocarResponse>(
      `/expedientes/${expedienteId}/autorizacion-riesgo/revocar`,
      input
    )
    return res.data
  },
}

// ============================================
// Public endpoints (no auth)
// ============================================

const publicClient = new ApiClient()

export const autorizacionPublicService = {
  async getData(token: string): Promise<IAutorizacionPublicData> {
    const res = await publicClient.get<IAutorizacionPublicData>(
      `/public/autorizar/${token}`
    )
    return res.data
  },

  async firmar(token: string, input: IFirmarInput): Promise<IFirmarResponse> {
    const res = await publicClient.post<IFirmarResponse>(
      `/public/autorizar/${token}/firmar`,
      input
    )
    return res.data
  },

  async enviarOtp(token: string): Promise<IOtpResponse> {
    const res = await publicClient.post<IOtpResponse>(
      `/public/autorizar/${token}/enviar-otp`
    )
    return res.data
  },

  async verificarOtp(token: string, codigo: string): Promise<IVerificarOtpResponse> {
    const res = await publicClient.post<IVerificarOtpResponse>(
      `/public/autorizar/${token}/verificar-otp`,
      { codigo }
    )
    return res.data
  },
}
