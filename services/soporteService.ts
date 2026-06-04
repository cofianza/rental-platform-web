// ============================================================
// Soporte Service — tickets funcionales (Centro de Control admin)
// Consume el módulo soporte del API (/api/v1/soporte/tickets).
// ============================================================

import { apiClient } from '@/lib/api'

export type TicketPrioridad = 'alta' | 'media' | 'baja'
export type TicketEstado = 'abierto' | 'en_proceso' | 'resuelto'

export interface TicketSoporte {
  id: string
  ticketNumero: string
  remitenteId: string
  remitente: { nombre: string; apellido: string } | null
  asignadoA: string | null
  tipo: string
  asunto: string
  descripcion: string | null
  prioridad: TicketPrioridad
  estado: TicketEstado
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export interface ListTicketsResponse {
  tickets: TicketSoporte[]
  // El API devuelve la lista como data y la meta de paginación aparte;
  // apiClient mapea data → la lista. Mantenemos solo la lista aquí.
}

class SoporteService {
  async listTickets(params?: { estado?: TicketEstado; prioridad?: TicketPrioridad }): Promise<TicketSoporte[]> {
    const qs = new URLSearchParams()
    if (params?.estado) qs.set('estado', params.estado)
    if (params?.prioridad) qs.set('prioridad', params.prioridad)
    const query = qs.toString()
    const res = await apiClient.get<TicketSoporte[]>(`/soporte/tickets${query ? `?${query}` : ''}`)
    return res.data
  }

  async getById(id: string): Promise<TicketSoporte> {
    const res = await apiClient.get<TicketSoporte>(`/soporte/tickets/${id}`)
    return res.data
  }

  async createTicket(input: {
    tipo: string
    asunto: string
    descripcion?: string
    prioridad?: TicketPrioridad
  }): Promise<TicketSoporte> {
    const res = await apiClient.post<TicketSoporte>('/soporte/tickets', input)
    return res.data
  }

  async updateEstado(id: string, estado: TicketEstado): Promise<TicketSoporte> {
    const res = await apiClient.patch<TicketSoporte>(`/soporte/tickets/${id}/estado`, { estado })
    return res.data
  }
}

export const soporteService = new SoporteService()
