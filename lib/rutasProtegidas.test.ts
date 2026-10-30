/**
 * Pruebas de lib/rutasProtegidas (node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/rutasProtegidas.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { DASHBOARD_SEGMENTOS, PUBLICO_SEGMENTOS, esRutaProtegida, esRutaAuth } from './rutasProtegidas'

const segmentosDe = (grupo: string) =>
  readdirSync(join(import.meta.dirname, '..', 'app', grupo), { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('(') && !d.name.startsWith('_'))
    .map((d) => d.name)

test('cada segmento de app/(dashboard) está protegido', () => {
  for (const s of segmentosDe('(dashboard)')) {
    assert.ok((DASHBOARD_SEGMENTOS as readonly string[]).includes(s), `falta '${s}' en DASHBOARD_SEGMENTOS`)
  }
})

test('cada segmento de app/(public) está en PUBLICO_SEGMENTOS', () => {
  for (const s of segmentosDe('(public)')) {
    assert.ok((PUBLICO_SEGMENTOS as readonly string[]).includes(s), `falta '${s}' en PUBLICO_SEGMENTOS`)
  }
})

test('rutas del dashboard requieren sesión, incluidas las que antes faltaban', () => {
  for (const p of ['/dashboard', '/inmuebles/1', '/contratos', '/contratos/abc', '/citas', '/moras', '/admin/migracion/carga', '/plantillas-contrato/x', '/estudios', '/facturacion']) {
    assert.equal(esRutaProtegida(p), true, p)
  }
})

test('rutas públicas, de auth y top-level no requieren sesión', () => {
  for (const p of ['/', '/vitrina', '/inmueble/123', '/privacidad', '/terminos', '/login', '/registro', '/registro/propietario', '/recuperar-contrasena', '/restablecer-contrasena', '/verificar-email', '/auth/confirmar', '/estudio/tok', '/autorizar/tok', '/firma/tok', '/pago/resultado', '/verificar/x', '/invitacion/x', '/invitacion-miembro/x', '/coarrendatario/x', '/visita/x', '/cargar-documentos/x', '/verificar-identidad/x']) {
    assert.equal(esRutaProtegida(p), false, p)
  }
})

test('comparación por segmento completo, no por prefijo', () => {
  assert.equal(esRutaProtegida('/inmueblesx'), false)
  assert.equal(esRutaProtegida('/estudio'), false)
})

test('rutas de auth: /login y /registro*, nunca los enlaces de correo', () => {
  assert.equal(esRutaAuth('/login'), true)
  assert.equal(esRutaAuth('/registro'), true)
  assert.equal(esRutaAuth('/registro/inmobiliaria'), true)
  assert.equal(esRutaAuth('/login/x'), false)
  assert.equal(esRutaAuth('/verificar-email'), false)
  assert.equal(esRutaAuth('/restablecer-contrasena'), false)
  assert.equal(esRutaAuth('/recuperar-contrasena'), false)
})
