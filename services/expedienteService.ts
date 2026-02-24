/**
 * Servicio de Expedientes - HP-229 / HP-243 / HP-263 / HP-270
 * Llamadas a la API para expedientes con transformaciones backend→frontend
 */

import { apiClient } from '@/lib/api'
import type {
  IExpediente,
  IExpedienteFilters,
  IExpedientesMeta,
  IExpedientesStats,
  IAnalistaOption,
  EstadoExpediente,
  IExpedienteDetalle,
  ITransicionDisponible,
  IEjecutarTransicion,
  IComentarioExpediente,
  ICrearComentario,
  ITimelineEvento,
  ITimelinePagination,
  IHistorialTransicion,
} from '@/types/expediente'

// ============================================
// Helpers
// ============================================

/**
 * Construye query string desde filtros
 */
function buildQueryString(filters: Partial<IExpedienteFilters>): string {
  const params = new URLSearchParams()

  if (filters.search) params.append('search', filters.search)

  // Estados multi-select: enviar como comma-separated
  if (filters.estado && filters.estado.length > 0) {
    params.append('estado', filters.estado.join(','))
  }

  if (filters.analista_id) params.append('analista_id', filters.analista_id)
  if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde)
  if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta)
  if (filters.page) params.append('page', filters.page.toString())
  if (filters.limit) params.append('limit', filters.limit.toString())
  if (filters.sortBy) params.append('sortBy', filters.sortBy)
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

/**
 * Transforma un expediente del backend al formato frontend
 * Backend usa 'numero', frontend usa 'numero_expediente'
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapExpediente<T>(raw: any): T {
  if (!raw) return raw
  const { numero, ...rest } = raw
  return { ...rest, numero_expediente: numero } as T
}

/**
 * Transforma un comentario del backend al formato frontend
 * Backend usa 'texto', frontend usa 'contenido'
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapComentario(raw: any): IComentarioExpediente {
  if (!raw) return raw
  const { texto, ...rest } = raw
  return { ...rest, contenido: texto } as IComentarioExpediente
}

// ============================================
// Service
// ============================================

class ExpedienteService {
  /**
   * Obtiene lista paginada de expedientes con filtros
   */
  async getExpedientes(filters: Partial<IExpedienteFilters> = {}): Promise<{
    data: IExpediente[]
    meta: IExpedientesMeta
  }> {
    const queryString = buildQueryString(filters)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get(`/expedientes${queryString}`)) as any

    const items = (response.data || []).map((item: unknown) =>
      mapExpediente<IExpediente>(item)
    )

    return {
      data: items,
      meta: {
        total: response.pagination?.total || 0,
        page: Number(response.pagination?.page) || 1,
        limit: Number(response.pagination?.limit) || 10,
        totalPages: response.pagination?.totalPages || 0,
      },
    }
  }

  /**
   * Obtiene estadísticas/contadores por estado
   */
  async getStats(): Promise<IExpedientesStats> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get('/expedientes/stats')) as any

    const por_estado: Record<EstadoExpediente, number> = {
      borrador: 0,
      en_revision: 0,
      informacion_incompleta: 0,
      aprobado: 0,
      rechazado: 0,
      condicionado: 0,
      cerrado: 0,
    }

    if (response.data?.stats) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response.data.stats.forEach((stat: any) => {
        por_estado[stat.estado as EstadoExpediente] = stat.count
      })
    }

    return {
      total: response.data?.total || 0,
      por_estado,
    }
  }

  /**
   * Obtiene un expediente por ID
   */
  async getExpedienteById(id: string): Promise<IExpediente> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get(`/expedientes/${id}`)) as any
    return mapExpediente<IExpediente>(response.data)
  }

  /**
   * Obtiene lista de analistas para dropdown de filtro
   * (usuarios con rol operador_analista o administrador)
   */
  async getAnalistas(): Promise<IAnalistaOption[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = (await apiClient.get(
        '/users?role=operador_analista&limit=100&is_active=true'
      )) as any

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (response.data || []).map((u: any) => ({
        id: u.id,
        nombre: `${u.nombre} ${u.apellido || ''}`.trim(),
      }))
    } catch {
      // Silenciar error si el endpoint falla (ej. usuario sin permiso)
      return []
    }
  }

  // ============================================
  // HP-243: Vista Detalle del Expediente
  // ============================================

  /**
   * Obtiene el detalle completo de un expediente
   */
  async getExpedienteDetalle(id: string): Promise<IExpedienteDetalle> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get(`/expedientes/${id}`)) as any
    return mapExpediente<IExpedienteDetalle>(response.data)
  }

  /**
   * Obtiene las transiciones disponibles para el estado actual del expediente
   * Backend retorna: { transiciones_disponibles: [{ estado, label }] }
   * Frontend espera: ITransicionDisponible[] con { estado_destino, etiqueta }
   */
  async getTransicionesDisponibles(id: string): Promise<ITransicionDisponible[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get(
      `/expedientes/${id}/available-transitions`
    )) as any

    // Backend devuelve { data: { expediente_id, estado_actual, transiciones_disponibles } }
    const transiciones = response.data?.transiciones_disponibles || []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return transiciones.map((t: any) => ({
      estado_destino: t.estado as EstadoExpediente,
      etiqueta: t.label as string,
      requiere_comentario: true, // Siempre obligatorio
    }))
  }

  /**
   * Ejecuta una transición de estado en el expediente
   * Frontend envía: { estado_destino, comentario }
   * Backend espera: { nuevo_estado, comentario }
   */
  async ejecutarTransicion(
    id: string,
    data: IEjecutarTransicion
  ): Promise<IExpedienteDetalle> {
    // Transformar campo: estado_destino → nuevo_estado
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.post(
      `/expedientes/${id}/transitions`,
      {
        nuevo_estado: data.estado_destino,
        comentario: data.comentario,
      }
    )) as any

    return mapExpediente<IExpedienteDetalle>(response.data)
  }

  /**
   * Asigna o reasigna el responsable del expediente (HP-285)
   */
  async asignarResponsable(
    id: string,
    analistaId: string
  ): Promise<IExpedienteDetalle> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.patch(
      `/expedientes/${id}`,
      { analista_id: analistaId }
    )) as any

    return mapExpediente<IExpedienteDetalle>(response.data)
  }

  // ============================================
  // HP-263: Comentarios internos
  // ============================================

  /**
   * Obtiene los comentarios de un expediente
   * Backend devuelve `texto`, frontend usa `contenido`
   */
  async getComentarios(expedienteId: string): Promise<IComentarioExpediente[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get(
      `/expedientes/${expedienteId}/comments`
    )) as any

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (response.data || []).map((c: any) => mapComentario(c))
  }

  /**
   * Crea un nuevo comentario en el expediente
   * Frontend envía `contenido` → Backend espera `texto`
   */
  async crearComentario(
    expedienteId: string,
    data: ICrearComentario
  ): Promise<IComentarioExpediente> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.post(
      `/expedientes/${expedienteId}/comments`,
      { texto: data.contenido }
    )) as any

    return mapComentario(response.data)
  }

  /**
   * Edita un comentario existente (solo el autor puede)
   */
  async editarComentario(
    expedienteId: string,
    commentId: string,
    data: { contenido: string }
  ): Promise<IComentarioExpediente> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.put(
      `/expedientes/${expedienteId}/comments/${commentId}`,
      { texto: data.contenido }
    )) as any

    return mapComentario(response.data)
  }

  /**
   * Elimina un comentario (admin cualquiera, operador solo propios)
   */
  async eliminarComentario(
    expedienteId: string,
    commentId: string
  ): Promise<void> {
    await apiClient.delete(
      `/expedientes/${expedienteId}/comments/${commentId}`
    )
  }

  // ============================================
  // HP-270: Timeline de eventos
  // ============================================

  /**
   * Obtiene el timeline unificado de eventos del expediente
   * Soporta paginación y filtro por tipo
   */
  async getTimeline(
    expedienteId: string,
    params?: { page?: number; limit?: number; tipo?: string }
  ): Promise<{ data: ITimelineEvento[]; pagination: ITimelinePagination }> {
    const qs = new URLSearchParams()
    if (params?.page) qs.append('page', params.page.toString())
    if (params?.limit) qs.append('limit', params.limit.toString())
    if (params?.tipo) qs.append('tipo', params.tipo)
    const queryString = qs.toString()
    const url = `/expedientes/${expedienteId}/timeline${queryString ? `?${queryString}` : ''}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get(url)) as any

    return {
      data: response.data || [],
      pagination: response.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 },
    }
  }

  /**
   * Obtiene el historial de transiciones de estado del expediente
   * Endpoint: GET /expedientes/:id/transitions
   */
  async getHistorialTransiciones(expedienteId: string): Promise<IHistorialTransicion[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get(
      `/expedientes/${expedienteId}/transitions`
    )) as any

    return response.data?.historial || []
  }

  // ============================================
  // HP-247: Creacion de expediente
  // ============================================

  /**
   * Crea un nuevo expediente
   */
  async createExpediente(data: {
    inmueble_id: string
    solicitante_id: string
    analista_id?: string
    notas?: string
  }): Promise<IExpedienteDetalle> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.post('/expedientes', data)) as any
    return mapExpediente<IExpedienteDetalle>(response.data)
  }
}

// Instancia singleton
export const expedienteService = new ExpedienteService()
