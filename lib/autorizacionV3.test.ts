/**
 * Pruebas de lib/autorizacionV3 (node:test). Correr con: npx tsx --test lib/autorizacionV3.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { versionVisible } from './autorizacionV3'

test('la V3 se muestra como «3», como dice el texto; las demás versiones, tal cual', () => {
  assert.equal(versionVisible('V3'), '3')
  assert.equal(versionVisible('V3-coarrendatario'), '3')
  assert.equal(versionVisible('3.2-biometria'), '3.2-biometria')
  assert.equal(versionVisible(undefined), '')
})
