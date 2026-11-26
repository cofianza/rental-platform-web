/**
 * Pruebas de lib/destinacionInmueble (node:test). Correr con: npx tsx --test lib/destinacionInmueble.test.ts
 *
 * Reporte Oficina Virtual (25-nov), punto 8: un local registrado como vivienda llegó a estudio aprobado. La regla es
 * la de la API (inmuebles/destinacion.ts); los textos de incoherencia son los mismos que responde la API.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  destinacionDelInmueble,
  estudioSegunDestinacion,
  mensajeDestinacionIncoherente,
  MSG_DESTINACION_AVISO,
  MSG_DESTINACION_AVISO_SIN_INMUEBLE,
  MSG_DESTINACION_BLOQUEO,
  NOTA_CONTRATO_SOLO_VIVIENDA,
  NOTA_ESTUDIOS_NO_VIVIENDA,
  usosPermitidosPara,
} from './destinacionInmueble'

const TIPOS = ['apartamento', 'apartaestudio', 'casa', 'casa_finca', 'finca', 'oficina', 'local', 'bodega', 'lote', 'parqueadero']

test('la tabla: qué destinación admite cada tipo', () => {
  assert.deepEqual(Object.fromEntries(TIPOS.map((t) => [t, usosPermitidosPara(t)])), {
    apartamento: ['vivienda', 'comercial', 'mixto'],
    apartaestudio: ['vivienda', 'comercial', 'mixto'],
    casa: ['vivienda', 'comercial', 'mixto'],
    casa_finca: ['vivienda', 'comercial', 'mixto'],
    finca: ['vivienda', 'comercial', 'mixto'],
    oficina: ['comercial', 'mixto'],
    local: ['comercial', 'mixto'],
    bodega: ['comercial', 'mixto'],
    lote: ['comercial'],
    parqueadero: ['comercial'],
  })
  assert.deepEqual(usosPermitidosPara(''), ['vivienda', 'comercial', 'mixto'])
  assert.deepEqual(usosPermitidosPara(null), ['vivienda', 'comercial', 'mixto'])
})

test('el mensaje de incoherencia es el de la API', () => {
  assert.equal(
    mensajeDestinacionIncoherente('local', 'vivienda'),
    'Un local no puede tener destinación vivienda: elija comercial o mixta. El contrato que genera la plataforma es solo para vivienda.',
  )
  assert.equal(
    mensajeDestinacionIncoherente('parqueadero', 'vivienda'),
    'Un parqueadero no puede tener destinación vivienda: elija comercial. El contrato que genera la plataforma es solo para vivienda.',
  )
  assert.equal(
    mensajeDestinacionIncoherente('lote', 'mixto'),
    'Un lote no tiene parte habitable, así que no puede tener destinación mixta: elija comercial.',
  )
  assert.equal(mensajeDestinacionIncoherente('local', 'local_comercial'), null)
  assert.equal(mensajeDestinacionIncoherente('casa', 'comercial'), null)
  assert.equal(mensajeDestinacionIncoherente('finca', 'vivienda'), null)
  assert.equal(mensajeDestinacionIncoherente('local', ''), null)
})

test('destinación: el tipo manda sobre un uso que no le corresponde', () => {
  assert.equal(destinacionDelInmueble({ tipo: 'local', uso: 'vivienda' }), 'comercial')
  assert.equal(destinacionDelInmueble({ tipo: 'local', uso: 'mixto' }), 'mixto')
  assert.equal(destinacionDelInmueble({ tipo: 'lote', uso: 'mixto' }), 'comercial')
  assert.equal(destinacionDelInmueble({ tipo: 'apartamento', uso: 'vivienda' }), 'vivienda')
  assert.equal(destinacionDelInmueble({ tipo: 'casa', uso: 'comercial' }), 'comercial')
  assert.equal(destinacionDelInmueble({ tipo: 'casa', uso: 'local_comercial' }), 'comercial')
  assert.equal(destinacionDelInmueble({ tipo: null, uso: 'vivienda' }), 'vivienda')
  assert.equal(destinacionDelInmueble({ tipo: 'casa', uso: null }), null)
})

test('el asistente del estudio: bloquea con el interruptor apagado, avisa con el encendido', () => {
  assert.equal(estudioSegunDestinacion({ tipo: 'local', uso: 'vivienda' }, false), 'bloqueo')
  assert.equal(estudioSegunDestinacion({ tipo: 'apartamento', uso: 'mixto' }, false), 'bloqueo')
  assert.equal(estudioSegunDestinacion({ tipo: 'local', uso: 'vivienda' }, true), 'aviso')
  assert.equal(estudioSegunDestinacion({ tipo: 'apartamento', uso: 'vivienda' }, false), 'libre')
  assert.equal(estudioSegunDestinacion({ tipo: 'casa_finca', uso: 'vivienda' }, true), 'libre')
})

test('los textos: usted, «en desarrollo» y sin palabras vetadas', () => {
  for (const t of [MSG_DESTINACION_BLOQUEO, MSG_DESTINACION_AVISO, MSG_DESTINACION_AVISO_SIN_INMUEBLE, NOTA_CONTRATO_SOLO_VIVIENDA, NOTA_ESTUDIOS_NO_VIVIENDA]) {
    assert.doesNotMatch(t, /\b(tú|tu|puedes|rechaz)|bur[oó]|score/i)
  }
  assert.match(MSG_DESTINACION_BLOQUEO, /en desarrollo/)
  assert.match(NOTA_ESTUDIOS_NO_VIVIENDA, /en desarrollo/)
  assert.match(MSG_DESTINACION_AVISO, /contrato de vivienda/)
})
