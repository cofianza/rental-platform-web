/**
 * Tipos para Historial de Cambios de Inmuebles - HP-188
 */

export interface ICambioInmueble {
  id: string
  inmueble_id: string
  usuario_id: string
  usuario_nombre: string | null
  campo: string
  campo_label: string
  valor_anterior: string | null
  valor_nuevo: string | null
  created_at: string
}

export interface ICambiosResumen {
  total_cambios: number
  ultimo_cambio: ICambioInmueble | null
  campos_mas_modificados: {
    campo: string
    campo_label: string
    count: number
  }[]
}

export interface ICambiosResponse {
  success: boolean
  data: ICambioInmueble[]
  pagination: {
    total: number
    page: number
    size: number
    totalPages: number
  }
}

export interface ICambiosResumenResponse {
  success: boolean
  data: ICambiosResumen
}
