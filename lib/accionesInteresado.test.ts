/** Pruebas de lib/accionesInteresado (node:test). Correr con: npx --yes tsx@4 --test lib/accionesInteresado.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accionesInteresado } from './accionesInteresado'

test('punto 5: un interesado descartado solo muestra «Reabrir»', () => {
  assert.deepEqual(accionesInteresado('descartado'), { crearEstudio: false, contactado: false, descartar: false, reabrir: true })
})

test('punto 5: activo, «Crear estudio» y «Descartar»; «Contactado» solo mientras sigue nuevo', () => {
  assert.deepEqual(accionesInteresado('nuevo'), { crearEstudio: true, contactado: true, descartar: true, reabrir: false })
  assert.deepEqual(accionesInteresado('contactado'), { crearEstudio: true, contactado: false, descartar: true, reabrir: false })
})
