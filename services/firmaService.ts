/**
 * Servicio de Solicitudes de Firma - HP-341
 */

import { apiClient } from '@/lib/api'
import type {
  ISolicitudFirma,
  IContratoFirmante,
  ICrearSolicitudFirmaInput,
  ISolicitudFirmaPublic,
  IOtpSolicitarResponse,
  IOtpVerificarResponse,
  ICompletarFirmaInput,
  ICompletarFirmaResponse,
  IContratoPdfResponse,
  IEvidenciaFirma,
  IAcuseDownloadResponse,
  IVerificacionIdentidad,
  IVerificacionIdentidadPublica,
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

  async reenviarSolicitud(
    id: string,
    options?: { email_alternativo?: string },
  ): Promise<ISolicitudFirma> {
    const response = (await apiClient.post(
      `/firma/solicitudes/${id}/reenviar`,
      options || {},
    )) as unknown as { success: boolean; data: ISolicitudFirma }
    return response.data
  }

  /**
   * Reenvio "self" disponible al solicitante dueno del expediente. Permite
   * reenviarse el correo de firma al mismo email o a otro alternativo.
   */
  async reenviarSolicitudSelf(
    id: string,
    options?: { email_alternativo?: string },
  ): Promise<ISolicitudFirma> {
    const response = (await apiClient.post(
      `/firma/solicitudes/${id}/reenviar-self`,
      options || {},
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

  // Firmantes multi-parte (arrendatario/arrendador/cofianza) del contrato y la
  // verificación de identidad previa a la firma (Adenda 2 §9).
  async listarFirmantes(
    contratoId: string,
  ): Promise<{ firmantes: IContratoFirmante[]; verificaciones: IVerificacionIdentidad[] }> {
    const response = (await apiClient.get(
      `/contratos/${contratoId}/firma/firmantes`
    )) as unknown as {
      success: boolean
      data: { firmantes: IContratoFirmante[]; verificaciones?: IVerificacionIdentidad[] }
    }
    return { firmantes: response.data.firmantes, verificaciones: response.data.verificaciones ?? [] }
  }

  /** Adenda 2 §9: el analista registra cómo verificó la identidad ('suplantacion' cancela el contrato). */
  async revisarIdentidad(
    contratoId: string,
    verificacionId: string,
    input: { resultado: 'confirmada' | 'suplantacion'; nota: string },
  ): Promise<void> {
    await apiClient.post(`/contratos/${contratoId}/firma/firmantes/identidad/${verificacionId}/revisar`, input)
  }

  // ── Página pública /verificar-identidad/[token] (Adenda 2 §9) ──

  async getVerificacionIdentidad(token: string): Promise<IVerificacionIdentidadPublica> {
    const res = await apiClient.get<IVerificacionIdentidadPublica>(`/public/verificacion-identidad/${token}`)
    return res.data
  }

  async consentimientoIdentidad(token: string, opcion: 'autoriza' | 'analista'): Promise<{ completada: boolean }> {
    const res = await apiClient.post<{ completada: boolean }>(`/public/verificacion-identidad/${token}/consentimiento`, { opcion })
    return res.data
  }

  /** Nunca bloquea: un cotejo que no coincide responde 200 con `completada: false` y un motivo. */
  async biometriaIdentidad(
    token: string,
    input: { documentImage: string; photo: string },
  ): Promise<{ completada: boolean; motivo: string | null }> {
    const res = await apiClient.post<{ completada: boolean; motivo: string | null }>(
      `/public/verificacion-identidad/${token}/biometria`,
      input,
    )
    return res.data
  }

  async continuarIdentidad(token: string): Promise<{ completada: boolean }> {
    const res = await apiClient.post<{ completada: boolean }>(`/public/verificacion-identidad/${token}/continuar`, {})
    return res.data
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

  async completarFirma(token: string, input: ICompletarFirmaInput): Promise<ICompletarFirmaResponse> {
    const response = (await apiClient.post(
      `/public/firma/${token}/completar`,
      input
    )) as unknown as { success: boolean; data: ICompletarFirmaResponse }
    return response.data
  }

  // HP-342: Get contract PDF signed URL for viewer
  async getContratoPdf(token: string): Promise<IContratoPdfResponse> {
    const response = (await apiClient.get(
      `/public/firma/${token}/pdf`
    )) as unknown as { success: boolean; data: IContratoPdfResponse }
    return response.data
  }

  // HP-344: Evidencia de firma
  async getEvidencia(solicitudId: string): Promise<IEvidenciaFirma> {
    const response = (await apiClient.get(
      `/firma/solicitudes/${solicitudId}/evidencia`
    )) as unknown as { success: boolean; data: IEvidenciaFirma }
    return response.data
  }

  async downloadAcuse(solicitudId: string): Promise<IAcuseDownloadResponse> {
    const response = (await apiClient.get(
      `/firma/solicitudes/${solicitudId}/evidencia/pdf`
    )) as unknown as { success: boolean; data: IAcuseDownloadResponse }
    return response.data
  }
}

export const firmaService = new FirmaService()
