/**
 * Servicio de Notificaciones in-app.
 * Las nuevas notificaciones llegan en tiempo real via Supabase Realtime
 * (ver useNotificationsRealtime). Este servicio cubre la lectura inicial,
 * el badge y las acciones de marcar como leida.
 */

import { apiClient } from '@/lib/api'

export interface INotificacion {
  id: string
  user_id: string
  tipo: string
  titulo: string
  mensaje: string
  link: string | null
  payload: Record<string, unknown> | null
  leida_at: string | null
  created_at: string
}

export interface IListNotificacionesParams {
  page?: number
  limit?: number
  soloNoLeidas?: boolean
}

class NotificacionService {
  private basePath = '/notificaciones'

  async list(params: IListNotificacionesParams = {}): Promise<{ data: INotificacion[]; total: number }> {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.soloNoLeidas) qs.set('solo_no_leidas', 'true')
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    const res = await apiClient.get<INotificacion[]>(`${this.basePath}${suffix}`)
    return {
      data: res.data,
      total: (res as { pagination?: { total?: number } }).pagination?.total ?? res.data.length,
    }
  }

  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<{ count: number }>(`${this.basePath}/no-leidas/count`)
    return res.data.count
  }

  async markAsRead(id: string): Promise<INotificacion> {
    const res = await apiClient.patch<INotificacion>(`${this.basePath}/${id}/leida`, {})
    return res.data
  }

  async markAllAsRead(): Promise<{ count: number }> {
    const res = await apiClient.post<{ count: number }>(`${this.basePath}/marcar-todas-leidas`, {})
    return res.data
  }
}

export const notificacionService = new NotificacionService()
