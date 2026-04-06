// ============================================
// Public Properties Service — HP-366
// No auth required — public API
// ============================================

import { API_BASE_URL } from '@/lib/constants'

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
  const res = await fetch(`${API_BASE_URL}${path}`, { next: { revalidate: 60 } })
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

export async function getPublicPropertyFilters(): Promise<PublicPropertyFilters> {
  const result = await publicFetch<PublicPropertyFilters>('/public/properties/filters')
  return result.data ?? { ciudades: [], tipos: [], estratos: [] }
}
