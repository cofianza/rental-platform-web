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
 * a la mutación). Quien muta lo evita con `descartarEnVuelo(key)` al terminar la
 * mutación: la lectura siguiente va a la red aunque la anterior siga en vuelo.
 * El valor resuelto se comparte por REFERENCIA entre callers concurrentes:
 * trátalo como inmutable.
 */
const inflight = new Map<string, Promise<unknown>>()

export function coalesceRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key)
  if (existing) return existing as Promise<T>
  const p = fn().finally(() => {
    // Solo la propia: si se descartó y otra lectura ocupó la clave, esa sigue compartiéndose.
    if (inflight.get(key) === p) inflight.delete(key)
  })
  inflight.set(key, p)
  return p
}

/**
 * Tras una mutación: la petición en vuelo de `key` (anterior a la mutación) deja de compartirse. Quien ya la
 * esperaba recibe su respuesta; la siguiente lectura hace una petición nueva y ve el dato ya cambiado.
 */
export function descartarEnVuelo(key: string): void {
  inflight.delete(key)
}
