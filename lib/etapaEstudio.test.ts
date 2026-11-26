/**
 * Pruebas de lib/etapaEstudio y de queSigue (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/etapaEstudio.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularEtapa, esperaCargaNotariaContratos, turnoDeEtapa, type DatosEtapa } from './etapaEstudio'
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
  assert.match(espera, /espera hasta el .+ a que el segundo firmante autorice/)
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
  // El turno del aprobado con segundo firmante no es fijo: el criterio de la lista (depende_de).
  assert.equal(turnoDeEtapa('segundo_firmante', true, { coarrendatarioEnCurso: true }), 'prospecto')
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
  assert.equal(etiquetaTraba('coarrendatario_pendiente'), 'Aprobado · segundo firmante sin responder')
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

test('estudio reabierto por un reemplazo: espera a la persona nueva, nunca «No aprobado» ni «En evaluación»', async () => {
  const { ETAPA_LABEL } = await import('./etapaEstudio')
  const reabierto = { ...base, estado: 'en_revision' as DatosEtapa['estado'], titularEstado: 'completado', reaperturaAbierta: true }
  assert.equal(calcularEtapa(reabierto), 'reapertura')
  // Aunque una lectura llegue con el estado anterior todavía.
  assert.equal(calcularEtapa({ ...reabierto, estado: 'rechazado' }), 'reapertura')
  // Sin la marca, lo de siempre (el titular ya consultado: «En evaluación»).
  assert.equal(calcularEtapa({ ...reabierto, reaperturaAbierta: false }), 'consulta')
  // Cerrado manda.
  assert.equal(calcularEtapa({ ...reabierto, estado: 'cerrado' }), 'finalizado')
  // Bloque 4: un solo nombre (la persona nueva puede ser el solicitante, no solo el segundo firmante).
  assert.equal(ETAPA_LABEL.reapertura, 'Reabierto: esperando a la persona nueva')
  assert.equal(turnoDeEtapa('reapertura', false), 'prospecto')
  const texto = 'El estudio está reabierto: se decide de nuevo cuando la persona nueva acepte, autorice y termine su evaluación.'
  for (const vista of ['gestor', 'cofianza', 'equipo'] as const) {
    assert.equal(queSigue('reapertura', { vista, analista: vista === 'cofianza', fechaCondicion: null, esperaHasta: null, sinInmueble: false }), texto)
  }
})

test('punto 11: cuatro pasos fijos, el mismo nombre en todos los casos', async () => {
  const { PASOS_DETALLE, PASO_DE_ETAPA, PASO_RESULTADO, rotuloPaso, tonoDelPaso, ETAPA_LABEL } = await import('./etapaEstudio')
  type Etapa = keyof typeof PASO_DE_ETAPA
  assert.deepEqual([...PASOS_DETALLE], ['Estudio', 'Resultado', 'Contrato', 'Firma'])
  const paso = (e: Etapa) => PASOS_DETALLE[PASO_DE_ETAPA[e]] ?? 'completo'
  // Visita, autorización, pago y evaluación son el paso «Estudio».
  for (const e of ['visita', 'habilitar', 'no_habilitada', 'autorizacion', 'enlace', 'pago', 'pago_prospecto', 'consulta', 'espera_coarrendatario', 'sin_ejecutar', 'fallida'] as Etapa[]) {
    assert.equal(paso(e), 'Estudio', e)
  }
  for (const e of ['decision', 'segundo_firmante', 'bloqueado', 'no_aprobado', 'vencido', 'reapertura'] as Etapa[]) {
    assert.equal(paso(e), 'Resultado', e)
  }
  for (const e of ['contrato', 'canon_excede', 'coarrendatario_pendiente', 'coarrendatario_en_evaluacion', 'coarrendatario_en_verificacion'] as Etapa[]) {
    assert.equal(paso(e), 'Contrato', e)
  }
  for (const e of ['firma', 'firma_incompleta'] as Etapa[]) assert.equal(paso(e), 'Firma', e)
  assert.equal(paso('vigente'), 'completo')
  assert.equal(paso('finalizado'), 'completo')
  // Todas las etapas tienen paso.
  for (const e of Object.keys(ETAPA_LABEL) as Etapa[]) assert.equal(typeof PASO_DE_ETAPA[e], 'number', e)

  // El nombre no cambia con la etapa: ni «Aprobado» en el contrato ni «No aprobado» en el resultado.
  assert.equal(rotuloPaso(2, 'contrato'), 'Contrato')
  assert.equal(rotuloPaso(2, 'no_aprobado'), 'Contrato')
  assert.equal(rotuloPaso(PASO_RESULTADO, 'no_aprobado'), 'Resultado')
  assert.equal(rotuloPaso(PASO_RESULTADO, 'decision'), 'Resultado')
  // Solo el resultado, y solo mientras espera a un segundo firmante: con segundo firmante, reabierto por un
  // reemplazo o con la condición de coarrendatario de la Adenda 3.
  assert.equal(rotuloPaso(PASO_RESULTADO, 'segundo_firmante'), 'Segundo firmante')
  assert.equal(rotuloPaso(PASO_RESULTADO, 'reapertura'), 'Segundo firmante')
  assert.equal(rotuloPaso(PASO_RESULTADO, 'decision', true), 'Segundo firmante')
  assert.equal(rotuloPaso(0, 'segundo_firmante'), 'Estudio')
  assert.equal(rotuloPaso(PASO_RESULTADO, null), 'Resultado')
  assert.equal(rotuloPaso(PASO_RESULTADO, 'no_aprobado', true), 'Resultado')

  // El no aprobado marca el resultado en rojo; el vencido en gris; lo demás, como siempre.
  assert.equal(tonoDelPaso('no_aprobado'), 'rojo')
  assert.equal(tonoDelPaso('vencido'), 'gris')
  assert.equal(tonoDelPaso('decision'), 'normal')
  assert.equal(tonoDelPaso('contrato'), 'normal')
})

test('turno del aprobado con segundo firmante: el mismo criterio que la lista', async () => {
  const { turnoDeEtapa, turnoSegundoFirmante } = await import('./etapaEstudio')
  // Con apelación radicada, Cofianza (aunque haya coarrendatario en curso).
  assert.equal(turnoSegundoFirmante({ apelacion: true, coarrendatarioEnCurso: true }), 'cofianza')
  // Coarrendatario en curso (invitación vigente o evaluación sin terminar): se le espera.
  assert.equal(turnoSegundoFirmante({ coarrendatarioEnCurso: true }), 'prospecto')
  // Sin coarrendatario en curso: quien gestiona lo invita o lo reemplaza.
  assert.equal(turnoSegundoFirmante({ coarrendatarioEnCurso: false }), 'gestor')
  // Sin saberlo todavía: sin turno (nunca uno que luego cambie).
  assert.equal(turnoSegundoFirmante({ coarrendatarioEnCurso: null }), null)
  assert.equal(turnoSegundoFirmante(), null)
  assert.equal(turnoDeEtapa('segundo_firmante', false, { coarrendatarioEnCurso: false }), 'gestor')
  assert.equal(turnoDeEtapa('segundo_firmante', false), null)
  // Las demás etapas no cambian.
  assert.equal(turnoDeEtapa('decision', true, { coarrendatarioEnCurso: false }), 'prospecto')
})

test('punto 9: el nombre del condicionado según el resultado', async () => {
  const { etiquetaCondicionado, ETIQUETA_CONDICIONADO } = await import('./etapaEstudio')
  assert.equal(etiquetaCondicionado({ desenlace: 'aprobado_segundo_firmante' }), 'Aprobado con segundo firmante')
  assert.equal(etiquetaCondicionado({ desenlace: 'bloqueado_listas' }), 'Bloqueado por listas')
  assert.equal(etiquetaCondicionado({ tipo: 'con_coarrendatario' }), 'En revisión')
  assert.equal(etiquetaCondicionado({}), 'En revisión o con segundo firmante')
  assert.equal(ETIQUETA_CONDICIONADO, 'En revisión o con segundo firmante')
})

// ── Bloque 4 (revisión del conjunto, 23-nov) ──────────────────────────────────

test('bloque 4: «aprobado con segundo firmante» con el segundo en verificación: turno de Cofianza', async () => {
  const { turnoDeEtapa, turnoSegundoFirmante } = await import('./etapaEstudio')
  // Con la evaluación terminada el coarrendatario ya no está «en curso»: antes el turno caía en quien gestiona.
  assert.equal(turnoSegundoFirmante({ coarrendatarioEnCurso: false, enVerificacion: true }), 'cofianza')
  // Lo dice el estudio (segundo_en_verificacion): no hace falta esperar a leer el coarrendatario.
  assert.equal(turnoSegundoFirmante({ enVerificacion: true }), 'cofianza')
  assert.equal(turnoDeEtapa('segundo_firmante', true, { coarrendatarioEnCurso: null, enVerificacion: true }), 'cofianza')
  // Sin la marca, como antes.
  assert.equal(turnoSegundoFirmante({ coarrendatarioEnCurso: false, enVerificacion: false }), 'gestor')
  // Solo aplica a esa etapa.
  assert.equal(turnoDeEtapa('contrato', false, { enVerificacion: true }), 'gestor')
})

test('bloque 4: «qué sigue» con el segundo firmante en verificación', async () => {
  const { TEXTO_SEGUNDO_EN_VERIFICACION, TEXTO_VERIFICAR_SEGUNDO_FIRMANTE } = await import('./ayudaEstudio')
  const o = { vista: 'gestor' as const, analista: false, fechaCondicion: null, esperaHasta: null, sinInmueble: false }
  const deLaApi = 'Cofianza está verificando al segundo firmante presentado. No tiene que hacer nada: el plazo no vence mientras tanto y empieza de nuevo cuando termine la verificación.'
  // Lo dice la API: su texto, tal cual (sin fecha).
  assert.equal(queSigue('segundo_firmante', { ...o, textoApi: deLaApi, segundoEnVerificacion: 'api' }), deLaApi)
  // Lo dedujo la web (API anterior): el texto de la API todavía pediría presentar a alguien, con una fecha que ya no rechaza.
  const viejo = 'Presente un segundo firmante antes del 05/12/2026.'
  const respaldo = queSigue('segundo_firmante', { ...o, textoApi: viejo, segundoEnVerificacion: 'web' })
  assert.equal(respaldo, TEXTO_SEGUNDO_EN_VERIFICACION)
  assert.doesNotMatch(respaldo, /Presente|antes del|plazo/)
  // Al analista: qué le toca, y dónde. En la lista, sin «aquí abajo».
  const analista = { ...o, vista: 'cofianza' as const, analista: true }
  assert.equal(queSigue('segundo_firmante', { ...analista, textoApi: deLaApi, segundoEnVerificacion: 'api' }), TEXTO_VERIFICAR_SEGUNDO_FIRMANTE)
  // Sin prometer botones que la API puede no dar: cuáles hay, lo dice la evaluación.
  assert.equal(TEXTO_VERIFICAR_SEGUNDO_FIRMANTE, 'Verifique al segundo firmante en su evaluación, aquí abajo: allí están las acciones disponibles.')
  assert.doesNotMatch(TEXTO_VERIFICAR_SEGUNDO_FIRMANTE, /dar(la)? por verificad|pedir de nuevo/)
  assert.doesNotMatch(queSigue('segundo_firmante', { ...analista, segundoEnVerificacion: 'api', enLista: true }), /aquí abajo/)
  // Gerencia (Cofianza sin edición): el texto que la API redacta para Cofianza; en el respaldo, ni «usted presentó» ni «verifique».
  const paraCofianza = 'El segundo firmante presentado está en verificación de Cofianza.'
  assert.equal(queSigue('segundo_firmante', { ...o, vista: 'cofianza', textoApi: paraCofianza, segundoEnVerificacion: 'api' }), paraCofianza)
  const gerencia = queSigue('segundo_firmante', { ...o, vista: 'cofianza', textoApi: viejo, segundoEnVerificacion: 'web' })
  assert.doesNotMatch(gerencia, /usted presentó|Verifique|Presente/)
  assert.match(gerencia, /Cofianza verifica al segundo firmante/)
  // Sin verificación, como siempre: manda el texto de la API.
  assert.equal(queSigue('segundo_firmante', { ...o, textoApi: viejo }), viejo)
  assert.equal(queSigue('segundo_firmante', { ...analista, textoApi: viejo }), viejo)
})

test('bloque 4: trabas del segundo firmante que ya aceptó: etapa, nombre, paso, turno y texto', async () => {
  const { ETAPA_LABEL, PASO_DE_ETAPA, PASOS_DETALLE, esEtapaDeTraba, etapaDeTraba, etiquetaTraba } = await import('./etapaEstudio')
  const { TEXTO_VERIFICAR_SEGUNDO_FIRMANTE } = await import('./ayudaEstudio')
  const o = { vista: 'gestor' as const, analista: false, fechaCondicion: null, esperaHasta: null, sinInmueble: false }
  for (const codigo of ['coarrendatario_en_evaluacion', 'coarrendatario_en_verificacion'] as const) {
    assert.equal(etapaDeTraba(codigo), codigo)
    assert.equal(calcularEtapa({ ...base, estado: 'aprobado', trabaCodigo: codigo }), codigo)
    assert.equal(esEtapaDeTraba(codigo), true)
    // Aprobado, en el paso del contrato, pero nunca «Aprobado» a secas ni «crear el contrato».
    assert.equal(PASOS_DETALLE[PASO_DE_ETAPA[codigo]], 'Contrato')
    assert.match(ETAPA_LABEL[codigo], /^Aprobado · segundo firmante en /)
    assert.equal(etiquetaTraba(codigo), ETAPA_LABEL[codigo])
    // Esperarlo o seguir sin él lo decide quien gestiona.
    assert.equal(turnoDeEtapa(codigo, false), 'gestor')
    // El texto de la API, tal cual, para quien puede actuar; el respaldo nunca dice «cree el contrato».
    assert.equal(queSigue(codigo, { ...o, textoTraba: 'Texto de la API.' }), 'Texto de la API.')
    assert.match(queSigue(codigo, o), /seguir sin él|siga sin él/)
    assert.doesNotMatch(queSigue(codigo, o), /cree el contrato/)
    // Solo lectura y Gerencia: sus textos, no el de la API.
    assert.match(queSigue(codigo, { ...o, vista: 'equipo', textoTraba: 'Texto de la API.' }), /alguien de su equipo con permiso de edición/i)
    assert.match(queSigue(codigo, { ...o, vista: 'cofianza', textoTraba: 'Texto de la API.' }), /la inmobiliaria o el propietario/i)
    // El resultado todavía tiene que servir para el contrato: su vencimiento se muestra.
    const { vigenciaResultado } = await import('./etapaEstudio')
    assert.notEqual(vigenciaResultado(codigo, { hasta: '2026-12-13T15:00:00Z', ahoraMs: Date.parse('2026-11-23T15:00:00Z') }), null)
  }
  assert.equal(ETAPA_LABEL.coarrendatario_en_evaluacion, 'Aprobado · segundo firmante en evaluación')
  assert.equal(ETAPA_LABEL.coarrendatario_en_verificacion, 'Aprobado · segundo firmante en verificación')
  // Al analista, con la verificación pendiente: qué le toca (aunque el estudio ya esté aprobado).
  assert.equal(queSigue('coarrendatario_en_verificacion', { ...o, vista: 'cofianza', analista: true }), TEXTO_VERIFICAR_SEGUNDO_FIRMANTE)
  // La evaluación en curso no es algo que el analista resuelva.
  assert.doesNotMatch(queSigue('coarrendatario_en_evaluacion', { ...o, vista: 'cofianza', analista: true }), /Verifique/)
  // El mismo código tiene dos textos en la API (en curso / consulta fallida): a quien gestiona, siempre el de la API;
  // los textos propios (respaldo y los de quien no gestiona) no afirman que la evaluación esté «en curso».
  const fallida = 'La evaluación del segundo firmante no se completó. Reinténtela desde el estudio o siga sin él.'
  assert.equal(queSigue('coarrendatario_en_evaluacion', { ...o, textoTraba: fallida }), fallida)
  for (const vista of ['gestor', 'cofianza', 'equipo'] as const) {
    assert.doesNotMatch(queSigue('coarrendatario_en_evaluacion', { ...o, vista }), /en curso/)
    assert.match(queSigue('coarrendatario_en_evaluacion', { ...o, vista }), /todavía no tiene resultado/)
  }
  // «Segundo firmante» también en las etapas de antes.
  assert.equal(ETAPA_LABEL.coarrendatario_pendiente, 'Aprobado · segundo firmante sin responder')
  assert.equal(ETAPA_LABEL.espera_coarrendatario, 'Esperando al segundo firmante')
})

test('bloque 4: el vencimiento se cuenta contra firmar_hasta (el margen que necesita la firma)', async () => {
  const { vigenciaResultado } = await import('./etapaEstudio')
  // 23-nov-2026 10:00 en Bogotá. La vigencia termina el 13-dic; se puede enviar a firma hasta el 10-dic (fecha ficticia).
  const ahoraMs = Date.parse('2026-11-23T15:00:00Z')
  const hasta = '2026-12-13T15:00:00Z'
  const v = (firmarHasta: string | null | undefined, etapa: Parameters<typeof vigenciaResultado>[0] = 'contrato') =>
    vigenciaResultado(etapa, { hasta, firmarHasta, ahoraMs })
  const con = v('2026-12-10T14:00:00Z')
  assert.equal(con?.texto, 'Vence en 20 días · envíe a firma antes del 10 de diciembre')
  assert.equal(con?.tono, 'gris')
  assert.equal(con?.titulo, 'Después de esa fecha ya no alcanza el tiempo para firmar; el resultado vence el 13 de diciembre de 2026')
  // Ámbar desde los 7 días para firmar (aunque al resultado le queden más).
  assert.equal(v('2026-11-30T14:00:00Z')?.texto, 'Vence en 20 días · envíe a firma antes del 30 de noviembre')
  assert.equal(v('2026-11-30T14:00:00Z')?.tono, 'ambar')
  assert.equal(v('2026-11-24T14:00:00Z')?.texto, 'Vence en 20 días · envíe a firma antes del 24 de noviembre')
  // Más tarde hoy, en hora de Colombia.
  assert.equal(v('2026-11-24T03:00:00Z')?.texto, 'Vence en 20 días · envíe a firma hoy')
  // De otro año, con el año.
  assert.match(
    vigenciaResultado('contrato', { hasta: '2027-01-08T15:00:00Z', firmarHasta: '2027-01-05T14:00:00Z', ahoraMs })?.texto ?? '',
    /^Vence en 46 días · envíe a firma antes del 5 de enero de 2027$/,
  )
  // Ya pasó el margen y la API todavía no marcó la traba: nunca un plazo como si alcanzara.
  const sinMargen = v('2026-11-23T14:00:00Z')
  assert.equal(sinMargen?.texto, 'Vence en 20 días · ya no alcanza para firmar')
  assert.equal(sinMargen?.tono, 'ambar')
  // Sin firmar_hasta (API anterior), como hoy: contra el fin de la vigencia.
  assert.equal(v(null)?.texto, 'Vence en 20 días')
  assert.equal(v(undefined)?.titulo, 'El resultado sirve hasta el 13 de diciembre de 2026')
  assert.equal(v('no es fecha')?.texto, 'Vence en 20 días')
  // Vale igual en las etapas con traba; con el resultado ya vencido manda «Vencido».
  assert.equal(v('2026-12-10T14:00:00Z', 'canon_excede')?.texto, 'Vence en 20 días · envíe a firma antes del 10 de diciembre')
  assert.equal(v('2026-12-10T14:00:00Z', 'firma'), null)
  assert.equal(vigenciaResultado('contrato', { hasta: '2026-11-22T15:00:00Z', firmarHasta: '2026-11-19T14:00:00Z', ahoraMs })?.texto, 'Vencido')
  // La etapa «vencido» no cambia: la decide la traba de la API.
  assert.equal(
    vigenciaResultado('vencido', { vencioEn: '2026-11-25T15:00:00Z', firmarHasta: '2026-11-22T14:00:00Z', sinMargen: true, ahoraMs })?.texto,
    'Vence en 2 días · ya no alcanza para firmar',
  )
})

test('bloque 4: la traba del canon por el tope de Cofianza tiene su propio nombre', async () => {
  const { etiquetaTraba, esTrabaPorTope } = await import('./etapaEstudio')
  // Lo dice la API con su campo (cifras ficticias); manda sobre la leyenda y la cifra.
  const tope = { sobre_tope: true, hasta_canon: false, canon_habilitado_cop: 1_234_000 }
  assert.equal(esTrabaPorTope(tope), true)
  assert.equal(etiquetaTraba('canon_excede', tope), 'Aprobado · canon sobre el tope')
  assert.equal(etiquetaTraba('canon_excede', { sobre_tope: true }), 'Aprobado · canon sobre el tope')
  // Sin el campo (las demás trabas del canon, o una API anterior), como antes: nunca se deduce del texto.
  assert.equal(esTrabaPorTope({ hasta_canon: true, canon_habilitado_cop: 1_250_000 }), false)
  assert.equal(etiquetaTraba('canon_excede', { hasta_canon: true, canon_habilitado_cop: 1_250_000 }), 'Aprobado hasta un canon de $1.250.000')
  assert.equal(etiquetaTraba('canon_excede', { hasta_canon: false, canon_habilitado_cop: 1_234_000 }), 'Aprobado · canon mayor al evaluado')
  assert.equal(esTrabaPorTope(null), false)
})

test('bloque 4: aviso al aprobar: si algo impide el contrato, se dice eso', async () => {
  const { avisoEstudioAprobado } = await import('./ayudaEstudio')
  assert.equal(avisoEstudioAprobado(null), 'Estudio aprobado. Ya puede crear el contrato.')
  assert.equal(avisoEstudioAprobado(undefined), 'Estudio aprobado. Ya puede crear el contrato.')
  assert.equal(avisoEstudioAprobado({ texto: 'El canon de la propiedad supera lo que cubre el estudio.' }), 'Estudio aprobado. El canon de la propiedad supera lo que cubre el estudio.')
  assert.doesNotMatch(avisoEstudioAprobado({ texto: 'Texto de la API.' }), /Ya puede crear el contrato/)
  // Una traba sin texto no deja el aviso a medias.
  assert.equal(avisoEstudioAprobado({ texto: '  ' }), 'Estudio aprobado. Ya puede crear el contrato.')
  assert.equal(avisoEstudioAprobado(null, { sinInmueble: true }), 'Estudio aprobado. Para crear el contrato, primero vincule el inmueble.')
})

test('bloque 4: no aprobado con una persona reemplazable: la salida va antes que la apelación', () => {
  const o = { vista: 'gestor' as const, analista: false, fechaCondicion: null, esperaHasta: null, sinInmueble: false }
  assert.equal(
    queSigue('no_aprobado', { ...o, reemplazoPosible: true }),
    'El estudio no quedó aprobado. Puede reemplazar a una persona en «Personas del estudio», aquí abajo, o, si todavía aplica, el solicitante puede apelar (vea abajo).',
  )
  assert.match(queSigue('no_aprobado', { ...o, vista: 'equipo', reemplazoPosible: true }), /Alguien de su equipo con permiso de edición puede reemplazar/)
  assert.match(queSigue('no_aprobado', { ...o, vista: 'cofianza', reemplazoPosible: true }), /La inmobiliaria o el propietario pueden reemplazar/)
  // La apelación, sin afirmarla: su plazo pudo vencer (lo dice el banner de abajo).
  for (const vista of ['gestor', 'equipo', 'cofianza'] as const) {
    assert.match(queSigue('no_aprobado', { ...o, vista, reemplazoPosible: true }), /si todavía aplica, el solicitante puede apelar \(vea abajo\)\.$/)
  }
  assert.doesNotMatch(queSigue('no_aprobado', { ...o, reemplazoPosible: true, enLista: true }), /aquí abajo|vea abajo/)
  // Sin reemplazo posible, como antes.
  assert.equal(queSigue('no_aprobado', o), 'El estudio no quedó aprobado. Abajo están el motivo y, si aplica, cómo apelar.')
  // Solo en el no aprobado.
  assert.doesNotMatch(queSigue('contrato', { ...o, reemplazoPosible: true }), /reemplazar/)
})

test('revisión de UX: un solo nombre («segundo firmante») en los estados de la Adenda 5', async () => {
  const { ETAPA_LABEL } = await import('./etapaEstudio')
  const o = { vista: 'gestor' as const, analista: false, fechaCondicion: null, esperaHasta: null, sinInmueble: false }
  const etapas = ['espera_coarrendatario', 'coarrendatario_pendiente', 'coarrendatario_en_evaluacion', 'coarrendatario_en_verificacion'] as const
  for (const etapa of etapas) {
    // El chip y la ayuda dicen lo mismo: «coarrendatario» queda para la invitación y la condición de la Adenda 3.
    assert.match(ETAPA_LABEL[etapa], /segundo firmante/)
    for (const vista of ['gestor', 'cofianza', 'equipo'] as const) {
      const texto = queSigue(etapa, { ...o, vista })
      assert.match(texto, /segundo firmante/, `${etapa}/${vista}`)
      assert.doesNotMatch(texto, /coarrendatario/i, `${etapa}/${vista}`)
    }
  }
  // La condición de la Adenda 3 sí habla del coarrendatario.
  assert.match(queSigue('decision', { ...o, fechaCondicion: '05/11/2026' }), /coarrendatario/)
})

test('revisión de UX: «aprobado con segundo firmante» sin nada que hacer (prospecto: «En revisión», sin plazo)', async () => {
  const { sinAccionSegundoFirmante } = await import('./etapaEstudio')
  // Lo dice la API: sin acción mientras Cofianza verifica a la otra persona.
  assert.equal(sinAccionSegundoFirmante({ desenlace: 'aprobado_segundo_firmante', siguiente_accion: 'ninguna' }), true)
  // Con algo que hacer (presentar o reemplazar), o en otro resultado, no.
  assert.equal(sinAccionSegundoFirmante({ desenlace: 'aprobado_segundo_firmante', siguiente_accion: 'presentar_segundo_firmante' }), false)
  assert.equal(sinAccionSegundoFirmante({ desenlace: 'aprobado_segundo_firmante', siguiente_accion: 'sustituir_segundo_firmante' }), false)
  assert.equal(sinAccionSegundoFirmante({ desenlace: 'aprobado', siguiente_accion: 'ninguna' }), false)
  // Una API anterior no manda la acción: como antes.
  assert.equal(sinAccionSegundoFirmante({ desenlace: 'aprobado_segundo_firmante' }), false)
  assert.equal(sinAccionSegundoFirmante(null), false)
})

test('Adenda 6 §4: las listas del solicitante sin verificar en un estudio aprobado', async () => {
  const { ETAPA_LABEL, PASO_DE_ETAPA, PASOS_DETALLE, esEtapaDeTraba, etapaDeTraba } = await import('./etapaEstudio')
  const { TEXTO_REGISTRAR_LISTAS_SOLICITANTE } = await import('./ayudaEstudio')
  const o = { vista: 'gestor' as const, analista: false, fechaCondicion: null, esperaHasta: null, sinInmueble: false }
  assert.equal(etapaDeTraba('solicitante_en_verificacion'), 'solicitante_en_verificacion')
  assert.equal(calcularEtapa({ ...base, estado: 'aprobado', trabaCodigo: 'solicitante_en_verificacion' }), 'solicitante_en_verificacion')
  assert.equal(esEtapaDeTraba('solicitante_en_verificacion'), true)
  assert.equal(PASOS_DETALLE[PASO_DE_ETAPA.solicitante_en_verificacion], 'Contrato')
  assert.equal(ETAPA_LABEL.solicitante_en_verificacion, 'Aprobado · verificación de Cofianza')
  // Lo resuelve Cofianza: quien gestiona solo espera, y nunca se le dice que cree el contrato ni se nombran las listas.
  assert.equal(turnoDeEtapa('solicitante_en_verificacion', false), 'cofianza')
  assert.doesNotMatch(queSigue('solicitante_en_verificacion', o), /cree el contrato|listas/)
  assert.equal(queSigue('solicitante_en_verificacion', { ...o, textoTraba: 'Texto de la API.' }), 'Texto de la API.')
  // Al analista: qué le toca.
  assert.equal(queSigue('solicitante_en_verificacion', { ...o, vista: 'cofianza', analista: true }), TEXTO_REGISTRAR_LISTAS_SOLICITANTE)
})

test('Adenda 6 §2: en firma esperan las partes; en notaría, el turno es de quien gestiona (revisión de integración, punto 1)', () => {
  assert.equal(turnoDeEtapa('firma', false), 'firmas')
  assert.equal(turnoDeEtapa('firma', false, {}, { firmaNotaria: true }), 'gestor')
  // La marca solo cambia la etapa de firma.
  assert.equal(turnoDeEtapa('vigente', false, {}, { firmaNotaria: true }), null)
  // Del listado de contratos del estudio: el V3 en firma con firma_notaria (la misma regla que la lista de estudios).
  assert.equal(esperaCargaNotariaContratos([{ estado: 'pendiente_firma', destinacion: 'vivienda', firma_notaria: true }]), true)
  assert.equal(esperaCargaNotariaContratos([{ estado: 'pendiente_firma', destinacion: 'vivienda', firma_notaria: false }]), false)
  assert.equal(esperaCargaNotariaContratos([{ estado: 'pendiente_firma', destinacion: 'vivienda' }]), false)
  // El flujo anterior (sin destinación) no cuenta: allí la carga la ofrece el contrato, sin turno en la lista.
  assert.equal(esperaCargaNotariaContratos([{ estado: 'pendiente_firma', destinacion: null, firma_notaria: true }]), false)
  assert.equal(esperaCargaNotariaContratos([{ estado: 'vigente', destinacion: 'vivienda', firma_notaria: true }]), false)
  assert.equal(esperaCargaNotariaContratos([]), false)
})
