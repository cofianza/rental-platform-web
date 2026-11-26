/**
 * Conteos de la Oficina Virtual: GET /oficina-virtual/conteos (reporte del 25-nov, punto 1). Inicio, Estudios,
 * Contratos y Analítica leen sus cifras de aquí: una definición en la API, la misma en todas las pantallas.
 */

import { apiClient, ApiClientError } from '@/lib/api'
import { coalesceRequest } from '@/lib/requestCoalesce'
import type { IConteosOficina, SeccionOficina } from '@/types/oficinaVirtual'

class OficinaVirtualService {
  /**
   * Las secciones pedidas. null = la API todavía no tiene el endpoint (una versión anterior): quien llama vuelve a lo
   * de antes. Las peticiones iguales en vuelo se comparten (la página y su vista lo piden a la vez al montar).
   */
  async getConteos(secciones: readonly SeccionOficina[]): Promise<IConteosOficina | null> {
    const qs = [...secciones].sort().join(',')
    try {
      const res = (await coalesceRequest(`ov-conteos:${qs}`, () => apiClient.get(`/oficina-virtual/conteos?secciones=${qs}`))) as unknown as {
        data: IConteosOficina
      }
      return res.data
    } catch (err) {
      if (err instanceof ApiClientError && err.statusCode === 404) return null
      throw err
    }
  }
}

export const oficinaVirtualService = new OficinaVirtualService()
