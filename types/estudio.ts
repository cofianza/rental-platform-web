// ============================================
// Estudios de Riesgo Crediticio — Types
// ============================================

export type TipoEstudio = 'individual' | 'con_coarrendatario'
export type ProveedorEstudio = 'transunion' | 'sifin' | 'datacredito'
export type PagoPor = 'inmobiliaria' | 'arrendatario'

export type EstadoEstudio =
  | 'solicitado'
  | 'pago_pendiente'
  | 'pagado'
  | 'autorizado'
  | 'formulario_enviado'
  | 'formulario_completado'
  | 'documentos_cargados'
  | 'en_proceso'
  | 'completado'
  | 'fallido'
  | 'cancelado'

export type ResultadoEstudio = 'pendiente' | 'aprobado' | 'rechazado' | 'condicionado'

// ============================================
// Interfaces
// ============================================

export interface IEstudio {
  id: string
  expediente_id?: string
  tipo: TipoEstudio
  proveedor: ProveedorEstudio
  estado: EstadoEstudio
  resultado: ResultadoEstudio
  score?: number | null
  observaciones?: string | null
  duracion_contrato_meses: number
  pago_por: PagoPor
  fecha_solicitud: string
  fecha_completado?: string | null
  referencia_proveedor?: string | null
  certificado_url?: string | null
  motivo_rechazo?: string | null
  condiciones?: string | null
  datos_formulario?: Record<string, unknown> | null
  token_self_service?: string | null
  expiracion_token?: string | null
  estudio_padre_id?: string | null
  created_at: string
  updated_at: string
  solicitado_por?: {
    id: string
    nombre: string
    apellido: string
  } | null
}

export interface ICreateEstudioInput {
  tipo: TipoEstudio
  proveedor: ProveedorEstudio
  duracion_contrato_meses: number
  pago_por: PagoPor
  observaciones?: string
}

export interface IEstudioPublicForm {
  estudio_id: string
  tipo_estudio: TipoEstudio
  proveedor: ProveedorEstudio
  expediente_numero: string
  inmueble_direccion: string
  inmueble_ciudad: string
  solicitante_nombre: string
  ya_completado: boolean
}

export interface ISubmitFormularioInput {
  nombre_completo: string
  tipo_documento: string
  numero_documento: string
  email: string
  telefono: string
  ingresos_mensuales?: number
  ocupacion?: string
  empresa?: string
  direccion_residencia?: string
  acepta_terminos: true
}

export interface ISendLinkResponse {
  estudio: IEstudio
  enlace_enviado: boolean
  email_destino: string
}

// ============================================
// Registrar resultado
// ============================================

export interface IRegistrarResultadoInput {
  resultado: 'aprobado' | 'rechazado' | 'condicionado'
  score?: number
  observaciones: string
  motivo_rechazo?: string
  condiciones?: string
  certificado_storage_key?: string
}

export interface ICertificadoPresignedUrlResponse {
  signed_url: string
  storage_key: string
}

export interface ICertificadoViewUrlResponse {
  signed_url: string
}

// ============================================
// Global listing
// ============================================

export interface IEstudioListItem extends IEstudio {
  expedientes?: {
    numero: string
    solicitantes?: {
      nombre: string
      apellido: string
    } | null
  } | null
}

export interface IEstudioFilters {
  search: string
  estado: EstadoEstudio[]
  resultado: string
  proveedor: string
  fecha_desde: string
  fecha_hasta: string
  page: number
  limit: number
  sortBy: 'created_at' | 'estado' | 'resultado' | 'score'
  sortOrder: 'asc' | 'desc'
}

export interface IEstudiosMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

// ============================================
// Re-evaluacion
// ============================================

export type PropositoSoporte =
  | 'certificacion_laboral'
  | 'extractos_bancarios'
  | 'declaracion_renta'
  | 'carta_referencia'
  | 'otros_soportes'

export interface IDocumentoSoporte {
  id: string
  estudio_id: string
  storage_key: string
  nombre_original: string
  tipo_mime: string
  tamano_bytes: number
  proposito: PropositoSoporte
  created_at: string
  archivo_url?: string | null
}

export interface IEstudioHistorialItem extends IEstudio {
  numero_en_cadena: number
  es_reevaluacion: boolean
  documentos_soporte: IDocumentoSoporte[]
}

export interface IEstudioHistorial {
  total_en_cadena: number
  puede_reevaluar: boolean
  historial: IEstudioHistorialItem[]
}

export interface ISoportePresignedUrlInput {
  nombre_original: string
  tipo_mime: string
  tamano_bytes: number
  proposito: PropositoSoporte
}

export interface IConfirmarSoporteInput {
  storage_key: string
  nombre_original: string
  tipo_mime: string
  tamano_bytes: number
  proposito: PropositoSoporte
}
