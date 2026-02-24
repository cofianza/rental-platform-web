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

// ============================================
// HP-243: Vista Detalle del Expediente
// ============================================

/**
 * Inmueble detallado para vista de expediente
 * Campos alineados con backend: inmuebles(id, codigo, direccion, ciudad, departamento, tipo, estado, valor_arriendo)
 */
export interface IExpedienteInmuebleDetalle {
  id: string
  codigo: string
  titulo?: string  // Opcional - no viene del backend en detalle
  direccion: string
  ciudad: string
  departamento: string
  tipo: string
  uso?: string  // Opcional
  estrato?: number  // Opcional
  valor_arriendo: number
  valor_administracion?: number | null
  area_construida?: number | null
  habitaciones?: number | null
  banos?: number | null
  parqueaderos?: number | null
  foto_fachada_url?: string | null
}

/**
 * Solicitante detallado para vista de expediente
 * Campos alineados con backend: solicitantes(id, nombre, apellido, tipo_documento, numero_documento, email, telefono)
 */
export interface IExpedienteSolicitanteDetalle {
  id: string
  tipo_persona?: 'natural' | 'juridica'
  tipo_documento: string
  numero_documento: string
  nombre: string  // Backend usa singular
  apellido: string  // Backend usa singular
  email: string
  telefono: string
  direccion?: string | null
  departamento?: string | null
  ciudad?: string | null
  ocupacion?: string | null
  actividad_economica?: string | null
  ingresos_mensuales?: number | null
  nivel_educativo?: string | null
  parentesco?: string | null
  habitara_inmueble?: boolean | null
}

/**
 * Expediente con datos completos para vista detalle
 */
export interface IExpedienteDetalle extends Omit<IExpediente, 'inmueble' | 'solicitante'> {
  inmueble: IExpedienteInmuebleDetalle | null
  solicitante: IExpedienteSolicitanteDetalle | null
}

/**
 * Transición disponible para un expediente
 */
export interface ITransicionDisponible {
  estado_destino: EstadoExpediente
  etiqueta: string
  requiere_comentario: boolean
  color?: string
}

/**
 * Payload para ejecutar transición
 */
export interface IEjecutarTransicion {
  estado_destino: EstadoExpediente
  comentario: string
}

/**
 * Comentario interno del expediente (HP-263)
 */
export interface IComentarioExpediente {
  id: string
  expediente_id: string
  usuario_id: string
  usuario: {
    id: string
    nombre: string
    apellido: string
  }
  contenido: string
  is_internal: boolean
  created_at: string
  updated_at: string
}

/**
 * Payload para crear comentario
 */
export interface ICrearComentario {
  contenido: string
}

/**
 * Evento del timeline del expediente (HP-270)
 */
export interface ITimelineEvento {
  id: string
  expediente_id: string
  tipo: 'creacion' | 'transicion' | 'documento' | 'comentario' | 'asignacion' | 'estudio' | 'contrato' | 'pago'
  descripcion: string
  detalle: Record<string, unknown> | null
  usuario_id: string
  usuario: {
    id: string
    nombre: string
    apellido: string
  }
  created_at: string
}

// ============================================
// Responses para HP-243
// ============================================

export interface IExpedienteDetalleResponse {
  success: boolean
  data: IExpedienteDetalle
}

export interface ITransicionesDisponiblesResponse {
  success: boolean
  data: ITransicionDisponible[]
}

export interface IComentariosResponse {
  success: boolean
  data: IComentarioExpediente[]
}

export interface ITimelineResponse {
  success: boolean
  data: ITimelineEvento[]
}

// ============================================
// Historial de transiciones de estado
// ============================================

/**
 * Item del historial de transiciones (GET /expedientes/:id/transitions)
 */
export interface IHistorialTransicion {
  id: string
  estado_anterior: EstadoExpediente | null
  estado_nuevo: EstadoExpediente | null
  comentario: string | null
  descripcion: string
  created_at: string
  usuario: {
    id: string
    nombre: string
    apellido: string
  } | null
}
