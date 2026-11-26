/** Reporte de la Oficina Virtual (25-nov), puntos 10 y 11: el Inicio como lista de tareas (node:test). Cifras ficticias. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accionesDesdeFilas, lineasDeInicio, textoRequierenAccion, textoVerTodos, type AccionesInicio } from './inicioTareas'

const ceros: AccionesInicio = {
  requieren_accion: 0,
  requieren_accion_otros: 0,
  esperando_autorizacion: 0,
  citas_por_confirmar: 0,
  citas_por_realizar: 0,
  evaluaciones_por_habilitar: 0,
  contratos_por_generar: 0,
  aprobados_canon_excede: 0,
  aprobados_segundo_firmante: 0,
  aprobados_en_verificacion: 0,
}
const a = (o: Partial<AccionesInicio>): AccionesInicio => ({ ...ceros, ...o })

test('punto 11: las frases del reporte, en plural', () => {
  const l = lineasDeInicio(a({ contratos_por_generar: 11, aprobados_canon_excede: 4, esperando_autorizacion: 3 }))
  assert.deepEqual(
    l.map((x) => x.texto),
    ['Tiene 11 contratos por generar', '4 estudios aprobados necesitan otro inmueble', 'A 3 estudios solo les falta la autorización'],
  )
})

test('punto 11: en singular', () => {
  const l = lineasDeInicio(
    a({
      contratos_por_generar: 1,
      aprobados_canon_excede: 1,
      aprobados_segundo_firmante: 1,
      evaluaciones_por_habilitar: 1,
      citas_por_confirmar: 1,
      citas_por_realizar: 1,
      requieren_accion_otros: 1,
      esperando_autorizacion: 1,
      aprobados_en_verificacion: 1,
    }),
  )
  assert.deepEqual(
    l.map((x) => x.texto),
    [
      'Tiene 1 contrato por generar',
      '1 estudio aprobado necesita otro inmueble',
      '1 estudio aprobado tiene pendiente al segundo firmante',
      'Tiene 1 evaluación por habilitar',
      'Tiene 1 visita por confirmar',
      'Tiene 1 visita por realizar',
      'Otro estudio requiere su acción',
      'A 1 estudio solo le falta la autorización',
      '1 estudio aprobado está en verificación de Cofianza',
    ],
  )
})

test('punto 11: plural de cada grupo, con separador de miles', () => {
  const l = lineasDeInicio(
    a({
      aprobados_segundo_firmante: 2,
      evaluaciones_por_habilitar: 3,
      citas_por_confirmar: 1200,
      citas_por_realizar: 5,
      requieren_accion_otros: 6,
      aprobados_en_verificacion: 2,
    }),
  )
  assert.deepEqual(
    l.map((x) => x.texto),
    [
      '2 estudios aprobados tienen pendiente al segundo firmante',
      'Tiene 3 evaluaciones por habilitar',
      'Tiene 1.200 visitas por confirmar',
      'Tiene 5 visitas por realizar',
      'Otros 6 estudios requieren su acción',
      '2 estudios aprobados están en verificación de Cofianza',
    ],
  )
})

test('punto 11: los grupos en 0 no salen; todo en 0 = ninguna línea (la pantalla dice que no hay pendientes)', () => {
  assert.deepEqual(lineasDeInicio(ceros), [])
  assert.deepEqual(lineasDeInicio(a({ citas_por_realizar: 2 })).map((x) => x.clave), ['citas_por_realizar'])
  // «Espera autorización» desconocido (API anterior): no sale, nunca «0».
  assert.deepEqual(lineasDeInicio(a({ esperando_autorizacion: null })), [])
})

test('punto 10: «Requieren su acción» sale sin los de los demás grupos (el total exacto de la API)', () => {
  // La API ya restó los 11 por generar: quedan 2 con otras acciones.
  const l = lineasDeInicio(a({ requieren_accion: 13, requieren_accion_otros: 2, contratos_por_generar: 11 }))
  assert.deepEqual(l.map((x) => [x.clave, x.total]), [
    ['contratos_por_generar', 11],
    ['requieren_accion_otros', 2],
  ])
  assert.equal(l[1].texto, 'Otros 2 estudios requieren su acción')
  // Sin otros grupos de estudios no se dice «otros».
  assert.equal(lineasDeInicio(a({ requieren_accion: 2, requieren_accion_otros: 2 }))[0].texto, '2 estudios requieren su acción')
  // Si los únicos otros grupos son visitas, tampoco: una visita no es un estudio de la lista.
  assert.equal(lineasDeInicio(a({ citas_por_confirmar: 1, requieren_accion_otros: 1 }))[1].texto, '1 estudio requiere su acción')
  // Con el total exacto en 0 no sale, aunque el filtro completo tenga estudios (son los de los otros grupos).
  assert.deepEqual(lineasDeInicio(a({ requieren_accion: 11, requieren_accion_otros: 0, contratos_por_generar: 11 })).map((x) => x.clave), ['contratos_por_generar'])
})

test('punto 10: sin el total exacto (API anterior), «En total» con el del filtro', () => {
  const l = lineasDeInicio(a({ requieren_accion: 13, requieren_accion_otros: undefined, contratos_por_generar: 11 }))
  assert.equal(l[1].texto, 'En total, 13 estudios requieren su acción')
  assert.equal(textoRequierenAccion(1, { exacto: false, hayOtrosGrupos: true }), 'En total, 1 estudio requiere su acción')
  assert.equal(textoRequierenAccion(1, { exacto: false, hayOtrosGrupos: false }), '1 estudio requiere su acción')
})

test('cada línea dice a dónde lleva (la lista con su filtro) y si espera a otra persona', () => {
  const l = lineasDeInicio(a({ contratos_por_generar: 1, citas_por_confirmar: 1, requieren_accion_otros: 1, esperando_autorizacion: 1, aprobados_en_verificacion: 1 }))
  const por = Object.fromEntries(l.map((x) => [x.clave, x]))
  assert.equal(por.contratos_por_generar.destino.href, '/contratos')
  assert.equal(por.citas_por_confirmar.destino.href, '/citas')
  assert.equal(por.requieren_accion_otros.destino.href, '/expedientes?estudio_filtro=requiere_accion')
  assert.equal(por.esperando_autorizacion.destino.href, '/expedientes?estudio_filtro=espera_autorizacion')
  assert.equal(por.esperando_autorizacion.tono, 'espera')
  assert.equal(por.aprobados_en_verificacion.tono, 'espera')
  assert.equal(por.contratos_por_generar.tono, 'accion')
})

test('«Ver los N en …»', () => {
  const [c, v, o] = lineasDeInicio(a({ contratos_por_generar: 11, citas_por_confirmar: 3, requieren_accion_otros: 7 }))
  assert.equal(textoVerTodos(c), 'Ver los 11 en Contratos')
  assert.equal(textoVerTodos(v), 'Ver las 3 en Visitas')
  assert.equal(textoVerTodos(o), 'Ver todos los que requieren su acción en Estudios')
  // Los aprobados con algo por resolver están juntos en un panel de Contratos: se nombra el panel, sin número.
  const [canon] = lineasDeInicio(a({ aprobados_canon_excede: 4 }))
  assert.equal(textoVerTodos(canon), 'Ver en Contratos, «Aprobados con algo por resolver»')
})

test('API anterior: las líneas salen de las filas que se ven, sin «espera autorización»', () => {
  const acc = accionesDesdeFilas({ porConfirmar: 2, porRealizar: 0, porHabilitar: 1, porGenerarContrato: 5, canonExcede: 1, segundoFirmante: 0, enVerificacion: 0, requierenAccion: 9 })
  assert.equal(acc.esperando_autorizacion, null)
  assert.equal(acc.requieren_accion_otros, null)
  assert.deepEqual(lineasDeInicio(acc).map((x) => x.texto), [
    'Tiene 5 contratos por generar',
    '1 estudio aprobado necesita otro inmueble',
    'Tiene 1 evaluación por habilitar',
    'Tiene 2 visitas por confirmar',
    'En total, 9 estudios requieren su acción',
  ])
})
