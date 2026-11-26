/**
 * Pruebas de lib/habitara (node:test). Correr con: npx tsx --test lib/habitara.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HABITARA_OPCIONES, HABITARA_POR_DEFECTO, textoHabitara } from './habitara'

test('Adenda 6 §8: tres opciones y la de por defecto es «No lo indicó»', () => {
  assert.deepEqual(
    HABITARA_OPCIONES.map((o) => o.valor),
    ['si', 'no', 'no_indicado'],
  )
  assert.equal(HABITARA_POR_DEFECTO, 'no_indicado')
})

test('quien tramita ve Sí, No o No lo indicó', () => {
  assert.equal(textoHabitara(true), 'Sí')
  assert.equal(textoHabitara(false), 'No')
  assert.equal(textoHabitara(null), 'No lo indicó')
  // Una API anterior no manda el dato: tampoco se inventa un «No».
  assert.equal(textoHabitara(undefined), 'No lo indicó')
})
