/**
 * Pruebas de lib/cotejoFirma (node:test). Correr con: npx tsx --test lib/cotejoFirma.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { consejosCotejo, pasoInicialCotejo, textoAvanceCotejo, textoIntentosRestantes, textoResultadoCotejo } from './cotejoFirma'

test('caso 7: sin la 4A marcada al autorizar, la página abre en la casilla; con ella, en las fotos; terminado, el resultado', () => {
  assert.equal(pasoInicialCotejo({ completada: false, cotejo: { requiere_4a: true } }), 'consentimiento_4a')
  assert.equal(pasoInicialCotejo({ completada: false, cotejo: { requiere_4a: false } }), 'fotos')
  assert.equal(pasoInicialCotejo({ completada: true, cotejo: { requiere_4a: true } }), 'listo')
})

test('los intentos que le quedan, en singular y plural', () => {
  assert.equal(textoIntentosRestantes(1), 'Le queda 1 intento.')
  assert.equal(textoIntentosRestantes(3), 'Le quedan 3 intentos.')
  assert.equal(textoIntentosRestantes(-1), 'Le quedan 0 intentos.')
})

test('el avance para quien tramita no dice el resultado de nadie', () => {
  assert.equal(textoAvanceCotejo({ total: 2, aprobados: 1 }), 'Cotejo de identidad: 1 de 2')
  assert.doesNotMatch(textoAvanceCotejo({ total: 2, aprobados: 0 }), /falló|no coincide|rechaz/i)
})

test('los consejos hablan de luz y reflejos (6.1 §3) y nombran el documento', () => {
  const c = consejosCotejo('cédula de ciudadanía').join(' ')
  assert.match(c, /reflejos/)
  assert.match(c, /luz/)
  assert.match(c, /cédula de ciudadanía/)
})

test('al terminar: aprobado = firma digital por WhatsApp; si no, notaría a su costo, en usted', () => {
  assert.match(textoResultadoCotejo('aprobado').texto, /WhatsApp/)
  assert.match(textoResultadoCotejo('notaria').texto, /notaría, a su costo/)
  assert.doesNotMatch(textoResultadoCotejo('notaria').texto, /\btú\b|\btu\b/)
})
