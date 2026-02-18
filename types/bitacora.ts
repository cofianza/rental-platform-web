export interface IAuditLog {
  id: string
  usuario_id: string | null
  usuario_nombre: string | null
  accion: string
  entidad: string
  entidad_id: string | null
  detalle: Record<string, unknown> | null
  ip: string | null
  created_at: string
}

export interface IAuditLogFilters {
  page: number
  limit: number
  userId: string
  action: string
  entityType: string
  dateFrom: string
  dateTo: string
  sortOrder: 'asc' | 'desc'
}

export interface IAuditLogsMeta {
  total: number
  page: number
  size: number
  totalPages: number
}

export interface IAuditLogsResponse {
  success: boolean
  data: IAuditLog[]
  meta: IAuditLogsMeta
}

export interface IAuditLogResponse {
  success: boolean
  data: IAuditLog
}

export interface IAuditStats {
  byAction: { action: string; count: number }[]
  byDay: { date: string; count: number }[]
  total: number
}

export interface IAuditStatsResponse {
  success: boolean
  data: IAuditStats
}

export interface IAuditLogsState {
  logs: IAuditLog[]
  meta: IAuditLogsMeta | null
  filters: IAuditLogFilters
  isLoading: boolean
  error: string | null
  selectedLog: IAuditLog | null
}
