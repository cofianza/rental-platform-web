'use client'

/**
 * Hook de Estudios - HP-331
 * Maneja la lista global de estudios con sincronización de URL, debounce y bandejas
 */

import { useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { useEstudiosListStore, DEFAULT_ESTUDIO_FILTERS } from '@/stores/estudiosListStore'
import { estudioService } from '@/services/estudioService'
import type { IEstudioFilters, EstadoEstudio } from '@/types/estudio'

const DEBOUNCE_DELAY = 300

export function useEstudiosList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)

  // Store state
  const estudios = useEstudiosListStore((s) => s.estudios)
  const meta = useEstudiosListStore((s) => s.meta)
  const filters = useEstudiosListStore((s) => s.filters)
  const isLoading = useEstudiosListStore((s) => s.isLoading)
  const error = useEstudiosListStore((s) => s.error)
  const activeBandeja = useEstudiosListStore((s) => s.activeBandeja)

  // Store actions
  const setEstudios = useEstudiosListStore((s) => s.setEstudios)
  const setMeta = useEstudiosListStore((s) => s.setMeta)
  const setFilters = useEstudiosListStore((s) => s.setFilters)
  const setLoading = useEstudiosListStore((s) => s.setLoading)
  const setError = useEstudiosListStore((s) => s.setError)
  const resetFilters = useEstudiosListStore((s) => s.resetFilters)
  const storeSetActiveBandeja = useEstudiosListStore((s) => s.setActiveBandeja)

  // Sync URL params -> Store on mount
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const urlFilters: Partial<IEstudioFilters> = {}

    const search = searchParams.get('search')
    const estado = searchParams.get('estado')
    const resultado = searchParams.get('resultado')
    const proveedor = searchParams.get('proveedor')
    const fecha_desde = searchParams.get('fecha_desde')
    const fecha_hasta = searchParams.get('fecha_hasta')
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    const sortBy = searchParams.get('sortBy') as IEstudioFilters['sortBy'] | null
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null

    if (search) urlFilters.search = search
    if (estado) {
      const estados = estado.split(',') as EstadoEstudio[]
      urlFilters.estado = estados
      if (estados.length === 1) storeSetActiveBandeja(estados[0])
    }
    if (resultado) urlFilters.resultado = resultado
    if (proveedor) urlFilters.proveedor = proveedor
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

  // Update URL when filters change
  const updateUrl = useCallback(
    (newFilters: IEstudioFilters) => {
      const params = new URLSearchParams()

      if (newFilters.search) params.set('search', newFilters.search)
      if (newFilters.estado.length > 0) params.set('estado', newFilters.estado.join(','))
      if (newFilters.resultado) params.set('resultado', newFilters.resultado)
      if (newFilters.proveedor) params.set('proveedor', newFilters.proveedor)
      if (newFilters.fecha_desde) params.set('fecha_desde', newFilters.fecha_desde)
      if (newFilters.fecha_hasta) params.set('fecha_hasta', newFilters.fecha_hasta)
      if (newFilters.page > 1) params.set('page', newFilters.page.toString())
      if (newFilters.limit !== DEFAULT_ESTUDIO_FILTERS.limit) {
        params.set('limit', newFilters.limit.toString())
      }
      if (newFilters.sortBy !== DEFAULT_ESTUDIO_FILTERS.sortBy) {
        params.set('sortBy', newFilters.sortBy)
      }
      if (newFilters.sortOrder !== DEFAULT_ESTUDIO_FILTERS.sortOrder) {
        params.set('sortOrder', newFilters.sortOrder)
      }

      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      router.replace(newUrl, { scroll: false })
    },
    [pathname, router]
  )

  // Fetch estudios
  const fetchEstudios = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await estudioService.listAll(filters)
      setEstudios(response.data)
      setMeta(response.pagination)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar los estudios'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [filters, setLoading, setError, setEstudios, setMeta])

  // Debounced fetch on filters change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      fetchEstudios()
      updateUrl(filters)
    }, DEBOUNCE_DELAY)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filters, fetchEstudios, updateUrl])

  // Filter change (reset page unless it's a page change)
  const handleFilterChange = useCallback(
    (newFilters: Partial<IEstudioFilters>) => {
      if (!('page' in newFilters)) {
        setFilters({ ...newFilters, page: 1 })
      } else {
        setFilters(newFilters)
      }
    },
    [setFilters]
  )

  // Sort toggle
  const handleSort = useCallback(
    (column: IEstudioFilters['sortBy']) => {
      const newOrder =
        filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc'
      setFilters({ sortBy: column, sortOrder: newOrder, page: 1 })
    },
    [filters.sortBy, filters.sortOrder, setFilters]
  )

  // Clear all filters
  const clearFilters = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  // Check if non-bandeja filters are active
  const hasActiveFilters = useCallback(() => {
    return (
      filters.search !== '' ||
      filters.resultado !== '' ||
      filters.proveedor !== '' ||
      filters.fecha_desde !== '' ||
      filters.fecha_hasta !== ''
    )
  }, [filters])

  // Set active bandeja
  const setActiveBandeja = useCallback(
    (bandeja: EstadoEstudio | null) => {
      storeSetActiveBandeja(bandeja)
    },
    [storeSetActiveBandeja]
  )

  return {
    estudios,
    meta,
    filters,
    isLoading,
    error,
    activeBandeja,
    setFilters: handleFilterChange,
    clearFilters,
    handleSort,
    hasActiveFilters,
    setActiveBandeja,
    fetchEstudios,
  }
}
