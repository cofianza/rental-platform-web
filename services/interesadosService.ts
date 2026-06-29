import { apiClient } from '@/lib/api'

export type InteresadoEstado = 'nuevo' | 'contactado' | 'descartado'

export interface Interesado {
  id: string
  inmueble_id: string
  nombre: string
  telefono: string
  email: string
  mensaje: string | null
  estado: InteresadoEstado
  created_at: string
  inmuebles: {
    tipo: string
    ciudad: string
    barrio: string | null
    direccion: string | null
    foto_fachada_url: string | null
  } | null
}

export interface InteresadosQuery {
  estado?: InteresadoEstado
  inmueble_id?: string
  page?: number
  limit?: number
}

export const interesadosService = {
  /** Lista los interesados de los inmuebles del usuario (scopeado en el backend). */
  async list(query: InteresadosQuery = {}): Promise<Interesado[]> {
    const params = new URLSearchParams()
    if (query.estado) params.set('estado', query.estado)
    if (query.inmueble_id) params.set('inmueble_id', query.inmueble_id)
    params.set('limit', String(query.limit ?? 100))
    if (query.page) params.set('page', String(query.page))
    const res = await apiClient.get<Interesado[]>(`/interesados?${params.toString()}`)
    return res.data ?? []
  },

  /** Cambia el estado de un interesado (nuevo/contactado/descartado). */
  async updateEstado(id: string, estado: InteresadoEstado): Promise<void> {
    await apiClient.patch(`/interesados/${id}`, { estado })
  },

  /** Conteo de interesados 'nuevo' (sin atender) — para el badge de la pestaña. */
  async contarNuevos(): Promise<number> {
    const res = await apiClient.get<{ nuevos: number }>('/interesados/count')
    return res.data?.nuevos ?? 0
  },
}
