'use client'

/**
 * Hook de Expedientes - HP-229 + Bandejas Operativas
 * Maneja la lista de expedientes con sincronización de URL, debounce, ordenamiento y bandejas
 */

import { useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { useExpedientesStore, DEFAULT_EXPEDIENTE_FILTERS } from '@/stores/expedientesStore'
import { expedienteService } from '@/services/expedienteService'
import { useAuthStore } from '@/stores/auth.store'
import type { IExpedienteFilters, EstadoExpediente } from '@/types/expediente'

const DEBOUNCE_DELAY = 300

const EXPEDIENTE_MESSAGES = {
  FETCH_ERROR: 'Error al cargar los expedientes',
  STATS_ERROR: 'Error al cargar estadísticas',
  ANALISTAS_ERROR: 'Error al cargar analistas',
}

export function useExpedientes() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)

  // Auth
  const user = useAuthStore((state) => state.user)

  // Estado del store
  const expedientes = useExpedientesStore((state) => state.expedientes)
  const meta = useExpedientesStore((state) => state.meta)
  const stats = useExpedientesStore((state) => state.stats)
  const filters = useExpedientesStore((state) => state.filters)
  const analistas = useExpedientesStore((state) => state.analistas)
  const isLoading = useExpedientesStore((state) => state.isLoading)
  const isLoadingStats = useExpedientesStore((state) => state.isLoadingStats)
  const error = useExpedientesStore((state) => state.error)
  const selectedExpediente = useExpedientesStore((state) => state.selectedExpediente)
  const activeBandeja = useExpedientesStore((state) => state.activeBandeja)
  const misExpedientes = useExpedientesStore((state) => state.misExpedientes)

  // Acciones del store
  const setExpedientes = useExpedientesStore((state) => state.setExpedientes)
  const setMeta = useExpedientesStore((state) => state.setMeta)
  const setStats = useExpedientesStore((state) => state.setStats)
  const setFilters = useExpedientesStore((state) => state.setFilters)
  const setAnalistas = useExpedientesStore((state) => state.setAnalistas)
  const setLoading = useExpedientesStore((state) => state.setLoading)
  const setLoadingStats = useExpedientesStore((state) => state.setLoadingStats)
  const setError = useExpedientesStore((state) => state.setError)
  const setSelectedExpediente = useExpedientesStore((state) => state.setSelectedExpediente)
  const resetFilters = useExpedientesStore((state) => state.resetFilters)
  const toggleEstadoFilter = useExpedientesStore((state) => state.toggleEstadoFilter)
  const storeSetActiveBandeja = useExpedientesStore((state) => state.setActiveBandeja)
  const storeSetMisExpedientes = useExpedientesStore((state) => state.setMisExpedientes)

  /**
   * Sincroniza URL params -> Store (al montar)
   */
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const urlFilters: Partial<IExpedienteFilters> = {}

    const search = searchParams.get('search')
    const estado = searchParams.get('estado') // comma-separated
    const analista_id = searchParams.get('analista_id')
    const fecha_desde = searchParams.get('fecha_desde')
    const fecha_hasta = searchParams.get('fecha_hasta')
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    const sortBy = searchParams.get('sortBy') as IExpedienteFilters['sortBy'] | null
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null

    if (search) urlFilters.search = search
    if (estado) {
      const estados = estado.split(',') as EstadoExpediente[]
      urlFilters.estado = estados
      // Sincronizar bandeja si es un solo estado
      if (estados.length === 1) {
        storeSetActiveBandeja(estados[0])
      }
    }
    if (analista_id) urlFilters.analista_id = analista_id
    if (fecha_desde) urlFilters.fecha_desde = fecha_desde
    if (fecha_hasta) urlFilters.fecha_hasta = fecha_hasta
    if (page) urlFilters.page = parseInt(page, 10)
    if (limit) urlFilters.limit = parseInt(limit, 10)
    if (sortBy) urlFilters.sortBy = sortBy
    if (sortOrder) urlFilters.sortOrder = sortOrder

    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters)
    }
  }, [searchParams, setFilters, storeSetActiveBandeja])

  /**
   * Actualiza URL cuando cambian los filtros
   */
  const updateUrl = useCallback(
    (newFilters: IExpedienteFilters) => {
      const params = new URLSearchParams()

      if (newFilters.search) params.set('search', newFilters.search)
      if (newFilters.estado.length > 0) {
        params.set('estado', newFilters.estado.join(','))
      }
      if (newFilters.analista_id) params.set('analista_id', newFilters.analista_id)
      if (newFilters.fecha_desde) params.set('fecha_desde', newFilters.fecha_desde)
      if (newFilters.fecha_hasta) params.set('fecha_hasta', newFilters.fecha_hasta)
      if (newFilters.page > 1) params.set('page', newFilters.page.toString())
      if (newFilters.limit !== DEFAULT_EXPEDIENTE_FILTERS.limit) {
        params.set('limit', newFilters.limit.toString())
      }
      if (newFilters.sortBy !== DEFAULT_EXPEDIENTE_FILTERS.sortBy) {
        params.set('sortBy', newFilters.sortBy)
      }
      if (newFilters.sortOrder !== DEFAULT_EXPEDIENTE_FILTERS.sortOrder) {
        params.set('sortOrder', newFilters.sortOrder)
      }

      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      router.replace(newUrl, { scroll: false })
    },
    [pathname, router]
  )

  /**
   * Carga expedientes desde la API
   */
  const fetchExpedientes = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await expedienteService.getExpedientes(filters)
      setExpedientes(response.data)
      setMeta(response.meta)
    } catch (err) {
      const message = err instanceof Error ? err.message : EXPEDIENTE_MESSAGES.FETCH_ERROR
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [filters, setLoading, setError, setExpedientes, setMeta])

  /**
   * Carga estadísticas de expedientes
   */
  const fetchStats = useCallback(async () => {
    setLoadingStats(true)

    try {
      const statsData = await expedienteService.getStats()
      setStats(statsData)
    } catch (err) {
      console.error('Error loading stats:', err)
    } finally {
      setLoadingStats(false)
    }
  }, [setLoadingStats, setStats])

  /**
   * Carga lista de analistas para filtro
   */
  const fetchAnalistas = useCallback(async () => {
    try {
      const analistasData = await expedienteService.getAnalistas()
      setAnalistas(analistasData)
    } catch (err) {
      console.error('Error loading analistas:', err)
    }
  }, [setAnalistas])

  /**
   * Efecto para cargar expedientes cuando cambian los filtros (con debounce)
   */
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchExpedientes()
      updateUrl(filters)
    }, DEBOUNCE_DELAY)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [filters, fetchExpedientes, updateUrl])

  /**
   * Cargar analistas y stats al montar
   */
  useEffect(() => {
    fetchAnalistas()
    fetchStats()
  }, [fetchStats, fetchAnalistas])

  /**
   * Actualiza filtros (con reset de página si no es cambio de página)
   */
  const handleFilterChange = useCallback(
    (newFilters: Partial<IExpedienteFilters>) => {
      if (!('page' in newFilters)) {
        setFilters({ ...newFilters, page: 1 })
      } else {
        setFilters(newFilters)
      }
    },
    [setFilters]
  )

  /**
   * Cambia el ordenamiento
   */
  const handleSort = useCallback(
    (column: IExpedienteFilters['sortBy']) => {
      const newOrder =
        filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc'
      setFilters({ sortBy: column, sortOrder: newOrder, page: 1 })
    },
    [filters.sortBy, filters.sortOrder, setFilters]
  )

  /**
   * Limpia filtros y recarga
   */
  const clearFilters = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  /**
   * Verifica si hay filtros activos (excluye bandeja y misExpedientes)
   */
  const hasActiveFilters = useCallback(() => {
    return (
      filters.search !== '' ||
      filters.fecha_desde !== '' ||
      filters.fecha_hasta !== ''
    )
  }, [filters])

  /**
   * Selecciona una bandeja (filtra por estado)
   */
  const setActiveBandeja = useCallback(
    (bandeja: EstadoExpediente | null) => {
      storeSetActiveBandeja(bandeja)
    },
    [storeSetActiveBandeja]
  )

  /**
   * Toggle "Mis Expedientes" - filtra por analista_id del usuario logueado
   */
  const toggleMisExpedientes = useCallback(() => {
    const newValue = !misExpedientes
    storeSetMisExpedientes(newValue)

    if (newValue && user?.id) {
      setFilters({ analista_id: user.id, page: 1 })
    } else {
      setFilters({ analista_id: '', page: 1 })
    }
  }, [misExpedientes, user, storeSetMisExpedientes, setFilters])

  return {
    // Estado
    expedientes,
    meta,
    stats,
    filters,
    analistas,
    isLoading,
    isLoadingStats,
    error,
    selectedExpediente,

    // Bandejas
    activeBandeja,
    misExpedientes,
    setActiveBandeja,
    toggleMisExpedientes,

    // Acciones de filtros
    setFilters: handleFilterChange,
    clearFilters,
    handleSort,
    toggleEstadoFilter,
    hasActiveFilters,

    // Fetch
    fetchExpedientes,
    fetchStats,
    fetchAnalistas,

    // Selección
    setSelectedExpediente,
  }
}
