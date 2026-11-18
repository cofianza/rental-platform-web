/**
 * «Ver biometría» en la revisión manual (solo administrador y operador).
 * Las fotos no pasan por la base de Cofianza: la API se las pide a Auco en
 * cada consulta y sus enlaces vencen a los 5 minutos. Sin caché.
 */

import { apiClient } from '@/lib/api'
import type { IEvidenciaBiometria, IResumenBiometriaRespuesta } from '@/types/autorizacion'

export const biometriaService = {
  /** Lo guardado del cotejo y si hay fotos que consultar. No llama a Auco. */
  async getResumen(expedienteId: string): Promise<IResumenBiometriaRespuesta> {
    const response = await apiClient.get<IResumenBiometriaRespuesta>(`/expedientes/${expedienteId}/biometria`, {
      cache: 'no-store',
    })
    return response.data
  },

  /** Selfie, cédula y similitud de cada intento, pedidas a Auco ahora. Queda en la bitácora. */
  async getEvidencia(expedienteId: string): Promise<IEvidenciaBiometria> {
    const response = await apiClient.get<IEvidenciaBiometria>(`/expedientes/${expedienteId}/biometria/evidencia`, {
      cache: 'no-store',
    })
    return response.data
  },
}
