/**
 * Servicio de Solicitudes de Firma - HP-341
 */

import { apiClient } from '@/lib/api'
import type {
  ISolicitudFirma,
  ICrearSolicitudFirmaInput,
  ISolicitudFirmaPublic,
  IOtpSolicitarResponse,
  IOtpVerificarResponse,
} from '@/types/firma'

class FirmaService {
  async crearSolicitud(input: ICrearSolicitudFirmaInput): Promise<ISolicitudFirma & { firma_url: string }> {
    const response = (await apiClient.post(
      '/firma/solicitudes',
      input
    )) as unknown as { success: boolean; data: ISolicitudFirma & { firma_url: string } }
    return response.data
  }

  async getSolicitud(id: string): Promise<ISolicitudFirma> {
    const response = (await apiClient.get(
      `/firma/solicitudes/${id}`
    )) as unknown as { success: boolean; data: ISolicitudFirma }
    return response.data
  }

  async reenviarSolicitud(id: string): Promise<ISolicitudFirma> {
    const response = (await apiClient.post(
      `/firma/solicitudes/${id}/reenviar`
    )) as unknown as { success: boolean; data: ISolicitudFirma }
    return response.data
  }

  async cancelarSolicitud(id: string): Promise<void> {
    await apiClient.post(`/firma/solicitudes/${id}/cancelar`)
  }

  async listarPorContrato(contratoId: string): Promise<ISolicitudFirma[]> {
    const response = (await apiClient.get(
      `/contratos/${contratoId}/firma/solicitudes`
    )) as unknown as { success: boolean; data: { solicitudes: ISolicitudFirma[] } }
    return response.data.solicitudes
  }

  async validarToken(token: string): Promise<ISolicitudFirmaPublic> {
    const response = (await apiClient.get(
      `/public/firma/${token}`
    )) as unknown as { success: boolean; data: ISolicitudFirmaPublic }
    return response.data
  }

  async solicitarOtp(token: string): Promise<IOtpSolicitarResponse> {
    const response = (await apiClient.post(
      `/public/firma/${token}/otp/solicitar`
    )) as unknown as { success: boolean; data: IOtpSolicitarResponse }
    return response.data
  }

  async verificarOtp(token: string, codigo: string): Promise<IOtpVerificarResponse> {
    const response = (await apiClient.post(
      `/public/firma/${token}/otp/verificar`,
      { codigo }
    )) as unknown as { success: boolean; data: IOtpVerificarResponse }
    return response.data
  }
}

export const firmaService = new FirmaService()
