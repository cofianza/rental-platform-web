/**
 * Pruebas de lib/filtrosExpedientes (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/filtrosExpedientes.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  chipsDeFiltros,
  clavePestana,
  clavePestanaEstudios,
  esRolCofianza,
  filtrosDesdeUrl,
  nombreInmobiliariaElegida,
  opcionesInmobiliaria,
  periodoDe,
  QUITAR_CHIP,
  rangoPeriodo,
  SIN_INMOBILIARIA,
  soloCambioLaBusqueda,
  textoPeriodo,
  urlDeFiltros,
} from './filtrosExpedientes'
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

// ============================================================
// Filtro mejorado de la cola de Cofianza (27-nov)
// ============================================================

const ORG = '11111111-1111-4111-8111-111111111111'
const ANALISTA = '22222222-2222-4222-8222-222222222222'
const DEFECTO = { limit: 10, sortBy: 'created_at' as const, sortOrder: 'desc' as const }
const url = (q: string) => new URLSearchParams(q)
const ORGS = [
  { id: ORG, nombre: 'Álamo Propiedades', cerrada: false },
  { id: 'o2', nombre: 'Inmobiliaria Norte', cerrada: true },
  { id: 'o3', nombre: 'Casa Sur', cerrada: false },
]

test('el filtro de inmobiliaria es solo de Cofianza', () => {
  assert.equal(esRolCofianza('administrador'), true)
  assert.equal(esRolCofianza('operador_analista'), true)
  assert.equal(esRolCofianza('gerencia_consulta'), true)
  assert.equal(esRolCofianza('inmobiliaria'), false)
  assert.equal(esRolCofianza('propietario'), false)
  assert.equal(esRolCofianza(undefined), false)
})

test('URL → filtros: solo lo válido; la inmobiliaria solo para Cofianza', () => {
  const q = url(
    `search=ana&estado=borrador,xx&analista_id=${ANALISTA}&inmobiliaria_id=${ORG}&fecha_desde=2026-11-01&fecha_hasta=2026-11-15` +
      '&estudio_filtro=aprobado&page=3&limit=20&sortBy=numero&sortOrder=asc',
  )
  assert.deepEqual(filtrosDesdeUrl(q, { conInmobiliaria: true }), {
    search: 'ana',
    estado: ['borrador'],
    analista_id: ANALISTA,
    inmobiliaria_id: ORG,
    fecha_desde: '2026-11-01',
    fecha_hasta: '2026-11-15',
    estudio_filtro: 'aprobado',
    page: 3,
    limit: 20,
    sortBy: 'numero',
    sortOrder: 'asc',
  })
  // A la inmobiliaria o al propietario un enlace de Cofianza no le aplica ese filtro (la API lo rechazaría).
  assert.equal(filtrosDesdeUrl(q, { conInmobiliaria: false }).inmobiliaria_id, undefined)
  assert.equal(filtrosDesdeUrl(url(`inmobiliaria_id=${SIN_INMOBILIARIA}`), { conInmobiliaria: true }).inmobiliaria_id, SIN_INMOBILIARIA)
})

test('URL → filtros: lo que no se reconoce se ignora (nunca un NaN ni un valor inventado)', () => {
  const raro = url('page=abc&limit=0&sortBy=drop&sortOrder=up&estudio_filtro=x&fecha_desde=ayer&analista_id=1&inmobiliaria_id=org-1&estado=')
  assert.deepEqual(filtrosDesdeUrl(raro, { conInmobiliaria: true }), {})
  assert.deepEqual(filtrosDesdeUrl(url(''), { conInmobiliaria: true }), {})
  assert.equal(filtrosDesdeUrl(url('limit=500'), { conInmobiliaria: true }).limit, undefined)
})

test('filtros → URL: solo lo que difiere de la lista por defecto, y vuelve igual', () => {
  assert.equal(urlDeFiltros(f, DEFECTO), '')
  const con: IExpedienteFilters = {
    ...f,
    search: 'casa sur',
    inmobiliaria_id: ORG,
    fecha_desde: '2026-11-01',
    estudio_filtro: 'rechazado',
    page: 2,
    limit: 20,
    sortOrder: 'asc',
  }
  const qs = urlDeFiltros(con, DEFECTO)
  assert.equal(qs, `search=casa+sur&inmobiliaria_id=${ORG}&fecha_desde=2026-11-01&estudio_filtro=rechazado&page=2&limit=20&sortOrder=asc`)
  // Ida y vuelta: lo que se comparte se abre igual.
  assert.deepEqual({ ...f, ...filtrosDesdeUrl(url(qs), { conInmobiliaria: true }) }, con)
  assert.equal(urlDeFiltros({ ...f, inmobiliaria_id: SIN_INMOBILIARIA }, DEFECTO), 'inmobiliaria_id=ninguna')
})

test('periodo de creación: atajos, rango personalizado y el texto del chip', () => {
  const hoy = '2026-11-27'
  assert.deepEqual(rangoPeriodo('hoy', hoy), { fecha_desde: hoy, fecha_hasta: hoy })
  assert.deepEqual(rangoPeriodo('7', hoy), { fecha_desde: '2026-11-21', fecha_hasta: '' })
  assert.deepEqual(rangoPeriodo('30', hoy), { fecha_desde: '2026-10-29', fecha_hasta: '' })
  assert.deepEqual(rangoPeriodo('mes', hoy), { fecha_desde: '2026-11-01', fecha_hasta: '' })
  assert.equal(periodoDe('2026-11-21', '', hoy), '7')
  assert.equal(periodoDe('2026-11-02', '', hoy), 'otro')
  assert.equal(textoPeriodo('', '', hoy), null)
  assert.equal(textoPeriodo(hoy, hoy, hoy), 'Creados hoy')
  assert.equal(textoPeriodo('2026-11-21', '', hoy), 'Creados en los últimos 7 días')
  assert.equal(textoPeriodo('2026-11-01', '', hoy), 'Creados este mes')
  assert.equal(textoPeriodo('2026-11-02', '2026-11-10', hoy), 'Creados del 02/11/2026 al 10/11/2026')
  assert.equal(textoPeriodo('2026-11-05', '2026-11-05', hoy), 'Creados el 05/11/2026')
  assert.equal(textoPeriodo('2026-11-02', '', hoy), 'Creados desde el 02/11/2026')
  assert.equal(textoPeriodo('', '2026-11-10', hoy), 'Creados hasta el 10/11/2026')
})

test('combobox de inmobiliaria: «Todas», «Sin inmobiliaria» y la búsqueda por parte del nombre', () => {
  const todas = opcionesInmobiliaria(ORGS, '')
  assert.deepEqual(
    todas.map((o) => o.valor),
    ['', SIN_INMOBILIARIA, ORG, 'o2', 'o3'],
  )
  assert.equal(todas.find((o) => o.valor === 'o2')?.detalle, 'Cerrada')
  // Sin tildes ni mayúsculas, en cualquier parte del nombre.
  assert.deepEqual(opcionesInmobiliaria(ORGS, 'alamo').map((o) => o.valor), [ORG])
  assert.deepEqual(opcionesInmobiliaria(ORGS, ' SUR').map((o) => o.valor), ['o3'])
  // Las fijas solo si el texto es el comienzo de su rótulo: «inmo» no trae «Todas las inmobiliarias».
  assert.deepEqual(opcionesInmobiliaria(ORGS, 'inmo').map((o) => o.valor), ['o2'])
  assert.deepEqual(opcionesInmobiliaria(ORGS, 'sin').map((o) => o.valor), [SIN_INMOBILIARIA])
  assert.deepEqual(opcionesInmobiliaria(ORGS, 'zzz'), [])
  assert.equal(nombreInmobiliariaElegida('', ORGS), '')
  assert.equal(nombreInmobiliariaElegida(SIN_INMOBILIARIA, null), 'Sin inmobiliaria (propietario directo)')
  assert.equal(nombreInmobiliariaElegida(ORG, ORGS), 'Álamo Propiedades')
  // La lista todavía no llega: no se inventa un nombre.
  assert.equal(nombreInmobiliariaElegida(ORG, null), null)
})

test('chips: uno por filtro activo, con lo que quita cada uno', () => {
  const ctx = { analistas: [{ id: ANALISTA, nombre: 'Analista Uno' }], inmobiliarias: ORGS, misExpedientes: false, hoy: '2026-11-27' }
  assert.deepEqual(chipsDeFiltros(f, ctx), [])
  const chips = chipsDeFiltros({ ...f, search: '  casa ', analista_id: ANALISTA, inmobiliaria_id: ORG, fecha_desde: '2026-11-21' }, ctx)
  assert.deepEqual(chips, [
    { clave: 'search', texto: 'Búsqueda: «casa»' },
    { clave: 'analista', texto: 'Analista: Analista Uno' },
    { clave: 'inmobiliaria', texto: 'Inmobiliaria: Álamo Propiedades' },
    { clave: 'fecha', texto: 'Creados en los últimos 7 días' },
  ])
  // «Asignados a mí» reemplaza al analista (es el mismo filtro).
  assert.deepEqual(
    chipsDeFiltros({ ...f, analista_id: ANALISTA }, { ...ctx, misExpedientes: true }).map((c) => c.clave),
    ['asignados'],
  )
  assert.equal(chipsDeFiltros({ ...f, inmobiliaria_id: SIN_INMOBILIARIA }, ctx)[0].texto, 'Sin inmobiliaria (propietario directo)')
  assert.equal(chipsDeFiltros({ ...f, inmobiliaria_id: ORG }, { ...ctx, inmobiliarias: null })[0].texto, 'Inmobiliaria elegida')
  assert.deepEqual(QUITAR_CHIP.inmobiliaria, { inmobiliaria_id: '' })
  assert.deepEqual(QUITAR_CHIP.fecha, { fecha_desde: '', fecha_hasta: '' })
})
