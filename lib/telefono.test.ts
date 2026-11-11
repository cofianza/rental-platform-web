/**
 * Pruebas de lib/telefono (node:test). Correr con: npx tsx --test lib/telefono.test.ts
 * Mismos casos que el API: un fijo de Colombia no pasa como celular.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { noEsCelularColombiano } from './telefono'

test('un celular de Colombia, escrito de varias formas, es celular', () => {
  for (const t of ['+57 300 111 2233', '+573001112233', '3001112233', '573001112233', '0057 300 111 2233', '(300) 111-2233']) {
    assert.equal(noEsCelularColombiano(t), false, t)
  }
})

test('un fijo de Colombia no es celular', () => {
  for (const t of ['+57 601 555 1234', '6015551234', '576015551234', '0057 604 555 1234']) {
    assert.equal(noEsCelularColombiano(t), true, t)
  }
})

test('los de otros países y lo vacío no se juzgan', () => {
  for (const t of ['+1 305 555 0101', '+34 612 345 678', '', null, undefined]) {
    assert.equal(noEsCelularColombiano(t), false, String(t))
  }
})
