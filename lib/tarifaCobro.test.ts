/**
 * Pruebas de lib/tarifaCobro (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/tarifaCobro.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accionesDeCuenta, accionesDeLinea, aniversarioPorConfirmar, contarCuentas } from './tarifaCobro'
import type { ICuentaCobro } from '../types/tarifaCobro'

test('contarCuentas cuenta por situación y las de nota crédito', () => {
  const r = contarCuentas([
    { situacion: 'vencida', nota_credito_pendiente: true },
    { situacion: 'vencida', nota_credito_pendiente: false },
    { situacion: 'borrador', nota_credito_pendiente: false },
  ])
  assert.equal(r.porSituacion.vencida, 2)
  assert.equal(r.porSituacion.borrador, 1)
  assert.equal(r.porSituacion.pagada, 0)
  assert.equal(r.notaCredito, 1)
})

test('accionesDeCuenta: emitir y reintentar solo el administrador; pagar con saldo', () => {
  const hoy = '2026-11-18'
  const c = (estado: ICuentaCobro['estado'], saldo_cop: number | null, periodo = '2026-11-01') => ({ estado, saldo_cop, periodo })
  assert.deepEqual(accionesDeCuenta(c('borrador', null), 'administrador', hoy), { emitir: true, reintentar: false, pagar: false })
  assert.deepEqual(accionesDeCuenta(c('borrador', null), 'operador_analista', hoy), { emitir: false, reintentar: false, pagar: false })
  assert.equal(accionesDeCuenta(c('emitiendo', null), 'administrador', hoy).reintentar, true)
  assert.equal(accionesDeCuenta(c('emitida', 1000), 'operador_analista', hoy).pagar, true)
  assert.equal(accionesDeCuenta(c('emitida', 0), 'administrador', hoy).pagar, false)
  assert.equal(accionesDeCuenta(c('bloqueada_fiscal', null), 'administrador', hoy).emitir, false)
  assert.equal(accionesDeCuenta(c('emitida', 1000), 'inmobiliaria', hoy).pagar, false)
})

test('accionesDeCuenta: la cuenta de diciembre (línea tardía) no se emite antes de su corte, el 30-nov', () => {
  const dic = { estado: 'borrador' as const, saldo_cop: null, periodo: '2026-12-01' }
  assert.equal(accionesDeCuenta(dic, 'administrador', '2026-11-18').emitir, false)
  assert.equal(accionesDeCuenta(dic, 'administrador', '2026-11-30').emitir, true)
})

test('accionesDeLinea: no recaudada se puede pagar; pagada o anulada no; nada mientras se emite', () => {
  const t = 'tradicional'
  assert.deepEqual(accionesDeLinea({ estado: 'no_recaudada', modalidad: t }, 'emitida', 'operador_analista'), { pagar: true, anular: false, noRecaudada: false })
  assert.deepEqual(accionesDeLinea({ estado: 'pendiente', modalidad: t }, 'emitida', 'administrador', true), { pagar: true, anular: true, noRecaudada: false })
  assert.deepEqual(accionesDeLinea({ estado: 'pagada', modalidad: t }, 'emitida', 'administrador', true), { pagar: false, anular: false, noRecaudada: false })
  assert.deepEqual(accionesDeLinea({ estado: 'pendiente', modalidad: t }, 'borrador', 'administrador', true), { pagar: false, anular: true, noRecaudada: false })
  assert.deepEqual(accionesDeLinea({ estado: 'pendiente', modalidad: t }, 'emitiendo', 'administrador', true), { pagar: false, anular: false, noRecaudada: false })
})

test('accionesDeLinea: «Anular» solo para la Gerencia General, no para cualquier administrador', () => {
  const l = { estado: 'pendiente' as const, modalidad: 'tradicional' }
  assert.equal(accionesDeLinea(l, 'emitida', 'administrador').anular, false)
  assert.equal(accionesDeLinea(l, 'emitida', 'administrador', true).anular, true)
})

test('accionesDeLinea: no recaudada solo el titular, en Trasladada pendiente de una cuenta emitida', () => {
  assert.deepEqual(accionesDeLinea({ estado: 'pendiente', modalidad: 'trasladada' }, 'emitida', 'inmobiliaria'), { pagar: false, anular: false, noRecaudada: true })
  assert.equal(accionesDeLinea({ estado: 'pendiente', modalidad: 'tradicional' }, 'emitida', 'inmobiliaria').noRecaudada, false)
  assert.equal(accionesDeLinea({ estado: 'no_recaudada', modalidad: 'trasladada' }, 'emitida', 'inmobiliaria').noRecaudada, false)
  assert.equal(accionesDeLinea({ estado: 'pendiente', modalidad: 'trasladada' }, 'borrador', 'inmobiliaria').noRecaudada, false)
  assert.equal(accionesDeLinea({ estado: 'pendiente', modalidad: 'trasladada' }, 'emitida', 'administrador').noRecaudada, false)
})

test('aniversarioPorConfirmar: solo dentro de los 30 días previos', () => {
  assert.equal(aniversarioPorConfirmar('2025-11-05', '2026-10-07'), '2026-11-05')
  assert.equal(aniversarioPorConfirmar('2025-11-07', '2026-10-07'), null) // 31 días
  assert.equal(aniversarioPorConfirmar('2025-10-07', '2026-10-07'), '2026-10-07') // hoy
  assert.equal(aniversarioPorConfirmar('2026-09-01', '2026-10-07'), null) // primer año: falta mucho
  assert.equal(aniversarioPorConfirmar('2024-02-29', '2027-02-10'), '2027-02-28') // bisiesto
})

test('aniversarioPorConfirmar: null si el mes desde el que rige ya está cortado', () => {
  assert.equal(aniversarioPorConfirmar('2025-10-01', '2026-10-01'), null) // hoy, y hoy es día 1
  assert.equal(aniversarioPorConfirmar('2025-10-31', '2026-10-31'), null) // hoy, último día del mes
  assert.equal(aniversarioPorConfirmar('2025-11-01', '2026-10-31'), null) // día 1 del mes siguiente
  assert.equal(aniversarioPorConfirmar('2025-11-01', '2026-10-30'), '2026-11-01') // aún se puede
})
