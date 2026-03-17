/**
 * Servicio Pago Estudio - HP-353
 */

import { apiClient } from '@/lib/api'
import type { IPago } from './pagoService'

export interface IPagoEstudioEstado {
  estado: 'sin_definir' | 'pendiente' | 'procesando' | 'completado' | 'fallido' | 'cancelado' | 'asumido_inmobiliaria'
  puede_avanzar: boolean
  monto: number
  moneda: string
  monto_formateado: string
  pago: IPago | null
}

export interface IEnviarLinkInput {
  email_pagador: string
  nombre_pagador: string
  telefono?: string
}

export interface IPagoResultadoPublico {
  id: string
  estado: string
  concepto: string
  monto: number
  moneda: string
  monto_formateado: string
  fecha_pago: string | null
  expediente_numero: string | null
}

class PagoEstudioService {
  async getEstado(expedienteId: string): Promise<IPagoEstudioEstado> {
    const response = await apiClient.get<IPagoEstudioEstado>(`/expedientes/${expedienteId}/pago-estudio/estado`)
    return response.data
  }

  async asumir(expedienteId: string): Promise<IPago> {
    const response = await apiClient.post<IPago>(`/expedientes/${expedienteId}/pago-estudio/asumir`)
    return response.data
  }

  async enviarLink(expedienteId: string, input: IEnviarLinkInput): Promise<IPago> {
    const response = await apiClient.post<IPago>(`/expedientes/${expedienteId}/pago-estudio/enviar-link`, input)
    return response.data
  }

  async reenviar(expedienteId: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/expedientes/${expedienteId}/pago-estudio/reenviar`)
    return response.data
  }

  async cancelarYAsumir(expedienteId: string): Promise<IPago> {
    const response = await apiClient.post<IPago>(`/expedientes/${expedienteId}/pago-estudio/cancelar-y-asumir`)
    return response.data
  }
}

export const pagoEstudioService = new PagoEstudioService()

// Public (no auth)
export async function getResultadoPagoPublico(pagoId: string): Promise<IPagoResultadoPublico> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/publico/pago-resultado/${pagoId}`)
  if (!response.ok) throw new Error('Pago no encontrado')
  const json = await response.json()
  return json.data
}
