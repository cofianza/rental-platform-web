/**
 * PropertyGrid — HP-366
 * Client component: search, filters, grid of property cards, pagination
 * URL sync for shareable searches
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { IconHome, IconChevronLeft, IconChevronRight, IconAlertTriangle, IconRefresh } from '@/components/icons'
import {
  getPublicProperties,
  getPublicPropertyFilters,
  type PublicProperty,
  type PublicPropertyFilters,
  type PublicPropertiesQuery,
} from '@/services/publicPropertiesService'
import { VitrinaVacia } from './VitrinaVacia'
import { PropertyCard } from './VitrinaPreview'
import { LeadInteresModal } from './LeadInteresModal'
import {
  ConsolaBusqueda,
  BarraResultados,
  FILTROS_VACIOS,
  esOrden,
  hayFiltros,
  ordenAQuery,
  type FiltrosVitrinaValor,
} from './FiltrosVitrina'

/** Espera antes de buscar mientras se escribe (búsqueda y canon); los selects buscan de una vez. */
const DEBOUNCE_MS = 300
const LIMIT = 12

/** Los filtros que trae la URL (un enlace compartido abre la misma búsqueda). */
function filtrosDeUrl(sp: URLSearchParams): FiltrosVitrinaValor {
  const digitos = (k: string) => (sp.get(k) || '').replace(/\D/g, '').slice(0, 12)
  const orden = sp.get('orden')
  return {
    search: sp.get('search') || '',
    ciudad: sp.get('ciudad') || '',
    tipo: sp.get('tipo') || '',
    habitaciones: digitos('habitaciones'),
    precioMin: digitos('precio_min'),
    precioMax: digitos('precio_max'),
    estrato: digitos('estrato'),
    orden: esOrden(orden) ? orden : 'recientes',
  }
}

// ── Main Component ──────────────────────────

export function PropertyGrid() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Filtros (leídos de la URL al montar) y página.
  const [filtros, setFiltros] = useState<FiltrosVitrinaValor>(() => filtrosDeUrl(new URLSearchParams(searchParams.toString())))
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)

  // Data state
  const [properties, setProperties] = useState<PublicProperty[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [filterOptions, setFilterOptions] = useState<PublicPropertyFilters>({ ciudades: [], tipos: [], estratos: [] })
  const [loading, setLoading] = useState(true)
  // Si la carga falla no se dice «No hay resultados»: culpaba a los filtros.
  const [error, setError] = useState(false)
  // ¿La lista que se está mostrando se pidió con filtros? Sin filtros y sin
  // inmuebles la vitrina está vacía (se invita a publicar); con filtros es «No
  // hay resultados». Se guarda con la respuesta y no se lee de los campos: al
  // limpiar un filtro los campos cambian antes de que llegue la lista nueva, y
  // por un instante se anunciaba una vitrina vacía que no lo está.
  const [conFiltros, setConFiltros] = useState(false)
  const [, setFiltersLoaded] = useState(false)
  // Inmueble sobre el que el visitante sin cuenta dijo «Me interesa».
  const [lead, setLead] = useState<{ id: string; resumen: string } | null>(null)

  const hasActiveFilters = hayFiltros(filtros)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // La primera carga va sin debounce (antes esperaba 300 ms).
  const primeraCargaRef = useRef(true)

  // ── Load filter options once ────────────────

  useEffect(() => {
    getPublicPropertyFilters()
      .then(setFilterOptions)
      .catch(() => {})
      .finally(() => setFiltersLoaded(true))
  }, [])

  // ── Build query from state ──────────────────

  const buildQuery = useCallback((): PublicPropertiesQuery => {
    const q: PublicPropertiesQuery = { page, limit: LIMIT, ...ordenAQuery(filtros.orden) }
    if (filtros.search.trim()) q.search = filtros.search.trim()
    if (filtros.ciudad) q.ciudad = filtros.ciudad
    if (filtros.tipo) q.tipo = filtros.tipo
    if (filtros.habitaciones) q.habitaciones = Number(filtros.habitaciones)
    if (filtros.precioMin) q.precio_min = Number(filtros.precioMin)
    if (filtros.precioMax) q.precio_max = Number(filtros.precioMax)
    if (filtros.estrato) q.estrato = Number(filtros.estrato)
    return q
  }, [filtros, page])

  // ── Fetch properties ────────────────────────

  // Solo cuenta la última búsqueda: una respuesta vieja que tardó más no pisa la vigente.
  const peticionRef = useRef(0)
  const fetchProperties = useCallback(async () => {
    const n = ++peticionRef.current
    setLoading(true)
    setError(false)
    try {
      const result = await getPublicProperties(buildQuery())
      if (n !== peticionRef.current) return
      // Enlace viejo (`?page=9`) cuando ya hay menos inmuebles: la API devuelve la
      // página vacía con el total; se salta a la última página que sí existe.
      if (result.data.length === 0 && result.meta.totalPages > 0 && page > result.meta.totalPages) {
        // La petición queda «vieja»: el finally no apaga la carga y el skeleton
        // sigue hasta la respuesta de la página buena (sin parpadeo de «vacío»).
        peticionRef.current++
        setPage(result.meta.totalPages)
        return
      }
      setProperties(result.data)
      setTotal(result.meta.total)
      setTotalPages(result.meta.totalPages)
      setConFiltros(hasActiveFilters)
    } catch {
      if (n !== peticionRef.current) return
      setError(true)
      setProperties([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      if (n === peticionRef.current) setLoading(false)
    }
  }, [buildQuery, hasActiveFilters, page])

  // ── Sync URL ────────────────────────────────

  const syncUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (filtros.search.trim()) params.set('search', filtros.search.trim())
    if (filtros.ciudad) params.set('ciudad', filtros.ciudad)
    if (filtros.tipo) params.set('tipo', filtros.tipo)
    if (filtros.habitaciones) params.set('habitaciones', filtros.habitaciones)
    if (filtros.precioMin) params.set('precio_min', filtros.precioMin)
    if (filtros.precioMax) params.set('precio_max', filtros.precioMax)
    if (filtros.estrato) params.set('estrato', filtros.estrato)
    if (filtros.orden !== 'recientes') params.set('orden', filtros.orden)
    if (page > 1) params.set('page', String(page))
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [filtros, page, pathname, router])

  // ── Debounced fetch + URL sync ──────────────

  // Solo se espera cuando cambió algo que se escribe (búsqueda o canon): un select busca de una vez.
  const claveTexto = `${filtros.search.trim()}|${filtros.precioMin}|${filtros.precioMax}`
  const claveTextoRef = useRef(claveTexto)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const escribiendo = claveTextoRef.current !== claveTexto
    claveTextoRef.current = claveTexto
    const espera = primeraCargaRef.current ? 0 : escribiendo ? DEBOUNCE_MS : 0
    primeraCargaRef.current = false
    debounceRef.current = setTimeout(() => {
      fetchProperties()
      syncUrl()
    }, espera)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [fetchProperties, syncUrl, claveTexto])

  // ── Filter change resets page ───────────────

  // Todo cambio de filtro u orden vuelve a la primera página.
  const cambiarFiltros = (parcial: Partial<FiltrosVitrinaValor>) => {
    setFiltros((f) => ({ ...f, ...parcial }))
    setPage(1)
  }

  // Al cambiar de página se sube al inicio de los resultados: la paginación está
  // al pie y, en el celular, el visitante quedaba viendo el final de la nueva.
  const resultadosRef = useRef<HTMLDivElement>(null)
  const irAPagina = (n: number) => {
    setPage(n)
    resultadosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Limpiar no toca el orden: es una preferencia, no un filtro.
  const clearFilters = () => {
    setFiltros((f) => ({ ...FILTROS_VACIOS, orden: f.orden }))
    setPage(1)
  }

  // Aún no hay inmuebles publicados (distinto de que los filtros no encuentren
  // nada, y de una página fuera de rango, que llega vacía pero con total > 0).
  const vitrinaVacia = !loading && !error && properties.length === 0 && total === 0 && !conFiltros

  // ── Render ──────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Buscador y filtros: sube sobre el borde del encabezado de /vitrina. */}
      <ConsolaBusqueda
        valor={filtros}
        onCambiar={cambiarFiltros}
        opciones={filterOptions}
        total={total}
        cargando={loading}
        error={error}
        vitrinaVacia={vitrinaVacia}
        className="-mt-12 md:-mt-14"
      />

      <div ref={resultadosRef} className="scroll-mt-24">
        <BarraResultados
          valor={filtros}
          onCambiar={cambiarFiltros}
          onLimpiar={clearFilters}
          total={loading && properties.length === 0 ? null : total}
          sinConteo={!loading && (error || vitrinaVacia)}
        />
      </div>

      {/* Grid */}
      {/* Primera carga: esqueleto. Al filtrar o paginar con resultados en
          pantalla, se dejan visibles (atenuados) hasta que llegan los nuevos. */}
      {loading && properties.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : error && !loading ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <IconAlertTriangle size={48} className="mx-auto text-amber-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No pudimos cargar los inmuebles</h3>
          <p className="text-sm text-gray-500 mb-4">Tuvimos un problema al buscar. Inténtelo de nuevo en un momento.</p>
          <button
            onClick={fetchProperties}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800"
          >
            <IconRefresh size={16} />
            Reintentar
          </button>
        </div>
      ) : vitrinaVacia ? (
        <VitrinaVacia />
      ) : properties.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <IconHome size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay resultados</h3>
          <p className="text-sm text-gray-500 mb-4">
            {filtros.search.trim()
              ? 'No encontramos inmuebles con esa búsqueda. Pruebe con menos palabras, por ejemplo solo el barrio o la ciudad.'
              : 'No encontramos inmuebles con los filtros actuales. Intente ampliar su búsqueda.'}
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
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${loading ? 'pointer-events-none opacity-60' : ''}`}
          aria-busy={loading}
        >
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              className="w-full"
              onLead={(resumen) => setLead({ id: property.id, resumen })}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !(loading && properties.length === 0) && (
        <div className={`flex flex-wrap items-center justify-center gap-2 pt-4 ${loading ? 'pointer-events-none opacity-60' : ''}`}>
          <button
            onClick={() => irAPagina(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Página anterior"
          >
            <IconChevronLeft size={18} />
          </button>

          {generatePageNumbers(page, totalPages).map((p, idx) =>
            p === '...' ? (
              <span key={`dots-${idx}`} className="px-2 text-gray-500 text-sm">...</span>
            ) : (
              <button
                key={p}
                onClick={() => irAPagina(Number(p))}
                aria-current={Number(p) === page ? 'page' : undefined}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  Number(p) === page
                    ? 'bg-primary-700 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ),
          )}

          <button
            onClick={() => irAPagina(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Página siguiente"
          >
            <IconChevronRight size={18} />
          </button>
        </div>
      )}

      {lead && (
        <LeadInteresModal inmuebleId={lead.id} resumen={lead.resumen} isOpen onClose={() => setLead(null)} />
      )}
    </div>
  )
}

// ── Skeleton ────────────────────────────────

function PropertyCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-[180px] bg-gray-200" />
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
