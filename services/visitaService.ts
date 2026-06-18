/**
 * Visita Service — gestión pública (sin login) de una visita desde los botones
 * del WhatsApp. Pega a /public/visita/<token>... El token va en la ruta; no
 * requiere Authorization (apiClient simplemente no lo envía si no hay sesión).
 */

import { apiClient } from '@/lib/api'

export interface IVisitaPublica {
  estado: string
  accionable: boolean
  fecha: string | null // ISO con offset -05:00
  inmueble: { direccion: string; ciudad: string } | null
  nombre: string
}

export interface IVisitaSlot {
  inicio: string
  fin: string
}

export interface IVisitaDia {
  fecha: string // YYYY-MM-DD
  slots: IVisitaSlot[]
}

async function getVisita(token: string): Promise<IVisitaPublica> {
  const res = await apiClient.get<IVisitaPublica>(`/public/visita/${token}`)
  return res.data
}

async function getSlots(token: string, desde: string, hasta: string): Promise<IVisitaDia[]> {
  const qs = new URLSearchParams({ desde, hasta }).toString()
  const res = await apiClient.get<IVisitaDia[]>(`/public/visita/${token}/slots?${qs}`)
  return res.data
}

async function reprogramar(token: string, fecha: string): Promise<IVisitaPublica> {
  const res = await apiClient.post<IVisitaPublica>(`/public/visita/${token}/reprogramar`, { fecha })
  return res.data
}

async function cancelar(token: string, motivo?: string): Promise<IVisitaPublica> {
  const res = await apiClient.post<IVisitaPublica>(`/public/visita/${token}/cancelar`, { motivo })
  return res.data
}

export const visitaService = { getVisita, getSlots, reprogramar, cancelar }
