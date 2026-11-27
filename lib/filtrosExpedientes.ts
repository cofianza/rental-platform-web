/**
 * Cómo reacciona una lista de estudios o de evaluaciones a un cambio de filtros (reporte de Gerencia,
 * 21-nov, punto 12):
 * - la búsqueda espera a que se deje de escribir; el chip, la pestaña, el orden y la página cargan ya;
 * - las filas de otra pestaña (otro chip u otra bandeja) no se muestran mientras carga la elegida: se
 *   muestra el esqueleto. Con la misma pestaña (página, orden, búsqueda) se siguen viendo con «Actualizando…».
 * Pura.
 */

import type { EstudioFiltro, IExpedienteFilters } from '@/types/expediente'
import type { IEstudioFilters } from '@/types/estudio'
import type { EstadoExpediente } from '@/lib/constants'

/** Lo que hace de los filtros una «pestaña»: el chip de la vista de quien gestiona y la bandeja de Cofianza. */
export function clavePestana(f: Pick<IExpedienteFilters, 'estudio_filtro' | 'estado'>): string {
  return `${f.estudio_filtro ?? 'todos'}|${[...(f.estado ?? [])].sort().join(',')}`
}

/** La pestaña de la lista de evaluaciones (/estudios): la bandeja son estados y, a veces, un resultado. */
export function clavePestanaEstudios(f: Pick<IEstudioFilters, 'estado' | 'resultado'>): string {
  return `${[...(f.estado ?? [])].sort().join(',')}|${f.resultado ?? ''}`
}

const igual = (a: unknown, b: unknown): boolean =>
  Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((v, i) => v === b[i]) : a === b

/**
 * Solo cambió el texto de la búsqueda (la página puede volver a la 1 con ella). Sin filtros
 * anteriores (primera carga) es false: se carga ya.
 */
export function soloCambioLaBusqueda<T extends { search: string; page: number }>(prev: T | null, next: T): boolean {
  if (!prev || prev.search === next.search) return false
  const claves = new Set([...Object.keys(prev), ...Object.keys(next)]) as Set<keyof T>
  for (const k of claves) {
    if (k === 'search' || k === 'page') continue
    if (!igual(prev[k], next[k])) return false
  }
  return true
}

// ============================================================
// Filtro mejorado de la cola de Cofianza (pedido de Gerencia del 27-nov): inmobiliaria, chips de los filtros activos,
// periodo de creación y los filtros en la URL. Puro.
// ============================================================

/** Valor del filtro «Inmobiliaria» para los estudios sin inmobiliaria (propietario directo). El mismo de la API. */
export const SIN_INMOBILIARIA = 'ninguna'

/** Los roles de Cofianza: los únicos que ven el filtro «Inmobiliaria» (la API lo rechaza a los demás). */
export const ROLES_COFIANZA: readonly string[] = ['administrador', 'operador_analista', 'gerencia_consulta']
export const esRolCofianza = (rol: string | null | undefined): boolean => !!rol && ROLES_COFIANZA.includes(rol)

// ---------- Periodo de creación ----------

export type Periodo = '' | 'hoy' | '7' | '30' | 'mes' | 'otro'

/** Fecha de hoy en Colombia como AAAA-MM-DD (lo que esperan fecha_desde/fecha_hasta). */
export function hoyBogota(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

export function restarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - dias)).toISOString().slice(0, 10)
}

/** Rango de cada periodo; «hasta» vacío = sin tope (incluye hoy). */
export function rangoPeriodo(p: Exclude<Periodo, '' | 'otro'>, hoy: string): { fecha_desde: string; fecha_hasta: string } {
  if (p === 'hoy') return { fecha_desde: hoy, fecha_hasta: hoy }
  if (p === 'mes') return { fecha_desde: `${hoy.slice(0, 8)}01`, fecha_hasta: '' }
  return { fecha_desde: restarDias(hoy, Number(p) - 1), fecha_hasta: '' }
}

export function periodoDe(desde: string, hasta: string, hoy: string): Periodo {
  if (!desde && !hasta) return ''
  for (const p of ['hoy', '7', '30', 'mes'] as const) {
    const r = rangoPeriodo(p, hoy)
    if (r.fecha_desde === desde && r.fecha_hasta === hasta) return p
  }
  return 'otro'
}

/** AAAA-MM-DD → DD/MM/AAAA (como se escribe la fecha en Colombia). */
const fechaLegible = (iso: string): string => {
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

/** Lo que dice el chip del periodo de creación; null sin periodo. */
export function textoPeriodo(desde: string, hasta: string, hoy: string): string | null {
  const p = periodoDe(desde, hasta, hoy)
  if (p === '') return null
  if (p === 'hoy') return 'Creados hoy'
  if (p === '7') return 'Creados en los últimos 7 días'
  if (p === '30') return 'Creados en los últimos 30 días'
  if (p === 'mes') return 'Creados este mes'
  if (desde && hasta) return desde === hasta ? `Creados el ${fechaLegible(desde)}` : `Creados del ${fechaLegible(desde)} al ${fechaLegible(hasta)}`
  return desde ? `Creados desde el ${fechaLegible(desde)}` : `Creados hasta el ${fechaLegible(hasta)}`
}

// ---------- Inmobiliaria ----------

/** Sin tildes ni mayúsculas, para buscar «alamo» en «Álamo». */
export const normalizarTexto = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

export const TEXTO_TODAS_INMOBILIARIAS = 'Todas las inmobiliarias'
export const TEXTO_SIN_INMOBILIARIA = 'Sin inmobiliaria (propietario directo)'

export interface OpcionInmobiliaria {
  /** '' = todas; SIN_INMOBILIARIA; o el id de la organización. */
  valor: string
  texto: string
  /** «Cerrada», al lado del nombre. */
  detalle?: string
}

/**
 * Las opciones del combobox para lo que se escribió: «Todas» y «Sin inmobiliaria» arriba (si el texto es el comienzo
 * de su rótulo, o no hay texto) y las organizaciones cuyo nombre contiene el texto, sin distinguir tildes ni mayúsculas.
 */
export function opcionesInmobiliaria(
  inmobiliarias: ReadonlyArray<{ id: string; nombre: string; cerrada?: boolean }>,
  texto: string,
): OpcionInmobiliaria[] {
  const q = normalizarTexto(texto)
  const fijas: OpcionInmobiliaria[] = [
    { valor: '', texto: TEXTO_TODAS_INMOBILIARIAS },
    { valor: SIN_INMOBILIARIA, texto: TEXTO_SIN_INMOBILIARIA },
  ].filter((o) => !q || normalizarTexto(o.texto).startsWith(q))
  const orgs = inmobiliarias
    .filter((o) => !q || normalizarTexto(o.nombre).includes(q))
    .map((o) => ({ valor: o.id, texto: o.nombre, ...(o.cerrada ? { detalle: 'Cerrada' } : {}) }))
  return [...fijas, ...orgs]
}

/**
 * El nombre de lo elegido: '' (todas), «Sin inmobiliaria…» o el nombre de la organización. null = la organización
 * todavía no se conoce (la lista no ha llegado o ya no está).
 */
export function nombreInmobiliariaElegida(
  valor: string | undefined,
  inmobiliarias: ReadonlyArray<{ id: string; nombre: string }> | null,
): string | null {
  if (!valor) return ''
  if (valor === SIN_INMOBILIARIA) return TEXTO_SIN_INMOBILIARIA
  return inmobiliarias?.find((o) => o.id === valor)?.nombre ?? null
}

// ---------- Chips de los filtros activos ----------

export type ClaveChip = 'search' | 'asignados' | 'analista' | 'inmobiliaria' | 'fecha'

export interface ChipFiltro {
  clave: ClaveChip
  texto: string
}

/** Lo que quita cada chip («Asignados a mí» se apaga con su interruptor, que también limpia el analista). */
export const QUITAR_CHIP: Record<Exclude<ClaveChip, 'asignados'>, Partial<IExpedienteFilters>> = {
  search: { search: '' },
  analista: { analista_id: '' },
  inmobiliaria: { inmobiliaria_id: '' },
  fecha: { fecha_desde: '', fecha_hasta: '' },
}

/** Un chip por filtro activo de la barra, en el orden de la barra. */
export function chipsDeFiltros(
  f: Pick<IExpedienteFilters, 'search' | 'analista_id' | 'inmobiliaria_id' | 'fecha_desde' | 'fecha_hasta'>,
  ctx: {
    analistas: ReadonlyArray<{ id: string; nombre: string }>
    inmobiliarias: ReadonlyArray<{ id: string; nombre: string }> | null
    misExpedientes: boolean
    hoy: string
  },
): ChipFiltro[] {
  const chips: ChipFiltro[] = []
  const busqueda = f.search.trim()
  if (busqueda) chips.push({ clave: 'search', texto: `Búsqueda: «${busqueda}»` })
  if (ctx.misExpedientes) chips.push({ clave: 'asignados', texto: 'Asignados a mí' })
  else if (f.analista_id) {
    const nombre = ctx.analistas.find((a) => a.id === f.analista_id)?.nombre
    chips.push({ clave: 'analista', texto: nombre ? `Analista: ${nombre}` : 'Analista elegido' })
  }
  if (f.inmobiliaria_id) {
    const nombre = nombreInmobiliariaElegida(f.inmobiliaria_id, ctx.inmobiliarias)
    chips.push({
      clave: 'inmobiliaria',
      texto: f.inmobiliaria_id === SIN_INMOBILIARIA ? TEXTO_SIN_INMOBILIARIA : nombre ? `Inmobiliaria: ${nombre}` : 'Inmobiliaria elegida',
    })
  }
  const periodo = textoPeriodo(f.fecha_desde, f.fecha_hasta, ctx.hoy)
  if (periodo) chips.push({ clave: 'fecha', texto: periodo })
  return chips
}

// ---------- Los filtros en la URL ----------

/** Los chips de estudio que la lista acepta en la URL. */
export const ESTUDIO_FILTROS: readonly EstudioFiltro[] = [
  'todos', 'aprobado', 'rechazado', 'condicionado', 'segundo_firmante', 'bloqueado', 'revision_cofianza',
  'en_proceso', 'sin_estudio', 'sin_autorizar', 'requiere_accion', 'cerrado', 'espera_autorizacion',
]

const ESTADOS_URL: readonly EstadoExpediente[] = [
  'borrador', 'en_revision', 'informacion_incompleta', 'aprobado', 'rechazado', 'condicionado', 'cerrado',
]
const ORDENES: readonly IExpedienteFilters['sortBy'][] = ['created_at', 'numero', 'estado', 'updated_at']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FECHA = /^\d{4}-\d{2}-\d{2}$/
const entero = (v: string | null, min: number, max: number): number | undefined => {
  if (!v || !/^\d+$/.test(v)) return undefined
  const n = Number(v)
  return n >= min && n <= max ? n : undefined
}

/**
 * Los filtros que trae la URL (al volver a la lista o al abrir un enlace compartido). Solo las claves presentes y
 * válidas: lo que no se reconoce se ignora (nunca un NaN ni un filtro inventado). El de inmobiliaria solo para
 * Cofianza (`conInmobiliaria`): a los demás la API se lo rechazaría.
 */
export function filtrosDesdeUrl(
  params: { get(clave: string): string | null },
  { conInmobiliaria }: { conInmobiliaria: boolean },
): Partial<IExpedienteFilters> {
  const f: Partial<IExpedienteFilters> = {}
  const search = params.get('search')
  if (search) f.search = search
  const estados = (params.get('estado') ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter((e): e is EstadoExpediente => (ESTADOS_URL as readonly string[]).includes(e))
  if (estados.length > 0) f.estado = estados
  const analista = params.get('analista_id')
  if (analista && UUID.test(analista)) f.analista_id = analista
  const inmobiliaria = params.get('inmobiliaria_id')
  if (conInmobiliaria && inmobiliaria && (inmobiliaria === SIN_INMOBILIARIA || UUID.test(inmobiliaria))) f.inmobiliaria_id = inmobiliaria
  const desde = params.get('fecha_desde')
  if (desde && FECHA.test(desde)) f.fecha_desde = desde
  const hasta = params.get('fecha_hasta')
  if (hasta && FECHA.test(hasta)) f.fecha_hasta = hasta
  const estudio = params.get('estudio_filtro')
  if (estudio && (ESTUDIO_FILTROS as readonly string[]).includes(estudio)) f.estudio_filtro = estudio as EstudioFiltro
  const page = entero(params.get('page'), 1, 100_000)
  if (page) f.page = page
  const limit = entero(params.get('limit'), 1, 100)
  if (limit) f.limit = limit
  const sortBy = params.get('sortBy')
  if (sortBy && (ORDENES as readonly string[]).includes(sortBy)) f.sortBy = sortBy as IExpedienteFilters['sortBy']
  const sortOrder = params.get('sortOrder')
  if (sortOrder === 'asc' || sortOrder === 'desc') f.sortOrder = sortOrder
  return f
}

/**
 * El querystring (sin «?») de los filtros: solo lo que difiere de la lista por defecto, para que el enlace se pueda
 * compartir y volver atrás conserve la vista.
 */
export function urlDeFiltros(
  f: IExpedienteFilters,
  defecto: Pick<IExpedienteFilters, 'limit' | 'sortBy' | 'sortOrder'>,
): string {
  const params = new URLSearchParams()
  if (f.search) params.set('search', f.search)
  if (f.estado.length > 0) params.set('estado', f.estado.join(','))
  if (f.analista_id) params.set('analista_id', f.analista_id)
  if (f.inmobiliaria_id) params.set('inmobiliaria_id', f.inmobiliaria_id)
  if (f.fecha_desde) params.set('fecha_desde', f.fecha_desde)
  if (f.fecha_hasta) params.set('fecha_hasta', f.fecha_hasta)
  if (f.estudio_filtro && f.estudio_filtro !== 'todos') params.set('estudio_filtro', f.estudio_filtro)
  if (f.page > 1) params.set('page', String(f.page))
  if (f.limit !== defecto.limit) params.set('limit', String(f.limit))
  if (f.sortBy !== defecto.sortBy) params.set('sortBy', f.sortBy)
  if (f.sortOrder !== defecto.sortOrder) params.set('sortOrder', f.sortOrder)
  return params.toString()
}
