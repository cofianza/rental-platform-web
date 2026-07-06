/**
 * Tipos para Solicitantes - HP-247
 * Interfaces para el modulo de solicitantes/applicants
 */

// ============================================
// Enums y tipos base
// ============================================

/**
 * Tipo de persona
 */
export type TipoPersona = 'natural' | 'juridica'

/**
 * Tipos de documento (alineado con backend)
 */
export type TipoDocumento = 'cc' | 'ce' | 'pasaporte' | 'nit'

/**
 * Niveles educativos
 */
export type NivelEducativo = 'primaria' | 'secundaria' | 'tecnico' | 'universitario' | 'posgrado'

// ============================================
// Interfaces principales
// ============================================

/**
 * Solicitante completo (respuesta API)
 */
export interface ISolicitante {
  id: string
  tipo_persona: TipoPersona
  nombre: string
  apellido: string
  tipo_documento: TipoDocumento
  numero_documento: string
  email: string
  telefono: string | null
  direccion: string | null
  departamento: string | null
  ciudad: string | null
  ocupacion: string | null
  actividad_economica: string | null
  empresa: string | null
  ingresos_mensuales: number | null
  nivel_educativo: NivelEducativo | null
  parentesco: string | null
  habitara_inmueble: boolean
  estado: 'activo' | 'inactivo'
  created_at: string
  updated_at: string
  /** true si al "crear" se reutilizó una ficha ya existente por documento (3.1). */
  reutilizado?: boolean
}

/**
 * Datos para crear un solicitante
 */
export interface ISolicitanteCreateData {
  tipo_persona: TipoPersona
  nombre: string
  apellido: string
  tipo_documento: TipoDocumento
  numero_documento: string
  email: string
  telefono?: string
  direccion?: string
  departamento?: string
  ciudad?: string
  ocupacion?: string
  actividad_economica?: string
  empresa?: string
  ingresos_mensuales?: number
  nivel_educativo?: NivelEducativo
  parentesco?: string
  habitara_inmueble?: boolean
}

/**
 * Datos para actualizar un solicitante
 */
export interface ISolicitanteUpdateData extends Partial<ISolicitanteCreateData> {}

// ============================================
// Tipos de respuesta API
// ============================================

/**
 * Respuesta de un solicitante
 */
export interface ISolicitanteResponse {
  success: boolean
  data: ISolicitante
}

/**
 * Respuesta de busqueda (puede no encontrar)
 */
export interface ISolicitanteSearchResponse {
  success: boolean
  data: ISolicitante | null
}

/**
 * Respuesta de lista de solicitantes
 */
export interface ISolicitantesListResponse {
  success: boolean
  data: ISolicitante[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
