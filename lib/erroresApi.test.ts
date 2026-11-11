/**
 * Pruebas de lib/erroresApi (node:test). Correr con: npx tsx --test lib/erroresApi.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { leerErrorDeFormulario } from './erroresApi'

// Forma de ApiClientError (lib/api.ts): code, message y details sin `.response`.
const apiError = (code: string, message: string, details?: Array<{ field: string; message: string }>) =>
  Object.assign(new Error(message), { name: 'ApiClientError', statusCode: 400, code, details })

test('un 400 de validación se lee por campo (antes caía en el aviso genérico)', () => {
  const r = leerErrorDeFormulario(apiError('VALIDATION_ERROR', 'Datos inválidos', [{ field: 'piso', message: 'Piso muy largo' }]), ['piso', 'barrio'])
  assert.deepEqual(r.porCampo, { piso: 'Piso muy largo' })
  assert.equal(r.mensaje, 'Piso muy largo')
  assert.equal(r.code, 'VALIDATION_ERROR')
})

test('un campo que el formulario no tiene no se mapea, pero sí sale en el aviso', () => {
  const r = leerErrorDeFormulario(apiError('VALIDATION_ERROR', 'x', [{ field: 'latitud', message: 'Latitud inválida' }]), ['piso'])
  assert.deepEqual(r.porCampo, {})
  assert.equal(r.mensaje, 'Latitud inválida')
})

test('sin detalles se muestra el mensaje de la API', () => {
  const r = leerErrorDeFormulario(apiError('CODIGO_DUPLICADO', 'Ese código ya está en uso'), ['codigo'])
  assert.equal(r.mensaje, 'Ese código ya está en uso')
  assert.equal(r.code, 'CODIGO_DUPLICADO')
})

test('un error sin forma conocida no revienta', () => {
  assert.deepEqual(leerErrorDeFormulario(undefined, []), { code: undefined, mensaje: null, porCampo: {} })
})
