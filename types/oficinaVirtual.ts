/**
 * Conteos de la Oficina Virtual (GET /oficina-virtual/conteos; reporte del 25-nov, puntos 1, 7, 11 y 13).
 * Cada cifra se calcula en la API en un solo lugar y trae su periodo: la pantalla lo escribe junto a ella.
 * Una sección en null = no se pudo calcular (se muestra «—», nunca un 0).
 */

import type { EstudioFiltro } from '@/types/expediente'

export type SeccionOficina = 'estudios' | 'aprobacion' | 'contratos' | 'acciones'

export type PeriodoOficina = 'desde_el_inicio' | 'este_mes' | 'ultimos_30_dias' | 'ahora'

export interface IEstudiosOficina {
  periodo: 'desde_el_inicio'
  /** Las pestañas de la lista de estudios (las claves de GET /expedientes/conteos). Falta una = no se pudo contar. */
  pestanas: Partial<Record<EstudioFiltro, number>>
  /** ¿Las pestañas de resultado suman exactamente «Todos»? */
  particion: boolean
  este_mes: { periodo: 'este_mes'; desde: string; creados: number }
}

export interface IAprobacionOficina {
  periodo: 'ultimos_30_dias'
  desde: string
  hasta: string
  aprobados: number
  /** Ausentes si la API no pudo clasificar a los condicionados. */
  con_segundo_firmante?: number
  bloqueados?: number
  /** No aprobables. */
  rechazados: number
  decididos: number
  en_revision: number
  /** Porcentaje (2 decimales); null sin decisiones. */
  tasa: number | null
  /** La proporción en décimos (0 a 10); null sin decisiones. */
  de_cada_10: number | null
}

export interface IAprobadosSinContrato {
  periodo: 'ahora'
  por_generar: number
  con_traba: { total: number; canon_excede: number; segundo_firmante: number; en_verificacion: number }
  resultado_vencido: number
}

export interface IContratosOficina {
  periodo: 'desde_el_inicio'
  total: number
  borrador: number
  /** En firma y con firma incompleta. */
  en_firma: number
  activos: number
  finalizados: number
  cancelados: number
  aprobados_sin_contrato: IAprobadosSinContrato
}

/** Punto 11: los totales de cada grupo de acción del Inicio, sin recortes. */
export interface IAccionesOficina {
  periodo: 'ahora'
  requieren_accion: number
  /** null con una API anterior (no se sabe). */
  esperando_autorizacion: number | null
  citas_por_confirmar: number
  citas_por_realizar: number
  evaluaciones_por_habilitar: number
  contratos_por_generar: number
  aprobados_canon_excede: number
  aprobados_segundo_firmante: number
  aprobados_en_verificacion: number
  aprobados_con_traba: number
  resultado_vencido: number
}

export interface IConteosOficina {
  generado_en: string
  zona_horaria: string
  estudios?: IEstudiosOficina | null
  aprobacion?: IAprobacionOficina | null
  contratos?: IContratosOficina | null
  acciones?: IAccionesOficina | null
}
