// ============================================
// Moras Service — flujo 3 fases (Mario 12-may-2026).
// ============================================

import { apiClient } from '@/lib/api'

export type MoraEstado = 'fase_1' | 'fase_2' | 'fase_3' | 'pagada' | 'cancelada'

export interface IMoraTicket {
  id: string
  ticket_numero: string
  contrato_id: string
  expediente_id: string | null
  solicitante_id: string | null
  inquilino_nombre: string
  inquilino_telefono: string | null
  inquilino_email: string | null
  inmueble_codigo: string | null
  inmueble_direccion: string | null
  coarrendatario_id: string | null
  coarrendatario_nombre: string | null
  monto_mora: number
  fecha_vencimiento_canon: string
  estado: MoraEstado
  reportado_por: string
  reportado_at: string
  descripcion: string | null
  fase_2_at: string | null
  fase_3_at: string | null
  pagada_at: string | null
  cancelada_at: string | null
  cancelado_motivo: string | null
  created_at: string
  updated_at: string
}

export interface IMoraMensaje {
  id: string
  mora_id: string
  autor_tipo: 'sistema' | 'asesor' | 'inquilino' | 'propietario'
  autor_id: string | null
  mensaje: string
  via_whatsapp: boolean
  whatsapp_message_id: string | null
  created_at: string
}

export interface IMoraDetalle extends IMoraTicket {
  mensajes: IMoraMensaje[]
}

export interface IMorasStats {
  reportadas_mes: number
  resueltas: number
  en_gestion: number
  monto_total: number
}

export interface IReportarMoraInput {
  contrato_id: string
  fecha_vencimiento_canon: string
  monto_mora: number
  descripcion?: string
}

export interface IListMorasQuery {
  estado?: 'todas' | MoraEstado
  contrato_id?: string
  page?: number
  limit?: number
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

class MorasService {
  private base = '/moras'

  async stats(): Promise<IMorasStats> {
    const res = await apiClient.get<IMorasStats>(`${this.base}/stats`)
    return res.data
  }

  async list(query: IListMorasQuery = {}): Promise<{
    data: IMoraTicket[]
    pagination: PaginationMeta
  }> {
    const params = new URLSearchParams()
    if (query.estado) params.set('estado', query.estado)
    if (query.contrato_id) params.set('contrato_id', query.contrato_id)
    if (query.page) params.set('page', String(query.page))
    if (query.limit) params.set('limit', String(query.limit))
    const qs = params.toString()
    const res = (await apiClient.get(`${this.base}${qs ? `?${qs}` : ''}`)) as unknown as {
      data: IMoraTicket[]
      pagination?: PaginationMeta
    }
    return {
      data: res.data ?? [],
      pagination: res.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 0 },
    }
  }

  async getById(id: string): Promise<IMoraDetalle> {
    const res = await apiClient.get<IMoraDetalle>(`${this.base}/${id}`)
    return res.data
  }

  async reportar(input: IReportarMoraInput): Promise<IMoraDetalle> {
    const res = await apiClient.post<IMoraDetalle>(this.base, input)
    return res.data
  }

  async escalar(id: string, notas?: string): Promise<IMoraDetalle> {
    const res = await apiClient.patch<IMoraDetalle>(`${this.base}/${id}/escalar`, { notas })
    return res.data
  }

  async marcarPagada(
    id: string,
    input: { fecha_pago?: string; notas?: string } = {},
  ): Promise<IMoraDetalle> {
    const res = await apiClient.patch<IMoraDetalle>(`${this.base}/${id}/pagar`, input)
    return res.data
  }

  async cancelar(id: string, motivo: string): Promise<IMoraDetalle> {
    const res = await apiClient.patch<IMoraDetalle>(`${this.base}/${id}/cancelar`, { motivo })
    return res.data
  }

  async agregarMensaje(
    id: string,
    mensaje: string,
    viaWhatsapp = false,
  ): Promise<IMoraMensaje> {
    const res = await apiClient.post<IMoraMensaje>(`${this.base}/${id}/mensajes`, {
      mensaje,
      via_whatsapp: viaWhatsapp,
    })
    return res.data
  }
}

export const morasService = new MorasService()
