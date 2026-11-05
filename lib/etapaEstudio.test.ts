/**
 * Pruebas de lib/etapaEstudio y de queSigue (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/etapaEstudio.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularEtapa, turnoDeEtapa, type DatosEtapa } from './etapaEstudio'
import { queSigue } from './ayudaEstudio'

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
  // Gerencia, con el pago del prospecto: lo mismo que la lista («Esperando el pago»).
  assert.equal(
    calcularEtapa({ ...base, autorizacionEstado: 'autorizado', titularEstado: 'pago_pendiente', pagoPor: 'arrendatario' }),
    'pago_prospecto',
  )
  assert.equal(calcularEtapa({ ...base, autorizacionEstado: 'autorizado', titularEstado: 'fallido' }), 'fallida')
  assert.equal(calcularEtapa({ ...base, autorizacionEstado: 'autorizado', titularEstado: 'formulario_completado' }), 'sin_ejecutar')
  // Pagada antes de firmar (vitrina): espera al prospecto, no la consulta.
  assert.equal(calcularEtapa({ ...base, autorizacionEstado: 'pendiente', titularEstado: 'formulario_completado' }), 'autorizacion')
})

test('después de la consulta: decisión, contrato, firma y cierre', () => {
  assert.equal(calcularEtapa({ ...base, estado: 'condicionado' }), 'decision')
  assert.equal(calcularEtapa({ ...base, estado: 'aprobado' }), 'contrato')
  assert.equal(calcularEtapa({ ...base, estado: 'aprobado', contratosEstados: ['pendiente_firma'] }), 'firma')
  assert.equal(calcularEtapa({ ...base, estado: 'aprobado', contratosEstados: ['firma_incompleta'] }), 'firma_incompleta')
  assert.equal(turnoDeEtapa('firma_incompleta', false), 'gestor')
  assert.equal(calcularEtapa({ ...base, estado: 'aprobado', contratosEstados: ['cancelado', 'vigente'] }), 'vigente')
  assert.equal(calcularEtapa({ ...base, estado: 'rechazado' }), 'no_aprobado')
  assert.equal(calcularEtapa({ ...base, estado: 'cerrado' }), 'finalizado')
  assert.equal(calcularEtapa({ ...base, estado: 'cerrado', estadoPreCancelacion: 'borrador' }), 'cancelado')
  assert.equal(calcularEtapa({ ...base, estado: 'cerrado', estadoPreCancelacion: 'rechazado' }), 'no_aprobado')
})

test('Adenda 4: espera del coarrendatario, pago del prospecto y turno', () => {
  assert.equal(
    calcularEtapa({ ...base, autorizacionEstado: 'autorizado', titularEstado: 'en_proceso', esperaHasta: '2026-11-01T15:00:00Z' }),
    'espera_coarrendatario',
  )
  assert.equal(
    calcularEtapa({ ...base, autorizacionEstado: 'autorizado', pago: { estado: 'pendiente', puede_avanzar: false, paga: 'arrendatario' } }),
    'pago_prospecto',
  )
  assert.equal(turnoDeEtapa('decision', true), 'prospecto')
  assert.equal(turnoDeEtapa('decision', false), 'cofianza')
  assert.equal(turnoDeEtapa('visita', false), null)
})

test('qué sigue: espera con fecha, decisión del analista y estudio sin inmueble', () => {
  const o = { vista: 'gestor' as const, analista: false, fechaCondicion: null, esperaHasta: null, sinInmueble: false }
  const espera = queSigue('espera_coarrendatario', { ...o, esperaHasta: '2026-11-01T15:00:00Z' })
  assert.match(espera, /espera hasta el .+ a que el coarrendatario autorice/)
  assert.match(espera, /reenvíele la invitación/)
  assert.doesNotMatch(queSigue('espera_coarrendatario', { ...o, vista: 'equipo' }), /reenvíele/)
  assert.equal(queSigue('decision', { ...o, vista: 'cofianza', analista: true }), 'Revise el caso y decida si lo aprueba.')
  assert.equal(queSigue('decision', { ...o, vista: 'cofianza' }), 'Lo decide un analista de Cofianza.')
  assert.match(queSigue('decision', { ...o, fechaCondicion: '05/11/2026' }), /antes del 05\/11\/2026/)
  assert.match(queSigue('contrato', { ...o, vista: 'cofianza', sinInmueble: true }), /vincular el inmueble/)
  assert.equal(queSigue('consulta', { ...o, vista: 'equipo' }), queSigue('consulta', o))
  // En revisión sin condición no se ofrece coarrendatario: con 85 o más o bajo 70 no se admite.
  assert.doesNotMatch(queSigue('decision', o), /coarrendatario/)
})

test('U2: la consulta que no arrancó, para el analista de Cofianza', () => {
  const o = { vista: 'cofianza' as const, analista: true, fechaCondicion: null, esperaHasta: null, sinInmueble: false }
  assert.match(queSigue('sin_ejecutar', o), /Ejecútela en «Evaluación crediticia», en el detalle; quien tramita el arriendo también puede hacerlo\./)
  // Gerencia (no analista) y el gestor conservan su texto.
  assert.doesNotMatch(queSigue('sin_ejecutar', { ...o, analista: false }), /Ejecútela/)
  assert.match(queSigue('sin_ejecutar', { ...o, vista: 'gestor', analista: false }), /Ejecútela en «Evaluación crediticia», aquí abajo\./)
})

test('U8: la revisión sin condición se llama «En revisión de Cofianza»', async () => {
  const { ETAPA_LABEL } = await import('./etapaEstudio')
  assert.equal(ETAPA_LABEL.decision, 'En revisión de Cofianza')
})

test('Adenda 5: el paz y salvo pendiente espera al candidato y no dice el detalle', () => {
  // turnoDeEtapa: la decisión espera al candidato (coarrendatario o paz y salvo).
  assert.equal(turnoDeEtapa('decision', true), 'prospecto')
  const o = { vista: 'gestor' as const, analista: false, fechaCondicion: null, esperaHasta: null, sinInmueble: false, fechaPazYSalvo: '19/11/2026' }
  const gestor = queSigue('decision', o)
  assert.match(gestor, /requisito pendiente a cargo del candidato hasta el 19\/11\/2026/)
  assert.match(gestor, /no tiene que hacer nada/)
  const equipo = queSigue('decision', { ...o, vista: 'equipo' })
  assert.match(equipo, /requisito pendiente a cargo del candidato/)
  // §10: a la inmobiliaria y al propietario nunca se les dice que es una mora ni el monto.
  for (const t of [gestor, equipo]) assert.doesNotMatch(t, /mora|paz y salvo|\$/i)
  assert.match(queSigue('decision', { ...o, vista: 'cofianza', analista: true }), /acreditar el paz y salvo a más tardar el 19\/11\/2026.*acredítelo aquí abajo/)
  assert.doesNotMatch(queSigue('decision', { ...o, vista: 'cofianza' }), /acredítelo/)
  // La API cierra el plazo al final del día anunciado: «antes del» lo acortaba un día.
  for (const vista of ['gestor', 'equipo', 'cofianza'] as const) {
    for (const analista of [false, true]) assert.doesNotMatch(queSigue('decision', { ...o, vista, analista }), /antes del/)
  }
  // Sin paz y salvo, la decisión sigue siendo del analista.
  assert.equal(queSigue('decision', { ...o, vista: 'cofianza', analista: true, fechaPazYSalvo: null }), 'Revise el caso y decida si lo aprueba.')
  // A quién le escribió Cofianza: al candidato, no al gestor.
  assert.match(gestor, /Cofianza ya le escribió al candidato con el detalle/)
})

test('Adenda 5: con el paz y salvo ya cargado, lo revisa y lo acredita Cofianza', () => {
  const o = {
    vista: 'cofianza' as const,
    analista: true,
    fechaCondicion: null,
    esperaHasta: null,
    sinInmueble: false,
    fechaPazYSalvo: '19/11/2026',
    pazYSalvoCargado: true,
  }
  assert.equal(queSigue('decision', o), 'El candidato cargó el paz y salvo: revíselo y acredítelo aquí abajo.')
  assert.match(queSigue('decision', { ...o, analista: false }), /falta que un analista de Cofianza lo revise y lo acredite/)
  const gestor = queSigue('decision', { ...o, vista: 'gestor', analista: false })
  const equipo = queSigue('decision', { ...o, vista: 'equipo', analista: false })
  for (const t of [gestor, equipo]) {
    assert.match(t, /cargó el requisito pendiente y Cofianza lo revisa/)
    // §10: sin nombrar el documento ni la obligación.
    assert.doesNotMatch(t, /mora|paz y salvo|\$/i)
  }
  assert.match(gestor, /no tiene que hacer nada/)
})
