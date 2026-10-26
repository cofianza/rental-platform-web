/**
 * Pruebas de lib/etapaEstudio (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/etapaEstudio.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularEtapa, type DatosEtapa } from './etapaEstudio'

const base: DatosEtapa = {
  estado: 'borrador',
  habilitado: true,
  citaResuelta: true,
  tieneInmueble: true,
  autorizacionEstado: null,
  pago: null,
  titularEstado: 'solicitado',
  contratosEstados: [],
}

test('antes de habilitar: visita o habilitar (sin inmueble no hay visita)', () => {
  assert.equal(calcularEtapa({ ...base, habilitado: false, citaResuelta: false }), 'visita')
  assert.equal(calcularEtapa({ ...base, habilitado: false }), 'habilitar')
  assert.equal(calcularEtapa({ ...base, habilitado: false, citaResuelta: false, tieneInmueble: false }), 'habilitar')
})

test('habilitado: quién paga, autorización, pago y consulta', () => {
  assert.equal(calcularEtapa({ ...base, pago: { estado: 'sin_definir', puede_avanzar: false } }), 'pago')
  assert.equal(calcularEtapa({ ...base, autorizacionEstado: 'pendiente', pago: { estado: 'asumido_inmobiliaria', puede_avanzar: true } }), 'autorizacion')
  assert.equal(calcularEtapa({ ...base, autorizacionEstado: 'autorizado', pago: { estado: 'pendiente', puede_avanzar: false } }), 'pago')
  assert.equal(calcularEtapa({ ...base, autorizacionEstado: 'autorizado', titularEstado: 'en_proceso' }), 'consulta')
})

test('revisión 26-oct: no habilitada, enlace vencido, opción B, Gerencia y consulta detenida', () => {
  assert.equal(calcularEtapa({ ...base, habilitado: false, estudioRechazado: true }), 'no_habilitada')
  assert.equal(calcularEtapa({ ...base, autorizacionEstado: 'expirado', enlaceVencido: true }), 'enlace')
  assert.equal(
    calcularEtapa({ ...base, autorizacionEstado: null, pago: { estado: 'pendiente', puede_avanzar: false, paga: 'gestor' } }),
    'pago',
  )
  assert.equal(calcularEtapa({ ...base, autorizacionEstado: 'autorizado', titularEstado: 'pago_pendiente' }), 'pago')
  assert.equal(calcularEtapa({ ...base, autorizacionEstado: 'autorizado', titularEstado: 'fallido' }), 'fallida')
  assert.equal(calcularEtapa({ ...base, autorizacionEstado: 'autorizado', titularEstado: 'formulario_completado' }), 'sin_ejecutar')
  // Pagada antes de firmar (vitrina): espera al prospecto, no la consulta.
  assert.equal(calcularEtapa({ ...base, autorizacionEstado: 'pendiente', titularEstado: 'formulario_completado' }), 'autorizacion')
})

test('después de la consulta: decisión, contrato, firma y cierre', () => {
  assert.equal(calcularEtapa({ ...base, estado: 'condicionado' }), 'decision')
  assert.equal(calcularEtapa({ ...base, estado: 'aprobado' }), 'contrato')
  assert.equal(calcularEtapa({ ...base, estado: 'aprobado', contratosEstados: ['pendiente_firma'] }), 'firma')
  assert.equal(calcularEtapa({ ...base, estado: 'aprobado', contratosEstados: ['cancelado', 'vigente'] }), 'vigente')
  assert.equal(calcularEtapa({ ...base, estado: 'rechazado' }), 'no_aprobado')
  assert.equal(calcularEtapa({ ...base, estado: 'cerrado' }), 'finalizado')
  assert.equal(calcularEtapa({ ...base, estado: 'cerrado', estadoPreCancelacion: 'borrador' }), 'cancelado')
  assert.equal(calcularEtapa({ ...base, estado: 'cerrado', estadoPreCancelacion: 'rechazado' }), 'no_aprobado')
})
