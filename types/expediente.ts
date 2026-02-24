/**
 * Tipos para Expedientes - HP-229
 * Interfaces para el módulo de expedientes
 */

import type { EstadoExpediente } from '@/lib/constants'

// Re-export del tipo de estado
export type { EstadoExpediente }

/**
 * Inmueble asociado al expediente
 */
export interface IExpedienteInmueble {
  id: string
  codigo: string
  titulo: string
  direccion: string
  ciudad: string
}

/**
 * Solicitante del expediente
 */
export interface IExpedienteSolicitante {
  id: string
  nombre: string  // Nombre completo (nombres + apellidos concatenados por el backend)
  documento: string // Tipo + número de documento
}

/**
 * Analista/Responsable del expediente
 */
export interface IExpedienteAnalista {
  id: string
  nombre: string
  apellido: string
}

/**
 * Expediente completo (respuesta de API)
 */
export interface IExpediente {
  id: string
  numero_expediente: string
  inmueble_id: string
  inmueble: IExpedienteInmueble | null
  solicitante_id: string
  solicitante: IExpedienteSolicitante | null
  analista_id: string | null
  analista: IExpedienteAnalista | null
  creador_id: string
  creador: {
    id: string
    nombre: string
    apellido: string
  } | null
  estado: EstadoExpediente
  notas: string | null
  created_at: string
  updated_at: string
}

/**
 * Filtros de listado de expedientes
 */
export interface IExpedienteFilters {
  search: string
  estado: EstadoExpediente[] // Multi-select: array de estados
  analista_id: string
  fecha_desde: string // ISO date string
  fecha_hasta: string // ISO date string
  page: number
  limit: number
  sortBy: 'created_at' | 'numero' | 'estado'
  sortOrder: 'asc' | 'desc'
}

/**
 * Metadatos de paginación
 */
export interface IExpedientesMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Estadísticas por estado (formato API)
 */
export interface IExpedientesStatsRaw {
  total: number
  stats: Array<{
    estado: EstadoExpediente
    count: number
  }>
}

/**
 * Estadísticas por estado (formato transformado para UI)
 */
export interface IExpedientesStats {
  total: number
  por_estado: Record<EstadoExpediente, number>
}

/**
 * Opción de analista para dropdown
 */
export interface IAnalistaOption {
  id: string
  nombre: string
}

/**
 * Respuesta de listado de expedientes
 */
export interface IExpedientesResponse {
  success: boolean
  data: IExpediente[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

/**
 * Respuesta de un expediente
 */
export interface IExpedienteResponse {
  success: boolean
  data: IExpediente
}

/**
 * Respuesta de estadísticas (formato API)
 */
export interface IExpedientesStatsResponse {
  success: boolean
  data: IExpedientesStatsRaw
}
