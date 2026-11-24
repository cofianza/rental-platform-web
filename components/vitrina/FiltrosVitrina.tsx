/**
 * Buscador y filtros de la vitrina pública (/vitrina).
 *
 * Una sola consola: la búsqueda arriba (por barrio, ciudad o código, con
 * sugerencias de los barrios que tienen inmuebles) y, debajo, una celda por
 * filtro (ciudad, tipo, habitaciones, canon, estrato y «Más filtros»: baños,
 * parqueadero y área). En el celular y la tableta los filtros van en un panel
 * inferior con «Ver N inmuebles» y el orden queda a la vista. Los filtros
 * activos se muestran como chips que se quitan con un toque.
 *
 * Solo presentación: el estado, la URL y las peticiones viven en PropertyGrid.
 * Todo lo que se filtra aquí lo acepta la API pública (/public/properties).
 */

'use client'

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { IconSearch, IconX, IconChevronDown, IconSlidersHorizontal, IconArrowUpDown, IconMapPin } from '@/components/icons'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

// ── Valor de los filtros ────────────────────

export type OrdenVitrina = 'recientes' | 'menor' | 'mayor'

export interface FiltrosVitrinaValor {
  /** Texto del campo de búsqueda, tal como lo escribe el visitante. */
  search: string
  ciudad: string
  tipo: string
  /** Mínimo de habitaciones ('' = cualquiera). */
  habitaciones: string
  /** Solo dígitos ('' = sin límite). */
  precioMin: string
  precioMax: string
  /** '' = cualquiera. */
  estrato: string
  /** Barrio exacto, elegido entre las sugerencias ('' = todos). */
  barrio: string
  /** Mínimo de baños ('' = cualquiera). */
  banos: string
  /** '1' = solo con parqueadero. */
  parqueadero: string
  /** Área mínima en m², solo dígitos. */
  areaMin: string
  orden: OrdenVitrina
}

export const FILTROS_VACIOS: FiltrosVitrinaValor = {
  search: '',
  ciudad: '',
  tipo: '',
  habitaciones: '',
  precioMin: '',
  precioMax: '',
  estrato: '',
  barrio: '',
  banos: '',
  parqueadero: '',
  areaMin: '',
  orden: 'recientes',
}

/** Lo que borra «Limpiar» del panel: todo menos la búsqueda y el orden. */
export const FILTROS_DEL_PANEL: Partial<FiltrosVitrinaValor> = {
  ciudad: '',
  barrio: '',
  tipo: '',
  habitaciones: '',
  precioMin: '',
  precioMax: '',
  estrato: '',
  banos: '',
  parqueadero: '',
  areaMin: '',
}

export const ORDENES: { valor: OrdenVitrina; etiqueta: string }[] = [
  { valor: 'recientes', etiqueta: 'Más recientes' },
  { valor: 'menor', etiqueta: 'Menor canon' },
  { valor: 'mayor', etiqueta: 'Mayor canon' },
]

export const esOrden = (v: string | null): v is OrdenVitrina => v === 'recientes' || v === 'menor' || v === 'mayor'

/** El orden en los términos de la API. */
export function ordenAQuery(orden: OrdenVitrina): {
  sortBy: 'created_at' | 'valor_arriendo'
  sortOrder: 'asc' | 'desc'
} {
  if (orden === 'menor') return { sortBy: 'valor_arriendo', sortOrder: 'asc' }
  if (orden === 'mayor') return { sortBy: 'valor_arriendo', sortOrder: 'desc' }
  return { sortBy: 'created_at', sortOrder: 'desc' }
}

export const TIPO_LABELS: Record<string, string> = {
  apartamento: 'Apartamento',
  apartaestudio: 'Apartaestudio',
  casa: 'Casa',
  casa_finca: 'Casa Finca',
  finca: 'Finca',
  oficina: 'Oficina',
  local: 'Local',
  bodega: 'Bodega',
  lote: 'Lote',
  parqueadero: 'Parqueadero',
}

const HABITACIONES = ['1', '2', '3', '4']
const BANOS = ['1', '2', '3']
const AREAS = ['40', '60', '90', '120']
const ESTRATOS_POR_DEFECTO = [1, 2, 3, 4, 5, 6]

/** Rangos de canon frecuentes: un toque los llena. */
const RANGOS_CANON: { etiqueta: string; min: string; max: string }[] = [
  { etiqueta: 'Hasta $1.000.000', min: '', max: '1000000' },
  { etiqueta: '$1.000.000 a $2.000.000', min: '1000000', max: '2000000' },
  { etiqueta: '$2.000.000 a $3.500.000', min: '2000000', max: '3500000' },
  { etiqueta: 'Desde $3.500.000', min: '3500000', max: '' },
]

const pesos = (digitos: string) => `$${Number(digitos).toLocaleString('es-CO')}`

/** «$1,5 M» / «$800 mil»: cabe en la celda del canon. */
function pesosCortos(digitos: string): string {
  const n = Number(digitos)
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  if (n >= 1_000) return `$${(n / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 0 })} mil`
  return `$${n.toLocaleString('es-CO')}`
}

/** Resumen del canon para la celda: «Cualquiera», «Hasta $2 M», «Desde $1 M», «$1 M – $2 M». */
export function resumenCanon(min: string, max: string): string | null {
  if (min && max) return `${pesosCortos(min)} – ${pesosCortos(max)}`
  if (max) return `Hasta ${pesosCortos(max)}`
  if (min) return `Desde ${pesosCortos(min)}`
  return null
}

/** El canon con cifras completas, para el chip. */
function textoCanon(min: string, max: string): string {
  if (min && max) return `Canon de ${pesos(min)} a ${pesos(max)}`
  if (max) return `Canon hasta ${pesos(max)}`
  return `Canon desde ${pesos(min)}`
}

/** Cuántos filtros hay puestos (la búsqueda y el orden no cuentan). */
export function contarFiltros(f: FiltrosVitrinaValor): number {
  // Ciudad y barrio son un solo filtro (el barrio sale de las sugerencias de una ciudad).
  return [f.ciudad || f.barrio, f.tipo, f.habitaciones, f.precioMin || f.precioMax, f.estrato, f.banos, f.parqueadero, f.areaMin].filter(Boolean)
    .length
}

/** Resumen de «Más filtros» para su celda: el único puesto, o cuántos hay. */
export function resumenMas(f: FiltrosVitrinaValor): string | null {
  const puestos = [
    f.banos && `${f.banos}+ ${f.banos === '1' ? 'baño' : 'baños'}`,
    f.parqueadero && 'Con parqueadero',
    f.areaMin && `Desde ${Number(f.areaMin).toLocaleString('es-CO')} m²`,
  ].filter((x): x is string => !!x)
  if (puestos.length === 0) return null
  return puestos.length === 1 ? puestos[0] : `${puestos.length} filtros`
}

export const hayFiltros = (f: FiltrosVitrinaValor) => !!f.search.trim() || contarFiltros(f) > 0

export interface ChipFiltro {
  clave: string
  texto: string
  quitar: Partial<FiltrosVitrinaValor>
}

/** Los filtros activos como chips, en el orden de la consola. */
export function chipsActivos(f: FiltrosVitrinaValor): ChipFiltro[] {
  const chips: ChipFiltro[] = []
  if (f.search.trim())
    chips.push({
      clave: 'search',
      texto: `«${f.search.trim()}»`,
      quitar: { search: '' },
    })
  // Sin ciudad, el barrio elegido de sus sugerencias tampoco se sostiene: se quitan juntos.
  if (f.ciudad) chips.push({ clave: 'ciudad', texto: f.ciudad, quitar: { ciudad: '', barrio: '' } })
  if (f.barrio) chips.push({ clave: 'barrio', texto: f.barrio, quitar: { barrio: '' } })
  if (f.tipo)
    chips.push({
      clave: 'tipo',
      texto: TIPO_LABELS[f.tipo] ?? f.tipo,
      quitar: { tipo: '' },
    })
  if (f.habitaciones)
    chips.push({
      clave: 'habitaciones',
      texto: `${f.habitaciones}+ ${f.habitaciones === '1' ? 'habitación' : 'habitaciones'}`,
      quitar: { habitaciones: '' },
    })
  if (f.precioMin || f.precioMax)
    chips.push({
      clave: 'canon',
      texto: textoCanon(f.precioMin, f.precioMax),
      quitar: { precioMin: '', precioMax: '' },
    })
  if (f.estrato)
    chips.push({
      clave: 'estrato',
      texto: `Estrato ${f.estrato}`,
      quitar: { estrato: '' },
    })
  if (f.banos) chips.push({ clave: 'banos', texto: `${f.banos}+ ${f.banos === '1' ? 'baño' : 'baños'}`, quitar: { banos: '' } })
  if (f.parqueadero) chips.push({ clave: 'parqueadero', texto: 'Con parqueadero', quitar: { parqueadero: '' } })
  if (f.areaMin) chips.push({ clave: 'area', texto: `Desde ${Number(f.areaMin).toLocaleString('es-CO')} m²`, quitar: { areaMin: '' } })
  return chips
}

// ── Sugerencias del buscador ────────────────

export interface UbicacionVitrina {
  ciudad: string
  barrio: string | null
  total: number
}

export interface Sugerencia {
  ciudad: string
  /** null = la ciudad entera. */
  barrio: string | null
  total: number
}

/** Sin tildes ni mayúsculas, como compara la API. */
const sinTildes = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()

/**
 * Ciudades y barrios con inmuebles que contienen lo escrito (desde 2 letras, sin tildes), primero los que
 * empiezan así y las ciudades antes que sus barrios. Máximo 6.
 */
export function sugerenciasDe(texto: string, ubicaciones: UbicacionVitrina[]): Sugerencia[] {
  const q = sinTildes(texto)
  if (q.length < 2) return []
  const ciudades = new Map<string, Sugerencia>()
  for (const u of ubicaciones) {
    const clave = sinTildes(u.ciudad)
    const c = ciudades.get(clave)
    if (c) c.total += u.total
    else ciudades.set(clave, { ciudad: u.ciudad, barrio: null, total: u.total })
  }
  const candidatos: Array<Sugerencia & { rango: number }> = []
  for (const c of ciudades.values()) {
    const n = sinTildes(c.ciudad)
    if (n.includes(q)) candidatos.push({ ...c, rango: n.startsWith(q) ? 0 : 2 })
  }
  for (const u of ubicaciones) {
    if (!u.barrio) continue
    const n = sinTildes(u.barrio)
    if (n.includes(q)) candidatos.push({ ciudad: u.ciudad, barrio: u.barrio, total: u.total, rango: n.startsWith(q) ? 1 : 3 })
  }
  return candidatos
    .sort((a, b) => a.rango - b.rango || b.total - a.total || (a.barrio ?? a.ciudad).localeCompare(b.barrio ?? b.ciudad, 'es'))
    .slice(0, 6)
    .map(({ ciudad, barrio, total }) => ({ ciudad, barrio, total }))
}

// ── Consola ─────────────────────────────────

interface OpcionesFiltros {
  ciudades: string[]
  tipos: string[]
  estratos: number[]
  ubicaciones?: UbicacionVitrina[]
}

interface ConsolaProps {
  valor: FiltrosVitrinaValor
  onCambiar: (parcial: Partial<FiltrosVitrinaValor>) => void
  opciones: OpcionesFiltros
  /** Resultados de la búsqueda vigente (para «Ver N inmuebles» del panel del celular). */
  total: number
  cargando: boolean
  /** La carga falló: el panel no culpa a los filtros. */
  error?: boolean
  /** Aún no hay inmuebles publicados (sin filtros puestos). */
  vitrinaVacia?: boolean
  className?: string
}

export function ConsolaBusqueda({ valor, onCambiar, opciones, total, cargando, error, vitrinaVacia, className }: ConsolaProps) {
  const [panelAbierto, setPanelAbierto] = useState(false)
  const busquedaRef = useRef<HTMLInputElement>(null)
  const estratos = opciones.estratos.length > 0 ? [...opciones.estratos].sort((a, b) => a - b) : ESTRATOS_POR_DEFECTO
  const nFiltros = contarFiltros(valor)

  // Sugerencias: barrios y ciudades que de verdad tienen inmuebles (combobox ARIA).
  const [sugAbiertas, setSugAbiertas] = useState(false)
  const [activa, setActiva] = useState(-1)
  const listaId = useId()
  const sugerencias = useMemo(() => sugerenciasDe(valor.search, opciones.ubicaciones ?? []), [valor.search, opciones.ubicaciones])
  const mostrarSug = sugAbiertas && sugerencias.length > 0
  // El número de cada sugerencia no cuenta los demás filtros: con alguno puesto, no se muestra (no prometer de más).
  const otrosFiltros = contarFiltros({ ...valor, ciudad: '', barrio: '' }) > 0
  const [aviso, setAviso] = useState('')
  const consolaRef = useRef<HTMLDivElement>(null)
  const elegir = (s: Sugerencia) => {
    // La ciudad (y el barrio) pasan a ser filtros: el texto ya no hace falta.
    onCambiar({ ciudad: s.ciudad, barrio: s.barrio ?? '', search: '' })
    setSugAbiertas(false)
    setActiva(-1)
    setAviso(`Filtro aplicado: ${s.barrio ? `${s.barrio}, ${s.ciudad}` : s.ciudad}`)
    // En el celular se cierra el teclado para ver los resultados; en el computador el foco se queda en el campo.
    if (window.matchMedia('(pointer: coarse)').matches) busquedaRef.current?.blur()
  }
  // En el celular, al enfocar el buscador la consola sube al tope: si no, el teclado tapaba las sugerencias.
  const subirConsola = () => {
    if (!window.matchMedia('(max-width: 1023px)').matches) return
    setTimeout(() => consolaRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 250)
  }

  return (
    <>
      <div
        ref={consolaRef}
        className={cn(
          'relative z-10 scroll-mt-20 rounded-2xl border border-gray-200 bg-white shadow-[0_18px_40px_-20px_rgba(2,44,34,0.35)]',
          className,
        )}
      >
        <span className="sr-only" aria-live="polite">
          {aviso}
        </span>
        {/* Búsqueda */}
        <div className="relative flex items-center rounded-t-2xl focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-600">
          <IconSearch size={20} className="pointer-events-none absolute left-4 text-gray-500 sm:left-5" />
          <input
            type="search"
            value={valor.search}
            onChange={(e) => {
              onCambiar({ search: e.target.value })
              setSugAbiertas(true)
              setActiva(-1)
            }}
            // La API separa términos por comas y espacios, sin tildes y con el tipo en plural («apartamentos Laureles»).
            placeholder="Barrio, ciudad, tipo o código"
            aria-label="Buscar inmuebles por barrio, ciudad, tipo o código"
            enterKeyHint="search"
            ref={busquedaRef}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={mostrarSug}
            aria-controls={listaId}
            aria-activedescendant={mostrarSug && activa >= 0 ? `${listaId}-${activa}` : undefined}
            onFocus={() => {
              setSugAbiertas(true)
              subirConsola()
            }}
            onBlur={() => setSugAbiertas(false)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && sugerencias.length > 0) {
                e.preventDefault()
                setSugAbiertas(true)
                setActiva((i) => Math.min(i + 1, sugerencias.length - 1))
              } else if (e.key === 'ArrowUp' && mostrarSug) {
                e.preventDefault()
                setActiva((i) => Math.max(i - 1, -1))
              } else if (e.key === 'Escape' && mostrarSug) {
                e.preventDefault()
                setSugAbiertas(false)
                setActiva(-1)
              } else if (e.key === 'Enter') {
                // Con una sugerencia marcada, la elige; si no, la búsqueda ya corre sola: Enter cierra el teclado del celular.
                if (mostrarSug && activa >= 0) elegir(sugerencias[activa])
                else e.currentTarget.blur()
              }
            }}
            className="h-14 w-full rounded-t-2xl bg-transparent pl-12 pr-12 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none sm:pl-14 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {valor.search && (
            <button
              type="button"
              onClick={() => {
                onCambiar({ search: '' })
                busquedaRef.current?.focus()
              }}
              aria-label="Borrar la búsqueda"
              className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            >
              <IconX size={18} />
            </button>
          )}

          {mostrarSug && (
            <ul
              id={listaId}
              role="listbox"
              aria-label="Barrios y ciudades con inmuebles"
              // mousedown no le quita el foco al campo (tampoco en la barra de desplazamiento): si no, la lista se cerraba antes del clic.
              onMouseDown={(e) => e.preventDefault()}
              onMouseLeave={() => setActiva(-1)}
              className="absolute inset-x-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-1.5 shadow-[0_24px_48px_-16px_rgba(2,44,34,0.35)]"
            >
              {sugerencias.map((s, i) => (
                <li
                  key={`${s.ciudad}|${s.barrio ?? ''}`}
                  id={`${listaId}-${i}`}
                  role="option"
                  aria-selected={i === activa}
                  onClick={() => elegir(s)}
                  onMouseEnter={() => setActiva(i)}
                  className={cn('flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2', i === activa && 'bg-primary-50')}
                >
                  <IconMapPin size={16} className="shrink-0 text-gray-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900">{s.barrio ?? s.ciudad}</span>
                    <span className="block truncate text-xs text-gray-500">{s.barrio ? s.ciudad : 'Toda la ciudad'}</span>
                  </span>
                  {!otrosFiltros && (
                    <span className="shrink-0 text-xs tabular-nums text-gray-500">
                      {s.total} {s.total === 1 ? 'inmueble' : 'inmuebles'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Filtros: una celda por filtro (computador). */}
        <div className="hidden border-t border-gray-200 lg:grid lg:grid-cols-6 lg:divide-x lg:divide-gray-200">
          <CeldaSelect
            etiqueta="Ciudad"
            valor={valor.ciudad}
            onCambiar={(ciudad) => onCambiar({ ciudad, barrio: '' })}
            opciones={[{ valor: '', etiqueta: 'Todas' }, ...opciones.ciudades.map((c) => ({ valor: c, etiqueta: c }))]}
            className="rounded-bl-2xl"
          />
          <CeldaSelect
            etiqueta="Tipo"
            valor={valor.tipo}
            onCambiar={(tipo) => onCambiar({ tipo })}
            opciones={[
              { valor: '', etiqueta: 'Todos' },
              ...opciones.tipos.map((t) => ({
                valor: t,
                etiqueta: TIPO_LABELS[t] ?? t,
              })),
            ]}
          />
          <CeldaSelect
            etiqueta="Habitaciones"
            valor={valor.habitaciones}
            onCambiar={(habitaciones) => onCambiar({ habitaciones })}
            opciones={[
              { valor: '', etiqueta: 'Todas' },
              ...HABITACIONES.map((h) => ({
                valor: h,
                etiqueta: `${h} o más`,
              })),
            ]}
          />
          <CeldaPopover etiqueta="Canon mensual" resumen={resumenCanon(valor.precioMin, valor.precioMax)} vacio="Cualquiera">
            {(listo) => (
              <>
                <CamposCanon min={valor.precioMin} max={valor.precioMax} onCambiar={onCambiar} autoFocus />
                {listo}
              </>
            )}
          </CeldaPopover>
          <CeldaSelect
            etiqueta="Estrato"
            valor={valor.estrato}
            onCambiar={(estrato) => onCambiar({ estrato })}
            opciones={[
              { valor: '', etiqueta: 'Todos' },
              ...estratos.map((e) => ({
                valor: String(e),
                etiqueta: `Estrato ${e}`,
              })),
            ]}
          />
          <CeldaPopover etiqueta="Más filtros" resumen={resumenMas(valor)} vacio="Ninguno" className="rounded-br-2xl">
            {(listo) => (
              <>
                <CamposMas valor={valor} onCambiar={onCambiar} />
                {listo}
              </>
            )}
          </CeldaPopover>
        </div>

        {/* Celular: «Filtros» abre el panel; el orden queda a la vista. */}
        <div className="grid grid-cols-2 divide-x divide-gray-200 border-t border-gray-200 lg:hidden">
          <button
            type="button"
            onClick={() => setPanelAbierto(true)}
            aria-haspopup="dialog"
            className="flex min-h-12 items-center justify-center gap-2 rounded-bl-2xl px-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            <IconSlidersHorizontal size={18} className="text-gray-600" />
            Filtros
            {nFiltros > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-700 px-1.5 text-xs font-bold tabular-nums text-white">
                {nFiltros}
                <span className="sr-only"> filtros aplicados</span>
              </span>
            )}
          </button>
          <SelectOrden valor={valor.orden} onCambiar={(orden) => onCambiar({ orden })} className="rounded-br-2xl" compacto />
        </div>
      </div>

      {/* Fuera de la consola: dentro de su `z-10` el panel quedaba debajo de la barra de navegación. */}
      <Modal
        isOpen={panelAbierto}
        onClose={() => setPanelAbierto(false)}
        bare
        closeOnBackdrop
        ariaLabel="Filtros de la vitrina"
        className="fixed inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 py-2 pl-5 pr-2">
          <h2 className="text-base font-semibold text-gray-900">Filtros</h2>
          <button
            type="button"
            data-modal-close
            onClick={() => setPanelAbierto(false)}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
          <CampoSelect
            etiqueta="Ciudad"
            valor={valor.ciudad}
            onCambiar={(ciudad) => onCambiar({ ciudad, barrio: '' })}
            opciones={[{ valor: '', etiqueta: 'Todas las ciudades' }, ...opciones.ciudades.map((c) => ({ valor: c, etiqueta: c }))]}
          />
          {valor.barrio && (
            <div className="-mt-3 flex items-center justify-between gap-3 rounded-xl bg-primary-50 py-1 pl-3.5 pr-1">
              <p className="min-w-0 truncate text-sm text-primary-900">
                Barrio: <strong className="font-semibold">{valor.barrio}</strong>
              </p>
              <button
                type="button"
                onClick={() => onCambiar({ barrio: '' })}
                className="min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold text-primary-800 hover:bg-primary-100"
              >
                Quitar
              </button>
            </div>
          )}
          <CampoSelect
            etiqueta="Tipo de inmueble"
            valor={valor.tipo}
            onCambiar={(tipo) => onCambiar({ tipo })}
            opciones={[
              { valor: '', etiqueta: 'Todos los tipos' },
              ...opciones.tipos.map((t) => ({
                valor: t,
                etiqueta: TIPO_LABELS[t] ?? t,
              })),
            ]}
          />
          <Segmentado
            etiqueta="Habitaciones"
            valor={valor.habitaciones}
            onCambiar={(habitaciones) => onCambiar({ habitaciones })}
            opciones={[{ valor: '', etiqueta: 'Todas' }, ...HABITACIONES.map((h) => ({ valor: h, etiqueta: `${h}+` }))]}
          />
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-900">Canon mensual</legend>
            <CamposCanon min={valor.precioMin} max={valor.precioMax} onCambiar={onCambiar} />
          </fieldset>
          <Segmentado
            etiqueta="Estrato"
            valor={valor.estrato}
            onCambiar={(estrato) => onCambiar({ estrato })}
            opciones={[
              { valor: '', etiqueta: 'Todos' },
              ...estratos.map((e) => ({
                valor: String(e),
                etiqueta: String(e),
              })),
            ]}
          />
          <CamposMas valor={valor} onCambiar={onCambiar} />
        </div>

        <div className="flex shrink-0 gap-3 border-t border-gray-200 bg-white px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* El conteo de la página queda fuera del diálogo (aria-modal): aquí se anuncia de nuevo. */}
          <span className="sr-only" aria-live="polite">
            {cargando ? '' : textoVerResultados({ total, cargando, error, vitrinaVacia })}
          </span>
          <button
            type="button"
            // Solo lo que hay en el panel: la búsqueda (arriba) y el orden se quedan.
            onClick={() => onCambiar(FILTROS_DEL_PANEL)}
            disabled={nFiltros === 0}
            className="min-h-12 rounded-xl px-4 text-sm font-semibold text-gray-700 underline-offset-4 hover:underline disabled:text-gray-400 disabled:no-underline"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={() => setPanelAbierto(false)}
            className="min-h-12 flex-1 rounded-xl bg-primary-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-800"
          >
            {textoVerResultados({ total, cargando, error, vitrinaVacia })}
          </button>
        </div>
      </Modal>
    </>
  )
}

/** El botón principal del panel del celular: nunca culpa a los filtros de una falla ni de una vitrina vacía. */
function textoVerResultados({ total, cargando, error, vitrinaVacia }: { total: number; cargando: boolean; error?: boolean; vitrinaVacia?: boolean }) {
  if (cargando) return 'Buscando…'
  if (error) return 'No pudimos buscar: cierre e inténtelo de nuevo'
  if (vitrinaVacia) return 'Aún no hay inmuebles publicados'
  if (total === 0) return 'Sin resultados: ajuste los filtros'
  return `Ver ${total.toLocaleString('es-CO')} ${total === 1 ? 'inmueble' : 'inmuebles'}`
}

// ── Barra de resultados ─────────────────────

interface BarraProps {
  valor: FiltrosVitrinaValor
  onCambiar: (parcial: Partial<FiltrosVitrinaValor>) => void
  onLimpiar: () => void
  /** null = todavía no se sabe (primera carga): se ve un esqueleto. */
  total: number | null
  /** Error o vitrina vacía: sin conteo (lo explica el bloque de abajo). */
  sinConteo?: boolean
}

export function BarraResultados({ valor, onCambiar, onLimpiar, total, sinConteo }: BarraProps) {
  const chips = chipsActivos(valor)
  return (
    <div className="space-y-3">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-gray-600" aria-live="polite">
          {sinConteo ? null : total === null ? (
            <span className="inline-block h-4 w-40 animate-pulse rounded bg-gray-200" aria-hidden />
          ) : (
            <>
              <span className="font-semibold tabular-nums text-gray-900">{total.toLocaleString('es-CO')}</span>{' '}
              {total === 1 ? 'inmueble disponible' : 'inmuebles disponibles'}
            </>
          )}
        </p>
        <div className="hidden items-center gap-2 lg:flex">
          <span className="text-sm text-gray-500" id="vitrina-orden-etiqueta">
            Ordenar por
          </span>
          <SelectOrden valor={valor.orden} onCambiar={(orden) => onCambiar({ orden })} etiquetadoPor="vitrina-orden-etiqueta" />
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Filtros aplicados">
          {chips.map((c) => (
            <li key={c.clave}>
              <button
                type="button"
                onClick={() => onCambiar(c.quitar)}
                aria-label={`Quitar filtro: ${c.texto}`}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 pl-3.5 pr-2.5 text-sm font-medium text-primary-900 transition-colors hover:border-primary-300 hover:bg-primary-100 lg:min-h-9"
              >
                <span className="max-w-[16rem] truncate">{c.texto}</span>
                <IconX size={14} className="shrink-0 text-primary-700" />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={onLimpiar}
              className="min-h-10 px-2 text-sm font-semibold text-gray-700 underline-offset-4 hover:text-gray-900 hover:underline lg:min-h-9"
            >
              Limpiar todo
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}

// ── Piezas ──────────────────────────────────

interface Opcion {
  valor: string
  etiqueta: string
}

/**
 * Celda de la consola: etiqueta pequeña arriba y el valor elegido debajo. El select nativo cubre la celda
 * entera, así que cualquier punto de ella lo abre (y en el teclado y el lector de pantalla es un select).
 */
function CeldaSelect({
  etiqueta,
  valor,
  onCambiar,
  opciones,
  className,
}: {
  etiqueta: string
  valor: string
  onCambiar: (v: string) => void
  opciones: Opcion[]
  className?: string
}) {
  const id = useId()
  const lista = valor && !opciones.some((o) => o.valor === valor) ? [...opciones, { valor, etiqueta: valor }] : opciones
  return (
    <div
      className={cn(
        'relative h-16 min-w-0 transition-colors hover:bg-gray-50 focus-within:bg-primary-50/50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-600',
        className,
      )}
    >
      <label htmlFor={id} className="pointer-events-none absolute left-4 top-2.5 text-xs font-medium text-gray-500">
        {etiqueta}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        className={cn(
          'absolute inset-0 h-full w-full cursor-pointer appearance-none truncate bg-transparent pb-2.5 pl-4 pr-9 pt-[1.625rem] text-sm font-semibold focus:outline-none',
          valor ? 'text-primary-800' : 'text-gray-900',
        )}
      >
        {lista.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
      <IconChevronDown size={16} className="pointer-events-none absolute bottom-3 right-3 text-gray-400" />
    </div>
  )
}

/**
 * Celda que abre un panel (canon, «Más filtros»): se cierra con «Listo», un clic fuera, Escape o al salir
 * con Tab (el foco vuelve a la celda con Escape y «Listo»). `children` recibe el botón «Listo».
 */
function CeldaPopover({
  etiqueta,
  resumen,
  vacio,
  className,
  children,
}: {
  etiqueta: string
  /** El valor elegido, o null si no hay. */
  resumen: string | null
  /** Lo que se lee sin nada elegido. */
  vacio: string
  className?: string
  children: (listo: ReactNode) => ReactNode
}) {
  const [abierto, setAbierto] = useState(false)
  const raizRef = useRef<HTMLDivElement>(null)
  const botonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (raizRef.current && !raizRef.current.contains(e.target as Node)) setAbierto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setAbierto(false)
      botonRef.current?.focus()
    }
    // Con Tab fuera del panel (p. ej. a la celda siguiente) también se cierra: si no, tapaba los resultados.
    const foco = (e: FocusEvent) => {
      if (raizRef.current && e.target instanceof Node && !raizRef.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    document.addEventListener('focusin', foco)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
      document.removeEventListener('focusin', foco)
    }
  }, [abierto])

  const listo = (
    <div className="mt-4 flex justify-end">
      <button
        type="button"
        onClick={() => {
          setAbierto(false)
          botonRef.current?.focus()
        }}
        className="min-h-10 rounded-xl bg-primary-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-800"
      >
        Listo
      </button>
    </div>
  )

  return (
    <div ref={raizRef} className={cn('relative min-w-0', className)}>
      {/* La etiqueta y el chevron se ubican contra esta caja (el botón no es `relative`). */}
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls={panelId}
        className={cn(
          'block h-16 w-full min-w-0 rounded-[inherit] pb-2.5 pl-4 pr-9 pt-[1.625rem] text-left transition-colors hover:bg-gray-50 focus-visible:bg-primary-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600',
          abierto && 'bg-gray-50',
        )}
      >
        <span className="pointer-events-none absolute left-4 top-2.5 text-xs font-medium text-gray-500">{etiqueta}</span>
        <span className={cn('block truncate text-sm font-semibold tabular-nums', resumen ? 'text-primary-800' : 'text-gray-900')}>
          {resumen ?? vacio}
        </span>
        <IconChevronDown
          size={16}
          className={cn('pointer-events-none absolute bottom-3 right-3 text-gray-400 transition-transform', abierto && 'rotate-180')}
        />
      </button>

      {abierto && (
        <div
          id={panelId}
          role="dialog"
          aria-label={etiqueta}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-[22rem] rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_24px_48px_-16px_rgba(2,44,34,0.35)] animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {children(listo)}
        </div>
      )}
    </div>
  )
}

/** Baños, parqueadero y área mínima (en el panel de «Más filtros» y en el del celular). */
function CamposMas({ valor, onCambiar }: { valor: FiltrosVitrinaValor; onCambiar: (p: Partial<FiltrosVitrinaValor>) => void }) {
  const idArea = useId()
  return (
    <div className="space-y-5">
      <Segmentado
        etiqueta="Baños"
        valor={valor.banos}
        onCambiar={(banos) => onCambiar({ banos })}
        opciones={[{ valor: '', etiqueta: 'Todos' }, ...BANOS.map((b) => ({ valor: b, etiqueta: `${b}+` }))]}
      />
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-900">Parqueadero</p>
        <button
          type="button"
          aria-pressed={valor.parqueadero === '1'}
          onClick={() => onCambiar({ parqueadero: valor.parqueadero === '1' ? '' : '1' })}
          className={cn(
            'min-h-11 rounded-xl border px-3.5 text-sm font-semibold transition-colors',
            valor.parqueadero === '1' ? 'border-primary-700 bg-primary-700 text-white' : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
          )}
        >
          Con parqueadero
        </button>
      </div>
      <div>
        <label htmlFor={idArea} className="mb-2 block text-sm font-semibold text-gray-900">
          Área mínima
        </label>
        <div className="relative">
          <input
            id={idArea}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={valor.areaMin ? Number(valor.areaMin).toLocaleString('es-CO') : ''}
            onChange={(e) => onCambiar({ areaMin: e.target.value.replace(/\D/g, '').slice(0, 5) })}
            placeholder="Sin mínimo"
            className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-3.5 pr-11 text-sm tabular-nums text-gray-900 placeholder:text-gray-500 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">m²</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {AREAS.map((a) => {
            const activo = valor.areaMin === a
            return (
              <button
                key={a}
                type="button"
                aria-pressed={activo}
                onClick={() => onCambiar({ areaMin: activo ? '' : a })}
                className={cn(
                  'min-h-10 rounded-full border px-3 text-xs font-medium tabular-nums transition-colors',
                  activo ? 'border-primary-700 bg-primary-700 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50',
                )}
              >
                Desde {a} m²
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Mínimo y máximo (con separador de miles) más los rangos frecuentes. */
function CamposCanon({
  min,
  max,
  onCambiar,
  autoFocus,
}: {
  min: string
  max: string
  onCambiar: (p: Partial<FiltrosVitrinaValor>) => void
  autoFocus?: boolean
}) {
  const idMin = useId()
  const idMax = useId()
  // Al revés (mínimo mayor que el máximo) la API no encontraría nada: se avisa.
  const invertido = !!min && !!max && Number(min) > Number(max)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <CampoPesos
          id={idMin}
          etiqueta="Mínimo"
          valor={min}
          placeholder="Sin mínimo"
          onCambiar={(v) => onCambiar({ precioMin: v })}
          autoFocus={autoFocus}
        />
        <CampoPesos id={idMax} etiqueta="Máximo" valor={max} placeholder="Sin máximo" onCambiar={(v) => onCambiar({ precioMax: v })} />
      </div>
      {invertido && <p role="status" className="text-xs text-amber-800">El mínimo es mayor que el máximo. Corrija uno de los dos.</p>}
      <div className="flex flex-wrap gap-2">
        {RANGOS_CANON.map((r) => {
          const activo = r.min === min && r.max === max
          return (
            <button
              key={r.etiqueta}
              type="button"
              aria-pressed={activo}
              onClick={() => onCambiar(activo ? { precioMin: '', precioMax: '' } : { precioMin: r.min, precioMax: r.max })}
              className={cn(
                'min-h-10 rounded-full border px-3 text-xs font-medium tabular-nums transition-colors',
                activo
                  ? 'border-primary-700 bg-primary-700 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50',
              )}
            >
              {r.etiqueta}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Campo de pesos: texto con separador de miles (type="number" convertía «150.000» en $150). */
function CampoPesos({
  id,
  etiqueta,
  valor,
  placeholder,
  onCambiar,
  autoFocus,
}: {
  id: string
  etiqueta: string
  valor: string
  placeholder: string
  onCambiar: (v: string) => void
  autoFocus?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-600">
        {etiqueta}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          value={valor ? Number(valor).toLocaleString('es-CO') : ''}
          onChange={(e) => onCambiar(e.target.value.replace(/\D/g, '').slice(0, 12))}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-7 pr-3 text-sm tabular-nums text-gray-900 placeholder:text-gray-500 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
        />
      </div>
    </div>
  )
}

/** Select con etiqueta, para el panel del celular. */
function CampoSelect({
  etiqueta,
  valor,
  onCambiar,
  opciones,
}: {
  etiqueta: string
  valor: string
  onCambiar: (v: string) => void
  opciones: Opcion[]
}) {
  const id = useId()
  const lista = valor && !opciones.some((o) => o.valor === valor) ? [...opciones, { valor, etiqueta: valor }] : opciones
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-gray-900">
        {etiqueta}
      </label>
      <div className="relative">
        <select
          id={id}
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
          className="h-12 w-full appearance-none rounded-xl border border-gray-300 bg-white pl-3.5 pr-10 text-base text-gray-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
        >
          {lista.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
        <IconChevronDown size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
      </div>
    </div>
  )
}

/** Opciones cortas en una fila (habitaciones, estrato). */
function Segmentado({
  etiqueta,
  valor,
  onCambiar,
  opciones,
}: {
  etiqueta: string
  valor: string
  onCambiar: (v: string) => void
  opciones: Opcion[]
}) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className="mb-2 text-sm font-semibold text-gray-900">
        {etiqueta}
      </p>
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => {
          const activo = o.valor === valor
          return (
            <button
              key={o.valor || 'todas'}
              type="button"
              aria-pressed={activo}
              onClick={() => onCambiar(o.valor)}
              className={cn(
                'min-h-11 min-w-11 rounded-xl border px-3.5 text-sm font-semibold tabular-nums transition-colors',
                activo ? 'border-primary-700 bg-primary-700 text-white' : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
              )}
            >
              {o.etiqueta}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Orden de los resultados. En la consola del celular se ve como un botón (ícono + orden elegido) con el select
 * nativo encima, transparente: el toque abre la lista del teléfono.
 */
function SelectOrden({
  valor,
  onCambiar,
  className,
  compacto,
  etiquetadoPor,
}: {
  valor: OrdenVitrina
  onCambiar: (o: OrdenVitrina) => void
  className?: string
  /** Dentro de la consola del celular: ocupa la celda entera. */
  compacto?: boolean
  etiquetadoPor?: string
}) {
  const select = (
    <select
      value={valor}
      onChange={(e) => onCambiar(esOrden(e.target.value) ? e.target.value : 'recientes')}
      aria-label={etiquetadoPor ? undefined : 'Ordenar por'}
      aria-labelledby={etiquetadoPor}
      className={cn(
        'cursor-pointer appearance-none focus:outline-none',
        compacto
          ? 'absolute inset-0 h-full w-full text-base opacity-0'
          : 'h-10 rounded-xl border border-gray-300 bg-white pl-3.5 pr-9 text-sm font-semibold text-gray-900 hover:border-gray-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/30',
      )}
    >
      {ORDENES.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.etiqueta}
        </option>
      ))}
    </select>
  )
  if (!compacto) {
    return (
      <div className={cn('relative', className)}>
        {select}
        <IconChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
      </div>
    )
  }
  return (
    <div
      className={cn(
        'relative flex min-h-12 items-center justify-center gap-2 px-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-600',
        className,
      )}
    >
      <IconArrowUpDown size={18} className="shrink-0 text-gray-600" />
      <span className="truncate" aria-hidden>
        {ORDENES.find((o) => o.valor === valor)?.etiqueta}
      </span>
      {select}
    </div>
  )
}
