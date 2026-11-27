// ============================================
// Moras Service — flujo 3 fases (Gerencia 12-may-2026).
// ============================================

import { apiClient } from '@/lib/api'
import { leerPaginacion } from '@/lib/paginacion'
import type { EstadoDiferidos } from '@/types/migracion'

export type MoraEstado = 'fase_1' | 'fase_2' | 'fase_3' | 'pagada' | 'cancelada'

/**
 * Adenda 6.1 §4: estado del reporte (aparte de la fase). 'completo' = corre el
 * plazo de pago de Cofianza; 'incompleto' = contrato en notaría sin el contrato
 * autenticado; 'por_verificar' = Cofianza lo revisa; 'no_paga' = no corresponde
 * o la fecha está fuera de rango (final).
 */
export type ReporteEstado = 'completo' | 'incompleto' | 'por_verificar' | 'no_paga'
export type ResultadoVerificacion = 'verificado' | 'no_corresponde' | 'fecha_fuera_de_rango'

/** Lo que la API guarda de la constancia de notaría del contrato (sin IP ni quién registró). */
export interface IReporteNotaria {
  fecha_autenticacion: string | null
  rango: { desde: string; hasta: string; dias: number } | null
  fecha_en_rango: boolean | null
  documento: { nombre_archivo: string; sha256: string; bytes: number; subido_en: string | null } | null
  presentado_en: string | null
  verificacion: {
    resultado: ResultadoVerificacion
    nota: string | null
    en: string
    automatica?: boolean
  } | null
}

/** Lo que el formulario necesita del contrato elegido (la API calcula la fecha pactada). */
export interface IDatosReporteMora {
  contrato_id: string
  canon: number | null
  /** La fecha de pago pactada del mes en curso según el contrato (AAAA-MM-DD). */
  fecha_vencimiento: string
  dia_pago: number
  fuente_fecha: 'v3' | 'anterior' | 'sin_dato'
  explicacion_fecha: string
  /** `carga_inmobiliaria`: contrato V3 (contratos.destinacion), cuyo contrato autenticado solo lo carga la
   *  inmobiliaria (o Cofianza): el propietario no. Ausente con una API anterior. */
  notaria: { documento_cargado: boolean; fecha_en_rango: boolean | null; carga_inmobiliaria?: boolean } | null
  plazo_pago_dias: number
}

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
  // Adenda 6.1 §4 y reporte de la Oficina Virtual (punto 2).
  reporte_estado?: ReporteEstado
  reporte_completo_at?: string | null
  reporte_notaria?: IReporteNotaria | null
  /** Último día (AAAA-MM-DD) en que Cofianza paga: 20 días calendario desde el reporte completo. null si no corre. */
  plazo_pago_hasta?: string | null
  /** Se reportó entre el día 6 y el 10 (fuera de la ventana no se promete la fecha de pago). */
  reporte_en_ventana?: boolean | null
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
  /** Solo contratos migrados (§5.1.4): si la mora se puede reportar a centrales. null = no aplica. */
  reportable_centrales?: { reportable: boolean | null; motivo: string | null } | null
  /** Migración, Adenda 1 §3: datos que la inmobiliaria debe entregar por la mora. null = no aplica. */
  diferidos?: (EstadoDiferidos & { fila_id: string; lote_id: string }) | null
  /** Contrato V3 en notaría: el contrato autenticado solo lo carga la inmobiliaria (o Cofianza), no el propietario.
   *  Ausente con una API anterior. */
  notaria_carga_inmobiliaria?: boolean
}

/** Qué pasó con el WhatsApp al inquilino al reportar o escalar. 'programado' =
 *  fuera del horario de cobranza de la Ley 2300 (o sin 7 días desde el último WhatsApp de cobro):
 *  sale en `whatsapp_programado_para`. 'retenido' = igual, pero el envío
 *  automático está apagado y nada lo va a mandar solo. */
export type WhatsappEstado = 'aceptado' | 'fallido' | 'mock' | 'sin_telefono' | 'programado' | 'retenido'

export interface IMoraConAviso extends IMoraDetalle {
  whatsapp_estado: WhatsappEstado
  whatsapp_programado_para?: string | null
  /** El WhatsApp no salió (Meta lo rechazó) y el cobro le llegó al inquilino por correo en su lugar. */
  cobro_por_correo?: boolean
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
  /** La cola de Operaciones: 'por_verificar'. */
  reporte?: ReporteEstado
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
    if (query.reporte) params.set('reporte', query.reporte)
    if (query.page) params.set('page', String(query.page))
    if (query.limit) params.set('limit', String(query.limit))
    const qs = params.toString()
    const res = (await apiClient.get(`${this.base}${qs ? `?${qs}` : ''}`)) as unknown as {
      data: IMoraTicket[]
    }
    // La API manda la paginación en `meta`; antes se leía `pagination` y el total
    // siempre era 0, así que nunca salía «Mostrando X de Y».
    return {
      data: res.data ?? [],
      pagination: leerPaginacion(res, query.limit ?? 50),
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

  /** Canon, fecha de pago pactada y si el contrato es de notaría (al elegirlo en el formulario). */
  async datosReporte(contratoId: string): Promise<IDatosReporteMora> {
    const res = await apiClient.get<IDatosReporteMora>(`${this.base}/contratos/${contratoId}/datos-reporte`)
    return res.data
  }

  /**
   * Adenda 6.1 §4: el contrato autenticado de un contrato en notaría. Queda en el
   * contrato y la mora pasa a «por verificar». `documento_previo` = el contrato ya
   * lo tenía y se presentó ese.
   */
  async cargarDocumentoNotaria(id: string, file: File): Promise<IMoraDetalle & { documento_previo?: boolean }> {
    const form = new FormData()
    form.append('archivo', file)
    const response = await apiClient.raw(`${this.base}/${id}/documento-notaria`, { method: 'POST', body: form })
    return ((await response.json()) as { data: IMoraDetalle & { documento_previo?: boolean } }).data
  }

  /** Cofianza verifica el contrato autenticado: completo (corre el plazo) o «Cofianza no paga» (con nota). */
  async verificarNotaria(id: string, resultado: ResultadoVerificacion, nota?: string): Promise<IMoraDetalle> {
    const res = await apiClient.patch<IMoraDetalle>(`${this.base}/${id}/verificacion-notaria`, { resultado, nota })
    return res.data
  }

  /** Cofianza revisó el pago reportado y el cobro sigue: el WhatsApp de Fase 3 sale. */
  async reanudarWhatsapp(id: string): Promise<IMoraDetalle> {
    const res = await apiClient.patch<IMoraDetalle>(`${this.base}/${id}/reanudar-whatsapp`, {})
    return res.data
  }
}

export const morasService = new MorasService()
