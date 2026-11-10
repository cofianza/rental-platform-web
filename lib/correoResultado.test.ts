/**
 * Pruebas de lib/correoResultado (node:test). Correr con: npx tsx --test lib/correoResultado.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { correoResultadoValido, correoParaEnviar } from './correoResultado'

test('correoResultadoValido: formato básico de un correo', () => {
  assert.equal(correoResultadoValido('persona@correo.example'), true)
  assert.equal(correoResultadoValido('  persona@correo.example  '), true)
  assert.equal(correoResultadoValido(''), false)
  assert.equal(correoResultadoValido('persona@'), false)
  assert.equal(correoResultadoValido('persona correo@x.co'), false)
  assert.equal(correoResultadoValido('sin-arroba.example'), false)
  assert.equal(correoResultadoValido(`${'a'.repeat(250)}@x.co`), false)
  // Igual que la validación de la API: sin tildes, sin puntos seguidos y con un dominio de al menos dos letras.
  assert.equal(correoResultadoValido('a@b.c'), false)
  assert.equal(correoResultadoValido('ana..p@correo.example'), false)
  assert.equal(correoResultadoValido('josé@correo.example'), false)
  assert.equal(correoResultadoValido('ana.p+casa@correo.example'), true)
})

test('correoParaEnviar: solo cuando la pantalla lo pide, y recortado', () => {
  assert.deepEqual(correoParaEnviar(false, 'persona@correo.example'), {})
  assert.deepEqual(correoParaEnviar(undefined, 'persona@correo.example'), {})
  assert.deepEqual(correoParaEnviar(true, '  persona@correo.example '), { correo_resultado: 'persona@correo.example' })
})
