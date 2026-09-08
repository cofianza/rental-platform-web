/**
 * Constantes para modulo de estudios - HP-331
 */

import type { EstadoEstudio } from '@/types/estudio'

export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50] as const

/**
 * Bandejas de la lista de evaluaciones.
 *
 * Antes había un tab por estado "grande" (Solicitados / En proceso /
 * Completados / Fallidos / Cancelados) y los 6 estados donde el operador tiene
 * que empujar (pago_pendiente, autorizado, formulario_enviado,
 * formulario_completado, documentos_cargados, pagado) solo aparecían mezclados
 * dentro de "Todos": no había forma de ver qué está esperando al prospecto y
 * qué ya se puede ejecutar.
 *
 * 'listos_ejecutar' coincide con ESTADOS_PERMITIDOS_EJECUCION de la API
 * (estudios.service.ts); 'pagado' NO es ejecutable, por eso se agrupa con lo
 * que sigue esperando al prospecto.
 *
 * 'condicionados' es la cola de revisión manual del §14: mismo estado
 * ('completado') pero resultado 'condicionado'.
 */
export const BANDEJAS: Array<{
  id: string
  label: string
  estados: EstadoEstudio[]
  resultado?: 'condicionado'
}> = [
  { id: 'todos', label: 'Todos', estados: [] },
  {
    id: 'esperando_prospecto',
    label: 'Esperando al prospecto',
    estados: ['solicitado', 'autorizado', 'pagado', 'formulario_enviado'],
  },
  { id: 'esperando_pago', label: 'Esperando pago', estados: ['pago_pendiente'] },
  {
    id: 'listos_ejecutar',
    label: 'Listos para ejecutar',
    estados: ['formulario_completado', 'documentos_cargados'],
  },
  { id: 'en_proceso', label: 'En proceso', estados: ['en_proceso'] },
  {
    id: 'condicionados',
    label: 'Revisión manual',
    estados: ['completado'],
    resultado: 'condicionado',
  },
  { id: 'completados', label: 'Completados', estados: ['completado'] },
  { id: 'fallidos', label: 'Fallidos', estados: ['fallido'] },
]

export const SORTABLE_COLUMNS = {
  created_at: { key: 'created_at' as const, label: 'Fecha' },
  estado: { key: 'estado' as const, label: 'Estado' },
  resultado: { key: 'resultado' as const, label: 'Resultado' },
  score: { key: 'score' as const, label: 'Score' },
} as const

export const PROVEEDOR_LABELS: Record<string, string> = {
  transunion: 'TransUnion',
  sifin: 'SIFIN',
  datacredito: 'DataCrédito',
}

export const ESTUDIO_UI_MESSAGES = {
  EMPTY_STATE: 'No se encontraron estudios',
  EMPTY_STATE_FILTERED: 'No hay estudios que coincidan con los filtros aplicados.',
  LOADING: 'Cargando estudios...',
  ERROR_RETRY: 'Reintentar',
  CLEAR_FILTERS: 'Limpiar filtros',
  SEARCH_PLACEHOLDER: 'Buscar por número de estudio, nombre o cédula',
} as const
