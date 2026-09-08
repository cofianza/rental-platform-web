/**
 * Store de Estudios - Zustand (HP-331)
 * Maneja el estado de la lista global de estudios, filtros y bandejas
 */

import { create } from 'zustand'
import { BANDEJAS } from '@/components/estudios/constants'
import type { IEstudioListItem, IEstudioFilters, IEstudiosMeta } from '@/types/estudio'

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
  /** Id de la bandeja activa (ver BANDEJAS), no un estado suelto. */
  activeBandeja: string | null
}

interface EstudiosListActions {
  setEstudios: (estudios: IEstudioListItem[]) => void
  setMeta: (meta: IEstudiosMeta | null) => void
  setFilters: (filters: Partial<IEstudioFilters>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  resetFilters: () => void
  setActiveBandeja: (bandeja: string | null) => void
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
  // Una bandeja ya no es un estado: puede agrupar varios (p. ej. "Listos para
  // ejecutar") o filtrar además por resultado ("Revisión manual").
  setActiveBandeja: (bandeja) =>
    set((state) => {
      const def = BANDEJAS.find((b) => b.id === bandeja)
      return {
        activeBandeja: bandeja,
        filters: {
          ...state.filters,
          estado: def?.estados ?? [],
          resultado: def?.resultado ?? '',
          page: 1,
        },
      }
    }),
}))
