/**
 * Store de Expedientes - Zustand (HP-229 + Bandejas)
 * Maneja el estado de la lista de expedientes, filtros y bandejas operativas
 */

import { create } from 'zustand'
import type {
  IExpediente,
  IExpedienteFilters,
  IExpedientesMeta,
  IExpedientesStats,
  IAnalistaOption,
  IInmobiliariaFiltro,
  EstadoExpediente,
} from '@/types/expediente'

/**
 * Filtros por defecto
 */
export const DEFAULT_EXPEDIENTE_FILTERS: IExpedienteFilters = {
  search: '',
  estado: [], // Multi-select vacío = todos
  analista_id: '',
  miembro_responsable_id: '',
  inmobiliaria_id: '', // Solo Cofianza: '' = todas
  inmueble_id: '',
  fecha_desde: '',
  fecha_hasta: '',
  estudio_filtro: 'todos', // Vista fusionada: filtro por estado del estudio vigente
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
  /** El filtro de inmobiliaria con que se contaron `stats` ('' = todas; null = sin contar todavía). */
  statsDe: string | null
  filters: IExpedienteFilters
  analistas: IAnalistaOption[]
  /** Organizaciones del filtro «Inmobiliaria» (solo Cofianza). null = todavía no se cargan. */
  inmobiliarias: IInmobiliariaFiltro[] | null
  /** No se pudieron cargar (se reintenta al abrir el filtro o al volver a la lista). */
  errorInmobiliarias: boolean
  /** La API no tiene el filtro (anterior a esta función): no se muestra ni se envía. */
  sinFiltroInmobiliaria: boolean
  isLoading: boolean
  isLoadingStats: boolean
  error: string | null
  selectedExpediente: IExpediente | null
  /**
   * La pestaña (clavePestana: chip y bandeja) con que se cargaron `expedientes`. Si la elegida es otra,
   * la lista muestra el esqueleto y no las filas de la anterior (reporte de Gerencia, punto 12).
   */
  pestanaCargada: string | null

  // Bandejas operativas
  activeBandeja: EstadoExpediente | null // null = "Todos"
  misExpedientes: boolean
}

/**
 * Acciones del store
 */
interface ExpedientesActions {
  // Setters
  setExpedientes: (expedientes: IExpediente[]) => void
  setMeta: (meta: IExpedientesMeta | null) => void
  setStats: (stats: IExpedientesStats | null, de?: string) => void
  setFilters: (filters: Partial<IExpedienteFilters>) => void
  setAnalistas: (analistas: IAnalistaOption[]) => void
  setInmobiliarias: (inmobiliarias: IInmobiliariaFiltro[] | null, error?: boolean) => void
  setSinFiltroInmobiliaria: (value: boolean) => void
  setLoading: (loading: boolean) => void
  setLoadingStats: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedExpediente: (expediente: IExpediente | null) => void
  setPestanaCargada: (clave: string | null) => void

  // Actions
  resetFilters: () => void
  toggleEstadoFilter: (estado: EstadoExpediente) => void
  updateExpedienteInList: (expediente: IExpediente) => void

  // Bandejas
  setActiveBandeja: (bandeja: EstadoExpediente | null) => void
  setMisExpedientes: (value: boolean) => void
}

type ExpedientesStore = IExpedientesState & ExpedientesActions

const initialState: IExpedientesState = {
  expedientes: [],
  meta: null,
  stats: null,
  statsDe: null,
  filters: DEFAULT_EXPEDIENTE_FILTERS,
  analistas: [],
  inmobiliarias: null,
  errorInmobiliarias: false,
  sinFiltroInmobiliaria: false,
  // true hasta la primera carga: sin esto la lista vacía ("no hay estudios")
  // asomaba antes del primer fetch.
  isLoading: true,
  // true hasta la primera carga, como isLoading: las pestañas no dicen «sin conteo» antes de pedirlos.
  isLoadingStats: true,
  error: null,
  selectedExpediente: null,
  pestanaCargada: null,
  activeBandeja: null,
  misExpedientes: false,
}

export const useExpedientesStore = create<ExpedientesStore>((set) => ({
  ...initialState,

  // Setters
  setExpedientes: (expedientes) => set({ expedientes }),
  setMeta: (meta) => set({ meta }),
  setStats: (stats, de = '') => set({ stats, statsDe: stats ? de : null }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  setAnalistas: (analistas) => set({ analistas }),
  setInmobiliarias: (inmobiliarias, error = false) => set({ inmobiliarias, errorInmobiliarias: error }),
  setSinFiltroInmobiliaria: (sinFiltroInmobiliaria) => set({ sinFiltroInmobiliaria }),
  setLoading: (isLoading) => set({ isLoading }),
  setLoadingStats: (isLoadingStats) => set({ isLoadingStats }),
  setError: (error) => set({ error }),
  setSelectedExpediente: (selectedExpediente) => set({ selectedExpediente }),
  setPestanaCargada: (pestanaCargada) => set({ pestanaCargada }),

  // Actions
  resetFilters: () =>
    set({
      filters: DEFAULT_EXPEDIENTE_FILTERS,
      activeBandeja: null,
      misExpedientes: false,
    }),

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

  // Bandejas
  setActiveBandeja: (bandeja) =>
    set((state) => ({
      activeBandeja: bandeja,
      filters: {
        ...state.filters,
        estado: bandeja ? [bandeja] : [],
        page: 1,
      },
    })),

  setMisExpedientes: (value) => set({ misExpedientes: value }),
}))
