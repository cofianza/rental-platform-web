/**
 * Store de Estudios - Zustand (HP-331)
 * Maneja el estado de la lista global de estudios, filtros y bandejas
 */

import { create } from 'zustand'
import type {
  IEstudioListItem,
  IEstudioFilters,
  IEstudiosMeta,
  EstadoEstudio,
} from '@/types/estudio'

export const DEFAULT_ESTUDIO_FILTERS: IEstudioFilters = {
  search: '',
  estado: [],
  resultado: '',
  proveedor: '',
  fecha_desde: '',
  fecha_hasta: '',
  page: 1,
  limit: 10,
  sortBy: 'created_at',
  sortOrder: 'desc',
}

interface IEstudiosListState {
  estudios: IEstudioListItem[]
  meta: IEstudiosMeta | null
  filters: IEstudioFilters
  isLoading: boolean
  error: string | null
  activeBandeja: EstadoEstudio | null
}

interface EstudiosListActions {
  setEstudios: (estudios: IEstudioListItem[]) => void
  setMeta: (meta: IEstudiosMeta | null) => void
  setFilters: (filters: Partial<IEstudioFilters>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  resetFilters: () => void
  setActiveBandeja: (bandeja: EstadoEstudio | null) => void
}

type EstudiosListStore = IEstudiosListState & EstudiosListActions

const initialState: IEstudiosListState = {
  estudios: [],
  meta: null,
  filters: DEFAULT_ESTUDIO_FILTERS,
  isLoading: false,
  error: null,
  activeBandeja: null,
}

export const useEstudiosListStore = create<EstudiosListStore>((set) => ({
  ...initialState,

  setEstudios: (estudios) => set({ estudios }),
  setMeta: (meta) => set({ meta }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  resetFilters: () =>
    set({
      filters: DEFAULT_ESTUDIO_FILTERS,
      activeBandeja: null,
    }),
  setActiveBandeja: (bandeja) =>
    set((state) => ({
      activeBandeja: bandeja,
      filters: {
        ...state.filters,
        estado: bandeja ? [bandeja] : [],
        page: 1,
      },
    })),
}))
