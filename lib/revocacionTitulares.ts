/**
 * Revocación con dos titulares: tras un cambio de solicitante pueden convivir dos autorizaciones
 * vigentes de personas distintas. La API responde 409 `REVOCACION_TITULAR_AMBIGUO` con las opciones
 * (`details.titulares`: id y nombre de cada solicitante) y Cofianza elige de quién es la solicitud.
 * Sin dependencias de React ni del cliente HTTP, para probarlo con node:test.
 */

export interface ITitularRevocacion {
  solicitante_id: string
  nombre: string
}

export const CODIGO_REVOCACION_AMBIGUA = 'REVOCACION_TITULAR_AMBIGUO'

/** Las opciones para elegir, o null si el error no es el de dos titulares (o no trae opciones válidas). */
export function titularesDeRevocacionAmbigua(err: unknown): ITitularRevocacion[] | null {
  if (!err || typeof err !== 'object') return null
  const e = err as { code?: unknown; details?: unknown }
  if (e.code !== CODIGO_REVOCACION_AMBIGUA) return null
  const lista = (e.details as { titulares?: unknown } | null | undefined)?.titulares
  if (!Array.isArray(lista)) return null
  const titulares = lista
    .filter(
      (t): t is ITitularRevocacion =>
        !!t && typeof t === 'object' &&
        typeof (t as ITitularRevocacion).solicitante_id === 'string' && (t as ITitularRevocacion).solicitante_id !== '' &&
        typeof (t as ITitularRevocacion).nombre === 'string',
    )
    .map((t) => ({ solicitante_id: t.solicitante_id, nombre: t.nombre.trim() || 'Solicitante sin nombre' }))
  return titulares.length > 1 ? titulares : null
}
