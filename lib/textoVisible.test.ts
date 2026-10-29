/**
 * Pruebas de la condición de coarrendatario en components/expedientes/textoVisible
 * (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/textoVisible.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seCierraSiVence, textoCondicionCoarrendatario } from '../components/expedientes/textoVisible'

const base = { vence_en: '2026-11-03T15:00:00.000Z', vencida: false, ingreso_adicional_requerido: null, reglas_ingreso: [] as string[] }

test('seCierraSiVence: obligatoria o reglas de ingreso; solo por puntaje, revisión', () => {
  assert.equal(seCierraSiVence(base), false)
  assert.equal(seCierraSiVence({ ...base, reglas_ingreso: ['dti_mayor_65'] }), true)
  assert.equal(seCierraSiVence({ ...base, obligatoria: true }), true)
})

test('obligatoria: no dice «aprobado con condición»; el prospecto y el gestor con su texto', () => {
  const c = { ...base, obligatoria: true }
  assert.equal(textoCondicionCoarrendatario(c, { prospecto: true }), 'Para continuar, su estudio necesita un coarrendatario antes del 03/11/2026.')
  const gestor = textoCondicionCoarrendatario(c)
  assert.match(gestor, /^Sin un coarrendatario que califique antes del 03\/11\/2026, el estudio se cierra como no aprobado\./)
  assert.doesNotMatch(gestor, /aprobado con condición/)
  // Sin obligatoria, igual que antes.
  assert.equal(textoCondicionCoarrendatario(base), 'Está cerca: aprobado con condición de presentar un coarrendatario antes del 03/11/2026.')
})

test('vencida: con obligatoria se cierra; solo por puntaje, revisión', () => {
  assert.match(textoCondicionCoarrendatario({ ...base, vencida: true, obligatoria: true }), /se cerrará como no aprobado/)
  assert.match(textoCondicionCoarrendatario({ ...base, vencida: true }), /revisión de un analista/)
})
