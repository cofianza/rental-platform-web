/**
 * Pruebas de lib/reporteMora (node:test). Correr con: npx tsx --test lib/reporteMora.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  avisoFueraDeVentana,
  avisoNotariaFormulario,
  motivoNoPaga,
  chipReporte,
  CRONOGRAMA_MORA,
  escalaEn,
  fechaDia,
  FRASE_VENTANA_REPORTE,
  NOTA_MENSAJES_MORA,
  textoReporte,
} from './reporteMora'

const DIA = 86_400_000
const AHORA = Date.parse('2026-11-26T15:00:00Z')

test('la frase del reporte de la Oficina Virtual va literal', () => {
  assert.equal(
    FRASE_VENTANA_REPORTE,
    'Reporte la mora entre el día 6 y el día 10. Cofianza le paga dentro de los 20 días calendario siguientes al reporte completo.',
  )
})

test('un solo cronograma: las fases contadas desde el reporte, sin días de WhatsApp mezclados', () => {
  const texto = CRONOGRAMA_MORA.map((p) => `${p.cuando} ${p.que}`).join(' ')
  assert.match(texto, /A los 4 días del reporte Fase 2/)
  assert.match(texto, /A los 10 días del reporte Fase 3.*si el reporte está completo/)
  assert.doesNotMatch(texto, /día 7|día 14|hacia el/)
  // La regla de los mensajes va aparte.
  assert.match(NOTA_MENSAJES_MORA, /7 días entre un mensaje y el siguiente/)
})

test('la fecha del plazo no se corre de día', () => {
  assert.equal(fechaDia('2026-12-16'), '16 de diciembre de 2026')
})

const DUENO = { esInterno: false, hoy: '2026-11-26' }
const COFIANZA = { esInterno: true, hoy: '2026-11-26' }

test('el detalle promete la fecha solo con el reporte completo, la mora activa, dentro de la ventana y el plazo vigente', () => {
  const activa = { estado: 'fase_1', reporte_estado: 'completo' as const, plazo_pago_hasta: '2026-12-16', reporte_en_ventana: true }
  assert.equal(textoReporte(activa, DUENO), 'Completo: Cofianza paga a más tardar el 16 de diciembre de 2026')
  assert.equal(textoReporte({ ...activa, estado: 'pagada' }, DUENO), 'Completo')
  // Fuera de la ventana del día 6 al 10 no se promete la fecha.
  assert.match(textoReporte({ ...activa, reporte_en_ventana: false }, DUENO), /Cofianza revisa si cubre esta mora/)
  assert.doesNotMatch(textoReporte({ ...activa, reporte_en_ventana: false }, DUENO), /a más tardar/)
  // Un plazo vencido (p. ej. una mora de antes del despliegue) solo lo ve Cofianza.
  assert.equal(textoReporte({ ...activa, plazo_pago_hasta: '2026-10-21' }, DUENO), 'Completo')
  assert.match(textoReporte({ ...activa, plazo_pago_hasta: '2026-10-21' }, COFIANZA), /venció el 21 de octubre de 2026/)
  assert.match(textoReporte({ estado: 'fase_1', reporte_estado: 'incompleto', plazo_pago_hasta: null }, DUENO), /falta el contrato autenticado/)
  assert.match(textoReporte({ estado: 'fase_2', reporte_estado: 'por_verificar' }, DUENO), /desde que se cargó/)
  assert.equal(textoReporte({ estado: 'fase_2', reporte_estado: 'no_paga' }, DUENO), 'Cofianza no paga esta mora')
  // Una mora anterior a la migración (sin el dato) es completa.
  assert.match(textoReporte({ estado: 'fase_1', plazo_pago_hasta: '2026-12-16' }, DUENO), /^Completo: /)
})

test('el aviso de la ventana solo sale fuera de los días 6 a 10 y no bloquea', () => {
  assert.equal(avisoFueraDeVentana('2026-11-08'), null)
  assert.equal(avisoFueraDeVentana('2026-11-06'), null)
  assert.equal(avisoFueraDeVentana('2026-11-10'), null)
  assert.match(avisoFueraDeVentana('2026-11-26') ?? '', /Hoy es día 26.*Puede reportar igual/)
})

test('la fecha fuera de rango de Cofianza es la del sello; la del sistema, la registrada', () => {
  assert.match(motivoNoPaga('fecha_fuera_de_rango', 30), /sello notarial del documento/)
  assert.match(motivoNoPaga('fecha_fuera_de_rango', 60, true), /registrada no está dentro de los 60 días/)
  assert.equal(motivoNoPaga('no_corresponde', 30), 'el documento cargado no corresponde al contrato')
})

test('la tabla marca solo los reportes que no están completos', () => {
  assert.equal(chipReporte('completo'), null)
  assert.equal(chipReporte(undefined), null)
  assert.equal(chipReporte('incompleto')?.texto, 'Reporte incompleto')
  assert.equal(chipReporte('no_paga')?.tono, 'red')
})

test('«Escala en»: la Fase 3 espera el reporte completo y «no paga» no escala', () => {
  const hace = (d: number) => new Date(AHORA - d * DIA).toISOString()
  assert.equal(escalaEn({ estado: 'fase_1', reportado_at: hace(1) }, AHORA), 3)
  assert.equal(escalaEn({ estado: 'fase_1', reportado_at: hace(1), reporte_estado: 'incompleto' }, AHORA), 3)
  assert.equal(escalaEn({ estado: 'fase_2', reportado_at: hace(6), reporte_estado: 'completo' }, AHORA), 4)
  assert.equal(escalaEn({ estado: 'fase_2', reportado_at: hace(6), reporte_estado: 'por_verificar' }, AHORA), 'espera_reporte')
  assert.equal(escalaEn({ estado: 'fase_1', reportado_at: hace(1), reporte_estado: 'no_paga' }, AHORA), null)
  assert.equal(escalaEn({ estado: 'fase_3', reportado_at: hace(12) }, AHORA), null)
})

test('el aviso de notaría del formulario: falta el documento, ya está, o la fecha fuera de rango', () => {
  assert.equal(avisoNotariaFormulario({ documento_cargado: false, fecha_en_rango: true }).tono, 'amber')
  assert.match(avisoNotariaFormulario({ documento_cargado: false, fecha_en_rango: true }).texto, /no empieza a correr el plazo de pago/)
  assert.match(avisoNotariaFormulario({ documento_cargado: true, fecha_en_rango: true }).texto, /ya está cargado/)
  assert.match(avisoNotariaFormulario({ documento_cargado: true, fecha_en_rango: false }).texto, /Cofianza no paga/)
  for (const n of [{ documento_cargado: false, fecha_en_rango: true }, { documento_cargado: true, fecha_en_rango: true }])
    assert.doesNotMatch(avisoNotariaFormulario(n).texto, /\btú\b|\btu\b|\btienes\b/)
})
