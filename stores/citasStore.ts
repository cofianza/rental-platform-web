/**
 * Store de Citas — panel operativo del propietario/inmobiliaria.
 * Estructura análoga a expedientesStore: filtros + lista + meta, sin fetch
 * interno. El fetch vive en el hook useMisCitas.
 */

import { create } from 'zustand'
import type { ICita, ICitaFilters, ICitasMeta } from '@/types/cita'

export const DEFAULT_CITA_FILTERS: ICitaFilters = {
  estado: '',
  fecha_desde: '',
  fecha_hasta: '',
  inmueble_id: '',
  page: 1,
  limit: 50,
}

interface ICitasState {
  citas: ICita[]
  meta: ICitasMeta | null
  filters: ICitaFilters
  isLoading: boolean
  error: string | null
}

interface ICitasActions {
  setCitas: (citas: ICita[], meta: ICitasMeta) => void
  setFilters: (partial: Partial<ICitaFilters>) => void
  resetFilters: () => void
  updateCitaInList: (citaId: string, partial: Partial<ICita>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

type CitasStore = ICitasState & ICitasActions

const initialState: ICitasState = {
  citas: [],
  meta: null,
  filters: DEFAULT_CITA_FILTERS,
  isLoading: false,
  error: null,
}

export const useCitasStore = create<CitasStore>((set) => ({
  ...initialState,

  setCitas: (citas, meta) => set({ citas, meta }),

  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
    })),

  resetFilters: () => set({ filters: DEFAULT_CITA_FILTERS }),

  updateCitaInList: (citaId, partial) =>
    set((state) => ({
      citas: state.citas.map((c) => (c.id === citaId ? { ...c, ...partial } : c)),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}))
