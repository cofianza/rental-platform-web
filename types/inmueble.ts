/**
 * Tipos para Inmuebles - HP-174
 */

// Enums
export type TipoInmueble = 'apartamento' | 'casa' | 'oficina' | 'local' | 'bodega'
export type UsoInmueble = 'vivienda' | 'local_comercial'
export type EstadoInmueble = 'disponible' | 'en_estudio' | 'ocupado' | 'inactivo'

// Propietario (datos embebidos en inmueble)
export interface IPropietario {
  id: string
  nombre: string
  apellido: string
  telefono?: string
  email?: string
}

// Inmueble completo
export interface IInmueble {
  id: string
  codigo: string
  direccion: string
  ciudad: string
  barrio?: string | null
  departamento: string
  tipo: TipoInmueble
  uso: UsoInmueble
  destinacion?: string | null
  estrato: number
  valor_arriendo: number
  valor_comercial?: number | null
  administracion: number
  area_m2?: number | null
  habitaciones: number
  banos: number
  parqueadero: boolean
  parqueaderos: number
  piso?: string | null
  latitud?: number | null
  longitud?: number | null
  descripcion?: string | null
  notas_internas?: string | null
  estado: EstadoInmueble
  propietario_id: string
  visible_vitrina: boolean
  foto_fachada_url: string
  created_at: string
  updated_at: string
  // Relación con propietario (solo en detalle)
  propietario?: IPropietario
  // Contrato tipo subido por el propietario (alternativa a plantilla con variables)
  contrato_tipo_storage_key?: string | null
  contrato_tipo_nombre_archivo?: string | null
  contrato_tipo_tamano_bytes?: number | null
  contrato_tipo_subido_en?: string | null
  // Datos para contrato (cláusulas PRIMERA y SEGUNDA del contrato).
  // propiedad_horizontal: null = inferir por administración; true/false = explícito.
  propiedad_horizontal?: boolean | null
  cuarto_util?: boolean | null
  ubicacion_detallada?: string | null
}

// Formulario de creación
export interface IInmuebleCreateData {
  // Básicos (requeridos)
  direccion: string
  ciudad: string
  departamento: string
  tipo: TipoInmueble
  estrato: number
  valor_arriendo: number
  propietario_id: string
  foto_fachada_url: string
  // Opcionales
  barrio?: string
  uso?: UsoInmueble
  destinacion?: string
  valor_comercial?: number
  administracion?: number
  area_m2?: number
  habitaciones?: number
  banos?: number
  parqueadero?: boolean
  parqueaderos?: number
  piso?: string
  latitud?: number
  longitud?: number
  descripcion?: string
  notas_internas?: string
  visible_vitrina?: boolean
  // Datos para contrato
  propiedad_horizontal?: boolean | null
  cuarto_util?: boolean
  ubicacion_detallada?: string | null
}

// Formulario de edición (todos opcionales)
export interface IInmuebleUpdateData {
  direccion?: string
  ciudad?: string
  departamento?: string
  barrio?: string | null
  tipo?: TipoInmueble
  uso?: UsoInmueble
  destinacion?: string | null
  estrato?: number
  valor_arriendo?: number
  valor_comercial?: number | null
  administracion?: number
  area_m2?: number | null
  habitaciones?: number
  banos?: number
  parqueadero?: boolean
  parqueaderos?: number | null
  piso?: string | null
  latitud?: number | null
  longitud?: number | null
  descripcion?: string | null
  notas_internas?: string | null
  estado?: EstadoInmueble
  propietario_id?: string
  visible_vitrina?: boolean
  foto_fachada_url?: string
  // Datos para contrato
  propiedad_horizontal?: boolean | null
  cuarto_util?: boolean | null
  ubicacion_detallada?: string | null
}

// Filtros de listado
export interface IInmuebleFilters {
  search: string
  tipo: TipoInmueble | ''
  ciudad: string
  estado: EstadoInmueble | ''
  estrato: number | ''
  propietario_id: string
  visible_vitrina: boolean | ''
  // Rangos de arriendo
  rent_min: number | ''
  rent_max: number | ''
  // Paginación
  page: number
  limit: number
  // Ordenamiento
  sortBy: 'created_at' | 'valor_arriendo' | 'ciudad' | 'codigo' | 'area_m2' | 'tipo' | 'estrato' | 'estado'
  sortOrder: 'asc' | 'desc'
}

// Meta de paginación
export interface IInmueblesMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

// Opciones de filtros dinámicos (del backend)
export interface IFilterOptions {
  ciudades: string[]
  departamentos: string[]
  tipos: TipoInmueble[]
  estados: EstadoInmueble[]
  estrato: {
    min: number
    max: number
  }
  valor_arriendo: {
    min: number
    max: number
  }
}

// Estado del store
export interface IInmueblesState {
  inmuebles: IInmueble[]
  meta: IInmueblesMeta | null
  filters: IInmuebleFilters
  filterOptions: IFilterOptions | null
  isLoading: boolean
  error: string | null
  selectedInmueble: IInmueble | null
}

// Respuestas de API
export interface IInmueblesResponse {
  success: boolean
  data: IInmueble[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface IInmuebleResponse {
  success: boolean
  data: IInmueble
}

export interface IFilterOptionsResponse {
  success: boolean
  data: IFilterOptions
}

// ============================================
// FOTOS DEL INMUEBLE - HP-203
// ============================================

/**
 * Foto del inmueble
 */
export interface IFotoInmueble {
  id: string
  inmueble_id: string
  url: string
  url_thumbnail?: string | null
  descripcion?: string | null
  orden: number
  es_fachada: boolean
  tamaño_archivo?: number | null
  tipo_archivo?: string | null
  created_at: string
}

/**
 * Datos para crear una foto
 */
export interface IFotoInmuebleCreate {
  url: string
  url_thumbnail?: string
  descripcion?: string
  orden?: number
  es_fachada?: boolean
  tamaño_archivo?: number
  tipo_archivo?: string
}

/**
 * Datos para actualizar una foto
 */
export interface IFotoInmuebleUpdate {
  descripcion?: string | null
  orden?: number
  es_fachada?: boolean
}

/**
 * Respuesta de lista de fotos
 */
export interface IFotosInmuebleResponse {
  success: boolean
  data: IFotoInmueble[]
}

/**
 * Respuesta de una foto
 */
export interface IFotoInmuebleResponse {
  success: boolean
  data: IFotoInmueble
}

/**
 * Constantes de fotos
 */
export const FOTO_LIMITS = {
  MAX_FOTOS_PER_INMUEBLE: 20,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const
