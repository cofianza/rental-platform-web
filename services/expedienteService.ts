/**
 * Servicio de Expedientes - HP-229
 * Llamadas a la API para expedientes
 */

import { apiClient } from '@/lib/api'
import type {
  IExpediente,
  IExpedienteFilters,
  IExpedientesResponse,
  IExpedienteResponse,
  IExpedientesMeta,
  IExpedientesStats,
  IExpedientesStatsRaw,
  IAnalistaOption,
  EstadoExpediente,
} from '@/types/expediente'

/**
 * Construye query string desde filtros
 */
function buildQueryString(filters: Partial<IExpedienteFilters>): string {
  const params = new URLSearchParams()

  if (filters.search) params.append('search', filters.search)

  // Estados multi-select: enviar como comma-separated
  if (filters.estado && filters.estado.length > 0) {
    params.append('estado', filters.estado.join(','))
  }

  if (filters.analista_id) params.append('analista_id', filters.analista_id)
  if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde)
  if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta)
  if (filters.page) params.append('page', filters.page.toString())
  if (filters.limit) params.append('limit', filters.limit.toString())
  if (filters.sortBy) params.append('sortBy', filters.sortBy)
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

class ExpedienteService {
  /**
   * Obtiene lista paginada de expedientes con filtros
   */
  async getExpedientes(filters: Partial<IExpedienteFilters> = {}): Promise<{
    data: IExpediente[]
    meta: IExpedientesMeta
  }> {
    const queryString = buildQueryString(filters)
    const response = (await apiClient.get(
      `/expedientes${queryString}`
    )) as unknown as IExpedientesResponse

    return {
      data: response.data || [],
      meta: {
        total: response.pagination?.total || 0,
        page: Number(response.pagination?.page) || 1,
        limit: Number(response.pagination?.limit) || 10,
        totalPages: response.pagination?.totalPages || 0,
      },
    }
  }

  /**
   * Obtiene estadísticas/contadores por estado
   * Transforma el formato API a un objeto más fácil de usar en UI
   */
  async getStats(): Promise<IExpedientesStats> {
    const response = (await apiClient.get('/expedientes/stats')) as unknown as {
      success: boolean
      data: IExpedientesStatsRaw
    }

    // Transformar array de stats a objeto por_estado
    const por_estado: Record<EstadoExpediente, number> = {
      borrador: 0,
      en_revision: 0,
      informacion_incompleta: 0,
      aprobado: 0,
      rechazado: 0,
      condicionado: 0,
      cerrado: 0,
    }

    if (response.data?.stats) {
      response.data.stats.forEach((stat) => {
        por_estado[stat.estado] = stat.count
      })
    }

    return {
      total: response.data?.total || 0,
      por_estado,
    }
  }

  /**
   * Obtiene un expediente por ID
   */
  async getExpedienteById(id: string): Promise<IExpediente> {
    const response = (await apiClient.get(
      `/expedientes/${id}`
    )) as unknown as IExpedienteResponse

    return response.data
  }

  /**
   * Obtiene lista de analistas para dropdown de filtro
   * (usuarios con rol operador_analista o administrador)
   */
  async getAnalistas(): Promise<IAnalistaOption[]> {
    try {
      // Intentar obtener usuarios con rol operador_analista
      const response = (await apiClient.get(
        '/users?role=operador_analista&limit=100&is_active=true'
      )) as unknown as {
        success: boolean
        data: Array<{
          id: string
          nombre: string
          apellido?: string
        }>
      }

      return (response.data || []).map((u) => ({
        id: u.id,
        nombre: `${u.nombre} ${u.apellido || ''}`.trim(),
      }))
    } catch (err) {
      console.error('Error loading analistas:', err)
      return []
    }
  }
}

// Instancia singleton
export const expedienteService = new ExpedienteService()
