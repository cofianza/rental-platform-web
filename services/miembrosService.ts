// ============================================
// Miembros de la inmobiliaria — gestión de equipo + canje público de invitación
// ============================================

import { apiClient } from '@/lib/api'

/** owner = titular (puede haber varios = co-titulares). miembro = staff. solo_lectura = viewer. */
export type RolMiembro = 'owner' | 'miembro' | 'solo_lectura'

export interface Miembro {
  id: string
  /** perfil_id (null si la invitación está pendiente). */
  perfil_id: string | null
  email: string | null
  rol_miembro: RolMiembro
  estado: 'activo' | 'invitado' | 'revocado'
  nombre: string | null
  apellido: string | null
  invitado_en: string
  es_yo: boolean
}

export interface MiembrosResponse {
  organizacion: { id: string; nombre: string }
  soy_owner: boolean
  /** Si true, todos los miembros ven toda la cartera; si false, cada miembro ve solo lo suyo. */
  miembros_ven_todo: boolean
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

export interface InmobiliariaAdmin {
  id: string
  nombre: string
  estado: string
  owner_perfil_id: string | null
  owner_nombre: string | null
  miembros_ven_todo: boolean
  miembros_activos: number
  invitaciones_pendientes: number
  created_at: string
}

export interface AdminMiembrosResponse {
  organizacion: { id: string; nombre: string }
  miembros_ven_todo: boolean
  miembros: Miembro[]
}

// ── Autenticado (owner / miembro) ──────────────────────────────

export async function listMiembros(): Promise<MiembrosResponse> {
  const res = await apiClient.get<MiembrosResponse>('/inmobiliaria/miembros')
  return res.data
}

export async function invitarMiembro(
  email: string,
  rol_miembro: 'miembro' | 'solo_lectura' = 'miembro',
): Promise<{ message: string; reenviada: boolean }> {
  const res = await apiClient.post<{ message: string; reenviada: boolean }>(
    '/inmobiliaria/miembros/invitar',
    { email, rol_miembro },
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

/** Cambia el rol de un miembro activo (owner-only): promover a co-titular, degradar o solo lectura. */
export async function cambiarRolMiembro(id: string, rol_miembro: RolMiembro): Promise<{ message: string }> {
  const res = await apiClient.patch<{ message: string }>(`/inmobiliaria/miembros/${id}/rol`, { rol_miembro })
  return res.data
}

/** Salir de la organización (cualquier miembro activo, incl. solo lectura). */
export async function salirDeMiInmobiliaria(): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>('/inmobiliaria/miembros/salir', {})
  return res.data
}

// ── Administración de plataforma (rol administrador) ──────────

export async function adminListInmobiliarias(): Promise<InmobiliariaAdmin[]> {
  const res = await apiClient.get<InmobiliariaAdmin[]>('/admin/inmobiliarias')
  return res.data
}

export async function adminListMiembros(orgId: string): Promise<AdminMiembrosResponse> {
  const res = await apiClient.get<AdminMiembrosResponse>(`/admin/inmobiliarias/${orgId}/miembros`)
  return res.data
}

export async function adminCambiarRolMiembro(
  orgId: string,
  miembroId: string,
  rol_miembro: RolMiembro,
): Promise<{ message: string }> {
  const res = await apiClient.patch<{ message: string }>(
    `/admin/inmobiliarias/${orgId}/miembros/${miembroId}/rol`,
    { rol_miembro },
  )
  return res.data
}

export async function adminRevocarMiembro(orgId: string, miembroId: string): Promise<{ message: string }> {
  const res = await apiClient.delete<{ message: string }>(
    `/admin/inmobiliarias/${orgId}/miembros/${miembroId}`,
  )
  return res.data
}

export async function setMiembrosVenTodo(value: boolean): Promise<{ miembros_ven_todo: boolean }> {
  const res = await apiClient.patch<{ miembros_ven_todo: boolean }>(
    '/inmobiliaria/miembros/config',
    { miembros_ven_todo: value },
  )
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
