/**
 * Pruebas de lib/frenosSegundoFirmante (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/frenosSegundoFirmante.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FRENOS_DEL_SEGUNDO_FIRMANTE, SEGUNDO_FIRMANTE_EN_CURSO, avisoPrimaDeTraba, bloqueoOfreceSeguirSinEl, trabaAdmiteSeguirSinEl } from './frenosSegundoFirmante'

test('la traba del segundo firmante que ya aceptó admite «Seguir sin él»', () => {
  assert.equal(trabaAdmiteSeguirSinEl({ codigo: 'coarrendatario_en_evaluacion' }), true)
  assert.equal(trabaAdmiteSeguirSinEl({ codigo: 'coarrendatario_en_verificacion' }), true)
  // La invitación sin responder tiene su propio botón (cancela la invitación).
  assert.equal(trabaAdmiteSeguirSinEl({ codigo: 'coarrendatario_pendiente' }), false)
  assert.equal(trabaAdmiteSeguirSinEl({ codigo: 'canon_excede' }), false)
  assert.equal(trabaAdmiteSeguirSinEl(null), false)
})

test('«Seguir sin él» en un bloqueo: solo si la API lo dice (puede_seguir_sin_el), nunca por su texto', () => {
  const b = (codigo: string, extra: { puede_seguir_sin_el?: boolean } = {}) => ({ codigo, mensaje: 'Texto de la API.', ...extra })
  assert.equal(bloqueoOfreceSeguirSinEl(b('COARRENDATARIO_EN_VERIFICACION', { puede_seguir_sin_el: true })), true)
  assert.equal(bloqueoOfreceSeguirSinEl(b('COARRENDATARIO_SIN_EVALUAR', { puede_seguir_sin_el: true })), true)
  // Sin el campo (una API anterior, o la Adenda 5 apagada): sin botón, aunque el mensaje hable de seguir sin él.
  const soloTexto: { codigo: string; mensaje: string; puede_seguir_sin_el?: boolean } = { codigo: 'COARRENDATARIO_SIN_EVALUAR', mensaje: 'Espere el resultado o siga sin él.' }
  assert.equal(bloqueoOfreceSeguirSinEl(soloTexto), false)
  assert.equal(bloqueoOfreceSeguirSinEl(b('COARRENDATARIO_EN_VERIFICACION')), false)
  assert.equal(bloqueoOfreceSeguirSinEl(b('COARRENDATARIO_SIN_EVALUAR', { puede_seguir_sin_el: false })), false)
  // La invitación sin responder tiene su propio botón, y los demás bloqueos no tienen esta salida.
  assert.equal(bloqueoOfreceSeguirSinEl(b('COARRENDATARIO_PENDIENTE', { puede_seguir_sin_el: true })), false)
  assert.equal(bloqueoOfreceSeguirSinEl(b('TITULAR_NO_DISPONIBLE', { puede_seguir_sin_el: true })), false)
  assert.deepEqual(SEGUNDO_FIRMANTE_EN_CURSO, ['COARRENDATARIO_SIN_EVALUAR', 'COARRENDATARIO_EN_VERIFICACION'])
  // Los tres frenan también el contrato anterior (409 al generar): quedan como aviso fijo, no en un toast.
  assert.deepEqual(FRENOS_DEL_SEGUNDO_FIRMANTE, ['COARRENDATARIO_PENDIENTE', 'COARRENDATARIO_SIN_EVALUAR', 'COARRENDATARIO_EN_VERIFICACION'])
})

test('aviso de la prima: en cualquiera de las trabas del segundo firmante, nunca en las demás', () => {
  const traba = (codigo: string) => ({ codigo, texto: 'Texto de la API.', aviso_prima: 'Aviso de la prima.' })
  for (const codigo of ['coarrendatario_pendiente', 'coarrendatario_en_evaluacion', 'coarrendatario_en_verificacion']) {
    assert.equal(avisoPrimaDeTraba(traba(codigo)), 'Aviso de la prima.')
  }
  assert.equal(avisoPrimaDeTraba(traba('canon_excede')), undefined)
  assert.equal(avisoPrimaDeTraba({ codigo: 'coarrendatario_en_evaluacion', texto: 'Texto de la API.' }), undefined)
  assert.equal(avisoPrimaDeTraba(null), undefined)
})
