/**
 * Constantes para módulo de expedientes - HP-229
 */

import type { EstadoExpediente } from '@/lib/constants'

/**
 * Opciones de estado para filtro multi-select
 */
export const ESTADO_OPTIONS: { value: EstadoExpediente; label: string }[] = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'en_revision', label: 'En Revisión' },
  { value: 'informacion_incompleta', label: 'Info. Incompleta' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'condicionado', label: 'Condicionado' },
  { value: 'cerrado', label: 'Finalizado' },
]

/**
 * Opciones de items por página
 */
export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50] as const

/**
 * Columnas ordenables
 */
export const SORTABLE_COLUMNS = {
  numero: { key: 'numero' as const, label: 'Código' },
  created_at: { key: 'created_at' as const, label: 'Fecha' },
  estado: { key: 'estado' as const, label: 'Estado' },
} as const

/**
 * Mensajes del módulo
 */
export const EXPEDIENTE_UI_MESSAGES = {
  EMPTY_STATE: 'No se encontraron expedientes',
  EMPTY_STATE_FILTERED: 'No hay expedientes que coincidan con los filtros',
  LOADING: 'Cargando expedientes...',
  ERROR_RETRY: 'Reintentar',
  CLEAR_FILTERS: 'Limpiar filtros',
  NEW_EXPEDIENTE: 'Nuevo Expediente',
  SEARCH_PLACEHOLDER: 'Buscar por código, inmueble o solicitante...',
} as const
