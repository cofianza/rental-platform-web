/**
 * Constantes para módulo de expedientes - HP-229
 */

import type { EstadoExpediente } from '@/lib/constants'

/**
 * Opciones de estado para filtro multi-select
 */
export const ESTADO_OPTIONS: { value: EstadoExpediente; label: string }[] = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'informacion_incompleta', label: 'Info. incompleta' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'rechazado', label: 'No aprobable' },
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
} as const

/**
 * Mensajes del módulo
 */
export const EXPEDIENTE_UI_MESSAGES = {
  // Estado vacío de la tabla, según por qué está vacía.
  VACIO_ACCION_TITULO: 'Nada pendiente de su parte',
  VACIO_ACCION_TEXTO:
    'Cuando un estudio necesite algo de usted (habilitar la evaluación, definir el pago, reenviar un enlace o crear el contrato), aparecerá aquí.',
  VACIO_FILTROS_TITULO: 'Ningún estudio coincide',
  VACIO_FILTROS_TEXTO: 'Pruebe con otra búsqueda o quite los filtros.',
  VACIO_NADA_TITULO: 'Todavía no tiene estudios',
  VACIO_NADA_TEXTO:
    'Un estudio reúne la visita, la evaluación crediticia del prospecto y el contrato. Empiece con «Nuevo estudio».',
  VACIO_BANDEJA_TITULO: 'No hay estudios en esta bandeja.',
  LOADING: 'Cargando estudios...',
  ERROR_RETRY: 'Reintentar',
  CLEAR_FILTERS: 'Limpiar filtros',
  NEW_EXPEDIENTE: 'Nuevo estudio',
  SEARCH_PLACEHOLDER: 'Buscar por código, inmueble o solicitante...',
} as const
