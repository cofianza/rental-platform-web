/**
 * Pruebas de lib/paginacion (node:test). Correr con: npx tsx --test lib/paginacion.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { leerPaginacion } from './paginacion'

test('lee `meta` (formato de la API)', () => {
  assert.deepEqual(leerPaginacion({ data: [], meta: { total: 37, page: 2, limit: 10, totalPages: 4 } }, 10), {
    total: 37, page: 2, limit: 10, totalPages: 4,
  })
})

test('lee `pagination` (controladores viejos) si no hay `meta`', () => {
  assert.equal(leerPaginacion({ data: [], pagination: { total: 250, page: 1, limit: 100, totalPages: 3 } }, 50).total, 250)
})

test('números que llegan como texto se convierten', () => {
  assert.deepEqual(leerPaginacion({ meta: { total: '12', page: '1', limit: '10' } as never }, 10), {
    total: 12, page: 1, limit: 10, totalPages: 2,
  })
})

test('sin paginación: valores por defecto, total 0', () => {
  assert.deepEqual(leerPaginacion({ data: [] }, 50), { total: 0, page: 1, limit: 50, totalPages: 0 })
  assert.deepEqual(leerPaginacion(null, 10), { total: 0, page: 1, limit: 10, totalPages: 0 })
})
