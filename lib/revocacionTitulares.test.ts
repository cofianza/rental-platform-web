/**
 * Pruebas de lib/revocacionTitulares (node:test). Correr con: npx tsx --test lib/revocacionTitulares.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { titularesDeRevocacionAmbigua } from './revocacionTitulares'

const dos = [
  { solicitante_id: 'sol-1', nombre: 'Persona Uno' },
  { solicitante_id: 'sol-2', nombre: '  ' },
]

test('409 de dos titulares con opciones: las devuelve (nombre vacío con texto genérico)', () => {
  assert.deepEqual(titularesDeRevocacionAmbigua({ code: 'REVOCACION_TITULAR_AMBIGUO', details: { titulares: dos } }), [
    { solicitante_id: 'sol-1', nombre: 'Persona Uno' },
    { solicitante_id: 'sol-2', nombre: 'Solicitante sin nombre' },
  ])
})

test('cualquier otro error (o el de hoy, sin adenda): null, la pantalla sigue como antes', () => {
  assert.equal(titularesDeRevocacionAmbigua(new Error('x')), null)
  assert.equal(titularesDeRevocacionAmbigua({ code: 'AUTORIZACION_NOT_FOUND', details: { titulares: dos } }), null)
  assert.equal(titularesDeRevocacionAmbigua(null), null)
  assert.equal(titularesDeRevocacionAmbigua(undefined), null)
})

test('409 sin opciones o con una sola válida: null (se muestra el mensaje de la API)', () => {
  assert.equal(titularesDeRevocacionAmbigua({ code: 'REVOCACION_TITULAR_AMBIGUO' }), null)
  assert.equal(titularesDeRevocacionAmbigua({ code: 'REVOCACION_TITULAR_AMBIGUO', details: [] }), null)
  assert.equal(
    titularesDeRevocacionAmbigua({ code: 'REVOCACION_TITULAR_AMBIGUO', details: { titulares: [dos[0], { solicitante_id: '', nombre: 'x' }, 'basura'] } }),
    null,
  )
})
