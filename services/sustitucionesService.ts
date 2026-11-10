/**
 * Cambios de personas de un estudio y consulta adicional. Solo transporta: los
 * valores, los límites y los textos los decide la API.
 */

import { apiClient } from '@/lib/api'
import type { IConsultaAdicionalCanon, ICotizacionSustitucion, IEstadoSustituciones, ISustitucionCreada } from '@/types/sustitucion'

export const sustitucionesService = {
  async estado(estudioId: string): Promise<IEstadoSustituciones> {
    return (await apiClient.get<IEstadoSustituciones>(`/estudios/${estudioId}/sustituciones`)).data
  },

  async cotizar(estudioId: string): Promise<ICotizacionSustitucion> {
    return (await apiClient.get<ICotizacionSustitucion>(`/estudios/${estudioId}/sustituciones/cotizacion`)).data
  },

  /** `valorAceptado` es el que la API cotizó y la persona confirmó. */
  async crear(estudioId: string, coarrendatarioId: string, valorAceptado: number): Promise<ISustitucionCreada> {
    return (
      await apiClient.post<ISustitucionCreada>(`/estudios/${estudioId}/sustituciones`, {
        sale: { persona: 'coarrendatario', coarrendatario_id: coarrendatarioId },
        acepta_valor_cop: valorAceptado,
      })
    ).data
  },

  async retirar(estudioId: string, coarrendatarioId: string): Promise<{ desenlace: string | null }> {
    return (
      await apiClient.post<{ desenlace: string | null }>(`/estudios/${estudioId}/sustituciones/retirar-por-listas`, {
        persona: 'coarrendatario',
        coarrendatario_id: coarrendatarioId,
      })
    ).data
  },

  async cancelar(estudioId: string, sustitucionId: string): Promise<{ estado: string }> {
    return (await apiClient.delete<{ estado: string }>(`/estudios/${estudioId}/sustituciones/${sustitucionId}`)).data
  },

  /** Consulta adicional para evaluar el estudio con un canon mayor. */
  async consultaAdicionalCanon(estudioId: string, inmuebleId: string, valorAceptado: number): Promise<IConsultaAdicionalCanon> {
    return (
      await apiClient.post<IConsultaAdicionalCanon>(`/estudios/${estudioId}/reevaluacion-canon`, {
        inmueble_id: inmuebleId,
        acepta_valor_cop: valorAceptado,
      })
    ).data
  },
}
