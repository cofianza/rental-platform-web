/**
 * Coalescing de requests de red.
 *
 * Varias llamadas CONCURRENTES con la misma `key` comparten la MISMA promesa en
 * vuelo. Sirve para colapsar la ráfaga de montaje del detalle de expediente:
 * varias cards (CitasSection, ProgressBar, AccionHabilitarEstudioCard, …) piden
 * a la vez las citas/contratos del mismo expediente → antes eran N peticiones
 * idénticas, ahora es 1.
 *
 * NO es una caché: no hay TTL. Una vez que la promesa se resuelve, la clave se
 * libera, así que la siguiente llamada (p. ej. el refetch tras una mutación) va
 * fresca a la red. Por eso es seguro: cero riesgo de datos stale.
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
