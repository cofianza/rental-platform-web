/**
 * Pruebas de la condición de coarrendatario y de partirObservaciones en components/expedientes/textoVisible
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
  partirObservaciones,
  seCierraSiVence,
  textoCondicionCoarrendatario,
  textoVisible,
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

// ── Motivos de la revisión, separados del resumen de la central ──
const OBS_DATACREDITO =
  'Resultado de DataCrédito: puntaje 773; 3 créditos vigentes; saldo total $ 18.450.000; ingreso estimado por la central $ 4.300.000. ' +
  'El caso pasa a revisión de un analista de Cofianza. No fue posible confirmar la vigencia del documento con la Registraduría. ' +
  'Algunas fuentes de antecedentes no respondieron. No se pudo completar la validación de identidad: se verifica por otro medio.'

test('partirObservaciones: los motivos sin el resumen ni el aviso; los datos aparte', () => {
  const r = partirObservaciones(textoVisible(OBS_DATACREDITO))
  assert.deepEqual(r.motivos, [
    'No fue posible confirmar la vigencia del documento con la Registraduría.',
    'Algunas fuentes de antecedentes no respondieron.',
    'No se pudo completar la validación de identidad: se verifica por otro medio.',
  ])
  assert.equal(r.datos, 'DataCrédito, puntaje 773; 3 créditos vigentes; saldo total $18.450.000; ingreso estimado por la central $4.300.000.')
})

test('partirObservaciones: a la inmobiliaria le llega sin el puntaje y la lista es la misma', () => {
  const r = partirObservaciones(textoVisible(OBS_DATACREDITO, { externo: true }))
  assert.equal(r.datos, '')
  assert.equal(r.motivos.length, 3)
})

test('partirObservaciones: sin el aviso solo es resumen el formato de la central', () => {
  const sinAviso = 'TransUnion no entregó puntaje: la persona no tiene historial. El ingreso declarado difiere del estimado.'
  assert.deepEqual(partirObservaciones(sinAviso), {
    datos: 'TransUnion no entregó puntaje: la persona no tiene historial.',
    motivos: ['El ingreso declarado difiere del estimado.'],
    conAviso: false,
  })
  const legado = 'Score CreditVision: 741. Obligaciones totales: 4. Saldo total: $25.756.'
  assert.deepEqual(partirObservaciones(legado), { datos: legado, motivos: [], conAviso: false })
  assert.deepEqual(partirObservaciones('Solo un motivo escrito por el analista.'), { datos: '', motivos: ['Solo un motivo escrito por el analista.'], conAviso: false })
  assert.deepEqual(partirObservaciones(null), { datos: '', motivos: [], conAviso: false })
})

test('partirObservaciones: en registro manual, «Score…»/«Saldo…» del analista siguen siendo motivos', () => {
  const manual = 'Saldo total alto frente al ingreso. Score bajo en la otra central.'
  assert.deepEqual(partirObservaciones(manual).motivos, ['Saldo total alto frente al ingreso.', 'Score bajo en la otra central.'])
  assert.equal(partirObservaciones(manual).datos, '')
})

test('partirObservaciones: sin motivos (formato viejo para la agencia) avisa que hubo aviso', () => {
  const r = partirObservaciones('Score CreditVision: 741. Obligaciones totales: 4. Saldo total: $25.756. El caso pasa a revisión de un analista de Cofianza.')
  assert.deepEqual(r, { datos: 'Score CreditVision: 741. Obligaciones totales: 4. Saldo total: $25.756.', motivos: [], conAviso: true })
})

test('partirObservaciones: sin aviso, no parte dentro de las alertas de DataCrédito', () => {
  const r = partirObservaciones(
    'Resultado de DataCrédito: puntaje 640; 2 créditos vigentes; alertas: Documento reportado como extraviado. Verificar con el titular; Consulta reciente.',
  )
  assert.deepEqual(r.motivos, [])
  assert.equal(r.datos, 'DataCrédito, puntaje 640; 2 créditos vigentes; alertas: Documento reportado como extraviado. Verificar con el titular; Consulta reciente.')
  const conCondicion = partirObservaciones('Resultado de DataCrédito: puntaje 640; alertas: Uno. Dos. Condición pendiente: coarrendatario. ')
  assert.equal(conCondicion.datos, 'DataCrédito, puntaje 640; alertas: Uno. Dos.')
  assert.deepEqual(conCondicion.motivos, [])
})

test('partirObservaciones: el aviso de listas por confirmar no es una viñeta', () => {
  const r = partirObservaciones(
    'Resultado de TransUnion: puntaje 702. El caso pasa a revisión de un analista de Cofianza. El caso pasa a revisión de Cofianza antes de decidir. No se pudo completar la validación de identidad.',
  )
  assert.deepEqual(r.motivos, ['No se pudo completar la validación de identidad.'])
  const solo = partirObservaciones('Resultado de TransUnion: puntaje 702. El caso pasa a revisión de Cofianza antes de decidir.')
  assert.deepEqual(solo, { datos: 'TransUnion, puntaje 702.', motivos: [], conAviso: true })
})

test('partirObservaciones: la condición vencida no es motivo', () => {
  const r = partirObservaciones('Resultado de TransUnion: puntaje 702. El caso pasa a revisión de un analista de Cofianza. Condición pendiente: coarrendatario. El ingreso no alcanza.')
  assert.deepEqual(r.motivos, ['El ingreso no alcanza.'])
})
