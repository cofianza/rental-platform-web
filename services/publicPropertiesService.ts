// ============================================
// Public Properties Service — HP-366
// No auth required for getters — `registrarInteres` SÍ requiere auth.
// ============================================

import { API_BASE_URL } from '@/lib/constants'
import { apiClient } from '@/lib/api'

// ── Types ───────────────────────────────────

export interface PublicProperty {
  id: string
  tipo: string
  ciudad: string
  barrio: string | null
  estrato: number
  area_m2: number | null
  habitaciones: number
  banos: number
  parqueadero: boolean
  parqueaderos: number
  valor_arriendo: number
  administracion: number
  descripcion: string | null
  foto_fachada_url: string | null
  fotos?: { id: string; url: string; descripcion: string | null; orden: number }[]
  created_at: string
  // Identidad pública de la inmobiliaria dueña (nombre comercial + logo). null
  // para propietarios individuales o si no hay nada que mostrar.
  inmobiliaria?: { nombre: string | null; logo_url: string | null } | null
}

export interface PublicPropertyFilters {
  ciudades: string[]
  tipos: string[]
  estratos: number[]
}

export interface PublicPropertiesQuery {
  page?: number
  limit?: number
  ciudad?: string
  tipo?: string
  estrato?: number
  precio_min?: number
  precio_max?: number
  habitaciones?: number
  search?: string
  sortBy?: 'created_at' | 'valor_arriendo'
  sortOrder?: 'asc' | 'desc'
}

interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

// ── Fetch helper (no auth) ──────────────────

async function publicFetch<T>(path: string): Promise<{ data: T; meta?: PaginationMeta }> {
  const res = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`)
  }
  const json = await res.json()
  return { data: json.data, meta: json.meta }
}

// ── Service ─────────────────────────────────

export async function getPublicProperties(query: PublicPropertiesQuery = {}): Promise<{
  data: PublicProperty[]
  meta: PaginationMeta
}> {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.ciudad) params.set('ciudad', query.ciudad)
  if (query.tipo) params.set('tipo', query.tipo)
  if (query.estrato) params.set('estrato', String(query.estrato))
  if (query.precio_min) params.set('precio_min', String(query.precio_min))
  if (query.precio_max) params.set('precio_max', String(query.precio_max))
  if (query.habitaciones) params.set('habitaciones', String(query.habitaciones))
  if (query.search) params.set('search', query.search)
  if (query.sortBy) params.set('sortBy', query.sortBy)
  if (query.sortOrder) params.set('sortOrder', query.sortOrder)

  const qs = params.toString()
  const result = await publicFetch<PublicProperty[]>(`/public/properties${qs ? `?${qs}` : ''}`)
  return {
    data: result.data ?? [],
    meta: result.meta ?? { total: 0, page: 1, limit: 12, totalPages: 0 },
  }
}

export async function getPublicPropertyById(id: string): Promise<PublicProperty> {
  const result = await publicFetch<PublicProperty>(`/public/properties/${id}`)
  return result.data
}

export interface RegistrarInteresPublicoInput {
  nombre: string
  telefono: string
  email: string
  mensaje?: string
  acepta: boolean
}

/**
 * Registra el interés de un visitante SIN cuenta (lead). No requiere auth.
 * El backend guarda el contacto y avisa al dueño/inmobiliaria.
 */
export async function registrarInteresPublico(
  propertyId: string,
  input: RegistrarInteresPublicoInput,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/public/properties/${propertyId}/interes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    let msg = 'No se pudo enviar tu interés. Intenta de nuevo.'
    try {
      const json = await res.json()
      msg = json?.message || msg
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new Error(msg)
  }
}

export async function getPublicPropertyFilters(): Promise<PublicPropertyFilters> {
  const result = await publicFetch<PublicPropertyFilters>('/public/properties/filters')
  return result.data ?? { ciudades: [], tipos: [], estratos: [] }
}

/**
 * Registra una visita anónima al detalle de un inmueble público. Best-effort:
 * el backend devuelve 204 y si falla (red, BD), no propagamos el error porque
 * es analítica y no debe afectar la UX del visitante.
 */
export async function registrarVisitaInmueble(propertyId: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/public/properties/${propertyId}/visita`, {
      method: 'POST',
      keepalive: true, // permite enviar aunque el usuario navegue rápido
    })
  } catch {
    // Silencio intencional: analítica no debe romper el detalle del inmueble.
  }
}

// ── Interés (autenticado, rol solicitante) ────

export interface RegistrarInteresResult {
  expediente: {
    id: string
    numero: string
    estado: 'borrador'
    estudio_habilitado: boolean
    source: 'vitrina_publica'
  }
  siguiente_paso: 'agendar_cita'
}

/**
 * Registra el interés del solicitante autenticado en un inmueble. Crea el
 * expediente vía POST /vitrina/interest. NO crea cita — eso lo hace el caller
 * (ej. <MeInteresaCTA>) en un segundo paso si el flujo lo requiere.
 */
export async function registrarInteres(propertyId: string): Promise<RegistrarInteresResult> {
  const res = await apiClient.post<RegistrarInteresResult>('/vitrina/interest', {
    property_id: propertyId,
  })
  return res.data
}
