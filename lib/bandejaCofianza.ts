/**
 * La bandeja «En revisión de Cofianza» de la lista interna (/expedientes, BandejaTabs). Revisión UX del
 * bloque 3: la API cuenta `revision_cofianza` en GET /expedientes/stats con la regla del chip del mismo
 * nombre, y la lista se pide con estado=condicionado y estudio_filtro=revision_cofianza (conserva el orden
 * por prioridad del analista). Si la API no lo sabe (null) o es anterior (sin el campo), la bandeja vuelve
 * a ser todo el estado condicionado y se llama «Condicionados», para no decir lo que no es. Pura.
 */

import type { EstadoExpediente } from '@/lib/constants'
import type { EstudioFiltro, IExpedientesStats } from '@/types/expediente'

/** La API dio el conteo de la revisión de Cofianza (un número; null o ausente = no se sabe). */
export function revisionCofianzaDisponible(stats: Pick<IExpedientesStats, 'revision_cofianza'> | null | undefined): boolean {
  return typeof stats?.revision_cofianza === 'number'
}

/** El chip con que se pide la lista de una bandeja: solo la del condicionado lleva uno, y solo si la API lo sabe. */
export function estudioFiltroDeBandeja(
  bandeja: EstadoExpediente | null,
  stats: Pick<IExpedientesStats, 'revision_cofianza'> | null | undefined,
): EstudioFiltro {
  return bandeja === 'condicionado' && revisionCofianzaDisponible(stats) ? 'revision_cofianza' : 'todos'
}

/**
 * Con la bandeja del condicionado elegida, el chip que le corresponde cuando cambia lo que se sabe (llegan
 * los contadores, o la URL traía solo el estado). null = no hay nada que corregir: otra bandeja, contadores
 * sin llegar, o un chip que no es de la bandeja (p. ej. «Turno del gestor»).
 */
export function corregirFiltroDeBandeja(
  bandeja: EstadoExpediente | null,
  stats: Pick<IExpedientesStats, 'revision_cofianza'> | null | undefined,
  actual: EstudioFiltro | undefined,
): EstudioFiltro | null {
  if (bandeja !== 'condicionado' || !stats) return null
  const filtro = estudioFiltroDeBandeja(bandeja, stats)
  const vigente = actual ?? 'todos'
  if (vigente !== 'todos' && vigente !== 'revision_cofianza') return null
  return vigente === filtro ? null : filtro
}
