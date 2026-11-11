/**
 * Pruebas de lib/vitrinaInteres (node:test). Correr con: npx tsx --test lib/vitrinaInteres.test.ts
 *
 * UX-01 / R3-03 (revisión 2026-11-10): la API responde un 409 propio cuando no se puede abrir una solicitud sobre el
 * inmueble para esta persona. La tarjeta no le dice que «ya tiene un estudio activo» (no lo encuentra en ningún lado).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { esSolicitudNoDisponible, TEXTO_SOLICITUD_NO_DISPONIBLE } from './vitrinaInteres'

test('solo el 409 con el código propio', () => {
  assert.equal(esSolicitudNoDisponible({ statusCode: 409, code: 'SOLICITUD_NO_DISPONIBLE' }), true)
  assert.equal(esSolicitudNoDisponible({ statusCode: 409, code: 'EXPEDIENTE_ALREADY_EXISTS' }), false)
  assert.equal(esSolicitudNoDisponible({ statusCode: 400, code: 'SOLICITUD_NO_DISPONIBLE' }), false)
  assert.equal(esSolicitudNoDisponible(new Error('x')), false)
  assert.equal(esSolicitudNoDisponible(null), false)
})

test('el texto es neutro: en usted, sin hablar de un estudio activo ni del motivo', () => {
  assert.equal(TEXTO_SOLICITUD_NO_DISPONIBLE, 'No podemos abrir una solicitud para este inmueble. Si tiene dudas, comuníquese con Cofianza.')
  assert.doesNotMatch(TEXTO_SOLICITUD_NO_DISPONIBLE, /activo|lista|retir|rechaz|motivo/i)
})
