/**
 * Servicio de Citas - Visitas previas al estudio crediticio
 */

import { apiClient } from '@/lib/api'
import type {
  ICita,
  ICrearCita,
  IConfirmarCita,
  ICancelarCita,
  ICitaFilters,
  ICitasMeta,
} from '@/types/cita'

class CitaService {
  private basePath = '/citas'

  async crearCita(data: ICrearCita): Promise<ICita> {
    const res = await apiClient.post<ICita>(this.basePath, data)
    return res.data
  }

  async getCitasByExpediente(expedienteId: string): Promise<ICita[]> {
    const res = await apiClient.get<ICita[]>(`${this.basePath}?expediente_id=${expedienteId}`)
    return res.data
  }

  /**
   * Lista todas las citas accesibles por el usuario (filtradas por rol en
   * backend via resolveAccessibleExpedienteIds, Prompt 2). Sin `expediente_id`
   * devuelve el conjunto completo propietario/inmobiliaria/admin.
   */
  async listMisCitas(filters: Partial<ICitaFilters> = {}): Promise<{
    data: ICita[]
    meta: ICitasMeta
  }> {
    const params = new URLSearchParams()
    if (filters.estado) params.append('estado', filters.estado)
    if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde)
    if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta)
    if (filters.inmueble_id) params.append('inmueble_id', filters.inmueble_id)
    if (filters.page) params.append('page', String(filters.page))
    if (filters.limit) params.append('limit', String(filters.limit))
    const qs = params.toString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get(`${this.basePath}${qs ? `?${qs}` : ''}`)) as any
    return {
      data: (response.data || []) as ICita[],
      meta: {
        total: response.pagination?.total || 0,
        page: Number(response.pagination?.page) || 1,
        limit: Number(response.pagination?.limit) || 20,
        totalPages: response.pagination?.totalPages || 0,
      },
    }
  }

  async getCitaById(id: string): Promise<ICita> {
    const res = await apiClient.get<ICita>(`${this.basePath}/${id}`)
    return res.data
  }

  async confirmarCita(id: string, data: IConfirmarCita): Promise<ICita> {
    const res = await apiClient.post<ICita>(`${this.basePath}/${id}/confirmar`, data)
    return res.data
  }

  /**
   * Reprograma una cita (solicitada o confirmada) a una nueva fecha. Distinto
   * de confirmarCita: permite mover el horario incluso si ya estaba confirmada.
   * Backend dispara el aviso 'reprogramada' al solicitante.
   */
  async reprogramarCita(
    id: string,
    data: { fecha_confirmada: string; notas_propietario?: string },
  ): Promise<ICita> {
    const res = await apiClient.post<ICita>(`${this.basePath}/${id}/reprogramar`, data)
    return res.data
  }

  async realizarCita(id: string, notas_propietario?: string): Promise<ICita> {
    const res = await apiClient.post<ICita>(`${this.basePath}/${id}/realizar`, { notas_propietario })
    return res.data
  }

  async cancelarCita(id: string, data: ICancelarCita): Promise<ICita> {
    const res = await apiClient.post<ICita>(`${this.basePath}/${id}/cancelar`, data)
    return res.data
  }

  async marcarNoAsistio(id: string): Promise<ICita> {
    const res = await apiClient.post<ICita>(`${this.basePath}/${id}/no-asistio`, {})
    return res.data
  }
}

export const citaService = new CitaService()
