/**
 * Pruebas de lib/pazYSalvo y de los parámetros de la Adenda 5 en la calibración
 * (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/pazYSalvo.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  detalleMora,
  nombreObligacion,
  nombreSector,
  obligacionesExigidas,
  pazYSalvoCargado,
  pazYSalvoDeMoraVigente,
  pazYSalvoPendiente,
  razonMoraPct,
  refsExigidas,
  textoPct,
  textoRequisitoPendiente,
} from './pazYSalvo'
import { conUnidad, META, rigeHoy } from '../components/calibracion/parametros'

test('razón de mora: prefiere el %; si no, la fracción exacta con un decimal', () => {
  assert.equal(razonMoraPct({ razon_mora_pct: 13.8, razon_mora: 0.5 }), 13.8)
  assert.equal(razonMoraPct({ razon_mora: 180_000 / 1_300_000 }), 13.8)
  assert.equal(razonMoraPct({ razon_mora_pct: null, razon_mora: 300_000 / 1_300_000 }), 23.1)
  assert.equal(razonMoraPct({ razon_mora: null }), null)
  assert.equal(razonMoraPct(null), null)
  assert.equal(textoPct(15.4), '15,4 %')
})

test('paz y salvo: pendiente hasta acreditarlo, y las refs vengan como vengan', () => {
  const p = { vence_en: '2026-11-19T05:00:00Z', obligaciones: ['900123:*4321', { ref: '800456:*0001', acreedor: 'Tienda de ejemplo' }] }
  assert.equal(pazYSalvoPendiente(p), true)
  assert.equal(pazYSalvoPendiente({ ...p, acreditacion: { via: 'documento' } }), false)
  assert.equal(pazYSalvoPendiente(null), false)
  assert.deepEqual(refsExigidas(p), ['900123:*4321', '800456:*0001'])
  const enMora = [{ ref: '900123:*4321', acreedor: 'Operador de ejemplo', tipo_cuenta: '23-00 CTC', saldo_mora_cop: 56_000, dias_mora: 150 }]
  const exigidas = obligacionesExigidas(p, enMora)
  assert.equal(exigidas[0].acreedor, 'Operador de ejemplo')
  assert.equal(exigidas[1].acreedor, 'Tienda de ejemplo')
  assert.equal(nombreObligacion(exigidas[0]), 'Operador de ejemplo · 23-00 CTC')
  assert.equal(nombreObligacion({ ref: 'x:*1' }), 'Obligación x:*1')
  assert.equal(detalleMora(exigidas[0]), '$56.000 en mora · 150 días')
  assert.equal(nombreSector('4'), 'Sector telecomunicaciones')
  assert.equal(nombreSector(null), null)
})

test('GET mora-vigente: solo el paz y salvo pendiente cuenta (la API manda el último, resuelto o no)', () => {
  const base = { exigido_en: '2026-11-04T15:00:00Z', exigido_por: 'analista', acreditacion: null, vencimiento: null }
  const obligaciones = [{ ref: '900123:*4321', acreedor: 'Operador de ejemplo', saldo_mora_cop: 56_000 }]
  const pendiente = pazYSalvoDeMoraVigente({ paz_y_salvo: { ...base, pendiente: true, vence_en: '2026-11-19T15:00:00Z', obligaciones } })
  assert.equal(pazYSalvoPendiente(pendiente), true)
  assert.equal(obligacionesExigidas(pendiente)[0].acreedor, 'Operador de ejemplo')
  // Acreditado o vencido: la API manda pendiente=false y vence_en=null.
  assert.equal(pazYSalvoDeMoraVigente({ paz_y_salvo: { ...base, pendiente: false, vence_en: null, obligaciones } }), null)
  assert.equal(pazYSalvoDeMoraVigente({ paz_y_salvo: null }), null)
  assert.equal(pazYSalvoDeMoraVigente(null), null)
  // Lo que recibe el solicitante en su estudio: sin ref; no se inventa una.
  assert.deepEqual(obligacionesExigidas({ vence_en: '2026-11-19T15:00:00Z', obligaciones: [{ acreedor: 'Operador de ejemplo', saldo_mora_cop: 56_000 }] }), [])
})

test('paz y salvo cargado: el más reciente desde que se exigió (criterio del barrido)', () => {
  const soportes = [
    { id: 'a', proposito: 'certificacion_laboral', created_at: '2026-11-06T15:00:00Z' },
    { id: 'b', proposito: 'paz_y_salvo', created_at: '2026-11-05T15:00:00Z' },
    { id: 'c', proposito: 'paz_y_salvo', created_at: '2026-11-07T15:00:00Z' },
    { id: 'd', proposito: 'paz_y_salvo', created_at: '2026-10-01T15:00:00Z' },
  ]
  assert.equal(pazYSalvoCargado({ exigido_en: '2026-11-04T15:00:00Z' }, soportes)?.id, 'c')
  // Uno cargado antes de exigirlo no cuenta.
  assert.equal(pazYSalvoCargado({ exigido_en: '2026-11-04T15:00:00Z' }, [soportes[3]]), null)
  // Al candidato no le llega exigido_en: cuenta cualquiera, el más reciente.
  assert.equal(pazYSalvoCargado({}, soportes)?.id, 'c')
  assert.equal(pazYSalvoCargado({ exigido_en: '2026-11-04T15:00:00Z' }, [soportes[0]]), null)
  assert.equal(pazYSalvoCargado(null, soportes), null)
  assert.equal(pazYSalvoCargado({}, null), null)
})

test('§10: lo que ve la inmobiliaria no trae acreedor ni monto', () => {
  const t = textoRequisitoPendiente('2026-11-19T15:00:00Z')
  assert.equal(t, 'Requisito pendiente a cargo del candidato · hasta 19/11')
  assert.doesNotMatch(t, /mora|\$/i)
})

test('calibración: las fracciones del canon se leen como «15 % del canon» y el ejemplo de la adenda', () => {
  assert.equal(conUnidad(0.15, { clave: 'FACTOR_MORA_TOLERADA', entero: false }), '15 % del canon')
  assert.equal(conUnidad(0.3, { clave: 'FACTOR_MORA_RECHAZO', entero: false }), '30 % del canon')
  const v = { FACTOR_MORA_TOLERADA: 0.15, FACTOR_MORA_RECHAZO: 0.3 }
  const ejemplo = META.FACTOR_MORA_TOLERADA.ejemplo?.(v) ?? ''
  // Canon de $1.300.000: hasta $194.999 sigue; de $195.000 a $390.000 revisión; más rechaza (bordes exactos).
  assert.match(ejemplo, /hasta \$194\.999 en mora sigue la evaluación normal; de \$195\.000 a \$390\.000 decide un analista; más de \$390\.000 se rechaza/)
  assert.equal(META.MORA_VIGENTE_MONTO_MINIMO, undefined)
  assert.equal(META.ADENDA5.unidad, 'onoff')
  assert.equal(META.ADENDA5.motivo, true)
  // Las cuatro de riesgo piden motivo como en la API; el plazo no.
  for (const c of ['FACTOR_MORA_TOLERADA', 'FACTOR_MORA_RECHAZO', 'MIN_OBLIGACIONES_FINANCIERAS_AL_DIA']) assert.equal(META[c].motivo, true, c)
  assert.notEqual(META.DIAS_PLAZO_PAZ_Y_SALVO.motivo, true)
  assert.equal(rigeHoy('a5', { ADENDA5: 1 }), true)
  assert.equal(rigeHoy('a5', { ADENDA5: 0 }), false)
  assert.match(META.MIN_OBLIGACIONES_FINANCIERAS_AL_DIA.ejemplo?.({ MIN_OBLIGACIONES_FINANCIERAS_AL_DIA: 2 }) ?? '', /un solo crédito financiero/)
  const conUno = META.MIN_OBLIGACIONES_FINANCIERAS_AL_DIA.ejemplo?.({ MIN_OBLIGACIONES_FINANCIERAS_AL_DIA: 1 }) ?? ''
  assert.match(conUno, /quien no tiene ningún crédito financiero al día y tiene una mora/)
  assert.doesNotMatch(conUno, /quien tiene ningún/)
})
