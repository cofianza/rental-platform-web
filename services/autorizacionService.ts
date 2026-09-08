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
  IPerfilProspectoInput,
  IReportarIdentidadInput,
  IBiometriaResponse,
  IPagoProspecto,
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

  /** Envía/reenvía el enlace. `contacto` corrige email/teléfono del
   *  solicitante si estaban mal escritos (se persiste server-side). */
  async enviarEnlace(
    expedienteId: string,
    contacto?: { email?: string; telefono?: string },
  ): Promise<IEnviarEnlaceResponse> {
    const res = await apiClient.post<IEnviarEnlaceResponse>(
      `/expedientes/${expedienteId}/autorizacion-riesgo/enviar-enlace`,
      contacto || {}
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

  /** Estado del cobro tras firmar (opción C: paga el arrendatario). */
  async getPago(token: string): Promise<IPagoProspecto> {
    const res = await publicClient.get<IPagoProspecto>(`/public/autorizar/${token}/pago`)
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

  /** PASO 5 (§8.1 + §8.2 + §8.3). Una sola llamada, ANTES del paso de firma:
   *  el OTP se dispara al entrar a firma y caduca a los 5 minutos. */
  async guardarPerfil(token: string, input: IPerfilProspectoInput): Promise<{ guardado: boolean }> {
    const res = await publicClient.post<{ guardado: boolean }>(
      `/public/autorizar/${token}/perfil`,
      input
    )
    return res.data
  },

  /** Política Anexo A + §14: cotejo cara-vs-documento vía AucoFace.
   *  NUNCA bloquea — un cotejo fallido responde 200 con el veredicto y el
   *  prospecto puede seguir; el estudio pasa a revisión manual. */
  async verificarBiometria(
    token: string,
    input: { documentImage: string; photo: string },
  ): Promise<IBiometriaResponse> {
    const res = await publicClient.post<IBiometriaResponse>(
      `/public/autorizar/${token}/biometria`,
      input
    )
    return res.data
  },

  /** Ley 1581 art. 6-a: el titular NO está obligado a autorizar un dato
   *  sensible. Se registra el ejercicio del derecho y el flujo continúa. */
  async omitirBiometria(token: string): Promise<IBiometriaResponse> {
    const res = await publicClient.post<IBiometriaResponse>(
      `/public/autorizar/${token}/biometria/omitir`,
      {}
    )
    return res.data
  },

  /** §12: "el prospecto reporta que no es él" → detiene el enlace. */
  async reportarIdentidad(token: string, input: IReportarIdentidadInput): Promise<{ reportado: boolean }> {
    const res = await publicClient.post<{ reportado: boolean }>(
      `/public/autorizar/${token}/reportar-identidad`,
      input
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
