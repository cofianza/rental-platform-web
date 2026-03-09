/**
 * Tipos para Contratos generados desde plantillas
 */

export type EstadoContrato =
  | 'borrador'
  | 'en_revision'
  | 'aprobado'
  | 'pendiente_firma'
  | 'firmado'
  | 'vigente'
  | 'finalizado'
  | 'cancelado'

export interface IContrato {
  id: string
  expediente_id: string
  plantilla_id: string | null
  version: number
  estado: EstadoContrato
  contenido_pdf_url: string | null
  documento_firmado_url: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  duracion_meses: number | null
  valor_arriendo: number | null
  datos_variables: Record<string, string> | null
  generado_por: string | null
  fecha_generacion: string | null
  storage_key: string | null
  nombre_archivo: string | null
  plantilla_version: number | null
  fecha_firma: string | null
  fecha_terminacion: string | null
  motivo_cancelacion: string | null
  contrato_padre_id: string | null
  firmado_storage_key: string | null
  firmado_nombre_archivo: string | null
  firmado_hash_integridad: string | null
  firmado_ip: string | null
  firmado_user_agent: string | null
  firmado_referencia_otp: string | null
  firmado_notas: string | null
  firmado_tamano_bytes: number | null
  firmado_subido_por: string | null
  firmado_subido_en: string | null
  created_at: string
  updated_at: string
}

export interface IGenerarContratoInput {
  plantilla_id: string
  variables?: Record<string, string>
  fecha_inicio?: string
  duracion_meses?: number
}

export interface IRenovarContratoInput {
  fecha_inicio?: string
  duracion_meses?: number
  variables?: Record<string, string>
}

export interface IContratoMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface IContratoDownloadResponse {
  url: string
  nombre_archivo: string
  tipo_mime: string
  expires_in: number
}

export interface IContratosResponse {
  success: boolean
  data: IContrato[]
  pagination: IContratoMeta
}

export interface IContratoResponse {
  success: boolean
  data: IContrato
}

export interface IContratoDownloadApiResponse {
  success: boolean
  data: IContratoDownloadResponse
}

// ============================================================
// Versiones
// ============================================================

export interface IContratoVersion {
  id: string
  contrato_id: string
  version: number
  datos_variables: Record<string, string> | null
  storage_key: string
  nombre_archivo: string | null
  plantilla_version: number | null
  generado_por: string | null
  fecha_generacion: string | null
  resumen_cambios: string | null
  created_at: string
}

export interface IVersionDiferencia {
  variable: string
  valor_v1: string | null
  valor_v2: string | null
  cambio: 'agregada' | 'eliminada' | 'modificada' | 'sin_cambio'
}

export interface IVersionComparison {
  contrato_id: string
  v1: { version: number; fecha_generacion: string | null; plantilla_version: number | null }
  v2: { version: number; fecha_generacion: string | null; plantilla_version: number | null }
  diferencias: IVersionDiferencia[]
  total_cambios: number
}

export interface IVersionesResponse {
  success: boolean
  data: IContratoVersion[]
}

export interface IVersionComparisonResponse {
  success: boolean
  data: IVersionComparison
}

// ============================================================
// Transiciones de estado
// ============================================================

export interface IContratoTransicionDisponible {
  estado_destino: EstadoContrato
  etiqueta: string
}

export interface IContratoTransicionesResponse {
  success: boolean
  data: {
    contrato_id: string
    estado_actual: EstadoContrato
    transiciones_disponibles: Array<{ estado: EstadoContrato; label: string }>
  }
}

export interface IContratoHistorialEntry {
  id: string
  estado_anterior: EstadoContrato | null
  estado_nuevo: EstadoContrato | null
  comentario: string | null
  motivo: string | null
  descripcion: string
  created_at: string
  usuario: { id: string; nombre: string; apellido: string } | null
}

export interface IContratoHistorialResponse {
  success: boolean
  data: {
    contrato_id: string
    estado_actual: EstadoContrato
    historial: IContratoHistorialEntry[]
  }
}

export interface IContratoTransitionInput {
  nuevo_estado: EstadoContrato
  comentario: string
  motivo?: string
}

// ============================================================
// Listado global
// ============================================================

export interface IContratoListItem extends IContrato {
  expedientes?: {
    numero: string
    inmuebles?: { direccion: string; ciudad: string } | null
  } | null
}

// ============================================================
// Contrato firmado
// ============================================================

export interface IContratoInfoFirma {
  tiene_firmado: boolean
  firmado_nombre_archivo: string | null
  firmado_hash_integridad: string | null
  firmado_ip: string | null
  firmado_user_agent: string | null
  firmado_referencia_otp: string | null
  firmado_notas: string | null
  firmado_tamano_bytes: number | null
  firmado_subido_en: string | null
  firmado_subido_por: { id: string; nombre: string; apellido: string } | null
}

export interface IContratoVerificacionIntegridad {
  valido: boolean
  hash_almacenado: string
  hash_recalculado: string
  fecha_verificacion: string
}

export interface IContratoAccesoFirmado {
  id: string
  tipo_accion: 'descarga' | 'visualizacion' | 'verificacion'
  ip: string | null
  user_agent: string | null
  created_at: string
  usuario: { id: string; nombre: string; apellido: string } | null
}

// ============================================================
// Listado global
// ============================================================

export interface IContratoListFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  estado?: string
  search?: string
  fecha_desde?: string
  fecha_hasta?: string
}
