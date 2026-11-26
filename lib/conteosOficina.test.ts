/** Reporte de la Oficina Virtual (25-nov), puntos 1 y 13 (node:test, como las demás pruebas de lib). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detalleAprobacion, textoAprobamos, textoEstudiosPeriodo, totalesDeAcciones, TEXTO_PERIODO } from './conteosOficina'
import type { IAprobacionOficina } from '@/types/oficinaVirtual'

const a = (o: Partial<IAprobacionOficina>): IAprobacionOficina => ({
  periodo: 'ultimos_30_dias',
  desde: '2026-10-27T15:00:00.000Z',
  hasta: '2026-11-26T15:00:00.000Z',
  aprobados: 15,
  con_segundo_firmante: 0,
  bloqueados: 0,
  rechazados: 12,
  decididos: 27,
  en_revision: 0,
  tasa: 55.56,
  de_cada_10: 6,
  ...o,
})

test('punto 13: «Aprobamos 6 de cada 10 estudios (últimos 30 días)»', () => {
  assert.equal(textoAprobamos(a({})), 'Aprobamos 6 de cada 10 estudios (últimos 30 días)')
  assert.equal(textoAprobamos(a({ aprobados: 5, rechazados: 3, decididos: 8, de_cada_10: 6 })), 'Aprobamos 6 de cada 10 estudios (últimos 30 días)')
  // Sin `de_cada_10` (no debería pasar), la misma cuenta entera.
  assert.equal(textoAprobamos(a({ aprobados: 7, rechazados: 13, decididos: 20, de_cada_10: null })), 'Aprobamos 4 de cada 10 estudios (últimos 30 días)')
})

test('punto 13: en los bordes no se redondea a algo que no es', () => {
  assert.equal(textoAprobamos(a({ aprobados: 1, rechazados: 29, decididos: 30, de_cada_10: 0 })), 'Aprobamos menos de 1 de cada 10 estudios (últimos 30 días)')
  assert.equal(textoAprobamos(a({ aprobados: 29, rechazados: 1, decididos: 30, de_cada_10: 10 })), 'Aprobamos más de 9 de cada 10 estudios (últimos 30 días)')
  assert.equal(textoAprobamos(a({ aprobados: 3, rechazados: 0, decididos: 3, de_cada_10: 10 })), 'Aprobamos todos los estudios decididos (últimos 30 días)')
  assert.equal(textoAprobamos(a({ aprobados: 0, rechazados: 4, decididos: 4, de_cada_10: 0 })), 'No aprobamos ninguno de los 4 estudios decididos (últimos 30 días)')
  assert.equal(textoAprobamos(a({ aprobados: 0, rechazados: 1, decididos: 1, de_cada_10: 0 })), 'No aprobamos el único estudio decidido (últimos 30 días)')
  // Sin decisiones en el periodo, un texto claro (nunca «0 de cada 10»).
  assert.equal(textoAprobamos(a({ aprobados: 0, rechazados: 0, decididos: 0, tasa: null, de_cada_10: null })), 'Todavía no hay estudios decididos (últimos 30 días)')
  assert.equal(textoAprobamos(null), null)
})

test('punto 13: el detalle al pasar el cursor o tocar', () => {
  assert.equal(
    detalleAprobacion(a({})),
    'Últimos 30 días, de 27 estudios decididos: 15 aprobados, 0 con segundo firmante y 12 no aprobables (55,6 %). Lo que todavía revisa Cofianza no cuenta hasta que se decide.',
  )
  // Sin el desglose del segundo firmante (la API no pudo clasificar), sin él.
  assert.match(detalleAprobacion(a({ con_segundo_firmante: undefined, bloqueados: undefined }))!, /: 15 aprobados y 12 no aprobables \(/)
  assert.match(detalleAprobacion(a({ bloqueados: 2, decididos: 29 }))!, /y 2 bloqueados por listas \(/)
  assert.equal(detalleAprobacion(a({ decididos: 0 })), null)
})

test('punto 1: el total de estudios con su periodo', () => {
  assert.equal(textoEstudiosPeriodo(39, 5), '39 estudios desde el inicio, 5 nuevos este mes')
  assert.equal(textoEstudiosPeriodo(1, 1), '1 estudio desde el inicio, 1 nuevo este mes')
  assert.equal(textoEstudiosPeriodo(1200, 0), '1.200 estudios desde el inicio, 0 nuevos este mes')
  assert.equal(textoEstudiosPeriodo(39, undefined), '39 estudios desde el inicio')
  assert.equal(textoEstudiosPeriodo(undefined, 5), null)
  assert.equal(TEXTO_PERIODO.ultimos_30_dias, 'últimos 30 días')
})

test('punto 1 y 11: el inicio dice el total de cada grupo (el de la API), no las 5 filas que muestra', () => {
  const filas = { porConfirmar: 5, porRealizar: 1, porHabilitar: 0, porGenerarContrato: 5, conTrabaContrato: 2 }
  const api = {
    periodo: 'ahora' as const,
    requieren_accion: 14,
    esperando_autorizacion: 1,
    citas_por_confirmar: 7,
    citas_por_realizar: 1,
    evaluaciones_por_habilitar: 0,
    contratos_por_generar: 11,
    aprobados_canon_excede: 4,
    aprobados_segundo_firmante: 1,
    aprobados_en_verificacion: 0,
    aprobados_con_traba: 5,
    resultado_vencido: 2,
  }
  assert.deepEqual(totalesDeAcciones(api, filas), {
    porConfirmar: 7,
    porRealizar: 1,
    porHabilitar: 0,
    porGenerarContrato: 11,
    conTrabaContrato: 5,
    esperandoAutorizacion: 1,
  })
  // Una API anterior: las filas que se ven, como antes.
  assert.deepEqual(totalesDeAcciones(null, filas), { ...filas, esperandoAutorizacion: null })
})
