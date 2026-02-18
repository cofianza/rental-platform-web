import { apiClient } from '@/lib/api'
import type {
  IAuditLogFilters,
  IAuditLogsResponse,
  IAuditLogResponse,
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

    return {
      data: response.data || [],
      meta: {
        total: response.meta?.total ?? 0,
        page: Number(response.meta?.page) || 1,
        size: Number(response.meta?.size) || 10,
        totalPages: response.meta?.totalPages ?? 0,
      },
    }
  }

  async getLogById(id: string): Promise<IAuditLog> {
    const response = (await apiClient.get(
      `/audit-logs/${id}`,
    )) as unknown as IAuditLogResponse
    return response.data
  }

  async getStats(): Promise<IAuditStats> {
    const response = (await apiClient.get(
      '/audit-logs/stats',
    )) as unknown as IAuditStatsResponse
    return response.data
  }
}

export const bitacoraService = new BitacoraService()
