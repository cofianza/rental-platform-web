/**
 * «Ver biometría» en la revisión manual (solo administrador y operador).
 * Las fotos son las que Cofianza conserva, cifradas, de los cotejos que no
 * confirmaron la identidad; la API las descifra en cada petición. Sin caché.
 */

import { apiClient } from '@/lib/api'
import type { CualFotoBiometria, IEvidenciaBiometria, IResumenBiometriaRespuesta, PersonaCotejo } from '@/types/autorizacion'

export const biometriaService = {
  /** Lo guardado del cotejo y cuántos intentos tienen fotos. */
  async getResumen(expedienteId: string): Promise<IResumenBiometriaRespuesta> {
    const response = await apiClient.get<IResumenBiometriaRespuesta>(`/expedientes/${expedienteId}/biometria`, {
      cache: 'no-store',
    })
    return response.data
  },

  /** Los intentos con fotos guardadas (sin las imágenes). Queda en la bitácora. */
  async getEvidencia(expedienteId: string): Promise<IEvidenciaBiometria> {
    const response = await apiClient.get<IEvidenciaBiometria>(`/expedientes/${expedienteId}/biometria/evidencia`, {
      cache: 'no-store',
    })
    return response.data
  },

  /** Supresión anticipada: elimina todas las fotos guardadas del estudio. Queda en la bitácora. */
  async eliminarFotos(expedienteId: string): Promise<{ eliminadas: number }> {
    const response = await apiClient.delete<{ eliminadas: number }>(`/expedientes/${expedienteId}/biometria/fotos`)
    return response.data
  },

  /**
   * Adenda 6 §2: vincula las imágenes de los cotejos FALLIDOS de una persona (autorización V3) a una denuncia o
   * proceso — se conservan hasta que termine — o quita esa marca (motivo null). Solo administrador; queda en la bitácora.
   */
  async retencionPorProceso(expedienteId: string, persona: PersonaCotejo, motivo: string | null): Promise<{ filas: number }> {
    const url = `/expedientes/${expedienteId}/biometria/fotos/retencion`
    const response = motivo
      ? await apiClient.post<{ filas: number }>(url, { motivo, persona })
      : await apiClient.delete<{ filas: number }>(`${url}?persona=${persona}`)
    return response.data
  },

  /** Una imagen (selfie o documento) de un intento guardado. Cada una queda en la bitácora. */
  async getFoto(expedienteId: string, fotoId: string, cual: CualFotoBiometria): Promise<Blob> {
    const response = await apiClient.raw(`/expedientes/${expedienteId}/biometria/fotos/${fotoId}/${cual}`, {
      cache: 'no-store',
    })
    return response.blob()
  },
}
