/**
 * Tipos para Contratos generados desde plantillas
 */

export type EstadoContrato =
  | 'borrador'
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
  created_at: string
  updated_at: string
}

export interface IGenerarContratoInput {
  plantilla_id: string
  variables?: Record<string, string>
  fecha_inicio?: string
  duracion_meses?: number
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
