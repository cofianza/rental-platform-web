/**
 * Pruebas de lib/vigenciaReporte (node:test). Correr con: npx tsx --test lib/vigenciaReporte.test.ts
 *
 * A5D-03: los días que sirve el reporte de la central los manda la API (dias_vigencia_reporte); con la Adenda 5 son
 * los del panel. A5D03-SIN-HISTORIAL / A5D03-ORDEN-DESPLIEGUE (revisión 2026-11-10): sin el dato (historial que no se
 * pudo leer, o una API anterior si la web se publica primero) queda el texto de siempre, el de la Política (30 días):
 * con la adenda apagada ninguna pantalla cambia.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { vigenciaDesdeLaConsulta } from './vigenciaReporte'

test('con los días de la API: el paréntesis con esa cifra (con 30, el texto de hoy)', () => {
  assert.equal(vigenciaDesdeLaConsulta(30), ' (30 días desde la consulta)')
  assert.equal(vigenciaDesdeLaConsulta(20), ' (20 días desde la consulta)')
  assert.equal(vigenciaDesdeLaConsulta(1), ' (1 día desde la consulta)')
})

test('sin dato (historial sin leer, API anterior) o con un valor raro: el texto de siempre', () => {
  for (const v of [undefined, null, 0, -3, 2.5, Number.NaN]) {
    assert.equal(vigenciaDesdeLaConsulta(v), ' (30 días desde la consulta)')
  }
})
