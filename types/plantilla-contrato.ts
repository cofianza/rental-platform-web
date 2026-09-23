/**
 * Tipos para Plantillas de Contrato
 */

export interface IPlantillaContrato {
  id: string
  nombre: string
  descripcion: string | null
  contenido: string
  /** Plantillas HTML (V1/V4) que usa el generador de PDF; no se editan en el panel. */
  contenido_html?: string | null
  variables: string[]
  activa: boolean
  version: number
  creado_por: string | null
  created_at: string
  updated_at: string
}

export interface IPlantillaContratoFormData {
  nombre: string
  descripcion?: string
  /** Ausente al editar una plantilla HTML: solo cambian nombre, descripción y activa. */
  contenido?: string
  activa?: boolean
}

export interface IPlantillaContratoUpdateData {
  nombre?: string
  descripcion?: string | null
  contenido?: string
  activa?: boolean
}

export interface IPlantillaContratoFilters {
  search: string
  activa: 'true' | 'false' | ''
  page: number
  limit: number
  sortBy: 'created_at' | 'nombre' | 'version'
  sortDir: 'asc' | 'desc'
}

export interface IPlantillaContratoMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface IPlantillaPreviewResponse {
  nombre: string
  html: string
  variables_used: string[]
}

export interface IPlantillasResponse {
  success: boolean
  data: IPlantillaContrato[]
  pagination: IPlantillaContratoMeta
}

export interface IPlantillaResponse {
  success: boolean
  data: IPlantillaContrato
}

export interface IPlantillaPreviewApiResponse {
  success: boolean
  data: IPlantillaPreviewResponse
}
