/**
 * Pruebas de lib/avisosServicio (node:test). Correr con: npx tsx --test lib/avisosServicio.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  SERVICIOS_AVISO,
  LIMITE_MENSAJE,
  LIMITE_TITULO,
  CLAVE_OCULTOS_PUBLICOS,
  avisosAMostrar,
  bogotaLocalAIso,
  claveOcultosDe,
  siNoSeGuardoElCierre,
  isoABogotaLocal,
  podarOcultos,
  tieneCamposPorLlenar,
  textoAudiencia,
} from './avisosServicio'
import type { IAvisoVisible } from '../types/avisosServicio'

const aviso = (p: Partial<IAvisoVisible>): IAvisoVisible => ({
  id: 'a',
  servicio: 'whatsapp',
  nivel: 'parcial',
  titulo: 'T',
  mensaje: 'M',
  actualizado_en: '2026-11-24T15:00:00.000Z',
  ...p,
})

test('ocultar: solo la versión ocultada; si se edita vuelve a salir', () => {
  const a = aviso({ id: 'a' })
  assert.deepEqual(avisosAMostrar([a], { a: a.actualizado_en }), [])
  const editado = { ...a, actualizado_en: '2026-11-24T16:00:00.000Z' }
  assert.deepEqual(avisosAMostrar([editado], { a: a.actualizado_en }), [editado])
})

test('«fuera de servicio» no se oculta', () => {
  const a = aviso({ id: 'a', nivel: 'caido' })
  assert.deepEqual(avisosAMostrar([a], { a: a.actualizado_en }), [a])
})

test('punto 12: el respaldo del panel en el navegador es por persona y distinto del de las páginas públicas', () => {
  const a = claveOcultosDe('00000000-0000-4000-8000-000000000001')
  const b = claveOcultosDe('00000000-0000-4000-8000-000000000002')
  assert.notEqual(a, b)
  assert.notEqual(a, CLAVE_OCULTOS_PUBLICOS)
  assert.equal(CLAVE_OCULTOS_PUBLICOS, 'hp-avisos-ocultos')
})

test('punto 12: si la API no guardó el cierre, se recuerda en el navegador salvo aviso retirado, «fuera de servicio» o «ver como»', () => {
  assert.equal(siNoSeGuardoElCierre('NETWORK_ERROR'), 'recordar')
  assert.equal(siNoSeGuardoElCierre('INTERNAL_ERROR'), 'recordar')
  // Una API sin la ruta responde 404 sin ese código: se recuerda en el navegador, como antes.
  assert.equal(siNoSeGuardoElCierre('NOT_FOUND'), 'recordar')
  assert.equal(siNoSeGuardoElCierre(undefined), 'recordar')
  assert.equal(siNoSeGuardoElCierre('AVISO_NO_ENCONTRADO'), 'olvidar')
  assert.equal(siNoSeGuardoElCierre('AVISO_NO_SE_CIERRA'), 'deshacer')
  assert.equal(siNoSeGuardoElCierre('SOLO_LECTURA'), 'deshacer')
})

test('podarOcultos deja solo los vigentes', () => {
  assert.deepEqual(podarOcultos({ a: 'x', viejo: 'y' }, [aviso({ id: 'a' })]), { a: 'x' })
})

test('hora de Colombia ida y vuelta', () => {
  assert.equal(bogotaLocalAIso('2026-11-24T18:30'), '2026-11-24T23:30:00.000Z')
  assert.equal(isoABogotaLocal('2026-11-24T23:30:00.000Z'), '2026-11-24T18:30')
  assert.equal(bogotaLocalAIso(''), null)
  assert.equal(isoABogotaLocal('basura'), '')
})

test('corchetes por llenar', () => {
  assert.equal(tieneCamposPorLlenar('El [día] a las [hora]'), true)
  assert.equal(tieneCamposPorLlenar('El sábado a las 10 p. m.'), false)
})

test('textoAudiencia', () => {
  assert.equal(textoAudiencia(['inmobiliaria']), 'inmobiliarias')
  assert.equal(textoAudiencia(['propietario', 'inmobiliaria']), 'inmobiliarias y propietarios')
  assert.equal(textoAudiencia(['inmobiliaria', 'propietario', 'prospecto']), 'inmobiliarias, propietarios y prospectos')
})

test('los textos sugeridos caben en los límites de la API', () => {
  for (const s of SERVICIOS_AVISO) {
    assert.ok(s.titulo.length <= LIMITE_TITULO, s.value)
    assert.ok(s.mensaje.length <= LIMITE_MENSAJE, s.value)
    assert.ok(!/\btú\b|\btu\b|\bte\b/i.test(s.mensaje), `${s.value} en usted`)
  }
})
