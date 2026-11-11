/**
 * Pruebas de lib/faqCostoRespaldo (node:test). Correr con: npx tsx --test lib/faqCostoRespaldo.test.ts
 *
 * A5D-04: el respaldo de «¿Cuánto cuesta y qué incluye?» (solo si la API no responde) no fija los porcentajes de la
 * prima: el texto vigente, con la cifra, lo manda la API.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FAQ_COSTO_RESPALDO } from './faqCostoRespaldo'

test('la prima sin porcentajes: «un porcentaje de un canon, más IVA»', () => {
  assert.match(FAQ_COSTO_RESPALDO, /Si aprueba, paga una sola vez la prima de vinculación, un porcentaje de un canon, más IVA\. Luego paga una tarifa mensual más IVA\./)
  assert.doesNotMatch(FAQ_COSTO_RESPALDO, /20\s*%|10\s*%|coarrendatario/)
})

test('el resto del texto sigue como estaba (costo único del estudio y la devolución al terminar)', () => {
  assert.ok(FAQ_COSTO_RESPALDO.startsWith('El estudio de arrendamiento tiene un costo único al inicio. '))
  assert.match(FAQ_COSTO_RESPALDO, /Al terminar el contrato recupera el 30% de las tarifas mensuales pagadas/)
})
