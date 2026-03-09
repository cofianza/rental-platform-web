/**
 * Constantes para modulo de estudios - HP-331
 */

export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50] as const

export const SORTABLE_COLUMNS = {
  created_at: { key: 'created_at' as const, label: 'Fecha' },
  estado: { key: 'estado' as const, label: 'Estado' },
  resultado: { key: 'resultado' as const, label: 'Resultado' },
  score: { key: 'score' as const, label: 'Score' },
} as const

export const PROVEEDOR_LABELS: Record<string, string> = {
  transunion: 'TransUnion',
  sifin: 'SIFIN',
  datacredito: 'DataCredito',
}

export const ESTUDIO_UI_MESSAGES = {
  EMPTY_STATE: 'No se encontraron estudios',
  EMPTY_STATE_FILTERED: 'No hay estudios que coincidan con los filtros aplicados.',
  LOADING: 'Cargando estudios...',
  ERROR_RETRY: 'Reintentar',
  CLEAR_FILTERS: 'Limpiar filtros',
  SEARCH_PLACEHOLDER: 'Buscar por expediente, solicitante o proveedor...',
} as const
