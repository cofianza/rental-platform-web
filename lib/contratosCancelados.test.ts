/** Adenda 6 §9 (node:test, como las demás pruebas de lib). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { notaContratosCancelados } from './contratosCancelados'

test('Adenda 6 §9: el cero se explica solo cuando todos los contratos están cancelados', () => {
  assert.equal(notaContratosCancelados(0, 4, 0), '(4 contratos cancelados)')
  assert.equal(notaContratosCancelados(0, 1, 0), '(1 contrato cancelado)')
  assert.equal(notaContratosCancelados(0, 1234, 0), '(1.234 contratos cancelados)')
  // Con un contrato en firma o terminado, la causa del cero es otra: no se dice.
  assert.equal(notaContratosCancelados(0, 4, 1), null)
  // Con contratos activos o sin cancelados, nada.
  assert.equal(notaContratosCancelados(2, 4, 2), null)
  assert.equal(notaContratosCancelados(0, 0, 0), null)
  // Una API anterior no manda los conteos.
  assert.equal(notaContratosCancelados(0, undefined, undefined), null)
  assert.equal(notaContratosCancelados(0, 4, undefined), null)
})
