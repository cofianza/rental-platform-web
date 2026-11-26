/**
 * Pruebas de lib/personaEstudio (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/personaEstudio.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ROTULO_SIN_EFECTO,
  SOLICITANTE_ANTERIOR,
  TEXTO_CANCELAR_INVITACION_REAPERTURA,
  TEXTO_CANCELAR_REAPERTURA,
  TEXTO_EN_ESPERA,
  TEXTO_ENLACE_VENCIDO_REAPERTURA,
  TEXTO_ESTUDIO_CERRADO,
  TEXTO_REAPERTURA,
  TEXTO_TERMINO_SIN_APROBAR,
  TOAST_INVITACION_CANCELADA_REAPERTURA,
  avisoReemplazoEnRechazado,
  cierreDelEstudio,
  comoSePresento,
  esSalidaDelEstudio,
  estaCerrado,
  estaEnVerificacion,
  evaluacionDeOtroSolicitante,
  fechaColombia,
  insigniaPersona,
  noCalificaEnRojo,
  papelEnElEstudio,
  personaA5dUsable,
  rolDeclarado,
  rotuloCoarrendatario,
  terminoSinAprobar,
  textoCoarrendatario,
  textoFirmarHastaCambio,
  textoPlazoReapertura,
  textoVerificacionAnalista,
  titularEstudioTerminado,
  tonoPersonaA5d,
  type CierreEstudio,
} from './personaEstudio'
import type { IPersonaA5d } from '@/types/estudio'

const RESULTADOS = ['aprobado', 'rechazado', 'condicionado', 'pendiente', null, undefined]
const TERMINADOS: CierreEstudio[] = ['no_aprobable', 'cerrado_sin_aprobar', 'cerrado']
const PROHIBIDO = /sigue con el titular|analista|se decide con los dos/i

test('en qué quedó el estudio', () => {
  assert.equal(cierreDelEstudio('rechazado'), 'no_aprobable')
  assert.equal(cierreDelEstudio('cerrado', 'rechazado'), 'cerrado_sin_aprobar')
  assert.equal(cierreDelEstudio('cerrado', 'aprobado'), 'cerrado')
  assert.equal(cierreDelEstudio('cerrado'), 'cerrado')
  assert.equal(cierreDelEstudio('condicionado'), null)
  assert.equal(cierreDelEstudio('en_revision'), null)
  assert.equal(cierreDelEstudio(undefined), null)
  assert.deepEqual(TERMINADOS.map(terminoSinAprobar), [true, true, false])
  assert.deepEqual(TERMINADOS.map(estaCerrado), [false, true, true])
})

test('coarrendatario sin persona_a5d: con el estudio terminado nunca «sigue con el titular» ni lo «revisa un analista»', () => {
  for (const c of TERMINADOS) for (const r of RESULTADOS) assert.doesNotMatch(textoCoarrendatario(r, c), PROHIBIDO)
  for (const r of RESULTADOS) assert.equal(textoCoarrendatario(r, 'no_aprobable'), TEXTO_TERMINO_SIN_APROBAR)
  // Cerrado, con cualquier estado anterior.
  for (const r of RESULTADOS) {
    assert.equal(textoCoarrendatario(r, 'cerrado'), TEXTO_ESTUDIO_CERRADO)
    assert.equal(textoCoarrendatario(r, 'cerrado_sin_aprobar'), TEXTO_ESTUDIO_CERRADO)
  }
  assert.equal(TEXTO_TERMINO_SIN_APROBAR, 'Esta evaluación no cambia el resultado: el estudio terminó sin aprobar.')
  assert.equal(TEXTO_ESTUDIO_CERRADO, 'El estudio se cerró: esta evaluación ya no cambia nada.')
})

test('coarrendatario sin persona_a5d, estudio en curso: los textos de la Adenda 3 V2 §7 quedan como estaban', () => {
  assert.equal(textoCoarrendatario('aprobado', null), 'El coarrendatario es válido: suma su puntaje y su ingreso. El estudio se decide con los dos.')
  assert.equal(textoCoarrendatario('rechazado', null), 'El coarrendatario no califica: no aporta puntos ni ingreso, y el estudio sigue con el titular.')
  assert.equal(textoCoarrendatario('condicionado', null), 'La evaluación del coarrendatario la revisa un analista de Cofianza.')
})

test('rótulo del coarrendatario: ni «Válido» con el estudio no aprobado ni «En revisión» con el estudio terminado', () => {
  assert.equal(rotuloCoarrendatario('aprobado', null), 'Válido')
  assert.equal(rotuloCoarrendatario('rechazado', null), 'No califica')
  assert.equal(rotuloCoarrendatario('condicionado', null), 'En revisión')
  assert.equal(rotuloCoarrendatario('aprobado', 'no_aprobable'), ROTULO_SIN_EFECTO)
  assert.equal(rotuloCoarrendatario('aprobado', 'cerrado_sin_aprobar'), ROTULO_SIN_EFECTO)
  // Cerrado con contrato: fue válido.
  assert.equal(rotuloCoarrendatario('aprobado', 'cerrado'), 'Válido')
  for (const c of TERMINADOS) {
    assert.equal(rotuloCoarrendatario('condicionado', c), ROTULO_SIN_EFECTO)
    assert.equal(rotuloCoarrendatario('rechazado', c), 'No califica')
  }
  assert.equal(rotuloCoarrendatario('pendiente', null), null)
  assert.equal(rotuloCoarrendatario(null, 'no_aprobable'), null)
})

const titular = (o: Partial<Parameters<typeof titularEstudioTerminado>[0]> = {}) => ({ estado: 'completado', resultado: 'aprobado', ...o })

test('titular sin persona_a5d: sin «Aprobado» junto a «terminó sin aprobar» ni «En revisión» con el estudio cerrado', () => {
  assert.deepEqual(titularEstudioTerminado(titular(), 'no_aprobable'), { rotulo: ROTULO_SIN_EFECTO, texto: TEXTO_TERMINO_SIN_APROBAR })
  assert.deepEqual(titularEstudioTerminado(titular({ resultado: 'condicionado', decision_cofianza: 'aprobado' }), 'no_aprobable'), {
    rotulo: ROTULO_SIN_EFECTO,
    texto: TEXTO_TERMINO_SIN_APROBAR,
  })
  assert.deepEqual(titularEstudioTerminado(titular({ resultado: 'condicionado' }), 'no_aprobable'), { rotulo: ROTULO_SIN_EFECTO, texto: TEXTO_TERMINO_SIN_APROBAR })
  assert.deepEqual(titularEstudioTerminado(titular({ resultado: 'condicionado' }), 'cerrado'), { rotulo: ROTULO_SIN_EFECTO, texto: TEXTO_ESTUDIO_CERRADO })
  assert.deepEqual(titularEstudioTerminado(titular({ resultado: 'condicionado' }), 'cerrado_sin_aprobar'), { rotulo: ROTULO_SIN_EFECTO, texto: TEXTO_ESTUDIO_CERRADO })
  assert.deepEqual(titularEstudioTerminado(titular(), 'cerrado_sin_aprobar'), { rotulo: ROTULO_SIN_EFECTO, texto: TEXTO_ESTUDIO_CERRADO })
  // Lo de siempre: estudio en curso, cerrado con la evaluación aprobada, no aprobado, negada por el analista,
  // con el resultado que envía la API o con la condición del coarrendatario.
  assert.equal(titularEstudioTerminado(titular(), null), null)
  assert.equal(titularEstudioTerminado(titular(), 'cerrado'), null)
  assert.equal(titularEstudioTerminado(titular({ resultado: 'rechazado' }), 'no_aprobable'), null)
  assert.equal(titularEstudioTerminado(titular({ resultado: 'condicionado', decision_cofianza: 'negado' }), 'no_aprobable'), null)
  assert.equal(titularEstudioTerminado(titular({ desenlace: 'aprobado_segundo_firmante' }), 'no_aprobable'), null)
  assert.equal(titularEstudioTerminado(titular({ resultado: 'condicionado', condicion_coarrendatario: { vencida: true } }), 'no_aprobable'), null)
  assert.equal(titularEstudioTerminado(titular({ estado: 'fallido' }), 'no_aprobable'), null)
})

const persona = (o: Partial<IPersonaA5d> = {}): IPersonaA5d => ({ papel: 'titular', etiqueta: 'Titular del estudio', texto: 'TEXTO DE LA API', ...o })

test('persona_a5d solo se usa completo', () => {
  assert.equal(personaA5dUsable(undefined), null)
  assert.equal(personaA5dUsable(null), null)
  assert.equal(personaA5dUsable(persona({ etiqueta: '  ' })), null)
  assert.equal(personaA5dUsable(persona({ texto: '' })), null)
  assert.equal(personaA5dUsable({ papel: 'titular' } as IPersonaA5d), null)
  const p = persona()
  assert.equal(personaA5dUsable(p), p)
})

test('papel junto al nombre e insignia sin repetirlo', () => {
  assert.equal(papelEnElEstudio(persona()), 'Titular del estudio')
  assert.equal(papelEnElEstudio(persona({ papel: 'segundo_firmante' })), 'Segundo firmante')
  assert.equal(papelEnElEstudio(persona({ papel: 'sin_papel' })), null)
  assert.equal(papelEnElEstudio(persona({ papel: 'otro' as IPersonaA5d['papel'] })), null)
  assert.equal(insigniaPersona(persona()), null)
  assert.equal(insigniaPersona(persona({ papel: 'segundo_firmante', etiqueta: 'segundo firmante ' })), null)
  assert.equal(insigniaPersona(persona({ papel: 'sin_papel', etiqueta: 'No pasó' })), 'No pasó')
  assert.equal(insigniaPersona(persona({ papel: 'sin_papel', etiqueta: 'Salió del estudio' })), 'Salió del estudio')
  assert.equal(insigniaPersona(persona({ etiqueta: 'En verificación' })), 'En verificación')
})

test('colores: sin papel en gris, rojo solo cuando hay que actuar', () => {
  const sinPapel = (etiqueta: string, ctx = {}) => tonoPersonaA5d(persona({ papel: 'sin_papel', etiqueta }), ctx)
  assert.equal(sinPapel('No pasó'), 'alerta')
  // «No califica»: rojo si hay que reemplazarla; gris con el estudio aprobado (no bloquea) o cerrado.
  assert.equal(sinPapel('No califica'), 'alerta')
  assert.equal(sinPapel('no califica '), 'alerta')
  assert.equal(sinPapel('No califica', { cierre: 'no_aprobable' }), 'alerta')
  assert.equal(sinPapel('No califica', { estudioAprobado: true }), 'neutro')
  assert.equal(sinPapel('No califica', { cierre: 'cerrado' }), 'neutro')
  assert.equal(noCalificaEnRojo(), true)
  assert.equal(noCalificaEnRojo({ estudioAprobado: true }), false)
  assert.equal(noCalificaEnRojo({ cierre: 'cerrado_sin_aprobar' }), false)
  for (const e of ['En espera', 'En verificación', 'Evaluada', 'No alcanza']) assert.equal(sinPapel(e), 'neutro', e)
  for (const e of ['Sin efecto', 'Salió del estudio', 'Plazo vencido']) assert.equal(sinPapel(e), 'cerrada', e)
  assert.equal(tonoPersonaA5d(persona({ papel: 'segundo_firmante', etiqueta: 'Segundo firmante' })), 'exito')
  // Titular: lo dice el resultado de su evaluación.
  assert.equal(tonoPersonaA5d(persona()), null)
})

test('salió del estudio y en verificación, por la etiqueta de la API', () => {
  assert.equal(esSalidaDelEstudio(persona({ papel: 'sin_papel', etiqueta: 'Salió del estudio' })), true)
  assert.equal(esSalidaDelEstudio(persona({ papel: 'sin_papel', etiqueta: 'salió del estudio' })), true)
  assert.equal(esSalidaDelEstudio(persona({ papel: 'sin_papel', etiqueta: 'Sin efecto' })), false)
  assert.equal(esSalidaDelEstudio(null), false)
  assert.equal(estaEnVerificacion(persona({ papel: 'sin_papel', etiqueta: 'En verificación' })), true)
  assert.equal(estaEnVerificacion(persona({ papel: 'sin_papel', etiqueta: 'En espera' })), false)
  assert.equal(estaEnVerificacion(undefined), false)
})

test('al analista, la persona en verificación: qué hacer', () => {
  assert.equal(
    textoVerificacionAnalista('por_confirmar'),
    'Coincidencia en listas restrictivas por confirmar. Ábrala en «Ver detalle» para confirmarla o descartarla antes de decidir.',
  )
  assert.equal(textoVerificacionAnalista(null), 'Revise el motivo y decida si lo aprueba.')
  assert.equal(textoVerificacionAnalista('descartada'), 'Revise el motivo y decida si lo aprueba.')
})

test('bloque 4: al analista, el segundo firmante en verificación con los botones de la API', () => {
  const v = (dar: boolean, reintentar: boolean) => ({ puede_dar_por_verificado: dar, puede_reintentar: reintentar })
  // Nunca «decida si lo aprueba»: ahí no hay «Aprobar estudio».
  assert.equal(textoVerificacionAnalista(null, v(true, true)), 'Puede darla por verificada (con constancia) o pedir de nuevo la consulta.')
  assert.equal(textoVerificacionAnalista(null, v(true, false)), 'Puede darla por verificada (con constancia).')
  assert.equal(textoVerificacionAnalista(null, v(false, true)), 'Puede pedir de nuevo la consulta.')
  // Sin ninguna de las dos, nada: el motivo de la API ya dice por qué.
  assert.equal(textoVerificacionAnalista(null, v(false, false)), '')
  // Las listas por confirmar mandan (se resuelven en el detalle).
  assert.match(textoVerificacionAnalista('por_confirmar', v(true, true)), /listas restrictivas por confirmar/)
  // Sin la verificación (no se pudo leer, o no hay nada que resolver): como antes.
  assert.equal(textoVerificacionAnalista(null, null), 'Revise el motivo y decida si lo aprueba.')
})

test('bloque 4: verificado el segundo firmante, qué pasa (con el estudio ya aprobado no «se decide»)', async () => {
  const { efectoVerificacionSegundo, fraseResultadoLimpio } = await import('./personaEstudio')
  assert.equal(efectoVerificacionSegundo(false), 'el estudio se decide con las dos personas')
  // Con el estudio ya aprobado no se promete la vinculación: depende de que resulte válida.
  assert.equal(
    efectoVerificacionSegundo(true),
    'si es válida como segundo firmante, queda vinculada al contrato; si no, el contrato sigue solo con el titular',
  )
  assert.equal(fraseResultadoLimpio(false), 'Si el resultado llega limpio, el estudio se decide solo.')
  assert.equal(
    fraseResultadoLimpio(true),
    'Si el resultado llega limpio y la persona es válida como segundo firmante, queda vinculada al contrato; si no, el contrato sigue solo con el titular.',
  )
  for (const texto of [efectoVerificacionSegundo(true), fraseResultadoLimpio(true)]) assert.doesNotMatch(texto, /esta persona queda vinculada/)
})

test('bloque 4: no aprobado con salida, cuando la API dice que a una persona se la puede reemplazar', async () => {
  const { ofreceReemplazo, personaA5dUsable } = await import('./personaEstudio')
  const persona = (extra: Partial<IPersonaA5d> = {}): IPersonaA5d => ({ papel: 'sin_papel', etiqueta: 'No pasó', texto: 'No pasó la evaluación: puede reemplazarla por otra persona.', ...extra })
  // El campo de la API (solo viaja con true), que sobrevive a personaA5dUsable.
  assert.equal(ofreceReemplazo(personaA5dUsable(persona({ puede_reemplazar: true }))), true)
  // Sin el campo no se deduce del texto (una API anterior): no se afirma nada.
  assert.equal(ofreceReemplazo(personaA5dUsable(persona())), false)
  assert.equal(ofreceReemplazo(persona({ puede_reemplazar: false })), false)
  assert.equal(ofreceReemplazo(null), false)
})

test('cómo se presentó: solo si el papel no es el que declaró (Adenda 5 §11) o no tiene papel', () => {
  assert.equal(comoSePresento(persona(), false), null)
  assert.equal(comoSePresento(persona({ papel: 'segundo_firmante' }), true), null)
  assert.equal(comoSePresento(persona(), true), 'Se presentó como coarrendatario')
  assert.equal(comoSePresento(persona({ papel: 'segundo_firmante' }), false), 'Se presentó como solicitante')
  assert.equal(comoSePresento(persona({ papel: 'sin_papel' }), false), 'Se presentó como solicitante')
  assert.equal(comoSePresento(persona({ papel: 'sin_papel' }), true), 'Se presentó como coarrendatario')
  assert.equal(rolDeclarado(false), 'Solicitante')
  assert.equal(rolDeclarado(true), 'Coarrendatario')
})

test('evaluación de un solicitante que ya fue reemplazado', () => {
  // Documentos ficticios.
  assert.equal(evaluacionDeOtroSolicitante({ numero_documento: '1000000001' }, '1000000002'), true)
  assert.equal(evaluacionDeOtroSolicitante({ numero_documento: '1.000.000.001' }, '1000000001'), false)
  assert.equal(evaluacionDeOtroSolicitante({ numero_documento: 'ab-123' }, 'AB123'), false)
  // Sin los dos documentos no se afirma nada.
  assert.equal(evaluacionDeOtroSolicitante(null, '1000000002'), false)
  assert.equal(evaluacionDeOtroSolicitante({ numero_documento: '1000000001' }, null), false)
  assert.equal(evaluacionDeOtroSolicitante({}, undefined), false)
  // La marca de la API manda.
  assert.equal(evaluacionDeOtroSolicitante(null, null, { etiqueta: 'Salió del estudio' }), true)
  assert.equal(SOLICITANTE_ANTERIOR, 'Solicitante anterior')
})

test('reemplazo en un estudio rechazado: manda el aviso de la API; el plazo, solo el que ella manda', () => {
  // Bloque 4: el mismo nombre del estado («reabierto»), no «vuelve a revisión».
  const base = 'Al cargar a la persona nueva, el estudio se reabre y se decide de nuevo con su evaluación.'
  // API anterior: sin campos ni frase.
  assert.equal(avisoReemplazoEnRechazado({ aviso: 'AVISO' }), base)
  // La API ya lo dice (campo o frase, con cualquiera de las dos palabras): no se repite.
  assert.equal(avisoReemplazoEnRechazado({ aviso: 'AVISO', vuelve_a_revision: true }), null)
  assert.equal(avisoReemplazoEnRechazado({ aviso: 'AVISO. Al cargar a la persona nueva, el estudio vuelve a revisión y se decide de nuevo.' }), null)
  assert.equal(avisoReemplazoEnRechazado({ aviso: 'AVISO. Al cargar a la persona nueva, el estudio se reabre y se decide de nuevo.' }), null)
  // Con la fecha de la API y un aviso que no la dice: se agrega; si el aviso ya dice el plazo, no.
  const vence = '2026-12-04T17:00:00Z'
  assert.equal(
    avisoReemplazoEnRechazado({ aviso: 'AVISO', vuelve_a_revision: true, vence_reapertura: vence }),
    'La persona nueva debe autorizar a más tardar el 4 de diciembre de 2026.',
  )
  assert.equal(avisoReemplazoEnRechazado({ aviso: 'AVISO', vence_reapertura: vence }), `${base} La persona nueva debe autorizar a más tardar el 4 de diciembre de 2026.`)
  assert.equal(
    avisoReemplazoEnRechazado({ aviso: 'Debe autorizar a más tardar el 4 de diciembre. El estudio vuelve a revisión.', vuelve_a_revision: true, vence_reapertura: vence }),
    null,
  )
  // Nunca un plazo calculado aquí: sin la fecha de la API, ninguno.
  assert.doesNotMatch(avisoReemplazoEnRechazado({ aviso: 'AVISO' }) ?? '', /vence|días|tardar/)
})

test('plazo de la reapertura después de cargar a la persona: la fecha de la API, en hora de Colombia', () => {
  assert.equal(textoPlazoReapertura('2026-12-04T17:00:00Z'), 'La persona nueva debe autorizar a más tardar el 4 de diciembre de 2026.')
  // 04:00 UTC del 5 es todavía el 4 en Colombia.
  assert.equal(fechaColombia('2026-12-05T04:00:00Z'), '4 de diciembre de 2026')
  assert.equal(textoPlazoReapertura(null), null)
  assert.equal(textoPlazoReapertura('no es fecha'), null)
})

test('textos de la reapertura', () => {
  assert.equal(
    TEXTO_CANCELAR_REAPERTURA,
    'El estudio vuelve a quedar no aprobado y Cofianza devuelve el pago si la consulta no se hizo. La persona anterior no vuelve al estudio.',
  )
  // Bloque 4: la devolución, condicionada (no todo cambio cobra una consulta adicional); el enlace vencido no la promete.
  assert.equal(
    TEXTO_CANCELAR_INVITACION_REAPERTURA,
    'Si la cancela, el cambio de persona se cierra, el estudio vuelve a quedar no aprobado y, si pagó la consulta adicional, Cofianza devuelve el pago.',
  )
  assert.equal(TOAST_INVITACION_CANCELADA_REAPERTURA, 'Invitación cancelada. El estudio volvió a quedar no aprobado.')
  assert.equal(
    TEXTO_ENLACE_VENCIDO_REAPERTURA,
    'Venció el enlace: el cambio se cierra y el estudio vuelve a quedar no aprobado; si pagó la consulta adicional, Cofianza devuelve el pago.',
  )
  // La devolución nunca sin condición.
  assert.doesNotMatch(TEXTO_ENLACE_VENCIDO_REAPERTURA, /devolverá el pago\.$|y Cofianza devuelve/)
  assert.equal(TEXTO_REAPERTURA, 'El estudio está reabierto: se decide de nuevo cuando la persona nueva acepte, autorice y termine su evaluación.')
  // El texto de la evaluación en espera no repite el de la franja «Qué sigue».
  assert.notEqual(TEXTO_EN_ESPERA, TEXTO_REAPERTURA)
  assert.doesNotMatch(TEXTO_EN_ESPERA, /se decide de nuevo/)
})

test('ningún texto de este archivo usa «buró» ni «score»', async () => {
  const { readFileSync } = await import('node:fs')
  const fuente = readFileSync(new URL('./personaEstudio.ts', import.meta.url), 'utf8')
  const cadenas = fuente.match(/'[^'\n]*'/g) ?? []
  for (const c of cadenas) assert.doesNotMatch(c, /bur[oó]|score/i)
})

test('punto 10: el coarrendatario en curso va en el Resumen; terminado, en «Pasos anteriores»', async () => {
  const { coarrendatarioSigueVivo } = await import('./personaEstudio')
  const vivo = (coa: Parameters<typeof coarrendatarioSigueVivo>[0], sinEfecto = false, cierre: Parameters<typeof coarrendatarioSigueVivo>[1]['cierre'] = null) =>
    coarrendatarioSigueVivo(coa, { sinEfecto, cierre })
  const persona = (etiqueta: string): IPersonaA5d => ({ papel: 'sin_papel', etiqueta, texto: 'Texto de prueba.' })
  // Invitación sin responder y evaluación sin terminar (o fallida, que se reintenta).
  assert.equal(vivo({ estado: 'pendiente_aceptacion' }), true)
  assert.equal(vivo({ estado: 'aceptado', estudio: { estado: 'en_proceso' } }), true)
  assert.equal(vivo({ estado: 'aceptado', estudio: { estado: 'fallido' } }), true)
  // Terminada pero en verificación, en revisión o en espera.
  assert.equal(vivo({ estado: 'aceptado', estudio: { estado: 'completado', persona_a5d: persona('En verificación') } }), true)
  assert.equal(vivo({ estado: 'aceptado', estudio: { estado: 'completado', persona_a5d: persona('En espera') } }), true)
  assert.equal(vivo({ estado: 'estudio_completado', estudio: { estado: 'completado', resultado: 'condicionado' } }), true)
  // Terminada: válida, no califica, salió.
  assert.equal(vivo({ estado: 'estudio_completado', estudio: { estado: 'completado', resultado: 'aprobado' } }), false)
  assert.equal(vivo({ estado: 'estudio_completado', estudio: { estado: 'completado', resultado: 'rechazado' } }), false)
  assert.equal(vivo({ estado: 'aceptado', estudio: { estado: 'completado', persona_a5d: { papel: 'segundo_firmante', etiqueta: 'Segundo firmante', texto: 'Queda vinculada.' } } }), false)
  assert.equal(vivo({ estado: 'aceptado', estudio: { estado: 'completado', persona_a5d: persona('No califica') } }), false)
  assert.equal(vivo({ estado: 'retirado' }), false)
  assert.equal(vivo({ estado: 'rechazado_invitacion' }), false)
  // La invitación sin efecto (el estudio se resolvió sin él) o el estudio terminado: ya pasó.
  assert.equal(vivo({ estado: 'pendiente_aceptacion' }, true), false)
  assert.equal(vivo({ estado: 'aceptado', estudio: { estado: 'en_proceso' } }, true), false)
  assert.equal(vivo({ estado: 'estudio_completado', estudio: { estado: 'completado', resultado: 'condicionado' } }, false, 'no_aprobable'), false)
  assert.equal(vivo(null), false)
})

test('coarrendatario en curso (el criterio del turno del segundo firmante): invitación vigente o evaluación sin terminar', async () => {
  const { coarrendatarioEnCurso } = await import('./personaEstudio')
  const ahora = Date.parse('2026-11-23T15:00:00Z')
  assert.equal(coarrendatarioEnCurso({ estado: 'pendiente_aceptacion', token_expiracion: '2026-11-30T00:00:00Z' }, ahora), true)
  // Vencida: reenviarla le toca a quien gestiona.
  assert.equal(coarrendatarioEnCurso({ estado: 'pendiente_aceptacion', token_expiracion: '2026-11-20T00:00:00Z' }, ahora), false)
  assert.equal(coarrendatarioEnCurso({ estado: 'aceptado', estudio: { estado: 'en_proceso' } }, ahora), true)
  assert.equal(coarrendatarioEnCurso({ estado: 'aceptado', estudio: null }, ahora), true)
  assert.equal(coarrendatarioEnCurso({ estado: 'aceptado', estudio: { estado: 'completado' } }, ahora), false)
  assert.equal(coarrendatarioEnCurso({ estado: 'rechazado_invitacion' }, ahora), false)
  assert.equal(coarrendatarioEnCurso({ estado: 'retirado' }, ahora), false)
  assert.equal(coarrendatarioEnCurso(null, ahora), false)
})

test('bloque 4: segundo firmante en verificación (respaldo cuando la API no manda segundo_en_verificacion)', async () => {
  const { coarrendatarioEnVerificacion, coarrendatarioEnCurso } = await import('./personaEstudio')
  const persona = (etiqueta: string): IPersonaA5d => ({ papel: 'sin_papel', etiqueta, texto: 'Texto de prueba.' })
  const enVerificacion = { estado: 'estudio_completado', estudio: { estado: 'completado', resultado: 'condicionado', persona_a5d: persona('En verificación') } }
  assert.equal(coarrendatarioEnVerificacion(enVerificacion), true)
  // Ya no está «en curso» (su evaluación terminó): sin este criterio el turno caía en quien gestiona.
  assert.equal(coarrendatarioEnCurso(enVerificacion), false)
  // Sin persona_a5d: la evaluación terminada que quedó en revisión.
  assert.equal(coarrendatarioEnVerificacion({ estado: 'aceptado', estudio: { estado: 'completado', resultado: 'condicionado' } }), true)
  // Con persona_a5d manda su etiqueta: bloquea, no alcanza o válida no es «en verificación».
  assert.equal(coarrendatarioEnVerificacion({ estado: 'aceptado', estudio: { estado: 'completado', resultado: 'condicionado', persona_a5d: persona('Bloquea la operación') } }), false)
  assert.equal(coarrendatarioEnVerificacion({ estado: 'aceptado', estudio: { estado: 'completado', resultado: 'rechazado', persona_a5d: persona('No califica') } }), false)
  assert.equal(coarrendatarioEnVerificacion({ estado: 'aceptado', estudio: { estado: 'completado', resultado: 'aprobado' } }), false)
  // Sin terminar, sin responder, o quien ya salió: no.
  assert.equal(coarrendatarioEnVerificacion({ estado: 'aceptado', estudio: { estado: 'en_proceso', resultado: 'pendiente' } }), false)
  assert.equal(coarrendatarioEnVerificacion({ estado: 'pendiente_aceptacion' }), false)
  assert.equal(coarrendatarioEnVerificacion({ estado: 'retirado', estudio: { estado: 'completado', resultado: 'condicionado' } }), false)
  assert.equal(coarrendatarioEnVerificacion(null), false)
})

// Revisión de lógica de la Adenda 6 §7 (punto 1): la cotización del cambio de persona trae hasta cuándo el resultado
// permite enviar a firma (`firmar_hasta`): la web lo dice con fecha y hora de Colombia, sin calcular nada.
test('textoFirmarHastaCambio: la fecha y la hora que manda la API; sin fecha, nada', () => {
  const t = textoFirmarHastaCambio('2026-12-07T14:00:00Z') ?? ''
  assert.match(t, /^El resultado de este estudio permite enviar el contrato a firma hasta el 7 de diciembre de 2026 a las 9:00\s?a\.\s?m\.; cambiar a la persona no amplía ese plazo\.$/)
  assert.equal(textoFirmarHastaCambio(null), null)
  assert.equal(textoFirmarHastaCambio(undefined), null)
  assert.equal(textoFirmarHastaCambio('no es fecha'), null)
})
