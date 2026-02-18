'use client'

/**
 * Hook de Inmuebles - HP-174
 * Maneja la lista de inmuebles con sincronización de URL, debounce y ordenamiento
 */

import { useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { useInmueblesStore, DEFAULT_INMUEBLE_FILTERS } from '@/stores/inmuebles.store'
import { inmuebleService } from '@/services/inmuebleService'
import type {
  IInmuebleFilters,
  IInmueble,
  TipoInmueble,
  EstadoInmueble,
} from '@/types/inmueble'

const DEBOUNCE_DELAY = 300

// Mensajes
const INMUEBLE_MESSAGES = {
  FETCH_ERROR: 'Error al cargar los inmuebles',
  CREATE_SUCCESS: 'Inmueble creado exitosamente',
  CREATE_ERROR: 'Error al crear el inmueble',
  UPDATE_SUCCESS: 'Inmueble actualizado exitosamente',
  UPDATE_ERROR: 'Error al actualizar el inmueble',
  DELETE_SUCCESS: 'Inmueble eliminado exitosamente',
  DELETE_ERROR: 'Error al eliminar el inmueble',
  UPLOAD_ERROR: 'Error al subir la imagen',
}

export function useInmuebles() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)

  // Estado del store
  const inmuebles = useInmueblesStore((state) => state.inmuebles)
  const meta = useInmueblesStore((state) => state.meta)
  const filters = useInmueblesStore((state) => state.filters)
  const filterOptions = useInmueblesStore((state) => state.filterOptions)
  const isLoading = useInmueblesStore((state) => state.isLoading)
  const error = useInmueblesStore((state) => state.error)
  const selectedInmueble = useInmueblesStore((state) => state.selectedInmueble)

  // Acciones del store
  const setInmuebles = useInmueblesStore((state) => state.setInmuebles)
  const setMeta = useInmueblesStore((state) => state.setMeta)
  const setFilters = useInmueblesStore((state) => state.setFilters)
  const setFilterOptions = useInmueblesStore((state) => state.setFilterOptions)
  const setLoading = useInmueblesStore((state) => state.setLoading)
  const setError = useInmueblesStore((state) => state.setError)
  const setSelectedInmueble = useInmueblesStore((state) => state.setSelectedInmueble)
  const resetFilters = useInmueblesStore((state) => state.resetFilters)
  const updateInmuebleInList = useInmueblesStore((state) => state.updateInmuebleInList)
  const removeInmuebleFromList = useInmueblesStore((state) => state.removeInmuebleFromList)

  /**
   * Sincroniza URL params -> Store (al montar)
   */
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const urlFilters: Partial<IInmuebleFilters> = {}

    const search = searchParams.get('search')
    const tipo = searchParams.get('tipo') as TipoInmueble | null
    const ciudad = searchParams.get('ciudad')
    const estado = searchParams.get('estado') as EstadoInmueble | null
    const estrato = searchParams.get('estrato')
    const rent_min = searchParams.get('rent_min')
    const rent_max = searchParams.get('rent_max')
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    const sortBy = searchParams.get('sortBy') as IInmuebleFilters['sortBy'] | null
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null

    if (search) urlFilters.search = search
    if (tipo) urlFilters.tipo = tipo
    if (ciudad) urlFilters.ciudad = ciudad
    if (estado) urlFilters.estado = estado
    if (estrato) urlFilters.estrato = parseInt(estrato, 10)
    if (rent_min) urlFilters.rent_min = parseInt(rent_min, 10)
    if (rent_max) urlFilters.rent_max = parseInt(rent_max, 10)
    if (page) urlFilters.page = parseInt(page, 10)
    if (limit) urlFilters.limit = parseInt(limit, 10)
    if (sortBy) urlFilters.sortBy = sortBy
    if (sortOrder) urlFilters.sortOrder = sortOrder

    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters)
    }
  }, [searchParams, setFilters])

  /**
   * Actualiza URL cuando cambian los filtros
   */
  const updateUrl = useCallback(
    (newFilters: IInmuebleFilters) => {
      const params = new URLSearchParams()

      if (newFilters.search) params.set('search', newFilters.search)
      if (newFilters.tipo) params.set('tipo', newFilters.tipo)
      if (newFilters.ciudad) params.set('ciudad', newFilters.ciudad)
      if (newFilters.estado) params.set('estado', newFilters.estado)
      if (newFilters.estrato !== '' && newFilters.estrato !== undefined) {
        params.set('estrato', newFilters.estrato.toString())
      }
      if (newFilters.rent_min !== '' && newFilters.rent_min !== undefined) {
        params.set('rent_min', newFilters.rent_min.toString())
      }
      if (newFilters.rent_max !== '' && newFilters.rent_max !== undefined) {
        params.set('rent_max', newFilters.rent_max.toString())
      }
      if (newFilters.page > 1) params.set('page', newFilters.page.toString())
      if (newFilters.limit !== DEFAULT_INMUEBLE_FILTERS.limit) {
        params.set('limit', newFilters.limit.toString())
      }
      if (newFilters.sortBy !== DEFAULT_INMUEBLE_FILTERS.sortBy) {
        params.set('sortBy', newFilters.sortBy)
      }
      if (newFilters.sortOrder !== DEFAULT_INMUEBLE_FILTERS.sortOrder) {
        params.set('sortOrder', newFilters.sortOrder)
      }

      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      router.replace(newUrl, { scroll: false })
    },
    [pathname, router]
  )

  /**
   * Carga inmuebles desde la API
   */
  const fetchInmuebles = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await inmuebleService.getInmuebles(filters)
      setInmuebles(response.data)
      setMeta(response.meta)
    } catch (err) {
      const message = err instanceof Error ? err.message : INMUEBLE_MESSAGES.FETCH_ERROR
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [filters, setLoading, setError, setInmuebles, setMeta])

  /**
   * Carga opciones de filtros dinámicos
   */
  const fetchFilterOptions = useCallback(async () => {
    try {
      const options = await inmuebleService.getFilterOptions()
      setFilterOptions(options)
    } catch (err) {
      console.error('Error loading filter options:', err)
    }
  }, [setFilterOptions])

  /**
   * Efecto para cargar inmuebles cuando cambian los filtros
   */
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchInmuebles()
      updateUrl(filters)
    }, DEBOUNCE_DELAY)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [filters, fetchInmuebles, updateUrl])

  /**
   * Cargar opciones de filtros al montar
   */
  useEffect(() => {
    fetchFilterOptions()
  }, [fetchFilterOptions])

  /**
   * Actualiza filtros (con reset de página si no es cambio de página)
   */
  const handleFilterChange = useCallback(
    (newFilters: Partial<IInmuebleFilters>) => {
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
    (column: IInmuebleFilters['sortBy']) => {
      const newOrder =
        filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc'
      setFilters({ sortBy: column, sortOrder: newOrder, page: 1 })
    },
    [filters.sortBy, filters.sortOrder, setFilters]
  )

  /**
   * Elimina un inmueble (baja lógica)
   */
  const deleteInmueble = useCallback(
    async (inmueble: IInmueble): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        await inmuebleService.deleteInmueble(inmueble.id)
        removeInmuebleFromList(inmueble.id)
        toast.success(INMUEBLE_MESSAGES.DELETE_SUCCESS)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : INMUEBLE_MESSAGES.DELETE_ERROR
        setError(message)
        toast.error(message)
        return false
      } finally {
        setLoading(false)
      }
    },
    [removeInmuebleFromList, setLoading, setError]
  )

  /**
   * Limpia filtros y recarga
   */
  const clearFilters = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  return {
    // Estado
    inmuebles,
    meta,
    filters,
    filterOptions,
    isLoading,
    error,
    selectedInmueble,

    // Acciones de filtros
    setFilters: handleFilterChange,
    clearFilters,
    handleSort,
    fetchInmuebles,
    fetchFilterOptions,

    // Selección
    setSelectedInmueble,

    // CRUD
    deleteInmueble,
    updateInmuebleInList,
  }
}
