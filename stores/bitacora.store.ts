import { create } from 'zustand'
import type { IAuditLog, IAuditLogFilters, IAuditLogsMeta, IAuditLogsState } from '@/types/bitacora'
import { DEFAULT_FILTERS } from '@/components/bitacora/constants'

interface BitacoraActions {
  setLogs: (logs: IAuditLog[]) => void
  setMeta: (meta: IAuditLogsMeta | null) => void
  setFilters: (filters: Partial<IAuditLogFilters>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  selectLog: (log: IAuditLog) => void
  clearSelectedLog: () => void
  resetFilters: () => void
}

type BitacoraStore = IAuditLogsState & BitacoraActions

const initialState: IAuditLogsState = {
  logs: [],
  meta: null,
  filters: DEFAULT_FILTERS,
  isLoading: false,
  error: null,
  selectedLog: null,
}

export const useBitacoraStore = create<BitacoraStore>((set) => ({
  ...initialState,

  setLogs: (logs) => set({ logs }),
  setMeta: (meta) => set({ meta }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  selectLog: (selectedLog) => set({ selectedLog }),
  clearSelectedLog: () => set({ selectedLog: null }),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}))
