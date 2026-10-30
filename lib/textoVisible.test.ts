/**
 * Pruebas de la condición de coarrendatario en components/expedientes/textoVisible
 * (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/textoVisible.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MENSAJE_COARRENDATARIO_OBLIGATORIO,
  MENSAJE_ESTA_CERCA,
  MENSAJE_ESTA_CERCA_DECIDE_ANALISTA,
  mensajeCondicionCoarrendatario,
  motivoCoarrendatario,
  seCierraSiVence,
  textoCondicionCoarrendatario,
} from '../components/expedientes/textoVisible'

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

test('mensajeCondicionCoarrendatario: el literal del §6.9 solo sin obligatoria ni R2 (Adenda 4 R3)', () => {
  assert.equal(mensajeCondicionCoarrendatario({}), MENSAJE_ESTA_CERCA)
  assert.equal(mensajeCondicionCoarrendatario({ obligatoria: true }), MENSAJE_COARRENDATARIO_OBLIGATORIO)
  assert.equal(mensajeCondicionCoarrendatario({ obligatoria: true, decide_analista: true }), MENSAJE_COARRENDATARIO_OBLIGATORIO)
  const r2 = mensajeCondicionCoarrendatario({ decide_analista: true })
  assert.equal(r2, MENSAJE_ESTA_CERCA_DECIDE_ANALISTA)
  assert.doesNotMatch(r2, /segundos/)
  assert.match(r2, /un analista de Cofianza decide su estudio/)
})

test('al coarrendatario su motivo dice «No califica», no «Rechazo automático»', () => {
  assert.equal(motivoCoarrendatario('Rechazo automático: no cumple una condición.'), 'No califica: no cumple una condición.')
  assert.equal(motivoCoarrendatario('Otro motivo.'), 'Otro motivo.')
  assert.equal(motivoCoarrendatario('Mínimo 450; se rechaza sin calcular.'), 'Mínimo 450; se decide sin calcular.')
})
