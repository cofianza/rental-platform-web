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

// Con el resultado que envía la API (`desenlace`), la etapa del condicionado sale de él.
test('condicionado: sin desenlace, «decision» como siempre', () => {
  assert.equal(calcularEtapa({ ...base, estado: 'condicionado' }), 'decision')
  assert.equal(calcularEtapa({ ...base, estado: 'condicionado', desenlace: null }), 'decision')
  // Un valor que esta versión no conoce no rompe nada.
  assert.equal(calcularEtapa({ ...base, estado: 'condicionado', desenlace: 'otro' }), 'decision')
})

test('condicionado: con desenlace, su etapa y su turno', () => {
  assert.equal(calcularEtapa({ ...base, estado: 'condicionado', desenlace: 'aprobado_segundo_firmante' }), 'segundo_firmante')
  assert.equal(calcularEtapa({ ...base, estado: 'condicionado', desenlace: 'bloqueado_listas' }), 'bloqueado')
  assert.equal(turnoDeEtapa('segundo_firmante', true), 'prospecto')
  assert.equal(turnoDeEtapa('bloqueado', false), 'gestor')
  // Fuera del condicionado el desenlace no mueve la etapa.
  assert.equal(calcularEtapa({ ...base, estado: 'aprobado', desenlace: 'aprobado' }), 'contrato')
  assert.equal(calcularEtapa({ ...base, estado: 'rechazado', desenlace: 'rechazado' }), 'no_aprobado')
})

test('queSigue: en las etapas del resultado manda el texto de la API', () => {
  const o = { vista: 'gestor' as const, analista: false, fechaCondicion: null, esperaHasta: null, sinInmueble: false }
  assert.equal(queSigue('segundo_firmante', { ...o, textoApi: 'Texto de la API.' }), 'Texto de la API.')
  assert.equal(queSigue('bloqueado', { ...o, textoApi: 'Otro texto.' }), 'Otro texto.')
  // Sin texto de la API hay un respaldo; en las demás etapas el texto de la API no se usa.
  assert.match(queSigue('segundo_firmante', o), /segundo firmante/)
  assert.doesNotMatch(queSigue('decision', { ...o, textoApi: 'Texto de la API.' }), /Texto de la API/)
})

test('reporte de Gerencia (21-nov): etapas de traba, su nombre y su texto', async () => {
  const { etiquetaTraba } = await import('./etapaEstudio')
  assert.equal(calcularEtapa({ ...base, estado: 'aprobado', trabaCodigo: 'canon_excede' }), 'canon_excede')
  assert.equal(calcularEtapa({ ...base, estado: 'aprobado', trabaCodigo: 'coarrendatario_pendiente' }), 'coarrendatario_pendiente')
  assert.equal(calcularEtapa({ ...base, estado: 'aprobado', trabaCodigo: 'vencido' }), 'vencido')
  assert.equal(calcularEtapa({ ...base, estado: 'aprobado', trabaCodigo: 'otro' }), 'contrato')
  assert.equal(calcularEtapa({ ...base, estado: 'aprobado', trabaCodigo: 'vencido', contratosEstados: ['pendiente_firma'] }), 'firma')
  assert.equal(turnoDeEtapa('canon_excede', false), 'gestor')
  assert.equal(turnoDeEtapa('coarrendatario_pendiente', false), 'gestor')
  // El vencido no es turno de nadie (la API: depende_de null, no «requiere su acción»).
  assert.equal(turnoDeEtapa('vencido', false), null)
  // Con la leyenda «hasta un canon»: la cifra; sin ella, canon mayor al evaluado; sin hasta_canon (API anterior) decide la cifra.
  assert.equal(etiquetaTraba('canon_excede', { hasta_canon: true, canon_habilitado_cop: 1_250_000 }), 'Aprobado hasta un canon de $1.250.000')
  assert.equal(etiquetaTraba('canon_excede', { hasta_canon: true }), 'Aprobado hasta un canon menor')
  assert.equal(etiquetaTraba('canon_excede', { hasta_canon: false, canon_habilitado_cop: 1_500_000 }), 'Aprobado · canon mayor al evaluado')
  assert.equal(etiquetaTraba('canon_excede', { canon_habilitado_cop: 1_250_000 }), 'Aprobado hasta un canon de $1.250.000')
  // Estudios anteriores a la Adenda 5: canon_excede sin la cifra.
  assert.equal(etiquetaTraba('canon_excede', {}), 'Aprobado · canon mayor al evaluado')
  assert.equal(etiquetaTraba('canon_excede'), 'Aprobado · canon mayor al evaluado')
  assert.equal(etiquetaTraba('coarrendatario_pendiente'), 'Aprobado · coarrendatario sin responder')
  assert.equal(etiquetaTraba('vencido'), 'Resultado vencido')
  assert.equal(etiquetaTraba('vencido', { sin_margen: true }), 'Resultado por vencer')
  const o = { vista: 'gestor' as const, analista: false, fechaCondicion: null, esperaHasta: null, sinInmueble: false }
  // El texto de la API, tal cual, solo para el gestor que puede actuar; sin él, un respaldo que no dice «cree el contrato».
  assert.equal(queSigue('canon_excede', { ...o, textoTraba: 'Texto de la API.' }), 'Texto de la API.')
  assert.equal(queSigue('canon_excede', { ...o, perfilIncompleto: true, textoTraba: 'Texto de la API.' }), 'Complete su perfil para poder actuar en este estudio.')
  for (const etapa of ['canon_excede', 'coarrendatario_pendiente', 'vencido'] as const) {
    assert.doesNotMatch(queSigue(etapa, o), /cree el contrato aquí abajo/)
    // Cofianza, Gerencia y solo lectura: sus propios textos, no el de la API (que le habla al gestor).
    assert.doesNotMatch(queSigue(etapa, { ...o, vista: 'cofianza', textoTraba: 'Texto de la API.' }), /Texto de la API/)
    assert.doesNotMatch(queSigue(etapa, { ...o, vista: 'equipo', textoTraba: 'Texto de la API.' }), /Texto de la API/)
  }
  assert.match(queSigue('canon_excede', { ...o, vista: 'cofianza' }), /la inmobiliaria o el propietario/)
  assert.match(queSigue('vencido', { ...o, vista: 'equipo' }), /Alguien de su equipo con permiso de edición/)
  // Solo lectura con el perfil incompleto: el mismo reemplazo de siempre.
  assert.equal(queSigue('canon_excede', { ...o, vista: 'equipo', perfilIncompleto: true }), 'Complete su perfil para poder actuar en este estudio.')
  // En las demás etapas el texto de la traba no se usa.
  assert.doesNotMatch(queSigue('contrato', { ...o, textoTraba: 'Texto de la API.' }), /Texto de la API/)
})

test('punto 7: vencimiento del resultado en días de Colombia', async () => {
  const { vigenciaResultado } = await import('./etapaEstudio')
  // 23-nov-2026 10:00 en Bogotá (15:00 UTC).
  const ahoraMs = Date.parse('2026-11-23T15:00:00Z')
  const v = (hasta: string | null, etapa: Parameters<typeof vigenciaResultado>[0] = 'contrato') =>
    vigenciaResultado(etapa, { hasta, ahoraMs })
  assert.deepEqual(
    { texto: v('2026-12-13T15:00:00Z')?.texto, tono: v('2026-12-13T15:00:00Z')?.tono },
    { texto: 'Vence en 20 días', tono: 'gris' },
  )
  assert.equal(v('2026-11-30T15:00:00Z')?.texto, 'Vence en 7 días')
  assert.equal(v('2026-11-30T15:00:00Z')?.tono, 'ambar')
  assert.equal(v('2026-11-24T15:00:00Z')?.texto, 'Vence en 1 día')
  // Más tarde hoy (hora de Colombia), aunque en UTC ya sea mañana.
  assert.equal(v('2026-11-24T03:00:00Z')?.texto, 'Vence hoy')
  assert.equal(v('2026-11-23T14:00:00Z')?.texto, 'Vencido')
  assert.equal(v('2026-11-23T14:00:00Z')?.tono, 'rojo')
  // Una fecha sola sirve hasta el final de ese día.
  assert.equal(v('2026-11-23')?.texto, 'Vence hoy')
  assert.equal(v('2026-11-22')?.texto, 'Vencido')
  assert.equal(v('2026-11-25')?.texto, 'Vence en 2 días')
  // Solo mientras el resultado tenga que servir para el contrato; sin fecha, nada.
  assert.equal(v('2026-12-13T15:00:00Z', 'firma'), null)
  assert.equal(v(null), null)
  assert.equal(v('2026-12-13T15:00:00Z', 'canon_excede')?.texto, 'Vence en 20 días')
  // Con la etapa «vencido»: «Vencido», en gris como la etapa (la fecha va en el title).
  const vencido = vigenciaResultado('vencido', { hasta: null, vencioEn: '2026-11-03T15:00:00Z', ahoraMs })
  assert.deepEqual({ texto: vencido?.texto, tono: vencido?.tono }, { texto: 'Vencido', tono: 'gris' })
  assert.equal(vencido?.titulo, 'El resultado venció el 3 de noviembre de 2026')
  assert.equal(vigenciaResultado('vencido', { ahoraMs })?.texto, 'Vencido')
  // Sin margen para firmar: todavía no vence, pero nunca un plazo como si sirviera.
  assert.equal(
    vigenciaResultado('vencido', { vencioEn: '2026-11-28T15:00:00Z', sinMargen: true, ahoraMs })?.texto,
    'Vence en 5 días · ya no alcanza para firmar',
  )
  assert.equal(vigenciaResultado('vencido', { vencioEn: '2026-11-23T20:00:00Z', sinMargen: true, ahoraMs })?.texto, 'Vence hoy · ya no alcanza para firmar')
  // Si la fecha ya pasó, aunque llegue sin_margen, es «Vencido».
  assert.equal(vigenciaResultado('vencido', { vencioEn: '2026-11-20T15:00:00Z', sinMargen: true, ahoraMs })?.texto, 'Vencido')
  assert.equal(v('2026-11-30T15:00:00Z')?.titulo, 'El resultado sirve hasta el 30 de noviembre de 2026')
})
