'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { contratoService } from '@/services/contratoService'
import type { IContratoListItem, IContratoMeta, IContratoListFilters } from '@/types/contrato'

const DEBOUNCE_DELAY = 300

const DEFAULT_FILTERS: IContratoListFilters = {
  page: 1,
  limit: 10,
  sortBy: 'created_at',
  sortDir: 'desc',
}

export function useContratos() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // La primera carga va sin debounce (antes esperaba 300 ms).
  const primeraCargaRef = useRef(true)

  const [contratos, setContratos] = useState<IContratoListItem[]>([])
  const [meta, setMeta] = useState<IContratoMeta>({ total: 0, page: 1, limit: 10, totalPages: 0 })
  // Filtros iniciales desde la URL, ya en el primer render (antes un efecto los
  // ponía después y la primera carga salía 300 ms tarde).
  const [filters, setFiltersState] = useState<IContratoListFilters>(() => ({
    page: Number(searchParams.get('page')) || 1,
    limit: Number(searchParams.get('limit')) || 10,
    sortBy: searchParams.get('sortBy') || 'created_at',
    sortDir: (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc',
    estado: searchParams.get('estado') || undefined,
    search: searchParams.get('search') || undefined,
    fecha_desde: searchParams.get('fecha_desde') || undefined,
    fecha_hasta: searchParams.get('fecha_hasta') || undefined,
  }))
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sync filters to URL
  const updateUrl = useCallback((f: IContratoListFilters) => {
    const params = new URLSearchParams()
    if (f.page && f.page > 1) params.set('page', f.page.toString())
    if (f.limit && f.limit !== 10) params.set('limit', f.limit.toString())
    if (f.sortBy && f.sortBy !== 'created_at') params.set('sortBy', f.sortBy)
    if (f.sortDir && f.sortDir !== 'desc') params.set('sortDir', f.sortDir)
    if (f.estado) params.set('estado', f.estado)
    if (f.search) params.set('search', f.search)
    if (f.fecha_desde) params.set('fecha_desde', f.fecha_desde)
    if (f.fecha_hasta) params.set('fecha_hasta', f.fecha_hasta)
    const qs = params.toString()
    router.replace(`/contratos${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [router])

  // Fetch data
  const fetchContratos = useCallback(async (f: IContratoListFilters) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await contratoService.getAllContratos(f)
      setContratos(result.data)
      setMeta(result.meta)
    } catch {
      setError('Error al cargar los contratos')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced fetch on filter changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const espera = primeraCargaRef.current ? 0 : DEBOUNCE_DELAY
    primeraCargaRef.current = false
    debounceRef.current = setTimeout(() => {
      fetchContratos(filters)
      updateUrl(filters)
    }, espera)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filters, fetchContratos, updateUrl])

  // Set filters (reset page to 1 unless changing page)
  const setFilters = useCallback((partial: Partial<IContratoListFilters>) => {
    setFiltersState((prev) => {
      const isPageChange = 'page' in partial && Object.keys(partial).length === 1
      return {
        ...prev,
        ...partial,
        page: isPageChange ? (partial.page ?? 1) : 1,
      }
    })
  }, [])

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS)
  }, [])

  const hasActiveFilters = !!(
    filters.estado ||
    filters.search ||
    filters.fecha_desde ||
    filters.fecha_hasta
  )

  const refetch = useCallback(() => {
    fetchContratos(filters)
  }, [filters, fetchContratos])

  return {
    contratos,
    meta,
    filters,
    isLoading,
    error,
    setFilters,
    clearFilters,
    hasActiveFilters,
    refetch,
  }
}
