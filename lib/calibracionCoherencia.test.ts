/**
 * Pruebas de las reglas de coherencia que el panel de calibración revisa antes
 * de enviar (components/calibracion/parametros.ts, coherenciaA5d). El API las
 * vuelve a validar (validarCoherencia). Correr con:
 * npx tsx --test lib/calibracionCoherencia.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coherenciaA5d, humanizar, verboParametro } from '../components/calibracion/parametros'

// Valores vigentes en producción (los que importan a estas reglas).
const HOY = {
  ADENDA3_V2: 1,
  ADENDA4: 1,
  ADENDA5_DEF: 0,
  UMBRAL_APROBACION_AUTOMATICA: 85,
  UMBRAL_ZONA_GRIS: 70,
  UMBRAL_CASCADA_APROBACION: 90,
  UMBRAL_CASCADA_RECHAZO: 40,
  PUNTAJE_MINIMO_TITULAR_PARA_COARRENDATARIO: 70,
  PUNTAJE_PISO_COARRENDATARIO: 60,
  TARIFA_VIA_AUTOMATICA: 2,
  TARIFA_VIA_NO_AUTOMATICA: 2.3,
}

test('los valores de hoy pasan todas las reglas', () => {
  for (const [clave, valor] of Object.entries(HOY)) assert.equal(coherenciaA5d(clave, valor, HOY), null, clave)
})

test('zona gris: el mínimo para ofrecer coarrendatario no queda por debajo al subirla', () => {
  assert.match(coherenciaA5d('UMBRAL_ZONA_GRIS', 72, HOY) ?? '', /^«Puntaje mínimo para ofrecer coarrendatario» \(70 pts\) debe quedar desde «inicio de la zona gris/)
  assert.equal(coherenciaA5d('UMBRAL_ZONA_GRIS', 72, { ...HOY, PUNTAJE_MINIMO_TITULAR_PARA_COARRENDATARIO: 72 }), null)
})

test('el piso para exigir coarrendatario queda por debajo de la zona gris', () => {
  assert.match(coherenciaA5d('PUNTAJE_PISO_COARRENDATARIO', 69, { ...HOY, UMBRAL_ZONA_GRIS: 69 }) ?? '', /debe quedar por debajo/)
})

test('segunda central: rechazo ≤ 2 × zona gris − 100 y aprobación ≥ aprobación automática', () => {
  assert.match(coherenciaA5d('UMBRAL_CASCADA_RECHAZO', 41, HOY) ?? '', /no puede pasar de 40/)
  assert.match(coherenciaA5d('UMBRAL_CASCADA_APROBACION', 84, HOY) ?? '', /no puede quedar por debajo/)
  assert.match(coherenciaA5d('UMBRAL_APROBACION_AUTOMATICA', 91, HOY) ?? '', /no puede quedar por debajo/)
  assert.equal(coherenciaA5d('UMBRAL_CASCADA_RECHAZO', 30, HOY), null)
})

test('tarifas: la automática no supera a la no automática (iguales sí)', () => {
  assert.match(coherenciaA5d('TARIFA_VIA_AUTOMATICA', 2.4, HOY) ?? '', /no puede superar/)
  assert.equal(coherenciaA5d('TARIFA_VIA_AUTOMATICA', 2.3, HOY), null)
})

test('humanizar no repite «Solo rige con la Adenda 5 encendida.» (la tarjeta ya lo dice)', () => {
  assert.equal(humanizar('Solo rige con la Adenda 5 encendida.'), '')
  assert.equal(humanizar('Debe quedar por encima del piso. Solo rige con la Adenda 5 encendida.'), 'Debe quedar por encima del piso.')
})

test('Ver o Cambiar según el permiso', () => {
  assert.equal(verboParametro({ editable: false, min: 0, max: 100 }), 'Ver')
  assert.equal(verboParametro({ editable: true, min: 30, max: 30 }), 'Ver')
  assert.equal(verboParametro({ editable: true, min: 0, max: 100 }), 'Cambiar')
  assert.equal(verboParametro(undefined), 'Cambiar')
})

// Revisión de lógica de la Adenda 6 §7 (punto 8): la vigencia del resultado no pasa de los días que se reutiliza el
// reporte (el API también lo exige en validarCoherencia).
test('Adenda 6 §7: la vigencia del resultado no pasa de los días que se reutiliza el reporte, se mueva cualquiera', () => {
  const v = { ...HOY, DIAS_VIGENCIA_RESULTADO: 30, DIAS_VIGENCIA_REPORTE: 30 }
  assert.equal(coherenciaA5d('DIAS_VIGENCIA_RESULTADO', 30, v), null)
  assert.equal(coherenciaA5d('DIAS_VIGENCIA_RESULTADO', 20, v), null)
  assert.match(coherenciaA5d('DIAS_VIGENCIA_REPORTE', 20, v) ?? '', /^«?Vigencia del resultado»? \(30 días\) no puede pasar de «días que se reutiliza el reporte de la central» \(20 días\)/)
  assert.match(coherenciaA5d('DIAS_VIGENCIA_RESULTADO', 25, { ...v, DIAS_VIGENCIA_REPORTE: 20 }) ?? '', /no puede pasar de/)
  // Otra clave no la mira.
  assert.equal(coherenciaA5d('VIGENCIA_CRC_DIAS', 60, { ...v, DIAS_VIGENCIA_REPORTE: 20 }), null)
})

// Segunda revisión de la Adenda 6 §7 (punto 6): con menos de 4 días todo resultado nace sin tiempo para firmar (el
// proceso de firma necesita más de 3 días de vigencia), y el plazo del segundo firmante termina al menos 4 días antes
// del resultado (el API también lo exige en validarCoherencia).
test('Adenda 6 §7: vigencia del resultado ≥ 4 y plazo del coarrendatario ≤ vigencia − 4, se mueva cualquiera', () => {
  // Los valores por defecto (30 y 15) pasan.
  const v = { ...HOY, DIAS_VIGENCIA_RESULTADO: 30, DIAS_VIGENCIA_REPORTE: 30, VIGENCIA_CONDICION_COARRENDATARIO_DIAS: 15 }
  assert.equal(coherenciaA5d('DIAS_VIGENCIA_RESULTADO', 30, v), null)
  assert.equal(coherenciaA5d('VIGENCIA_CONDICION_COARRENDATARIO_DIAS', 15, v), null)
  // La vigencia no baja de 4 días.
  assert.match(
    coherenciaA5d('DIAS_VIGENCIA_RESULTADO', 3, { ...v, VIGENCIA_CONDICION_COARRENDATARIO_DIAS: 1 }) ?? '',
    /^«?Vigencia del resultado»? \(3 días\) no puede quedar por debajo de 4 días/,
  )
  // El plazo: 26 con 30 sí, 27 no; y bajar la vigencia también lo mira.
  assert.equal(coherenciaA5d('VIGENCIA_CONDICION_COARRENDATARIO_DIAS', 26, v), null)
  assert.match(
    coherenciaA5d('VIGENCIA_CONDICION_COARRENDATARIO_DIAS', 27, v) ?? '',
    /^«Plazo para presentar el coarrendatario» \(27 días\) no puede pasar de 26 días con «vigencia del resultado» \(30 días\)/,
  )
  assert.match(coherenciaA5d('DIAS_VIGENCIA_RESULTADO', 18, v) ?? '', /no puede pasar de 14 días/)
  assert.equal(coherenciaA5d('DIAS_VIGENCIA_RESULTADO', 19, v), null)
  // Otra clave no la mira.
  assert.equal(coherenciaA5d('VIGENCIA_CRC_DIAS', 60, { ...v, DIAS_VIGENCIA_RESULTADO: 3 }), null)
})
