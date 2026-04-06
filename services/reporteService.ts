/**
 * Servicio de Reportes - HP-360
 * Llamadas a la API para reportes de volumen de expedientes
 */

import { apiClient } from '@/lib/api'

// ============================================
// TIPOS
// ============================================

export interface VolumenPeriodo {
  periodo: string
  creados: number
  cerrados: number
  neto: number
}

export interface VolumenData {
  periodos: VolumenPeriodo[]
  totales: { total_creados: number; total_cerrados: number; total_neto: number }
}

export interface VolumenFilters {
  dateFrom?: string
  dateTo?: string
  estado?: string
}

export interface AprobacionPeriodo {
  periodo: string
  aprobados: number
  rechazados: number
  condicionados: number
  total: number
  tasa: number
}

export interface AprobacionData {
  meses: AprobacionPeriodo[]
  totales: {
    total_aprobados: number
    total_rechazados: number
    total_condicionados: number
    total_resueltos: number
    tasa_global: number
  }
}

export interface IngresosPeriodo {
  periodo: string
  concepto: string
  cantidad_pagos: number
  monto_total: number
}

export interface IngresosData {
  meses: IngresosPeriodo[]
  resumen: {
    total_ingresos: number
    total_pendiente: number
    cantidad_pagos: number
  }
}

export interface TiempoEtapa {
  etapa: string
  promedio_dias: number
  minimo_dias: number
  maximo_dias: number
  cantidad_expedientes: number
  es_cuello_botella: boolean
}

export interface TiemposData {
  etapas: TiempoEtapa[]
  resumen: {
    tiempo_total_promedio_dias: number
    etapa_mas_lenta: string
    etapa_mas_rapida: string
    total_expedientes_analizados: number
  }
}

// ============================================
// SERVICIO
// ============================================

class ReporteService {
  /**
   * Obtiene datos de volumen de expedientes (creados vs cerrados por periodo)
   */
  async getVolumenExpedientes(filters?: VolumenFilters): Promise<VolumenData> {
    const params = new URLSearchParams()
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.set('dateTo', filters.dateTo)
    if (filters?.estado) params.set('estado', filters.estado)
    const qs = params.toString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<any>(
      `/reportes/volumen-expedientes${qs ? `?${qs}` : ''}`
    )
    const raw = res.data
    // Map backend fields (meses, total_*) to frontend interface (periodos, totales)
    return {
      periodos: raw.meses ?? raw.periodos ?? [],
      totales: raw.totales ?? {
        total_creados: raw.total_creados ?? 0,
        total_cerrados: raw.total_cerrados ?? 0,
        total_neto: raw.total_neto ?? 0,
      },
    }
  }

  /**
   * Obtiene datos de tasa de aprobacion de expedientes por periodo
   */
  async getAprobacionExpedientes(filters?: {
    dateFrom?: string
    dateTo?: string
  }): Promise<AprobacionData> {
    const params = new URLSearchParams()
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.set('dateTo', filters.dateTo)
    const qs = params.toString()
    const res = await apiClient.get<AprobacionData>(
      `/reportes/aprobacion${qs ? `?${qs}` : ''}`
    )
    return res.data
  }
  /**
   * Obtiene datos de ingresos por pagos por periodo
   */
  async getIngresosReporte(filters?: {
    dateFrom?: string
    dateTo?: string
    concepto?: string
  }): Promise<IngresosData> {
    const params = new URLSearchParams()
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.set('dateTo', filters.dateTo)
    if (filters?.concepto) params.set('concepto', filters.concepto)
    const qs = params.toString()
    const res = await apiClient.get<IngresosData>(
      `/reportes/ingresos${qs ? `?${qs}` : ''}`
    )
    return res.data
  }

  /**
   * Obtiene datos de tiempos promedio por etapa del flujo de expedientes
   */
  async getTiemposPorEtapa(filters?: {
    dateFrom?: string
    dateTo?: string
  }): Promise<TiemposData> {
    const params = new URLSearchParams()
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.set('dateTo', filters.dateTo)
    const qs = params.toString()
    const res = await apiClient.get<TiemposData>(
      `/reportes/tiempos-por-etapa${qs ? `?${qs}` : ''}`
    )
    return res.data
  }
}

export const reporteService = new ReporteService()
