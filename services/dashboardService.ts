// ============================================
// Dashboard Service — HP-359
// Consume endpoints de HP-358
// ============================================

import { apiClient } from '@/lib/api'

// ── Types ───────────────────────────────────

export interface DashboardSummary {
  totalExpedientesActivos: number
  expedientesPorEstado: Record<string, number>
  tasaAprobacion: number
  tiempoPromedioResolucionDias: number
  ingresosDelPeriodo: number
}

export interface ExpedientePorEstado {
  estado: string
  count: number
}

export interface DashboardFilters {
  dateFrom?: string
  dateTo?: string
}

// ── Service ─────────────────────────────────

class DashboardService {
  async getSummary(filters?: DashboardFilters): Promise<DashboardSummary> {
    const params = new URLSearchParams()
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.set('dateTo', filters.dateTo)

    const query = params.toString()
    const url = `/dashboard/summary${query ? `?${query}` : ''}`
    const res = await apiClient.get<DashboardSummary>(url)
    return res.data
  }

  async getExpedientesPorEstado(filters?: DashboardFilters): Promise<ExpedientePorEstado[]> {
    const params = new URLSearchParams()
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.set('dateTo', filters.dateTo)

    const query = params.toString()
    const url = `/dashboard/expedientes-por-estado${query ? `?${query}` : ''}`
    const res = await apiClient.get<ExpedientePorEstado[]>(url)
    return res.data
  }
}

export const dashboardService = new DashboardService()
