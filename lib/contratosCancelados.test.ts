/** Reporte de la Oficina Virtual (25-nov), punto 7 (node:test, como las demás pruebas de lib). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { notaContratosCerrados } from './contratosCancelados'

test('punto 7: con cancelados o terminados se dice junto al contador, haya o no contratos activos', () => {
  assert.equal(notaContratosCerrados({ cancelados: 4, finalizados: 0 }), '(4 cancelados)')
  assert.equal(notaContratosCerrados({ cancelados: 1, finalizados: 0 }), '(1 cancelado)')
  assert.equal(notaContratosCerrados({ cancelados: 4, finalizados: 1 }), '(4 cancelados y 1 terminado)')
  assert.equal(notaContratosCerrados({ cancelados: 0, finalizados: 2 }), '(2 terminados)')
  assert.equal(notaContratosCerrados({ cancelados: 1234, finalizados: 0 }), '(1.234 cancelados)')
  assert.equal(notaContratosCerrados({ cancelados: 0, finalizados: 0 }), null)
})

test('punto 7: en un contador que no cuenta contratos («Inquilinos en cartera») se nombran', () => {
  assert.equal(notaContratosCerrados({ cancelados: 4, finalizados: 0 }, { conPalabraContratos: true }), '(4 contratos cancelados)')
  assert.equal(notaContratosCerrados({ cancelados: 1, finalizados: 2 }, { conPalabraContratos: true }), '(1 contrato cancelado y 2 terminados)')
  assert.equal(notaContratosCerrados({ cancelados: 0, finalizados: 1 }, { conPalabraContratos: true }), '(1 contrato terminado)')
})

test('una API anterior: sin cancelados, nada; sin terminados, solo los cancelados', () => {
  assert.equal(notaContratosCerrados(null), null)
  assert.equal(notaContratosCerrados({ cancelados: undefined, finalizados: 3 }), null)
  assert.equal(notaContratosCerrados({ cancelados: 4 }), '(4 cancelados)')
  assert.equal(notaContratosCerrados({ cancelados: Number.NaN, finalizados: 0 }), null)
})
