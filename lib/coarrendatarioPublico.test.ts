/**
 * Pruebas de lib/coarrendatarioPublico (node:test). Correr con: npx tsx --test lib/coarrendatarioPublico.test.ts
 *
 * WEB-04: el enlace de un segundo firmante que ya salió del estudio no muestra el formulario de autorizar.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { esInvitacionRetirada, faseInicialInvitacion, TEXTO_YA_NO_HACE_PARTE } from './coarrendatarioPublico'

test('la API responde 410 COARRENDATARIO_RETIRADO: es la invitación de alguien que ya salió', () => {
  assert.equal(esInvitacionRetirada({ statusCode: 410, code: 'COARRENDATARIO_RETIRADO' }), true)
  assert.equal(esInvitacionRetirada({ statusCode: 404, code: 'COARRENDATARIO_NOT_FOUND' }), false)
  assert.equal(esInvitacionRetirada({ statusCode: 410, code: 'OTRO' }), false)
  assert.equal(esInvitacionRetirada(new Error('x')), false)
  assert.equal(esInvitacionRetirada(null), false)
})

test('la fase con que abre el enlace según el estado de la invitación', () => {
  assert.equal(faseInicialInvitacion('pendiente_aceptacion'), 'lista')
  assert.equal(faseInicialInvitacion('aceptado'), 'aceptado')
  assert.equal(faseInicialInvitacion('estudio_completado'), 'aceptado')
  assert.equal(faseInicialInvitacion('rechazado_invitacion'), 'rechazado')
  // Nunca el formulario para quien ya salió (aunque una API la mande con ese estado).
  assert.equal(faseInicialInvitacion('retirado'), 'retirado')
})

test('el texto final: en usted, sin culpa ni motivo, y que no tiene que hacer nada', () => {
  assert.equal(TEXTO_YA_NO_HACE_PARTE, 'Ya no hace parte de este estudio. No tiene que hacer nada.')
  assert.doesNotMatch(TEXTO_YA_NO_HACE_PARTE, /lista|rechaz|motivo|culpa|retir/i)
})
