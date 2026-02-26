/**
 * Tipos para Documentos - HP-295
 * Interfaces para el modulo de documentos de expedientes
 */

// ============================================
// Enums y tipos base
// ============================================

/**
 * Estados de un documento
 */
export type EstadoDocumento = 'pendiente' | 'aprobado' | 'rechazado' | 'reemplazado'

// ============================================
// Interfaces principales
// ============================================

/**
 * Tipo de documento (catalogo)
 */
export interface ITipoDocumento {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  es_obligatorio: boolean
  formatos_aceptados: string[]
  tamano_maximo_mb: number
  orden: number
  activo: boolean
  created_at: string
  updated_at: string
}

/**
 * Documento completo (respuesta API)
 */
export interface IDocumento {
  id: string
  expediente_id: string
  tipo_documento_id: string
  archivo_url: string | null
  nombre_original: string
  nombre_archivo: string | null
  storage_key: string | null
  tipo_mime: string | null
  tamano_bytes: number | null
  estado: EstadoDocumento
  motivo_rechazo: string | null
  version: number
  validado_por: string | null
  subido_por: string | null
  fecha_revision: string | null
  reemplazado_por: string | null
  created_at: string
  updated_at: string
  // Relacion con tipo_documento (join)
  tipo_documento?: {
    id: string
    codigo: string
    nombre: string
  }
  // Relacion con usuario que subio (opcional, detalle)
  subidor?: {
    id: string
    nombre: string
    apellido: string
  } | null
  // Relacion con validador (opcional, detalle)
  validador?: {
    id: string
    nombre: string
    apellido: string
  } | null
}

// ============================================
// Payloads para API
// ============================================

/**
 * Payload para solicitar URL presignada
 */
export interface IPresignedUrlRequest {
  expediente_id: string
  tipo_documento_id: string
  nombre_original: string
  tipo_mime: string
  tamano_bytes: number
}

/**
 * Respuesta de URL presignada
 */
export interface IPresignedUrlResponse {
  signedUrl: string
  storage_key: string
  nombre_archivo: string
  token: string
  expires_in: number
}

/**
 * Payload para confirmar subida
 */
export interface IConfirmarSubidaRequest {
  expediente_id: string
  tipo_documento_id: string
  nombre_original: string
  nombre_archivo: string
  storage_key: string
  tipo_mime: string
  tamano_bytes: number
}

/**
 * Query para listar documentos
 */
export interface IListDocumentosQuery {
  page?: number
  limit?: number
  tipo_documento_id?: string
  estado?: EstadoDocumento
  sortBy?: 'created_at' | 'nombre_original' | 'estado'
  sortOrder?: 'asc' | 'desc'
}

// ============================================
// Tipos de respuesta API
// ============================================

/**
 * Respuesta de URL presignada
 */
export interface IPresignedUrlApiResponse {
  success: boolean
  data: IPresignedUrlResponse
}

/**
 * Respuesta de confirmar subida
 */
export interface IConfirmarSubidaApiResponse {
  success: boolean
  data: IDocumento
}

/**
 * Respuesta de lista de documentos
 */
export interface IDocumentosListResponse {
  success: boolean
  data: IDocumento[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

/**
 * Respuesta de un documento
 */
export interface IDocumentoResponse {
  success: boolean
  data: IDocumento
}

/**
 * Respuesta de tipos de documento
 */
export interface ITiposDocumentoResponse {
  success: boolean
  data: ITipoDocumento[]
}

// ============================================
// Tipos para UI del wizard de documentos
// ============================================

/**
 * Estado de subida de un documento en la UI
 */
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

/**
 * Estado de un tipo de documento en la UI
 */
export interface IDocumentoUploadState {
  tipoDocumento: ITipoDocumento
  documento: IDocumento | null
  status: UploadStatus
  progress: number
  error: string | null
}

/**
 * Resumen de progreso de documentos
 */
export interface IDocumentosProgress {
  total: number
  completados: number
  obligatoriosTotal: number
  obligatoriosCompletados: number
}
