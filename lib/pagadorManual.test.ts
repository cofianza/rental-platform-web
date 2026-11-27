/** Pruebas de lib/pagadorManual (node:test). Correr con: npx --yes tsx@4 --test lib/pagadorManual.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONCEPTOS_CON_PAGADOR, correoValido, textoPagadorManual } from './pagadorManual'

test('el detalle dice quién hizo el pago, con el nombre si lo hay', () => {
  assert.equal(textoPagadorManual({ tipo: 'inmobiliaria', nombre: 'Inmobiliaria Ejemplo', email: null }), 'La inmobiliaria del estudio (Inmobiliaria Ejemplo)')
  assert.equal(textoPagadorManual({ tipo: 'propietario', nombre: null, email: null }), 'El propietario del inmueble')
  assert.equal(textoPagadorManual({ tipo: 'persona', nombre: 'Ana Ruiz', email: 'ana@correo.test' }), 'Ana Ruiz (ana@correo.test)')
  assert.equal(textoPagadorManual({ tipo: 'no_se_sabe', nombre: null, email: null }), 'Sin identificar en el comprobante')
  assert.equal(textoPagadorManual(null), null)
  assert.equal(textoPagadorManual(undefined), null)
})

test('solo el pago del estudio pide quién lo hizo; el correo de la persona se revisa', () => {
  assert.equal(CONCEPTOS_CON_PAGADOR.has('estudio'), true)
  assert.equal(CONCEPTOS_CON_PAGADOR.has('garantia'), false)
  assert.equal(correoValido('ana@correo.test'), true)
  assert.equal(correoValido('ana@correo'), false)
  assert.equal(correoValido(' '), false)
})
