/** Reporte de la Oficina Virtual (25-nov), punto 9: cinco secciones y las rutas de siempre (node:test). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SECCIONES_OFICINA, seccionActiva, subseccionActiva } from './oficinaVirtualNav'
import { RUTA_CUPOS } from './constants'

const donde = (pathname: string) => {
  const s = seccionActiva(pathname)
  return s ? [s.label, subseccionActiva(s, pathname)?.label ?? null] : null
}

test('la barra tiene cinco secciones, sin Analítica ni Configuración', () => {
  assert.deepEqual(
    SECCIONES_OFICINA.map((s) => s.label),
    ['Inicio', 'Inmuebles', 'Estudios', 'Contratos', 'Pagos'],
  )
})

test('cada ruta que ya existía queda en su sección (los enlaces de correos y WhatsApp no cambian)', () => {
  assert.deepEqual(donde('/dashboard'), ['Inicio', null])
  assert.deepEqual(donde('/inmuebles'), ['Inmuebles', 'Propiedades y vitrina'])
  assert.deepEqual(donde('/inmuebles/nuevo'), ['Inmuebles', 'Propiedades y vitrina'])
  assert.deepEqual(donde('/interesados'), ['Inmuebles', 'Interesados'])
  assert.deepEqual(donde('/citas'), ['Inmuebles', 'Visitas'])
  assert.deepEqual(donde('/disponibilidad'), ['Inmuebles', 'Horarios de visita'])
  assert.deepEqual(donde('/estudios'), ['Estudios', null])
  assert.deepEqual(donde('/expedientes/00000000-0000-4000-8000-000000000001'), ['Estudios', null])
  assert.deepEqual(donde('/contratos'), ['Contratos', 'Contratos'])
  assert.deepEqual(donde('/contratos/00000000-0000-4000-8000-000000000001'), ['Contratos', 'Contratos'])
  assert.deepEqual(donde('/moras'), ['Contratos', 'Reportar mora'])
  assert.deepEqual(donde('/facturacion'), ['Pagos', 'Pagos a Cofianza'])
  assert.deepEqual(donde('/facturacion/00000000-0000-4000-8000-000000000001'), ['Pagos', 'Pagos a Cofianza'])
  // Los cupos se gestionan en Pagos; la ruta sigue siendo la de siempre (la pasarela vuelve a ella).
  assert.equal(RUTA_CUPOS, '/configuracion/creditos-estudios')
  assert.deepEqual(donde(RUTA_CUPOS), ['Pagos', 'Cupos de estudios'])
})

test('lo del menú de la cuenta no enciende ninguna pestaña', () => {
  for (const p of ['/reportes', '/configuracion', '/configuracion/cuenta', '/configuracion/equipo', '/notificaciones']) {
    assert.equal(seccionActiva(p), null, p)
  }
})

test('una ruta que solo empieza igual no cuenta', () => {
  assert.equal(seccionActiva('/citasx'), null)
  assert.equal(seccionActiva('/configuracion/creditos-estudios-viejo'), null)
})
