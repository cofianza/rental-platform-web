'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useBitacoraStore } from '@/stores/bitacora.store'
import { bitacoraService } from '@/services/bitacoraService'
import { DEFAULT_FILTERS, BITACORA_MESSAGES } from '@/components/bitacora/constants'
import type { IAuditLogFilters, IAuditLog } from '@/types/bitacora'

const DEBOUNCE_DELAY = 300

export function useBitacora() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)

  const logs = useBitacoraStore((s) => s.logs)
  const meta = useBitacoraStore((s) => s.meta)
  const filters = useBitacoraStore((s) => s.filters)
  const isLoading = useBitacoraStore((s) => s.isLoading)
  const error = useBitacoraStore((s) => s.error)
  const selectedLog = useBitacoraStore((s) => s.selectedLog)

  const setLogs = useBitacoraStore((s) => s.setLogs)
  const setMeta = useBitacoraStore((s) => s.setMeta)
  const setFilters = useBitacoraStore((s) => s.setFilters)
  const setLoading = useBitacoraStore((s) => s.setLoading)
  const setError = useBitacoraStore((s) => s.setError)
  const selectLog = useBitacoraStore((s) => s.selectLog)
  const clearSelectedLog = useBitacoraStore((s) => s.clearSelectedLog)
  const resetFilters = useBitacoraStore((s) => s.resetFilters)

  // Sync URL -> Store on mount
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const urlFilters: Partial<IAuditLogFilters> = {}

    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const entityType = searchParams.get('entityType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null

    if (userId) urlFilters.userId = userId
    if (action) urlFilters.action = action
    if (entityType) urlFilters.entityType = entityType
    if (dateFrom) urlFilters.dateFrom = dateFrom
    if (dateTo) urlFilters.dateTo = dateTo
    if (page) urlFilters.page = parseInt(page, 10)
    if (limit) urlFilters.limit = parseInt(limit, 10)
    if (sortOrder) urlFilters.sortOrder = sortOrder

    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters)
    }
  }, [searchParams, setFilters])

  // Update URL when filters change
  const updateUrl = useCallback(
    (newFilters: IAuditLogFilters) => {
      const params = new URLSearchParams()

      if (newFilters.userId) params.set('userId', newFilters.userId)
      if (newFilters.action) params.set('action', newFilters.action)
      if (newFilters.entityType) params.set('entityType', newFilters.entityType)
      if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom)
      if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo)
      if (newFilters.page > 1) params.set('page', newFilters.page.toString())
      if (newFilters.limit !== DEFAULT_FILTERS.limit) {
        params.set('limit', newFilters.limit.toString())
      }
      if (newFilters.sortOrder !== 'desc') params.set('sortOrder', newFilters.sortOrder)

      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname
      router.replace(newUrl, { scroll: false })
    },
    [pathname, router],
  )

  // Fetch logs from API
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await bitacoraService.getLogs(filters)
      setLogs(response.data)
      setMeta(response.meta)
    } catch (err) {
      const message = err instanceof Error ? err.message : BITACORA_MESSAGES.FETCH_ERROR
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [filters, setLoading, setError, setLogs, setMeta])

  // Debounced fetch on filter change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchLogs()
      updateUrl(filters)
    }, DEBOUNCE_DELAY)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [filters, fetchLogs, updateUrl])

  const handleFilterChange = useCallback(
    (newFilters: Partial<IAuditLogFilters>) => {
      if (!('page' in newFilters)) {
        setFilters({ ...newFilters, page: 1 })
      } else {
        setFilters(newFilters)
      }
    },
    [setFilters],
  )

  const viewDetail = useCallback(
    (log: IAuditLog) => {
      selectLog(log)
    },
    [selectLog],
  )

  const clearFilters = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  return {
    logs,
    meta,
    filters,
    isLoading,
    error,
    selectedLog,

    setFilters: handleFilterChange,
    clearFilters,
    fetchLogs,
    viewDetail,
    clearSelectedLog,
  }
}
