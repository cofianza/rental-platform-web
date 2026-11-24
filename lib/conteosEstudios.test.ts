/**
 * Pruebas de lib/conteosEstudios (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/conteosEstudios.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  chipsVisibles,
  desgloseDeCifras,
  fraseDesgloseAprobacion,
  tasaAprobacion,
  tasaLegible,
  textoTasaAprobacion,
  tieneConteosAdenda5,
  type CifrasAprobacion,
} from './conteosEstudios'

const ids = (c: Parameters<typeof chipsVisibles>[0], activo: Parameters<typeof chipsVisibles>[1] = 'todos') =>
  chipsVisibles(c, activo).map((x) => x.id)

test('API anterior (sin las claves de la Adenda 5): «Condicionados», como antes', () => {
  const c = { todos: 40, requiere_accion: 3, condicionado: 7, aprobado: 12, rechazado: 13 }
  assert.equal(tieneConteosAdenda5(c), false)
  assert.deepEqual(ids(c), ['todos', 'requiere_accion', 'sin_estudio', 'en_proceso', 'condicionado', 'aprobado', 'rechazado'])
  // Si no se pudieron leer los conteos, tampoco se adivina: «Condicionados».
  assert.deepEqual(ids(null), ['todos', 'requiere_accion', 'sin_estudio', 'en_proceso', 'condicionado', 'aprobado', 'rechazado'])
})

test('API nueva: los resultados de la Adenda 5 en lugar de «Condicionados»', () => {
  const c = { condicionado: 7, segundo_firmante: 5, revision_cofianza: 2, bloqueado: 0, aprobado: 12, rechazado: 13 }
  assert.equal(tieneConteosAdenda5(c), true)
  // Sin bloqueados no sale su chip.
  assert.deepEqual(ids(c), ['todos', 'requiere_accion', 'sin_estudio', 'en_proceso', 'revision_cofianza', 'aprobado', 'segundo_firmante', 'rechazado'])
  // Con alguno, sí.
  assert.deepEqual(ids({ ...c, bloqueado: 1 }), [
    'todos', 'requiere_accion', 'sin_estudio', 'en_proceso', 'revision_cofianza', 'aprobado', 'segundo_firmante', 'bloqueado', 'rechazado',
  ])
  // Elegido, también sin bloqueados (se sabe qué filtra la lista).
  assert.ok(ids(c, 'bloqueado').includes('bloqueado'))
  // «Condicionados» elegido de antes sigue visible mientras esté elegido.
  assert.ok(ids(c, 'condicionado').includes('condicionado'))
  assert.ok(!ids(c).includes('condicionado'))
  // Los nombres exactos.
  const label = (id: string) => chipsVisibles({ ...c, bloqueado: 1 }, 'todos').find((x) => x.id === id)?.label
  assert.equal(label('segundo_firmante'), 'Con segundo firmante')
  assert.equal(label('revision_cofianza'), 'En revisión de Cofianza')
  assert.equal(label('bloqueado'), 'Bloqueados por listas')
  assert.equal(label('rechazado'), 'No aprobables')
})

test('conteos todavía sin llegar: solo los chips de siempre (más el elegido)', () => {
  assert.deepEqual(ids(undefined), ['todos', 'requiere_accion', 'sin_estudio', 'en_proceso', 'aprobado', 'rechazado'])
  assert.deepEqual(ids(undefined, 'segundo_firmante'), ['todos', 'requiere_accion', 'sin_estudio', 'en_proceso', 'aprobado', 'segundo_firmante', 'rechazado'])
})

test('tasa de aprobación: decididos = aprobados + segundo firmante + no aprobables + bloqueados', () => {
  const c = { condicionado: 9, segundo_firmante: 7, revision_cofianza: 2, bloqueado: 0, aprobado: 12, rechazado: 13 }
  // El segundo firmante cuenta en los decididos, no en los aprobados.
  assert.deepEqual(tasaAprobacion(c), { tasa: 37.5, aprobados: 12, decididos: 32, conSegundoFirmante: 7, noAprobables: 13, bloqueados: 0 })
  assert.equal(
    textoTasaAprobacion(c),
    'Tasa de aprobación: 37,5\u00a0% (de 32 estudios decididos: 12 aprobados, 7 con segundo firmante y 13 no aprobables).',
  )
  // Los bloqueados, al final y solo si hay alguno; el segundo firmante, también en 0.
  assert.equal(
    textoTasaAprobacion({ segundo_firmante: 0, revision_cofianza: 4, bloqueado: 1, aprobado: 12, rechazado: 12 }),
    'Tasa de aprobación: 48\u00a0% (de 25 estudios decididos: 12 aprobados, 0 con segundo firmante, 12 no aprobables y 1 bloqueado por listas).',
  )
  // Lo que revisa Cofianza no está decidido.
  assert.equal(tasaAprobacion({ segundo_firmante: 0, revision_cofianza: 30, aprobado: 1, rechazado: 0 })?.decididos, 1)
  // Singular.
  assert.equal(
    textoTasaAprobacion({ segundo_firmante: 0, aprobado: 1, rechazado: 0 }),
    'Tasa de aprobación: 100\u00a0% (de 1 estudio decidido: 1 aprobado, 0 con segundo firmante y 0 no aprobables).',
  )
})

test('tasa de aprobación con una API anterior: aprobados / (aprobados + no aprobables), sin el segundo firmante', () => {
  // El condicionado (mezcla de revisión y segundo firmante) queda fuera.
  assert.equal(
    textoTasaAprobacion({ condicionado: 7, aprobado: 12, rechazado: 13 }),
    'Tasa de aprobación: 48\u00a0% (de 25 estudios decididos: 12 aprobados y 13 no aprobables).',
  )
  assert.equal(textoTasaAprobacion({ aprobado: 1, rechazado: 1 }), 'Tasa de aprobación: 50\u00a0% (de 2 estudios decididos: 1 aprobado y 1 no aprobable).')
  assert.equal(textoTasaAprobacion({ aprobado: 0, rechazado: 0 }), null)
  assert.equal(textoTasaAprobacion(null), null)
  assert.equal(textoTasaAprobacion(undefined), null)
})

test('ayudas: «Requieren su acción» dice qué entra; quien no edita ve el turno de su equipo', () => {
  const c = { segundo_firmante: 1, revision_cofianza: 1, aprobado: 1, rechazado: 1 }
  const gestor = chipsVisibles(c, 'todos').find((x) => x.id === 'requiere_accion')
  assert.equal(gestor?.label, 'Requieren su acción')
  assert.match(gestor?.ayuda ?? '', /^Todo lo que espera algo de usted: .*presentar al segundo firmante o retirar a una persona bloqueada por listas\.$/)
  const equipo = chipsVisibles(c, 'todos', { equipo: true }).find((x) => x.id === 'requiere_accion')
  assert.equal(equipo?.label, 'Requieren acción del equipo')
  assert.match(equipo?.ayuda ?? '', /^Todo lo que espera algo de su equipo: /)
  assert.equal(
    chipsVisibles(c, 'todos').find((x) => x.id === 'revision_cofianza')?.ayuda,
    'Un analista de Cofianza revisa el estudio o verifica a una persona antes de dar el resultado.',
  )
})

test('bloque 4: el desglose de la tasa en el inicio y /reportes, con las cifras de la API', () => {
  // Cifras ficticias. `desglose_aprobacion` de GET /dashboard/summary (trae además decididos y en_revision).
  const delInicio = desgloseDeCifras({ aprobados: 12, con_segundo_firmante: 7, rechazados: 13, bloqueados: 0, decididos: 32, en_revision: 4 } as CifrasAprobacion)
  assert.deepEqual(delInicio, { aprobados: 12, decididos: 32, conSegundoFirmante: 7, noAprobables: 13, bloqueados: 0 })
  assert.equal(fraseDesgloseAprobacion(delInicio!), 'de 32 estudios decididos: 12 aprobados, 7 con segundo firmante y 13 no aprobables')
  // `decisiones30d` de la analítica de la cartera: las mismas claves, con sus otras cifras.
  assert.deepEqual(desgloseDeCifras({ aprobados: 12, con_segundo_firmante: 0, bloqueados: 1, condicionados: 3, rechazados: 12, total: 25, tasaAprobacion: 48 } as CifrasAprobacion), {
    aprobados: 12,
    decididos: 25,
    conSegundoFirmante: 0,
    noAprobables: 12,
    bloqueados: 1,
  })
  // Los totales de GET /reportes/aprobacion, que la página pasa con estos nombres.
  assert.equal(
    fraseDesgloseAprobacion(desgloseDeCifras({ aprobados: 1, con_segundo_firmante: 0, rechazados: 0, bloqueados: 2 })!),
    'de 3 estudios decididos: 1 aprobado, 0 con segundo firmante, 0 no aprobables y 2 bloqueados por listas',
  )
  // La misma frase que /estudios, y la misma tasa: aprobados / (aprobados + con segundo firmante + no aprobables + bloqueados).
  const conteos = { aprobado: 12, segundo_firmante: 7, revision_cofianza: 4, rechazado: 13, bloqueado: 0 }
  assert.equal(textoTasaAprobacion(conteos), `Tasa de aprobación: 37,5\u00a0% (${fraseDesgloseAprobacion(delInicio!)}).`)
  assert.equal(tasaAprobacion(conteos)?.decididos, delInicio?.decididos)
  // API anterior (no cuenta aparte el segundo firmante), sin decididos o sin datos: null, y la pantalla queda como antes.
  assert.equal(desgloseDeCifras({ aprobados: 12, rechazados: 13 }), null)
  assert.equal(desgloseDeCifras({ aprobados: 12, con_segundo_firmante: null, rechazados: 13 }), null)
  assert.equal(desgloseDeCifras({ aprobados: 0, con_segundo_firmante: 0, rechazados: 0 }), null)
  assert.equal(desgloseDeCifras(undefined), null)
  assert.equal(desgloseDeCifras(null), null)
})

test('bloque 4: la tasa se escribe igual en /estudios, el inicio y /reportes («37,5 %»)', () => {
  // Coma decimal, un decimal como máximo y espacio (duro) antes del signo. La API manda dos decimales.
  assert.equal(tasaLegible(37.5), '37,5\u00a0%')
  assert.equal(tasaLegible(37.46), '37,5\u00a0%')
  assert.equal(tasaLegible(48), '48\u00a0%')
  assert.equal(tasaLegible(48.04), '48\u00a0%')
  assert.equal(tasaLegible(0), '0\u00a0%')
  assert.equal(tasaLegible(100), '100\u00a0%')
  // La frase de /estudios usa el mismo formato.
  assert.match(textoTasaAprobacion({ aprobado: 12, segundo_firmante: 7, revision_cofianza: 4, rechazado: 13, bloqueado: 0 }) ?? '', /^Tasa de aprobación: 37,5\u00a0% \(/)
})
