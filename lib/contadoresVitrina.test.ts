/** Pruebas de lib/contadoresVitrina (node:test). Correr con: npx --yes tsx@4 --test lib/contadoresVitrina.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contadoresVitrina, notaTotalVitrina } from './contadoresVitrina'

test('punto 14: Total = En vitrina + Pausadas + Arrendadas (el caso del reporte: 32 = 27 + 5 + 0)', () => {
  const c = contadoresVitrina({ total: 32, enVitrina: 27, disponibles: 32, arrendadas: 0 })
  assert.deepEqual(c, { total: 32, enVitrina: 27, pausadas: 5, arrendadas: 0, otras: 0 })
  assert.equal(c.enVitrina + c.pausadas + c.arrendadas, c.total)
  assert.equal(notaTotalVitrina(c), 'En vitrina + pausadas + arrendadas')
})

test('punto 14: con arrendadas, también suman', () => {
  const c = contadoresVitrina({ total: 40, enVitrina: 20, disponibles: 25, arrendadas: 15 })
  assert.deepEqual(c, { total: 40, enVitrina: 20, pausadas: 5, arrendadas: 15, otras: 0 })
})

test('punto 14: una fila histórica en estudio se nombra en la nota, para que la suma cuadre', () => {
  const c = contadoresVitrina({ total: 10, enVitrina: 4, disponibles: 6, arrendadas: 3 })
  assert.equal(c.otras, 1)
  assert.equal(notaTotalVitrina(c), 'En vitrina + pausadas + arrendadas + 1 en estudio')
  // Nunca negativos (p. ej. si un conteo cambió entre dos consultas).
  assert.deepEqual(contadoresVitrina({ total: 3, enVitrina: 4, disponibles: 3, arrendadas: 1 }), { total: 3, enVitrina: 4, pausadas: 0, arrendadas: 1, otras: 0 })
})
