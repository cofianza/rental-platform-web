import { apiClient } from '@/lib/api'
import { leerPaginacion } from '@/lib/paginacion'
import type {
  IAuditLogFilters,
  IAuditLogsResponse,
  IAuditStatsResponse,
  IAuditLog,
  IAuditLogsMeta,
  IAuditStats,
} from '@/types/bitacora'

function buildQueryString(filters: Partial<IAuditLogFilters>): string {
  const params = new URLSearchParams()

  if (filters.page) params.append('page', filters.page.toString())
  if (filters.limit) params.append('limit', filters.limit.toString())
  if (filters.userId) params.append('userId', filters.userId)
  if (filters.action) params.append('action', filters.action)
  if (filters.entityType) params.append('entityType', filters.entityType)
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.append('dateTo', filters.dateTo)
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

class BitacoraService {
  async getLogs(
    filters: Partial<IAuditLogFilters> = {},
  ): Promise<{ data: IAuditLog[]; meta: IAuditLogsMeta }> {
    const queryString = buildQueryString(filters)
    const response = (await apiClient.get(
      `/audit-logs${queryString}`,
    )) as unknown as IAuditLogsResponse

    // `meta` o `pagination`: la API vieja mandaba `pagination` y la pantalla
    // mostraba «0 registros» sin paginación (sirve con las dos).
    return {
      data: response.data || [],
      meta: leerPaginacion(response, filters.limit ?? 10),
    }
  }

  async getStats(): Promise<IAuditStats> {
    const response = (await apiClient.get(
      '/audit-logs/stats',
    )) as unknown as IAuditStatsResponse
    return response.data
  }
}

export const bitacoraService = new BitacoraService()
