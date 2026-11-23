/**
 * Pruebas de lib/bandejaCofianza (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/bandejaCofianza.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { corregirFiltroDeBandeja, estudioFiltroDeBandeja, revisionCofianzaDisponible } from './bandejaCofianza'

test('la bandeja «En revisión de Cofianza» solo con el conteo de la API', () => {
  assert.equal(revisionCofianzaDisponible({ revision_cofianza: 4 }), true)
  assert.equal(revisionCofianzaDisponible({ revision_cofianza: 0 }), true)
  // null (la API no lo sabe), ausente (API anterior) o sin contadores: «Condicionados», como antes.
  assert.equal(revisionCofianzaDisponible({ revision_cofianza: null }), false)
  assert.equal(revisionCofianzaDisponible({}), false)
  assert.equal(revisionCofianzaDisponible(null), false)
})

test('el chip con que se pide cada bandeja', () => {
  assert.equal(estudioFiltroDeBandeja('condicionado', { revision_cofianza: 4 }), 'revision_cofianza')
  assert.equal(estudioFiltroDeBandeja('condicionado', { revision_cofianza: null }), 'todos')
  assert.equal(estudioFiltroDeBandeja('aprobado', { revision_cofianza: 4 }), 'todos')
  assert.equal(estudioFiltroDeBandeja(null, { revision_cofianza: 4 }), 'todos')
})

test('con la bandeja del condicionado elegida, el chip sigue lo que sabe la API', () => {
  // Llegan los contadores (o la URL traía solo el estado): se pide con el chip.
  assert.equal(corregirFiltroDeBandeja('condicionado', { revision_cofianza: 4 }, 'todos'), 'revision_cofianza')
  assert.equal(corregirFiltroDeBandeja('condicionado', { revision_cofianza: 4 }, undefined), 'revision_cofianza')
  // La API no lo sabe: todo el estado condicionado, sin el chip.
  assert.equal(corregirFiltroDeBandeja('condicionado', { revision_cofianza: null }, 'revision_cofianza'), 'todos')
  // Ya está bien, otra bandeja, sin contadores o «Turno del gestor»: nada que corregir.
  assert.equal(corregirFiltroDeBandeja('condicionado', { revision_cofianza: 4 }, 'revision_cofianza'), null)
  assert.equal(corregirFiltroDeBandeja('aprobado', { revision_cofianza: 4 }, 'todos'), null)
  assert.equal(corregirFiltroDeBandeja('condicionado', null, 'todos'), null)
  assert.equal(corregirFiltroDeBandeja('condicionado', { revision_cofianza: 4 }, 'requiere_accion'), null)
})
