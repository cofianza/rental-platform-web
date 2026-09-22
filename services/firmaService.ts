/**
 * Servicio de Solicitudes de Firma - HP-341
 */

import { apiClient } from '@/lib/api'
import type {
  ISolicitudFirma,
  IContratoFirmante,
  ICrearSolicitudFirmaInput,
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
}

export const firmaService = new FirmaService()
