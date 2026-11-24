// ============================================
// Avisos de servicio — el banner del panel y la gestión del administrador
// ============================================

import { apiClient } from '@/lib/api'
import type { IAvisoServicio, IAvisoServicioInput, IAvisoVisible } from '@/types/avisosServicio'

/** Los vigentes que le tocan a la sesión actual. */
export async function getAvisosActivos(): Promise<IAvisoVisible[]> {
  const res = await apiClient.get<IAvisoVisible[]>('/avisos-servicio/activos')
  return res.data
}

/** Páginas públicas por enlace: sin sesión, solo los marcados para prospectos. */
export async function getAvisosPublicos(): Promise<IAvisoVisible[]> {
  const res = await apiClient.get<IAvisoVisible[]>('/public/avisos-servicio')
  return res.data
}

// ---------- Administrador ----------

export async function listarAvisos(): Promise<IAvisoServicio[]> {
  const res = await apiClient.get<IAvisoServicio[]>('/avisos-servicio')
  return res.data
}

export async function crearAviso(input: IAvisoServicioInput): Promise<IAvisoServicio> {
  const res = await apiClient.post<IAvisoServicio>('/avisos-servicio', input)
  return res.data
}

export async function actualizarAviso(id: string, input: Partial<IAvisoServicioInput>): Promise<IAvisoServicio> {
  const res = await apiClient.patch<IAvisoServicio>(`/avisos-servicio/${id}`, input)
  return res.data
}

export async function eliminarAviso(id: string): Promise<void> {
  await apiClient.delete(`/avisos-servicio/${id}`)
}
