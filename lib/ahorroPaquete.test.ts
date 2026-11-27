/** Pruebas de lib/ahorroPaquete (node:test). Correr con: npx --yes tsx@4 --test lib/ahorroPaquete.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ahorroPaquete, condicionesCompraPaquete, textoAhorro } from './ahorroPaquete'

test('punto 6: el ahorro se mide contra el estudio individual de $80.000 (12,5 / 20 / 30 %), también el de 5', () => {
  assert.equal(ahorroPaquete({ cantidad_estudios: 5, precio_cop: 350_000 }, 80_000), 12.5)
  assert.equal(ahorroPaquete({ cantidad_estudios: 10, precio_cop: 640_000 }, 80_000), 20)
  assert.equal(ahorroPaquete({ cantidad_estudios: 25, precio_cop: 1_400_000 }, 80_000), 30)
  assert.equal(textoAhorro(12.5), 'Ahorro 12,5 %')
  assert.equal(textoAhorro(20), 'Ahorro 20 %')
})

test('punto 6: el precio individual lo dice la API (panel); sin él, o sin ahorro, no se muestra', () => {
  assert.equal(ahorroPaquete({ cantidad_estudios: 5, precio_cop: 350_000 }, 90_000), 22.2)
  assert.equal(ahorroPaquete({ cantidad_estudios: 5, precio_cop: 350_000 }, undefined), null)
  assert.equal(ahorroPaquete({ cantidad_estudios: 5, precio_cop: 350_000 }, null), null)
  assert.equal(ahorroPaquete({ cantidad_estudios: 5, precio_cop: 400_000 }, 80_000), null)
  assert.equal(ahorroPaquete({ cantidad_estudios: 5, precio_cop: 450_000 }, 80_000), null)
  assert.equal(ahorroPaquete({ cantidad_estudios: 0, precio_cop: 350_000 }, 80_000), null)
})

test('punto 6: antes de pagar, la vigencia (la de la API) y que los cupos no usados no se reembolsan', () => {
  assert.deepEqual(condicionesCompraPaquete(6), [
    'Cada paquete vence 6 meses después del pago: los cupos que no use antes de esa fecha se extinguen.',
    'Los cupos no usados no se reembolsan ni se abonan a otro concepto.',
  ])
  assert.match(condicionesCompraPaquete(1)[0], /vence 1 mes después/)
  assert.match(condicionesCompraPaquete(undefined)[0], /^Cada paquete tiene una vigencia que cuenta desde el pago:/)
})
