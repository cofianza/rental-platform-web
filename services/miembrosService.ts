// ============================================
// Miembros de la inmobiliaria — gestión de equipo + canje público de invitación
// ============================================

import { apiClient } from '@/lib/api'

export interface Miembro {
  id: string
  email: string | null
  rol_miembro: 'owner' | 'miembro'
  estado: 'activo' | 'invitado' | 'revocado'
  nombre: string | null
  apellido: string | null
  invitado_en: string
  es_yo: boolean
}

export interface MiembrosResponse {
  organizacion: { id: string; nombre: string }
  soy_owner: boolean
  miembros: Miembro[]
}

export interface InvitacionMiembroInfo {
  email: string
  estado: 'invitado' | 'activo' | 'revocado'
  organizacion: string
  invitador: string | null
  /** true -> el invitado ya tiene cuenta (debe iniciar sesión); false -> debe registrarse. */
  tiene_cuenta: boolean
}

// ── Autenticado (owner / miembro) ──────────────────────────────

export async function listMiembros(): Promise<MiembrosResponse> {
  const res = await apiClient.get<MiembrosResponse>('/inmobiliaria/miembros')
  return res.data
}

export async function invitarMiembro(email: string): Promise<{ message: string; reenviada: boolean }> {
  const res = await apiClient.post<{ message: string; reenviada: boolean }>(
    '/inmobiliaria/miembros/invitar',
    { email },
  )
  return res.data
}

export async function reenviarMiembro(id: string): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>(`/inmobiliaria/miembros/${id}/reenviar`, {})
  return res.data
}

export async function revocarMiembro(id: string): Promise<{ message: string }> {
  const res = await apiClient.delete<{ message: string }>(`/inmobiliaria/miembros/${id}`)
  return res.data
}

// ── Público (por token) ────────────────────────────────────────

export async function getInvitacionMiembro(token: string): Promise<InvitacionMiembroInfo> {
  const res = await apiClient.get<InvitacionMiembroInfo>(`/public/invitacion-miembro/${token}`)
  return res.data
}

export async function aceptarInvitacionMiembro(
  token: string,
): Promise<{ message: string; redirect: string }> {
  const res = await apiClient.post<{ message: string; redirect: string }>(
    `/public/invitacion-miembro/${token}/aceptar`,
    {},
  )
  return res.data
}

export async function registrarMiembro(
  token: string,
  body: { nombre: string; apellido: string; password: string; telefono?: string },
): Promise<{ message: string; email: string }> {
  const res = await apiClient.post<{ message: string; email: string }>(
    `/public/invitacion-miembro/${token}/registrar`,
    body,
  )
  return res.data
}
