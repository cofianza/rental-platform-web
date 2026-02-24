/**
 * Store de Expedientes - Zustand (HP-229)
 * Maneja el estado de la lista de expedientes y filtros
 */

import { create } from 'zustand'
import type {
  IExpediente,
  IExpedienteFilters,
  IExpedientesMeta,
  IExpedientesStats,
  IAnalistaOption,
  EstadoExpediente,
} from '@/types/expediente'

/**
 * Filtros por defecto
 */
export const DEFAULT_EXPEDIENTE_FILTERS: IExpedienteFilters = {
  search: '',
  estado: [], // Multi-select vacío = todos
  analista_id: '',
  fecha_desde: '',
  fecha_hasta: '',
  page: 1,
  limit: 10,
  sortBy: 'created_at',
  sortOrder: 'desc',
}

/**
 * Estado del store
 */
interface IExpedientesState {
  expedientes: IExpediente[]
  meta: IExpedientesMeta | null
  stats: IExpedientesStats | null
  filters: IExpedienteFilters
  analistas: IAnalistaOption[]
  isLoading: boolean
  isLoadingStats: boolean
  error: string | null
  selectedExpediente: IExpediente | null
}

/**
 * Acciones del store
 */
interface ExpedientesActions {
  // Setters
  setExpedientes: (expedientes: IExpediente[]) => void
  setMeta: (meta: IExpedientesMeta | null) => void
  setStats: (stats: IExpedientesStats | null) => void
  setFilters: (filters: Partial<IExpedienteFilters>) => void
  setAnalistas: (analistas: IAnalistaOption[]) => void
  setLoading: (loading: boolean) => void
  setLoadingStats: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedExpediente: (expediente: IExpediente | null) => void

  // Actions
  resetFilters: () => void
  toggleEstadoFilter: (estado: EstadoExpediente) => void
  updateExpedienteInList: (expediente: IExpediente) => void
}

type ExpedientesStore = IExpedientesState & ExpedientesActions

const initialState: IExpedientesState = {
  expedientes: [],
  meta: null,
  stats: null,
  filters: DEFAULT_EXPEDIENTE_FILTERS,
  analistas: [],
  isLoading: false,
  isLoadingStats: false,
  error: null,
  selectedExpediente: null,
}

export const useExpedientesStore = create<ExpedientesStore>((set) => ({
  ...initialState,

  // Setters
  setExpedientes: (expedientes) => set({ expedientes }),
  setMeta: (meta) => set({ meta }),
  setStats: (stats) => set({ stats }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  setAnalistas: (analistas) => set({ analistas }),
  setLoading: (isLoading) => set({ isLoading }),
  setLoadingStats: (isLoadingStats) => set({ isLoadingStats }),
  setError: (error) => set({ error }),
  setSelectedExpediente: (selectedExpediente) => set({ selectedExpediente }),

  // Actions
  resetFilters: () => set({ filters: DEFAULT_EXPEDIENTE_FILTERS }),

  toggleEstadoFilter: (estado) =>
    set((state) => {
      const current = state.filters.estado
      const updated = current.includes(estado)
        ? current.filter((e) => e !== estado)
        : [...current, estado]
      return { filters: { ...state.filters, estado: updated, page: 1 } }
    }),

  updateExpedienteInList: (updatedExpediente) =>
    set((state) => ({
      expedientes: state.expedientes.map((exp) =>
        exp.id === updatedExpediente.id ? updatedExpediente : exp
      ),
    })),
}))
