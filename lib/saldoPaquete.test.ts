/** Pruebas de lib/saldoPaquete (node:test). Correr con: npx --yes tsx@4 --test lib/saldoPaquete.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { saldoEnPaquete } from './saldoPaquete'

test('Adenda 6.1 §6: el saldo cubre el paquete completo', () => {
  assert.deepEqual(saldoEnPaquete(416_500, 500_000), { aplicaria: 416_500, porPagar: 0, cubre: true })
  assert.deepEqual(saldoEnPaquete(416_500, 416_500), { aplicaria: 416_500, porPagar: 0, cubre: true })
})

test('Adenda 6.1 §6: el saldo cubre una parte; lo demás se paga en Mercado Pago', () => {
  assert.deepEqual(saldoEnPaquete(416_500, 200_000), { aplicaria: 200_000, porPagar: 216_500, cubre: false })
})

test('sin saldo, o sin el total con IVA del paquete, no se muestra nada', () => {
  assert.equal(saldoEnPaquete(416_500, 0), null)
  assert.equal(saldoEnPaquete(416_500, null), null)
  assert.equal(saldoEnPaquete(undefined, 200_000), null)
  assert.equal(saldoEnPaquete(0, 200_000), null)
})
