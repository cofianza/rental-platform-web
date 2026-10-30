/**
 * Pruebas de lib/etapaFila (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/etapaFila.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { etapaDeFila, accionDeFila, tomarDisponible, actividadConAlerta, revisionDemorada } from './etapaFila'
import type { IExpediente, IEstudioVigente } from '@/types/expediente'

const fila = (o: Partial<IExpediente> = {}, ev?: Partial<IEstudioVigente> | null): IExpediente =>
  ({
    id: 'e1',
    estado: 'borrador',
    inmueble_id: 'i1',
    cita_realizada: true,
    depende_de: null,
    estudio_vigente: ev === null ? null : { estado: 'solicitado', resultado: 'pendiente', created_at: '', ...ev },
    ...o,
  }) as IExpediente

test('cierre: no aprobable, cancelado y finalizado', () => {
  assert.equal(etapaDeFila(fila({ estado: 'rechazado' })), 'no_aprobado')
  assert.equal(etapaDeFila(fila({ estado: 'cerrado', estado_pre_cancelacion: 'rechazado' })), 'no_aprobado')
  assert.equal(etapaDeFila(fila({ estado: 'cerrado', estado_pre_cancelacion: 'borrador' })), 'cancelado')
  assert.equal(etapaDeFila(fila({ estado: 'cerrado' })), 'finalizado')
})

test('contrato: vigente y en firma', () => {
  assert.equal(etapaDeFila(fila({ estado: 'aprobado', contrato_estado: 'vigente' })), 'vigente')
  assert.equal(etapaDeFila(fila({ estado: 'aprobado', contrato_estado: 'firma_incompleta' })), 'firma')
})

test('falló la del coarrendatario, aprobado y condicionado', () => {
  assert.equal(etapaDeFila(fila({ estado: 'condicionado' }, { coarrendatario_fallido: true })), 'fallida')
  assert.equal(etapaDeFila(fila({ estado: 'aprobado' })), 'contrato')
  assert.equal(etapaDeFila(fila({ estado: 'condicionado' })), 'decision')
})

test('sin evaluación (o cancelada): visita, habilitar o no habilitada', () => {
  assert.equal(etapaDeFila(fila({ cita_realizada: false }, null)), 'visita')
  assert.equal(etapaDeFila(fila({ depende_de: 'gestor' }, { estado: 'cancelado' })), 'habilitar')
  assert.equal(etapaDeFila(fila({}, null)), 'no_habilitada')
})

test('evaluación en curso: fallida, sin ejecutar, espera, enlace y consulta', () => {
  assert.equal(etapaDeFila(fila({}, { estado: 'fallido' })), 'fallida')
  assert.equal(etapaDeFila(fila({}, { estado: 'formulario_completado', sin_ejecutar: true })), 'sin_ejecutar')
  assert.equal(etapaDeFila(fila({}, { estado: 'en_proceso', espera_coarrendatario_hasta: '2026-10-30T15:00:00Z' })), 'espera_coarrendatario')
  assert.equal(etapaDeFila(fila({}, { estado: 'pagado', expirado: true })), 'enlace')
  assert.equal(etapaDeFila(fila({}, { estado: 'pagado' })), 'consulta')
})

test('pago: del gestor o del prospecto; si no, autorización', () => {
  assert.equal(etapaDeFila(fila({ depende_de: 'gestor' }, { estado: 'pago_pendiente' })), 'pago')
  assert.equal(etapaDeFila(fila({ depende_de: 'gestor' }, { estado: 'solicitado' })), 'pago')
  assert.equal(etapaDeFila(fila({ depende_de: 'prospecto' }, { estado: 'pago_pendiente' })), 'pago_prospecto')
  assert.equal(etapaDeFila(fila({ depende_de: 'prospecto' }, { estado: 'solicitado' })), 'autorizacion')
})

test('acción del gestor: solo en su turno, con los casos especiales', () => {
  assert.equal(accionDeFila(fila({ depende_de: 'prospecto' }), 'contrato'), undefined)
  assert.equal(accionDeFila(fila({ depende_de: 'gestor' }), 'contrato'), 'crear el contrato')
  assert.equal(accionDeFila(fila({ depende_de: 'gestor', inmueble_id: null }), 'contrato'), 'vincular el inmueble')
  assert.equal(accionDeFila(fila({ depende_de: 'gestor' }), 'enlace'), 'reenviar el enlace')
  assert.equal(
    accionDeFila(fila({ depende_de: 'gestor' }, { expirado: true, estado_bloqueo: 'bloqueado_documento' }), 'enlace'),
    'corregir el documento',
  )
  assert.equal(
    accionDeFila(fila({ depende_de: 'gestor' }, { expirado: true, estado_bloqueo: 'identidad_rechazada' }), 'enlace'),
    'comunicarse con Cofianza',
  )
  assert.equal(accionDeFila(fila({ depende_de: 'gestor' }), 'decision'), undefined)
})

test('L3: aprobado con el contrato en borrador: terminar el contrato', () => {
  const e = fila({ estado: 'aprobado', contrato_estado: 'borrador', depende_de: 'gestor' }, { estado: 'completado' })
  assert.equal(etapaDeFila(e), 'contrato')
  assert.equal(accionDeFila(e, 'contrato'), 'terminar el contrato')
  assert.equal(accionDeFila(fila({ estado: 'aprobado', depende_de: 'gestor' }), 'contrato'), 'crear el contrato')
})

test('U9: «Tomar» solo con el turno de Cofianza', () => {
  assert.equal(tomarDisponible(fila({ estado: 'condicionado' }, { estado: 'completado' })), true)
  assert.equal(
    tomarDisponible(fila({ estado: 'condicionado' }, { estado: 'completado', condicion_coarrendatario: { vence_en: '2099-01-01', ingreso_adicional_requerido: null } })),
    false,
  )
  assert.equal(tomarDisponible(fila({}, { estado: 'fallido' })), true)
  assert.equal(tomarDisponible(fila({}, { estado: 'formulario_completado', sin_ejecutar: true })), true)
  assert.equal(tomarDisponible(fila({ estado: 'aprobado' }, { estado: 'completado' })), false)
  assert.equal(tomarDisponible(fila({}, { estado: 'solicitado' })), false)
})

test('U14: actividad en alerta solo con turno del gestor o de Cofianza', () => {
  assert.equal(actividadConAlerta(fila({ depende_de: 'gestor' })), true)
  assert.equal(actividadConAlerta(fila({ estado: 'condicionado', depende_de: 'cofianza' }, { estado: 'completado' })), true)
  assert.equal(actividadConAlerta(fila({ depende_de: 'prospecto' })), false)
  assert.equal(actividadConAlerta(fila({ estado: 'aprobado', contrato_estado: 'vigente', depende_de: 'gestor' })), false)
  assert.equal(actividadConAlerta(fila({ estado: 'aprobado', contrato_estado: 'pendiente_firma', depende_de: 'prospecto' })), false)
  assert.equal(actividadConAlerta(fila({ estado: 'cerrado', depende_de: null })), false)
})

test('L4: «En revisión hace N días» desde las 24 h; rojo desde los 3 días', () => {
  const ahora = Date.parse('2026-10-30T12:00:00Z')
  const hace = (h: number) => new Date(ahora - h * 3_600_000).toISOString()
  assert.equal(revisionDemorada(hace(23), ahora), null)
  assert.deepEqual(revisionDemorada(hace(25), ahora), { texto: 'En revisión hace 1 día', tono: 'ambar' })
  assert.deepEqual(revisionDemorada(hace(50), ahora), { texto: 'En revisión hace 2 días', tono: 'ambar' })
  assert.deepEqual(revisionDemorada(hace(80), ahora), { texto: 'En revisión hace 3 días', tono: 'rojo' })
  assert.equal(revisionDemorada(null, ahora), null)
})
