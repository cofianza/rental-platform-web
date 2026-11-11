/**
 * Pruebas de lib/vigenciaReporte (node:test). Correr con: npx tsx --test lib/vigenciaReporte.test.ts
 *
 * A5D-03: los días que sirve el reporte de la central los manda la API (dias_vigencia_reporte); la web no escribe
 * la cifra. Sin el dato, solo la fecha, sin el paréntesis.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { vigenciaDesdeLaConsulta } from './vigenciaReporte'

test('con los días de la API: el paréntesis con esa cifra (con 30, el texto de hoy)', () => {
  assert.equal(vigenciaDesdeLaConsulta(30), ' (30 días desde la consulta)')
  assert.equal(vigenciaDesdeLaConsulta(20), ' (20 días desde la consulta)')
  assert.equal(vigenciaDesdeLaConsulta(1), ' (1 día desde la consulta)')
})

test('sin dato (API anterior, historial sin leer) o con un valor raro: nada', () => {
  assert.equal(vigenciaDesdeLaConsulta(undefined), '')
  assert.equal(vigenciaDesdeLaConsulta(null), '')
  assert.equal(vigenciaDesdeLaConsulta(0), '')
  assert.equal(vigenciaDesdeLaConsulta(-3), '')
  assert.equal(vigenciaDesdeLaConsulta(2.5), '')
  assert.equal(vigenciaDesdeLaConsulta(Number.NaN), '')
})
