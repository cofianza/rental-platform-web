/**
 * Hook de citas para panel /citas.
 * Refetch cuando cambian filtros. Patrón idéntico a useExpedientes.
 */

'use client'

import { useCallback, useEffect } from 'react'
import { citaService } from '@/services/citaService'
import { useCitasStore } from '@/stores/citasStore'
import type { ICitaFilters } from '@/types/cita'

export function useMisCitas() {
  const citas = useCitasStore((s) => s.citas)
  const meta = useCitasStore((s) => s.meta)
  const filters = useCitasStore((s) => s.filters)
  const isLoading = useCitasStore((s) => s.isLoading)
  const error = useCitasStore((s) => s.error)
  const setCitas = useCitasStore((s) => s.setCitas)
  const setLoading = useCitasStore((s) => s.setLoading)
  const setError = useCitasStore((s) => s.setError)
  const setFilters = useCitasStore((s) => s.setFilters)
  const resetFilters = useCitasStore((s) => s.resetFilters)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, meta } = await citaService.listMisCitas(filters)
      setCitas(data, meta)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar citas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [filters, setCitas, setLoading, setError])

  useEffect(() => {
    refetch()
  }, [refetch])

  const updateFilters = useCallback(
    (partial: Partial<ICitaFilters>) => setFilters({ ...partial, page: 1 }),
    [setFilters],
  )

  return {
    citas,
    meta,
    filters,
    isLoading,
    error,
    refetch,
    setFilters: updateFilters,
    resetFilters,
  }
}
