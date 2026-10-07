/**
 * Pruebas de lib/tarifaCobro (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/tarifaCobro.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accionesDeCuenta, accionesDeLinea, aniversarioPorConfirmar, contarCuentas } from './tarifaCobro'

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
  assert.deepEqual(accionesDeCuenta({ estado: 'borrador', saldo_cop: null }, 'administrador'), { emitir: true, reintentar: false, pagar: false })
  assert.deepEqual(accionesDeCuenta({ estado: 'borrador', saldo_cop: null }, 'operador_analista'), { emitir: false, reintentar: false, pagar: false })
  assert.equal(accionesDeCuenta({ estado: 'emitiendo', saldo_cop: null }, 'administrador').reintentar, true)
  assert.equal(accionesDeCuenta({ estado: 'emitida', saldo_cop: 1000 }, 'operador_analista').pagar, true)
  assert.equal(accionesDeCuenta({ estado: 'emitida', saldo_cop: 0 }, 'administrador').pagar, false)
  assert.equal(accionesDeCuenta({ estado: 'bloqueada_fiscal', saldo_cop: null }, 'administrador').emitir, false)
  assert.equal(accionesDeCuenta({ estado: 'emitida', saldo_cop: 1000 }, 'inmobiliaria').pagar, false)
})

test('accionesDeLinea: no recaudada se puede pagar; pagada o anulada no; nada mientras se emite', () => {
  const t = 'tradicional'
  assert.deepEqual(accionesDeLinea({ estado: 'no_recaudada', modalidad: t }, 'emitida', 'operador_analista'), { pagar: true, anular: false, noRecaudada: false })
  assert.deepEqual(accionesDeLinea({ estado: 'pendiente', modalidad: t }, 'emitida', 'administrador'), { pagar: true, anular: true, noRecaudada: false })
  assert.deepEqual(accionesDeLinea({ estado: 'pagada', modalidad: t }, 'emitida', 'administrador'), { pagar: false, anular: false, noRecaudada: false })
  assert.deepEqual(accionesDeLinea({ estado: 'pendiente', modalidad: t }, 'borrador', 'administrador'), { pagar: false, anular: true, noRecaudada: false })
  assert.deepEqual(accionesDeLinea({ estado: 'pendiente', modalidad: t }, 'emitiendo', 'administrador'), { pagar: false, anular: false, noRecaudada: false })
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
