/** Pruebas de lib/datosArrendador (node:test). Correr con: npx --yes tsx@4 --test lib/datosArrendador.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RUTA_DATOS_INMOBILIARIA, RUTAS_VIEJAS_DATOS_INMOBILIARIA, rutaDatosConRegreso, tituloDatosArrendador } from './datosArrendador'

test('punto 13: un solo lugar, «Datos de mi inmobiliaria» (el propietario lo ve con su nombre)', () => {
  assert.equal(tituloDatosArrendador('inmobiliaria'), 'Datos de mi inmobiliaria')
  assert.equal(tituloDatosArrendador('propietario'), 'Mis datos de propietario')
  assert.equal(tituloDatosArrendador(undefined), 'Datos de mi inmobiliaria')
  assert.equal(rutaDatosConRegreso('/inmuebles/nuevo'), '/configuracion/datos-inmobiliaria?returnTo=%2Finmuebles%2Fnuevo')
})

test('punto 13: las rutas viejas redirigen a la nueva (next.config.ts), sin conservar su página', () => {
  const config = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8')
  for (const vieja of RUTAS_VIEJAS_DATOS_INMOBILIARIA) {
    assert.match(config, new RegExp(`source: '${vieja}', destination: '${RUTA_DATOS_INMOBILIARIA}', permanent: false`))
    assert.throws(() => readFileSync(new URL(`../app/(dashboard)${vieja}/page.tsx`, import.meta.url)))
  }
  readFileSync(new URL(`../app/(dashboard)${RUTA_DATOS_INMOBILIARIA}/page.tsx`, import.meta.url))
})
