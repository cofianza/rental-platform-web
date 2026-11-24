/**
 * Pruebas de lib/requestCoalesce (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/requestCoalesce.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coalesceRequest, descartarEnVuelo } from './requestCoalesce'

/** Una petición que se resuelve cuando la prueba lo decide. */
function peticion<T>() {
  let resolver!: (v: T) => void
  const promesa = new Promise<T>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

test('las llamadas concurrentes con la misma clave comparten la petición; al terminar, la siguiente va a la red', async () => {
  let llamadas = 0
  const p = peticion<string>()
  const pedir = () =>
    coalesceRequest('k1', () => {
      llamadas++
      return p.promesa
    })
  const a = pedir()
  const b = pedir()
  assert.equal(llamadas, 1)
  p.resolver('dato')
  assert.deepEqual(await Promise.all([a, b]), ['dato', 'dato'])
  await coalesceRequest('k1', async () => {
    llamadas++
    return 'otro'
  })
  assert.equal(llamadas, 2)
})

test('bloque 4: tras una acción, la relectura no reutiliza la petición en vuelo de antes', async () => {
  const vieja = peticion<string>()
  const nueva = peticion<string>()
  let llamadas = 0
  const leer = () =>
    coalesceRequest('k2', () => {
      llamadas++
      return llamadas === 1 ? vieja.promesa : nueva.promesa
    })
  // Una lectura queda en vuelo; mientras tanto termina la acción (cancelar, invitar) y se descarta.
  const antes = leer()
  descartarEnVuelo('k2')
  const despues = leer()
  assert.equal(llamadas, 2, 'la relectura hace su propia petición')
  // La vieja responde tarde con el dato anterior: quien la esperaba la recibe, pero no pisa a la nueva.
  vieja.resolver('antes de la acción')
  assert.equal(await antes, 'antes de la acción')
  // La nueva sigue compartiéndose mientras esté en vuelo (la vieja, al terminar, no borró su clave).
  const tercera = leer()
  assert.equal(llamadas, 2)
  nueva.resolver('después de la acción')
  assert.equal(await despues, 'después de la acción')
  assert.equal(await tercera, 'después de la acción')
})

test('descartar una clave sin petición en vuelo no hace nada', () => {
  assert.doesNotThrow(() => descartarEnVuelo('no-existe'))
})
