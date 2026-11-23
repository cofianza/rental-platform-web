/**
 * Pruebas de lib/etapaFila (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/etapaFila.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { etapaDeFila, accionDeFila, tomarDisponible, actividadConAlerta, revisionDemorada, siguienteOrdenActividad } from './etapaFila'
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
  assert.equal(etapaDeFila(fila({ estado: 'aprobado', contrato_estado: 'firma_incompleta' })), 'firma_incompleta')
  assert.equal(etapaDeFila(fila({ estado: 'aprobado', contrato_estado: 'pendiente_firma' })), 'firma')
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

test('X5: el encabezado Actividad recorre los cuatro órdenes y vuelve al inicio', () => {
  const pasos: Array<ReturnType<typeof siguienteOrdenActividad>> = []
  let o = siguienteOrdenActividad('numero', 'asc')
  for (let i = 0; i < 5; i++) {
    pasos.push(o)
    o = siguienteOrdenActividad(o.sortBy, o.sortOrder)
  }
  assert.deepEqual(pasos, [
    { sortBy: 'updated_at', sortOrder: 'desc' },
    { sortBy: 'updated_at', sortOrder: 'asc' },
    { sortBy: 'created_at', sortOrder: 'desc' },
    { sortBy: 'created_at', sortOrder: 'asc' },
    { sortBy: 'updated_at', sortOrder: 'desc' },
  ])
})

// Con el resultado que envía la API (`desenlace`), la etapa sale de él; sin él, todo sigue como siempre.
test('condicionado: sin desenlace sigue siendo «decision»', () => {
  assert.equal(etapaDeFila(fila({ estado: 'condicionado' }, { estado: 'completado', resultado: 'condicionado' })), 'decision')
  assert.equal(etapaDeFila(fila({ estado: 'condicionado' }, { estado: 'completado', resultado: 'condicionado', desenlace: null })), 'decision')
})

test('condicionado: con desenlace, la etapa es la del resultado', () => {
  const sf = fila({ estado: 'condicionado', depende_de: 'prospecto' }, { estado: 'completado', resultado: 'condicionado', desenlace: 'aprobado_segundo_firmante' })
  assert.equal(etapaDeFila(sf), 'segundo_firmante')
  const bloqueado = fila({ estado: 'condicionado', depende_de: 'gestor' }, { estado: 'completado', resultado: 'condicionado', desenlace: 'bloqueado_listas' })
  assert.equal(etapaDeFila(bloqueado), 'bloqueado')
  assert.equal(accionDeFila(bloqueado, 'bloqueado'), 'revisar el bloqueo en el detalle')
  // No son revisiones de un analista: no hay nada que «tomar».
  assert.equal(tomarDisponible(sf), false)
  assert.equal(tomarDisponible(bloqueado), false)
})

test('el desenlace no cambia las etapas que no son del condicionado', () => {
  assert.equal(etapaDeFila(fila({ estado: 'aprobado' }, { estado: 'completado', resultado: 'aprobado', desenlace: 'aprobado' })), 'contrato')
  assert.equal(etapaDeFila(fila({ estado: 'rechazado' }, { estado: 'completado', resultado: 'rechazado', desenlace: 'rechazado' })), 'no_aprobado')
})

test('reporte de Gerencia (21-nov): aprobado con traba_contrato nunca es «crear el contrato»', () => {
  const traba = (codigo: string, extra = {}) => ({ codigo, texto: 'Texto de la API.', ...extra })
  const canon = fila({ estado: 'aprobado', depende_de: 'gestor', traba_contrato: traba('canon_excede', { canon_habilitado_cop: 1_500_000 }) })
  assert.equal(etapaDeFila(canon), 'canon_excede')
  assert.equal(accionDeFila(canon, 'canon_excede'), 'ajustar el canon o reasignar el estudio')
  // Con el coarrendatario sin responder el RPC puede decir «prospecto»: decide quien gestiona.
  const coa = fila({ estado: 'aprobado', depende_de: 'prospecto', traba_contrato: traba('coarrendatario_pendiente') })
  assert.equal(etapaDeFila(coa), 'coarrendatario_pendiente')
  assert.equal(accionDeFila(coa, 'coarrendatario_pendiente'), 'esperar al coarrendatario o seguir sin él')
  // La API pone depende_de null y requiere_accion false en el vencido: sin acción en la pastilla.
  const vencido = fila({ estado: 'aprobado', depende_de: null, requiere_accion: false, traba_contrato: traba('vencido') })
  assert.equal(etapaDeFila(vencido), 'vencido')
  assert.equal(accionDeFila(vencido, 'vencido'), undefined)
  // Por vencer sin margen para firmar: la misma etapa (cambia el nombre, no el camino).
  assert.equal(etapaDeFila(fila({ estado: 'aprobado', depende_de: null, traba_contrato: traba('vencido', { sin_margen: true }) })), 'vencido')
  // Vencido manda sobre la consulta fallida del coarrendatario; las otras trabas no.
  assert.equal(etapaDeFila(fila({ estado: 'aprobado', depende_de: null, traba_contrato: traba('vencido') }, { coarrendatario_fallido: true })), 'vencido')
  assert.equal(etapaDeFila(fila({ estado: 'aprobado', traba_contrato: traba('canon_excede') }, { coarrendatario_fallido: true })), 'fallida')
  // Sin traba, con null o con un código que esta versión no conoce: como siempre.
  assert.equal(etapaDeFila(fila({ estado: 'aprobado', traba_contrato: null })), 'contrato')
  assert.equal(etapaDeFila(fila({ estado: 'aprobado', traba_contrato: traba('otro') })), 'contrato')
  // El contrato ya en firma manda (la API no envía traba con contrato vivo, pero por si acaso).
  assert.equal(etapaDeFila(fila({ estado: 'aprobado', contrato_estado: 'pendiente_firma', traba_contrato: traba('vencido') })), 'firma')
  // El vencido no se pinta de alerta por el tiempo quieto.
  assert.equal(actividadConAlerta(vencido), false)
})

test('estudio reabierto por un reemplazo: su propia etapa en la lista', () => {
  assert.equal(etapaDeFila(fila({ estado: 'en_revision', reapertura_abierta: true }, { estado: 'completado', resultado: 'rechazado' })), 'reapertura')
  assert.equal(etapaDeFila(fila({ estado: 'rechazado', reapertura_abierta: true })), 'reapertura')
  assert.equal(etapaDeFila(fila({ estado: 'cerrado', reapertura_abierta: true })), 'finalizado')
  // Sin la marca, como siempre.
  assert.equal(etapaDeFila(fila({ estado: 'en_revision' }, { estado: 'completado', resultado: 'rechazado' })), 'consulta')
  assert.equal(actividadConAlerta(fila({ estado: 'en_revision', reapertura_abierta: true, depende_de: 'prospecto' }), 'reapertura'), false)
})

test('aprobado con segundo firmante sin coarrendatario en curso: «invite al segundo firmante o reemplácelo»', () => {
  const asf = (depende_de: IExpediente['depende_de']) =>
    fila({ estado: 'condicionado', depende_de }, { estado: 'completado', resultado: 'condicionado', desenlace: 'aprobado_segundo_firmante' })
  assert.equal(etapaDeFila(asf('gestor')), 'segundo_firmante')
  assert.equal(accionDeFila(asf('gestor'), 'segundo_firmante'), 'invite al segundo firmante o reemplácelo')
  // Con el coarrendatario en curso (la API: 'prospecto') o con apelación ('cofianza'), no hay acción de quien gestiona.
  assert.equal(accionDeFila(asf('prospecto'), 'segundo_firmante'), undefined)
  assert.equal(accionDeFila(asf('cofianza'), 'segundo_firmante'), undefined)
})
