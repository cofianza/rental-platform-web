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
  // Desembolso de Cofianza al propietario (migración 20260528000001).
  cofianza_pago_realizado: boolean | null
  cofianza_pago_monto: number | null
  cofianza_pago_fecha: string | null
  // Ley 2300: cuándo sale el WhatsApp de cobro que quedó esperando; y P27: el
  // dueño reportó un pago en Fase 3 y el WhatsApp espera la revisión de Cofianza.
  whatsapp_programado_para?: string | null
  whatsapp_pausado_at?: string | null
  created_at: string
  updated_at: string
}

export interface IMoraMensaje {
  id: string
  mora_id: string
  autor_tipo: 'sistema' | 'asesor' | 'inquilino' | 'propietario'
  autor_id: string | null
  /** Quién escribió o hizo la acción (también en los mensajes de sistema). */
  autor?: { nombre: string | null; apellido: string | null } | null
  mensaje: string
  via_whatsapp: boolean
  whatsapp_message_id: string | null
  created_at: string
}

export interface IMoraDetalle extends IMoraTicket {
  mensajes: IMoraMensaje[]
}

/** Qué pasó con el WhatsApp al inquilino al reportar o escalar. 'programado' =
 *  fuera del horario de cobranza de la Ley 2300 (o ya tuvo una gestión ese día):
 *  sale en `whatsapp_programado_para`. 'retenido' = igual, pero el envío
 *  automático está apagado y nada lo va a mandar solo. */
export type WhatsappEstado = 'aceptado' | 'fallido' | 'mock' | 'sin_telefono' | 'programado' | 'retenido'

export interface IMoraConAviso extends IMoraDetalle {
  whatsapp_estado: WhatsappEstado
  whatsapp_programado_para?: string | null
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
  /** 'activas' = fases 1 a 3 (la cola, sin pagadas ni canceladas). */
  estado?: 'todas' | 'activas' | MoraEstado
  orden?: 'asc' | 'desc'
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
    if (query.orden) params.set('orden', query.orden)
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

  async reportar(input: IReportarMoraInput): Promise<IMoraConAviso> {
    const res = await apiClient.post<IMoraConAviso>(this.base, input)
    return res.data
  }

  /** `desde` = la fase que ve la pantalla: si otro ya la escaló, el API responde 409. */
  async escalar(id: string, desde?: MoraEstado, notas?: string): Promise<IMoraConAviso> {
    const res = await apiClient.patch<IMoraConAviso>(`${this.base}/${id}/escalar`, { notas, desde })
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

  /** `reportaPago`: el dueño anota en Fase 3 que el inquilino le pagó (Cofianza lo revisa). */
  async agregarMensaje(id: string, mensaje: string, reportaPago = false): Promise<IMoraMensaje> {
    const res = await apiClient.post<IMoraMensaje>(`${this.base}/${id}/mensajes`, {
      mensaje,
      reporta_pago: reportaPago,
    })
    return res.data
  }

  /** Cofianza revisó el pago reportado y el cobro sigue: el WhatsApp de Fase 3 sale. */
  async reanudarWhatsapp(id: string): Promise<IMoraDetalle> {
    const res = await apiClient.patch<IMoraDetalle>(`${this.base}/${id}/reanudar-whatsapp`, {})
    return res.data
  }
}

export const morasService = new MorasService()
