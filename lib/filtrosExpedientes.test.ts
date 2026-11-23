/**
 * Pruebas de lib/filtrosExpedientes (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/filtrosExpedientes.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clavePestana, clavePestanaEstudios, soloCambioLaBusqueda } from './filtrosExpedientes'
import type { IExpedienteFilters } from '@/types/expediente'

const f: IExpedienteFilters = {
  search: '',
  estado: [],
  analista_id: '',
  miembro_responsable_id: '',
  inmueble_id: '',
  fecha_desde: '',
  fecha_hasta: '',
  estudio_filtro: 'todos',
  page: 1,
  limit: 10,
  sortBy: 'created_at',
  sortOrder: 'desc',
}

test('punto 12: solo la búsqueda espera; el chip, el orden y la página cargan ya', () => {
  assert.equal(soloCambioLaBusqueda(f, { ...f, search: 'ana' }), true)
  // Escribir vuelve a la página 1: sigue siendo solo la búsqueda.
  assert.equal(soloCambioLaBusqueda({ ...f, page: 3 }, { ...f, search: 'ana', page: 1 }), true)
  assert.equal(soloCambioLaBusqueda(f, { ...f, estudio_filtro: 'aprobado', page: 1 }), false)
  assert.equal(soloCambioLaBusqueda(f, { ...f, sortBy: 'numero' }), false)
  assert.equal(soloCambioLaBusqueda(f, { ...f, page: 2 }), false)
  // La búsqueda junto con otro cambio (p. ej. limpiar filtros) carga ya.
  assert.equal(soloCambioLaBusqueda({ ...f, search: 'ana' }, { ...f, estudio_filtro: 'rechazado' }), false)
  // Primera carga, o los mismos filtros: ya.
  assert.equal(soloCambioLaBusqueda(null, f), false)
  assert.equal(soloCambioLaBusqueda(f, { ...f }), false)
  // El arreglo de estados se compara por valor.
  assert.equal(soloCambioLaBusqueda({ ...f, estado: ['aprobado'] }, { ...f, estado: ['aprobado'], search: 'x' }), true)
})

test('la pestaña es el chip y la bandeja: la búsqueda, el orden y la página no la cambian', () => {
  const otraPagina: IExpedienteFilters = { ...f, search: 'ana', page: 4, sortBy: 'numero' }
  assert.equal(clavePestana(f), clavePestana(otraPagina))
  assert.notEqual(clavePestana(f), clavePestana({ ...f, estudio_filtro: 'rechazado' }))
  assert.notEqual(clavePestana(f), clavePestana({ ...f, estado: ['condicionado'] }))
  // Sin chip es «todos».
  assert.equal(clavePestana({ estado: [] }), clavePestana({ estado: [], estudio_filtro: 'todos' }))
})

test('lista de evaluaciones (/estudios): la bandeja son estados y resultado; la búsqueda espera igual', () => {
  const e = { search: '', estado: [] as string[], resultado: '', proveedor: '', fecha_desde: '', fecha_hasta: '', page: 1, limit: 10, sortBy: 'created_at' as const, sortOrder: 'desc' as const }
  assert.notEqual(clavePestanaEstudios({ estado: ['completado'], resultado: 'condicionado' }), clavePestanaEstudios({ estado: ['completado'], resultado: '' }))
  // El orden de los estados no cambia la bandeja.
  assert.equal(
    clavePestanaEstudios({ estado: ['solicitado', 'autorizado'], resultado: '' }),
    clavePestanaEstudios({ estado: ['autorizado', 'solicitado'], resultado: '' }),
  )
  assert.equal(soloCambioLaBusqueda(e, { ...e, search: 'ana' }), true)
  assert.equal(soloCambioLaBusqueda(e, { ...e, resultado: 'aprobado' }), false)
})
