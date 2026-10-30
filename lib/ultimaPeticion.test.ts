/**
 * Pruebas de lib/ultimaPeticion (node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/ultimaPeticion.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearContadorPeticiones } from './ultimaPeticion'

test('solo la última petición es vigente', () => {
  const c = crearContadorPeticiones()
  const a = c.iniciar()
  assert.equal(a(), true)
  const b = c.iniciar()
  assert.equal(a(), false)
  assert.equal(b(), true)
})

test('una respuesta vieja que llega tarde se descarta', async () => {
  const c = crearContadorPeticiones()
  const aplicadas: string[] = []
  const pedir = async (valor: string, ms: number) => {
    const vigente = c.iniciar()
    await new Promise((r) => setTimeout(r, ms))
    if (vigente()) aplicadas.push(valor)
  }
  await Promise.all([pedir('vieja', 30), pedir('nueva', 5)])
  assert.deepEqual(aplicadas, ['nueva'])
})

test('invalidar descarta todas las pendientes', () => {
  const c = crearContadorPeticiones()
  const a = c.iniciar()
  c.invalidar()
  assert.equal(a(), false)
  assert.equal(c.iniciar()(), true)
})
