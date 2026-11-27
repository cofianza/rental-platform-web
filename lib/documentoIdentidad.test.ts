/**
 * Pruebas de lib/documentoIdentidad (node:test). Correr con: npx tsx --test lib/documentoIdentidad.test.ts
 * Números ficticios (repo público).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { documentoAlCambiarTipo, documentoAlEscribir, tecladoDocumento } from './documentoIdentidad'

test('cédula: lo que se pega con puntos, espacios o guiones queda en dígitos', () => {
  for (const escrito of ['1.234.567.890', ' 1 234 567 890 ', '1-234-567-890', "1'234.567.890", '1,234,567,890']) {
    assert.equal(documentoAlEscribir('cc', escrito), '1234567890', escrito)
  }
  // Una letra tecleada por error no entra.
  assert.equal(documentoAlEscribir('cc', '12345a'), '12345')
})

test('pasaporte y demás: sin espacios ni puntos, en mayúsculas, con sus letras', () => {
  assert.equal(documentoAlEscribir('pasaporte', 'ab 123.456'), 'AB123456')
  assert.equal(documentoAlEscribir('ce', '98-765 4'), '987654')
})

test('NIT: conserva el guion del dígito de verificación', () => {
  assert.equal(documentoAlEscribir('nit', '900.123.456-8'), '900123456-8')
})

test('teclado numérico salvo pasaporte y NIT', () => {
  assert.equal(tecladoDocumento('cc'), 'numeric')
  assert.equal(tecladoDocumento('ppt'), 'numeric')
  assert.equal(tecladoDocumento('pasaporte'), 'text')
  assert.equal(tecladoDocumento('nit'), 'text')
  assert.equal(tecladoDocumento(undefined), 'numeric')
})

test('al cambiar el tipo, el número se vuelve a limpiar', () => {
  assert.equal(documentoAlCambiarTipo('pasaporte', 'cc', 'AB123456'), '123456')
  // De NIT a cédula el dígito de verificación no queda pegado.
  assert.equal(documentoAlCambiarTipo('nit', 'cc', '900123456-8'), '900123456')
  assert.equal(documentoAlCambiarTipo('cc', 'pasaporte', '1234567890'), '1234567890')
})
