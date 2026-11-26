/**
 * Pruebas de lib/autorizacionV3 (node:test). Correr con: npx tsx --test lib/autorizacionV3.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { esTextoV3, versionVisible } from './autorizacionV3'

test('la V3.1 se muestra como «3.1», como dice el texto; las demás versiones, tal cual', () => {
  assert.equal(versionVisible('V3.1'), '3.1')
  assert.equal(versionVisible('V3.1-coarrendatario'), '3.1')
  assert.equal(versionVisible('3.2-biometria'), '3.2-biometria')
  assert.equal(versionVisible(undefined), '')
})

test('esTextoV3: solo la V3.1 (la V3 nunca se publicó y las 3.x son otros textos)', () => {
  assert.equal(esTextoV3('V3.1'), true)
  assert.equal(esTextoV3('V3.1-coarrendatario'), true)
  for (const v of ['V3', 'V3-coarrendatario', '3.1-biometria', '3.2', null, undefined]) assert.equal(esTextoV3(v), false)
})
