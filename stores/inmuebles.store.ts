/**
 * Store de Inmuebles - Zustand (HP-174)
 * Maneja el estado de la lista de inmuebles y filtros
 */

import { create } from 'zustand'
import type {
  IInmueble,
  IInmuebleFilters,
  IInmueblesMeta,
  IInmueblesState,
  IFilterOptions,
} from '@/types/inmueble'

// Filtros por defecto
export const DEFAULT_INMUEBLE_FILTERS: IInmuebleFilters = {
  search: '',
  tipo: '',
  ciudad: '',
  estado: '',
  estrato: '',
  propietario_id: '',
  visible_vitrina: '',
  rent_min: '',
  rent_max: '',
  page: 1,
  limit: 10,
  sortBy: 'created_at',
  sortOrder: 'desc',
}

interface InmueblesActions {
  // Setters
  setInmuebles: (inmuebles: IInmueble[]) => void
  setMeta: (meta: IInmueblesMeta | null) => void
  setFilters: (filters: Partial<IInmuebleFilters>) => void
  setFilterOptions: (options: IFilterOptions | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedInmueble: (inmueble: IInmueble | null) => void

  // Actions
  resetFilters: () => void
  updateInmuebleInList: (inmueble: IInmueble) => void
  removeInmuebleFromList: (inmuebleId: string) => void
  addInmuebleToList: (inmueble: IInmueble) => void
}

type InmueblesStore = IInmueblesState & InmueblesActions

const initialState: IInmueblesState = {
  inmuebles: [],
  meta: null,
  filters: DEFAULT_INMUEBLE_FILTERS,
  filterOptions: null,
  isLoading: false,
  error: null,
  selectedInmueble: null,
}

export const useInmueblesStore = create<InmueblesStore>((set) => ({
  ...initialState,

  // Setters
  setInmuebles: (inmuebles) => set({ inmuebles }),

  setMeta: (meta) => set({ meta }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  setFilterOptions: (filterOptions) => set({ filterOptions }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setSelectedInmueble: (selectedInmueble) => set({ selectedInmueble }),

  // Actions
  resetFilters: () => set({ filters: DEFAULT_INMUEBLE_FILTERS }),

  updateInmuebleInList: (updatedInmueble) =>
    set((state) => ({
      inmuebles: state.inmuebles.map((inmueble) =>
        inmueble.id === updatedInmueble.id ? updatedInmueble : inmueble
      ),
    })),

  removeInmuebleFromList: (inmuebleId) =>
    set((state) => ({
      inmuebles: state.inmuebles.filter((inmueble) => inmueble.id !== inmuebleId),
      meta: state.meta
        ? { ...state.meta, total: Math.max(0, state.meta.total - 1) }
        : null,
    })),

  addInmuebleToList: (inmueble) =>
    set((state) => ({
      inmuebles: [inmueble, ...state.inmuebles],
      meta: state.meta
        ? { ...state.meta, total: state.meta.total + 1 }
        : null,
    })),
}))
