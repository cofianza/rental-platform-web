/**
 * Pruebas de lib/etapaFila (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/etapaFila.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ACCION_GESTOR,
  accionSegundoFirmante,
  esperaCargaNotaria,
  etapaDeFila,
  accionDeFila,
  tomarDisponible,
  actividadConAlerta,
  revisionDemorada,
  siguienteOrdenActividad,
} from './etapaFila'
import { queSigue } from './ayudaEstudio'
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
  // Oficina Virtual (25-nov), punto 13: en palabras de quien arrienda, con la cifra.
  assert.equal(accionDeFila(canon, 'canon_excede'), 'elegir un inmueble de hasta $1.500.000 o pedir bajar el canon')
  // Con el coarrendatario sin responder el RPC puede decir «prospecto»: decide quien gestiona.
  const coa = fila({ estado: 'aprobado', depende_de: 'prospecto', traba_contrato: traba('coarrendatario_pendiente') })
  assert.equal(etapaDeFila(coa), 'coarrendatario_pendiente')
  assert.equal(accionDeFila(coa, 'coarrendatario_pendiente'), 'esperar al segundo firmante o seguir sin él')
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

test('aprobado con segundo firmante sin coarrendatario en curso: «invitar al segundo firmante» (en infinitivo, tras «Su turno:»)', () => {
  const asf = (depende_de: IExpediente['depende_de'], ev: Partial<IEstudioVigente> = {}) =>
    fila({ estado: 'condicionado', depende_de }, { estado: 'completado', resultado: 'condicionado', desenlace: 'aprobado_segundo_firmante', ...ev })
  assert.equal(etapaDeFila(asf('gestor')), 'segundo_firmante')
  assert.equal(accionDeFila(asf('gestor'), 'segundo_firmante'), 'invitar al segundo firmante')
  // Con el coarrendatario en curso (la API: 'prospecto') o con apelación ('cofianza'), no hay acción de quien gestiona.
  assert.equal(accionDeFila(asf('prospecto'), 'segundo_firmante'), undefined)
  assert.equal(accionDeFila(asf('cofianza'), 'segundo_firmante'), undefined)
  // «Reemplazar» solo si ya hay uno evaluado que no alcanza (la API: sustituir).
  assert.equal(
    accionDeFila(asf('gestor', { siguiente_accion: 'sustituir_segundo_firmante', siguiente_accion_texto: 'Esta persona no cumple las condiciones. Puede reemplazarla.' }), 'segundo_firmante'),
    'reemplazar al segundo firmante',
  )
  assert.equal(
    accionDeFila(asf('gestor', { siguiente_accion: 'presentar_segundo_firmante', siguiente_accion_texto: 'Presente un segundo firmante antes del 05/12/2026.' }), 'segundo_firmante'),
    'invitar al segundo firmante',
  )
})

test('bloque 4: propietario directo o sin acción de la API: sin «invitar al segundo firmante»', () => {
  // Lo dice la API con su campo (lista y vista del estudio): el canal no admite segundo firmante.
  const motivo = 'En este inmueble todavía no se puede sumar un segundo firmante.'
  const canal = { siguiente_accion: 'presentar_segundo_firmante', siguiente_accion_texto: motivo, canal_sin_segundo_firmante: true }
  assert.equal(accionSegundoFirmante(canal), undefined)
  assert.equal(
    accionDeFila(
      fila({ estado: 'condicionado', depende_de: 'gestor' }, { estado: 'completado', resultado: 'condicionado', desenlace: 'aprobado_segundo_firmante', ...canal } as Partial<IEstudioVigente>),
      'segundo_firmante',
    ),
    undefined,
  )
  // Sin el campo (una API anterior) no se deduce del texto: la acción de siempre.
  assert.equal(accionSegundoFirmante({ siguiente_accion: 'presentar_segundo_firmante', siguiente_accion_texto: motivo }), 'invitar al segundo firmante')
  // La API no pide acción (p. ej. con el segundo firmante en verificación).
  assert.equal(accionSegundoFirmante({ siguiente_accion: 'ninguna', siguiente_accion_texto: 'Cofianza está verificando al segundo firmante que usted presentó.' }), undefined)
  // Quien no cumple es el solicitante (lo dice el texto de la API): no se llama «segundo firmante» a quien no lo es.
  assert.equal(
    accionSegundoFirmante({ siguiente_accion: 'sustituir_segundo_firmante', siguiente_accion_texto: 'El solicitante no cumple las condiciones. Puede reemplazarlo por otra persona desde el estudio.' }),
    'reemplazar al solicitante',
  )
  assert.equal(accionSegundoFirmante({ siguiente_accion: 'sustituir_segundo_firmante' }), 'reemplazar al segundo firmante')
  // Sin datos (API anterior): la acción de siempre.
  assert.equal(accionSegundoFirmante(null), 'invitar al segundo firmante')
  assert.equal(accionSegundoFirmante({}), 'invitar al segundo firmante')
})

test('bloque 4: trabas del segundo firmante que ya aceptó (en evaluación o en verificación)', () => {
  const traba = (codigo: string) => ({ codigo, texto: 'Texto de la API.' })
  const evaluacion = fila({ estado: 'aprobado', depende_de: 'prospecto', traba_contrato: traba('coarrendatario_en_evaluacion') })
  assert.equal(etapaDeFila(evaluacion), 'coarrendatario_en_evaluacion')
  assert.equal(accionDeFila(evaluacion, 'coarrendatario_en_evaluacion'), 'esperar el resultado del segundo firmante o seguir sin él')
  // Diga lo que diga depende_de (aquí, Cofianza): esperarlo o seguir sin él lo decide quien gestiona.
  const verificacion = fila({ estado: 'aprobado', depende_de: 'cofianza', traba_contrato: traba('coarrendatario_en_verificacion') })
  assert.equal(etapaDeFila(verificacion), 'coarrendatario_en_verificacion')
  assert.equal(accionDeFila(verificacion, 'coarrendatario_en_verificacion'), 'esperar la verificación del segundo firmante o seguir sin él')
  // Nunca «crear el contrato».
  for (const e of [evaluacion, verificacion]) assert.notEqual(accionDeFila(e, etapaDeFila(e)), 'crear el contrato')
  // El analista puede tomar la verificación; la evaluación en curso no es de Cofianza.
  assert.equal(tomarDisponible(verificacion), true)
  assert.equal(tomarDisponible(evaluacion), false)
  // Las acciones van en infinitivo (siguen a «Su turno:» o a «Turno del gestor:»).
  for (const accion of Object.values(ACCION_GESTOR)) assert.doesNotMatch(accion ?? '', /^(invite|espere|cree|ajuste|revise)\b/)
  // El vencido no tiene acción en la pastilla (la API no lo cuenta como turno de nadie).
  assert.equal(ACCION_GESTOR.vencido, undefined)
})

test('bloque 4: «aprobado con segundo firmante» con el segundo en verificación: lo toma un analista', () => {
  const asf = (extra: Partial<IExpediente> = {}) =>
    fila({ estado: 'condicionado', depende_de: 'cofianza', ...extra }, { estado: 'completado', resultado: 'condicionado', desenlace: 'aprobado_segundo_firmante' })
  assert.equal(tomarDisponible(asf({ segundo_en_verificacion: true })), true)
  // Sin la marca de la API (anterior), como antes.
  assert.equal(tomarDisponible(asf()), false)
})

test('Adenda 6 §4: las listas del solicitante sin verificar: turno de Cofianza, nunca «crear el contrato»', () => {
  const listas = fila({ estado: 'aprobado', depende_de: 'cofianza', traba_contrato: { codigo: 'solicitante_en_verificacion', texto: 'Texto de la API.' } })
  assert.equal(etapaDeFila(listas), 'solicitante_en_verificacion')
  assert.notEqual(accionDeFila(listas, 'solicitante_en_verificacion'), 'crear el contrato')
  assert.equal(tomarDisponible(listas), true)
})

test('Adenda 6 §2: el contrato V3 que espera la carga en notaría es turno de quien gestiona (revisión de integración, punto 1)', () => {
  const enNotaria = fila({ estado: 'aprobado', contrato_estado: 'pendiente_firma', depende_de: 'gestor', firma_notaria: true })
  assert.equal(etapaDeFila(enNotaria), 'firma')
  assert.equal(esperaCargaNotaria(enNotaria), true)
  assert.equal(accionDeFila(enNotaria, 'firma'), 'cargar el contrato firmado en notaría')
  // Aunque el turno llegue de una lista anterior: la marca manda (nunca «revisar la firma del contrato»).
  assert.equal(accionDeFila({ ...enNotaria, depende_de: 'prospecto' }, 'firma'), 'cargar el contrato firmado en notaría')
  // Firma digital o una API anterior (sin la marca): como siempre.
  const digital = fila({ estado: 'aprobado', contrato_estado: 'pendiente_firma', depende_de: 'gestor', firma_notaria: false })
  assert.equal(esperaCargaNotaria(digital), false)
  assert.equal(accionDeFila(digital, 'firma'), ACCION_GESTOR.firma)
  assert.equal(esperaCargaNotaria(fila({ contrato_estado: 'pendiente_firma' })), false)
  // Ya cargado (el contrato salió de la firma) no se pide cargarlo otra vez.
  assert.equal(esperaCargaNotaria(fila({ contrato_estado: 'vigente', firma_notaria: true })), false)
})

test('Adenda 6 §2: «Qué sigue» en notaría no habla de firma electrónica', () => {
  const o = { analista: false, fechaCondicion: null, esperaHasta: null, sinInmueble: false, firmaNotaria: true }
  assert.match(queSigue('firma', { ...o, vista: 'gestor' }), /^El contrato se firma en notaría: descárguelo, hágalo firmar con firma autenticada y cárguelo/)
  assert.match(queSigue('firma', { ...o, vista: 'equipo' }), /alguien de su equipo con permiso de edición/)
  assert.match(queSigue('firma', { ...o, vista: 'cofianza' }), /falta que quien gestiona el estudio cargue el contrato firmado/)
  for (const vista of ['gestor', 'equipo', 'cofianza'] as const) assert.doesNotMatch(queSigue('firma', { ...o, vista }), /firma electrónica|firmen todas/)
  // Sin la marca, el de siempre.
  assert.equal(queSigue('firma', { ...o, vista: 'gestor', firmaNotaria: false }), 'El contrato está en firma electrónica: falta que firmen todas las partes.')
})

test('Adenda 6 §2: textos de notaría con la salida de todo el sistema (revisión de integración, puntos 5 y 6)', async () => {
  const { readFileSync } = await import('node:fs')
  const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
  for (const ruta of ['../components/contratos/CargaContratoNotaria.tsx', '../components/contratos/v3/EstadoFirma.tsx']) {
    const fuente = leer(ruta)
    assert.doesNotMatch(fuente, /haga una nueva evaluación/, ruta)
    assert.match(fuente, /cancele el contrato y cree un estudio nuevo \(con su propio cobro\)/, ruta)
  }
  // Al solicitante no se le dice que el contrato lo carga él.
  const solicitante = leer('../components/expedientes/ContratoSolicitanteCard.tsx')
  assert.doesNotMatch(solicitante, /la fianza se activa cuando cargue el contrato firmado/)
  assert.match(solicitante, /la fianza se activa cuando quien tramita su arriendo cargue el contrato firmado/)
})

test('Oficina Virtual (punto 13): «Aprobado hasta $X. Elija un inmueble de ese valor o pida bajar el canon»', async () => {
  const { fraseCanonGestor, accionCanon, ACCION_GESTOR } = await import('./etapaFila')
  const { textoTurno } = await import('./turnoEstudio')
  assert.equal(fraseCanonGestor({ canon_habilitado_cop: 1_050_000 }), 'Aprobado hasta $1.050.000. Elija un inmueble de ese valor o pida bajar el canon')
  // Sin la cifra (estudio anterior a la Adenda 5) no se inventa una.
  for (const t of [null, undefined, {}, { canon_habilitado_cop: 0 }, { canon_habilitado_cop: null }]) {
    assert.equal(fraseCanonGestor(t), 'El canon supera lo aprobado. Elija otro inmueble o pida bajar el canon')
    assert.equal(accionCanon(t), ACCION_GESTOR.canon_excede)
  }
  // A quien gestiona, la frase entera (sin «Su turno:»); a su equipo de solo lectura y a Cofianza, la acción.
  const o = { accion: accionCanon({ canon_habilitado_cop: 1_050_000 }), fraseGestor: fraseCanonGestor({ canon_habilitado_cop: 1_050_000 }) }
  assert.equal(textoTurno('gestor', 'gestor', o), 'Aprobado hasta $1.050.000. Elija un inmueble de ese valor o pida bajar el canon')
  assert.equal(textoTurno('gestor', 'equipo', o), 'Turno de su equipo: elegir un inmueble de hasta $1.050.000 o pedir bajar el canon')
  assert.equal(textoTurno('gestor', 'cofianza', o), 'Turno del gestor: elegir un inmueble de hasta $1.050.000 o pedir bajar el canon')
  // Nunca el texto viejo.
  assert.doesNotMatch(JSON.stringify(ACCION_GESTOR), /ajustar el canon o reasignar/)
})
