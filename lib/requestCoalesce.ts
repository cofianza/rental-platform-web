/**
 * Coalescing de requests de red.
 *
 * Varias llamadas CONCURRENTES con la misma `key` comparten la MISMA promesa en
 * vuelo. Sirve para colapsar la ráfaga de montaje del detalle de expediente:
 * varias cards (CitasSection, ProgressBar, AccionHabilitarEstudioCard, …) piden
 * a la vez las citas/contratos del mismo expediente → antes eran N peticiones
 * idénticas, ahora es 1.
 *
 * NO es una caché: no hay TTL. Solo comparte promesas EN VUELO. Una vez que la
 * promesa se resuelve, la clave se libera, así que la siguiente llamada (p. ej.
 * el refetch SECUENCIAL tras una mutación —await de la mutación y luego el
 * refetch) va fresca a la red. Salvedad: si un refetch se SOLAPA con un GET del
 * mismo key aún en vuelo, recibirá el resultado de ESE GET (posible dato previo
 * a la mutación). Con el uso actual (refetch secuencial) no ocurre; tenlo en
 * cuenta si introduces refetches concurrentes. El valor resuelto se comparte
 * por REFERENCIA entre callers concurrentes: trátalo como inmutable.
 */
const inflight = new Map<string, Promise<unknown>>()

export function coalesceRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key)
  if (existing) return existing as Promise<T>
  const p = fn().finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, p)
  return p
}
