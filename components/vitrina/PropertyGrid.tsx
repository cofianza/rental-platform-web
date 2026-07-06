/**
 * PropertyGrid — HP-366
 * Client component: search, filters, grid of property cards, pagination
 * URL sync for shareable searches
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { IconSearch, IconHome, IconBed, IconBath, IconCar, IconRuler, IconChevronLeft, IconChevronRight, IconX } from '@/components/icons'
import {
  getPublicProperties,
  getPublicPropertyFilters,
  type PublicProperty,
  type PublicPropertyFilters,
  type PublicPropertiesQuery,
} from '@/services/publicPropertiesService'
import { formatCurrency } from '@/lib/constants'

const DEBOUNCE_MS = 300
const LIMIT = 12

// ── Tipo inmueble labels ────────────────────

const TIPO_LABELS: Record<string, string> = {
  apartamento: 'Apartamento',
  apartaestudio: 'Apartaestudio',
  casa: 'Casa',
  casa_finca: 'Casa Finca',
  finca: 'Finca',
  oficina: 'Oficina',
  local: 'Local',
  bodega: 'Bodega',
  lote: 'Lote',
  parqueadero: 'Parqueadero',
}

const HAB_OPTIONS = [
  { label: 'Todas', value: '' },
  { label: '1+', value: '1' },
  { label: '2+', value: '2' },
  { label: '3+', value: '3' },
  { label: '4+', value: '4' },
]

// ── Main Component ──────────────────────────

export function PropertyGrid() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Filters state (synced from URL on mount)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [ciudad, setCiudad] = useState(searchParams.get('ciudad') || '')
  const [tipo, setTipo] = useState(searchParams.get('tipo') || '')
  const [habitaciones, setHabitaciones] = useState(searchParams.get('habitaciones') || '')
  const [precioMin, setPrecioMin] = useState(searchParams.get('precio_min') || '')
  const [precioMax, setPrecioMax] = useState(searchParams.get('precio_max') || '')
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)

  // Data state
  const [properties, setProperties] = useState<PublicProperty[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [filterOptions, setFilterOptions] = useState<PublicPropertyFilters>({ ciudades: [], tipos: [], estratos: [] })
  const [loading, setLoading] = useState(true)
  const [, setFiltersLoaded] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load filter options once ────────────────

  useEffect(() => {
    getPublicPropertyFilters()
      .then(setFilterOptions)
      .catch(() => {})
      .finally(() => setFiltersLoaded(true))
  }, [])

  // ── Build query from state ──────────────────

  const buildQuery = useCallback((): PublicPropertiesQuery => {
    const q: PublicPropertiesQuery = { page, limit: LIMIT }
    if (search.trim()) q.search = search.trim()
    if (ciudad) q.ciudad = ciudad
    if (tipo) q.tipo = tipo
    if (habitaciones) q.habitaciones = Number(habitaciones)
    if (precioMin) q.precio_min = Number(precioMin)
    if (precioMax) q.precio_max = Number(precioMax)
    return q
  }, [search, ciudad, tipo, habitaciones, precioMin, precioMax, page])

  // ── Fetch properties ────────────────────────

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getPublicProperties(buildQuery())
      setProperties(result.data)
      setTotal(result.meta.total)
      setTotalPages(result.meta.totalPages)
    } catch {
      setProperties([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [buildQuery])

  // ── Sync URL ────────────────────────────────

  const syncUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (ciudad) params.set('ciudad', ciudad)
    if (tipo) params.set('tipo', tipo)
    if (habitaciones) params.set('habitaciones', habitaciones)
    if (precioMin) params.set('precio_min', precioMin)
    if (precioMax) params.set('precio_max', precioMax)
    if (page > 1) params.set('page', String(page))
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [search, ciudad, tipo, habitaciones, precioMin, precioMax, page, pathname, router])

  // ── Debounced fetch + URL sync ──────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchProperties()
      syncUrl()
    }, DEBOUNCE_MS)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [fetchProperties, syncUrl])

  // ── Filter change resets page ───────────────

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setCiudad('')
    setTipo('')
    setHabitaciones('')
    setPrecioMin('')
    setPrecioMax('')
    setPage(1)
  }

  const hasActiveFilters = !!(search || ciudad || tipo || habitaciones || precioMin || precioMax)

  // ── Render ──────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <IconSearch size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar por barrio, ciudad, tipo de inmueble..."
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Ciudad */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Ciudad</label>
          <select
            value={ciudad}
            onChange={(e) => handleFilterChange(setCiudad)(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todas</option>
            {filterOptions.ciudades.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Tipo */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => handleFilterChange(setTipo)(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos</option>
            {filterOptions.tipos.map((t) => (
              <option key={t} value={t}>{TIPO_LABELS[t] || t}</option>
            ))}
          </select>
        </div>

        {/* Habitaciones */}
        <div className="min-w-[100px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Habitaciones</label>
          <select
            value={habitaciones}
            onChange={(e) => handleFilterChange(setHabitaciones)(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {HAB_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Precio min */}
        <div className="min-w-[120px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Precio min</label>
          <input
            type="number"
            value={precioMin}
            onChange={(e) => handleFilterChange(setPrecioMin)(e.target.value)}
            placeholder="$0"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Precio max */}
        <div className="min-w-[120px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Precio max</label>
          <input
            type="number"
            value={precioMax}
            onChange={(e) => handleFilterChange(setPrecioMax)(e.target.value)}
            placeholder="Sin limite"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <IconX size={14} />
            Limpiar
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {loading ? (
            <span className="inline-block w-40 h-4 bg-gray-200 rounded animate-pulse" />
          ) : (
            <><span className="font-semibold text-gray-900">{total}</span> propiedades encontradas</>
          )}
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <IconHome size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay resultados</h3>
          <p className="text-sm text-gray-500 mb-4">
            No encontramos inmuebles con los filtros actuales. Intenta ampliar tu busqueda.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Pagina anterior"
          >
            <IconChevronLeft size={18} />
          </button>

          {generatePageNumbers(page, totalPages).map((p, idx) =>
            p === '...' ? (
              <span key={`dots-${idx}`} className="px-2 text-gray-400 text-sm">...</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(Number(p))}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  Number(p) === page
                    ? 'bg-primary-600 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ),
          )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Pagina siguiente"
          >
            <IconChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Property Card ───────────────────────────

function PropertyCard({ property }: { property: PublicProperty }) {
  return (
    <Link
      href={`/inmueble/${property.id}`}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all group"
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
        {property.foto_fachada_url ? (
          <img
            src={property.foto_fachada_url}
            alt={`${TIPO_LABELS[property.tipo] || property.tipo} en ${property.ciudad}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <IconHome size={48} className="text-gray-300" />
          </div>
        )}
        {/* Tipo badge */}
        <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700">
          {TIPO_LABELS[property.tipo] || property.tipo}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Precio + ubicación a la izquierda; logo de la inmobiliaria a la
            derecha (solo el logo, en su columna). */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* Price */}
            <p className="text-lg font-bold text-primary-700 mb-0.5">
              {formatCurrency(property.valor_arriendo)}
              <span className="text-xs font-normal text-gray-500"> /mes</span>
            </p>
            {property.administracion > 0 && (
              <p className="text-xs text-gray-500 mb-2">
                Admin: {formatCurrency(property.administracion)}
              </p>
            )}

            {/* Location */}
            <p className="text-sm text-gray-700 font-medium truncate">
              {property.barrio ? `${property.barrio}, ` : ''}{property.ciudad}
            </p>
            <p className="text-xs text-gray-400">Estrato {property.estrato}</p>
          </div>
          {property.inmobiliaria?.logo_url && (
            <img
              src={property.inmobiliaria.logo_url}
              alt={property.inmobiliaria.nombre || 'Inmobiliaria'}
              className="h-14 w-auto max-w-[40%] object-contain shrink-0"
            />
          )}
        </div>

        {/* Features */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-3">
          {property.area_m2 && (
            <span className="flex items-center gap-1">
              <IconRuler size={14} />
              {property.area_m2} m²
            </span>
          )}
          <span className="flex items-center gap-1">
            <IconBed size={14} />
            {property.habitaciones}
          </span>
          <span className="flex items-center gap-1">
            <IconBath size={14} />
            {property.banos}
          </span>
          {property.parqueadero && (
            <span className="flex items-center gap-1">
              <IconCar size={14} />
              Si
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── Skeleton ────────────────────────────────

function PropertyCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="h-3 w-24 bg-gray-200 rounded" />
        <div className="flex gap-3">
          <div className="h-3 w-12 bg-gray-200 rounded" />
          <div className="h-3 w-8 bg-gray-200 rounded" />
          <div className="h-3 w-8 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}

// ── Pagination helper ───────────────────────

function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]

  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')

  pages.push(total)

  return pages
}
