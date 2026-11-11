/**
 * Panel de calibración del modelo — Adenda 1 a la Política V4.1, §11.
 *
 * "Todos estos valores deben poder modificarse desde el panel de calibración,
 * sin intervención de desarrollo, únicamente por la Gerencia General, y todo
 * cambio debe quedar registrado con fecha, valor anterior, valor nuevo y
 * usuario."
 *
 * Son ~70 valores: la pantalla abre en un resumen (la escala de decisión, las
 * reglas encendidas, lo que se cobra y los plazos clave) y muestra una sección
 * a la vez, con cada valor explicado en palabras sencillas
 * (components/calibracion/parametros.ts). Lo que no aplica con las reglas
 * encendidas hoy va plegado al final de su sección. El backend valida rango,
 * coherencia y permiso y escribe el historial.
 *
 * La Adenda 5 definitiva tiene su propio grupo en el menú (interruptor y
 * motor, score, segundo firmante, mora no financiera, sustituciones y
 * precio). Mientras ADENDA5_DEF esté apagado, esas secciones se muestran
 * enteras con el aviso de que aplican al encenderla; lo que la adenda retira
 * sigue en su sección, con la nota de que deja de aplicar.
 *
 * Adenda 1 del módulo de contratos, respuesta 17: los parámetros de riesgo
 * solo los cambia la Gerencia General; a otro administrador le llegan con
 * `editable: false` y se ven de solo lectura (el API igual responde 403).
 */

'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import {
  calibracionService,
  type IParametroCalibracion,
  type IHistorialCalibracion,
  type ICascadaCentrales,
  type IRevisionManual,
  type ITablasPuntaje,
} from '@/services/calibracionService'
import Link from 'next/link'
import { IconBank, IconLock, IconSearch, IconChevronDown, IconRefresh, IconX } from '@/components/icons'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { EditarParametro } from '@/components/calibracion/EditarParametro'
import { Historial } from '@/components/calibracion/Historial'
import { Indicadores } from '@/components/calibracion/Indicadores'
import { ParametroFila } from '@/components/calibracion/ParametroFila'
import { Resumen } from '@/components/calibracion/Resumen'
import { AvisoA5d, BandasMora, previaA5d, Relacionados, TablaAnclajes } from '@/components/calibracion/Adenda5'
import { EscalaA5D } from '@/components/calibracion/EscalaDecision'
import { ComoSeCalculaA5D } from '@/components/calibracion/ComoSeCalcula'
import {
  a5dEncendida,
  grupoDe,
  metaDe,
  porOrden,
  rigeHoy,
  SECCIONES,
  seMuestra,
  SUB_ANCLAJES,
  textoCompleto,
  tituloSeccion,
  type SeccionId,
  type Valores,
} from '@/components/calibracion/parametros'

type Vista = 'resumen' | SeccionId | 'indicadores' | 'historial'
const VISTAS: { id: Vista; titulo: string }[] = [
  { id: 'resumen', titulo: 'Resumen' },
  ...SECCIONES.map((s) => ({ id: s.id as Vista, titulo: s.titulo })),
  { id: 'indicadores', titulo: 'Indicadores' },
  { id: 'historial', titulo: 'Historial de cambios' },
]
const esSeccion = (v: Vista): v is SeccionId => SECCIONES.some((s) => s.id === v)

export default function AdminCalibracionPage() {
  const { user } = useAuth()
  const [params, setParams] = useState<IParametroCalibracion[]>([])
  const [historial, setHistorial] = useState<IHistorialCalibracion[]>([])
  const [cascada, setCascada] = useState<ICascadaCentrales | null>(null)
  const [revision, setRevision] = useState<IRevisionManual | null>(null)
  // Las tablas de puntos del motor (M-3): solo para «Cómo se calcula»; si fallan, esa parte lo dice.
  const [tablas, setTablas] = useState<ITablasPuntaje | null>(null)
  const [loading, setLoading] = useState(true)
  // Un fallo de carga no es «sin cambios registrados»: se dice y se reintenta.
  const [errorCarga, setErrorCarga] = useState(false)
  // El historial que no se pudo leer tampoco es «sin cambios»: lo dice su pestaña.
  const [errorHistorial, setErrorHistorial] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<Vista>('resumen')
  const [abierto, setAbierto] = useState<string | null>(null)
  // Al cambiar de sección el foco va al título de la sección: el lector de pantalla no se queda en el menú sin saber qué cambió.
  const contenidoRef = useRef<HTMLDivElement>(null)

  const cargar = async () => {
    try {
      const [p, h, c, r, t] = await Promise.all([
        calibracionService.listar(),
        calibracionService.historial().catch(() => null),
        calibracionService.getCascada(30).catch(() => null),
        calibracionService.getRevisionManual(30).catch(() => null),
        calibracionService.getTablas().catch(() => null),
      ])
      setParams(p.filter(seMuestra).sort(porOrden))
      setHistorial(h ?? [])
      setErrorHistorial(h === null)
      setCascada(c)
      setRevision(r)
      setTablas(t)
      setErrorCarga(false)
    } catch {
      setErrorCarga(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.rol === 'administrador') void cargar()
    else setLoading(false)
  }, [user])

  // La sección va en el #: recargar o compartir el enlace vuelve al mismo lugar.
  useEffect(() => {
    const h = window.location.hash.slice(1)
    if (VISTAS.some((v) => v.id === h)) setVista(h as Vista)
  }, [])
  const irA = (v: Vista) => {
    setVista(v)
    setBusqueda('')
    window.history.replaceState(null, '', `#${v}`)
    window.scrollTo({ top: 0 })
    requestAnimationFrame(() => contenidoRef.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true }))
  }
  const reintentar = () => {
    setLoading(true)
    void cargar()
  }

  const valores: Valores = useMemo(() => Object.fromEntries(params.map((p) => [p.clave, p.valor])), [params])
  // El historial llega del más reciente al más viejo: el primero de cada clave es su último cambio.
  const ultimo = useMemo(() => {
    const m = new Map<string, IHistorialCalibracion>()
    for (const h of historial) if (!m.has(h.clave)) m.set(h.clave, h)
    return m
  }, [historial])

  const q = busqueda.trim().toLowerCase()
  const encontrados = q
    ? params.filter((p) => {
        const m = metaDe(p.clave)
        return `${m.nombre} ${textoCompleto(m, valores)} ${m.conA5d ?? ''} ${m.saleConA5d ?? ''} ${p.descripcion} ${p.clave}`.toLowerCase().includes(q)
      })
    : []
  const conteo =
    encontrados.length === 0
      ? `Ningún valor coincide con «${busqueda.trim()}».`
      : `${encontrados.length} ${encontrados.length === 1 ? 'valor coincide' : 'valores coinciden'} con «${busqueda.trim()}».`
  const pAbierto = params.find((p) => p.clave === abierto)

  // Las vistas del menú con su conteo; «Otros» solo aparece si el API trae un valor que esta pantalla todavía no conoce.
  // Las de la Adenda 5 apagada van sin número: ninguno de sus valores aplica hoy (lo dice el título del grupo).
  const navegables = VISTAS.flatMap((v) => {
    const propios = esSeccion(v.id) ? params.filter((p) => metaDe(p.clave).seccion === v.id) : null
    if (propios?.length === 0) return []
    const n = previaA5d(grupoDe(v.id), valores) ? null : (propios?.filter((p) => rigeHoy(metaDe(p.clave), valores)).length ?? null)
    return [{ ...v, n }]
  })
  // El grupo «Adenda 5 definitiva» va aparte en el menú (en el celular, como grupo del selector).
  const enA5d = (v: { id: Vista }) => grupoDe(v.id) === 'a5d'
  const iA5d = navegables.findIndex(enA5d)
  const navAntes = iA5d < 0 ? navegables : navegables.slice(0, iA5d)
  const navA5d = navegables.filter(enA5d)
  const navDespues = iA5d < 0 ? [] : navegables.slice(iA5d).filter((v) => !enA5d(v))
  const grupoA5d = a5dEncendida(valores) ? 'Adenda 5 definitiva' : 'Adenda 5 definitiva (aplica al encenderla)'

  const fila = (p: IParametroCalibracion) => (
    <ParametroFila key={p.clave} p={p} valores={valores} ultimo={ultimo.get(p.clave)} onAbrir={setAbierto} />
  )
  const opcion = (v: (typeof navegables)[number]) => (
    <option key={v.id} value={v.id}>
      {v.titulo}
      {v.n !== null ? ` (${v.n})` : ''}
    </option>
  )
  const itemMenu = (v: (typeof navegables)[number], separar: boolean) => (
    <li key={v.id} className={cn((separar || v.id === 'indicadores') && 'mt-2 border-t border-gray-200 pt-2')}>
      <button
        type="button"
        onClick={() => irA(v.id)}
        aria-current={vista === v.id ? 'page' : undefined}
        className={cn(
          'flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm',
          vista === v.id ? 'bg-primary-50 font-semibold text-primary-800' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
        )}
      >
        {v.titulo}
        {v.n !== null && (
          <span className={cn('text-xs font-normal tabular-nums', vista === v.id ? 'text-primary-700' : 'text-gray-500')}>
            {v.n}
            <span className="sr-only"> {v.n === 1 ? 'valor que aplica hoy' : 'valores que aplican hoy'}</span>
          </span>
        )}
      </button>
    </li>
  )

  if (user?.rol !== 'administrador') {
    return (
      <div className="space-y-6">
        <PageHeader title="Calibración del modelo" />
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6">
          <IconLock className="text-red-600" size={20} />
          <p className="text-sm text-red-800">Esta sección solo la pueden ver los administradores de Cofianza.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calibración del modelo"
        subtitle="Los valores con los que la plataforma decide, cobra y fija plazos. Un cambio aplica de inmediato y queda en el historial."
        actions={
          <Link
            href="/admin/calibracion/acreedores"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <IconBank size={16} />
            Lista de acreedores
          </Link>
        }
      />

      {loading ? (
        <SkeletonTable filas={8} columnas={4} etiqueta="Cargando la calibración…" />
      ) : errorCarga ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-800">No se pudo cargar la calibración.</p>
          <p className="mt-1 text-sm text-red-700">Intente de nuevo en un momento. Ningún valor cambió.</p>
          <button
            type="button"
            onClick={reintentar}
            className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <IconRefresh size={14} />
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <label htmlFor="buscar-calibracion" className="sr-only">
              Buscar un valor
            </label>
            <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="buscar-calibracion"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setBusqueda('')
              }}
              placeholder="Buscar un valor: precio, IVA, tarifa, días, coarrendatario…"
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-12 text-sm text-gray-900 shadow-sm placeholder:text-gray-500 [&::-webkit-search-cancel-button]:hidden"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                aria-label="Borrar la búsqueda"
                className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                <IconX size={16} />
              </button>
            )}
          </div>

          {/* Solo el conteo se anuncia (siempre montado): con la lista entera en la región viva, el lector la leía a cada tecla. */}
          <p role="status" className="sr-only">
            {q ? conteo : ''}
          </p>
          {q ? (
            <section aria-label="Resultados de la búsqueda">
              {encontrados.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
                  <p aria-hidden className="font-semibold text-gray-900">
                    {conteo}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">Pruebe con otra palabra, o recorra las secciones del menú.</p>
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Borrar la búsqueda
                  </button>
                </div>
              ) : (
                <>
                  <p aria-hidden className="mb-3 text-sm text-gray-600">
                    {conteo}
                  </p>
                  <div className="space-y-5">
                    {SECCIONES.map((s) => {
                      const items = encontrados.filter((p) => metaDe(p.clave).seccion === s.id)
                      if (items.length === 0) return null
                      return (
                        <div key={s.id}>
                          <h2 className="mb-2 text-sm font-semibold text-gray-700">{tituloSeccion(s)}</h2>
                          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">{items.map(fila)}</div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </section>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8">
              <nav aria-label="Secciones de la calibración" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
                {/* En el celular, un selector: la tira de botones escondía 9 de las 11 secciones fuera de la pantalla. */}
                <label className="block lg:hidden">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Sección</span>
                  <span className="relative block">
                    <select
                      value={vista}
                      onChange={(e) => irA(e.target.value as Vista)}
                      className="min-h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm font-semibold text-gray-900"
                    >
                      {navAntes.map(opcion)}
                      {navA5d.length > 0 && <optgroup label={grupoA5d}>{navA5d.map(opcion)}</optgroup>}
                      {navDespues.map(opcion)}
                    </select>
                    <IconChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  </span>
                </label>
                <ul className="hidden lg:flex lg:flex-col lg:gap-0.5">
                  {navAntes.map((v, i) => itemMenu(v, i === 1))}
                  {navA5d.length > 0 && (
                    <li className="mt-2 border-t border-gray-200 pt-2">
                      <p id="menu-a5d" className="px-3 pb-1 pt-1 text-xs font-semibold text-gray-600">
                        Adenda 5 definitiva
                        {!a5dEncendida(valores) && <span className="block font-normal">Aplica al encenderla</span>}
                      </p>
                      <ul aria-labelledby="menu-a5d" className="flex flex-col gap-0.5">
                        {navA5d.map((v) => itemMenu(v, false))}
                      </ul>
                    </li>
                  )}
                  {navDespues.map((v) => itemMenu(v, false))}
                </ul>
                <p className="mt-2 text-xs text-gray-600 lg:mt-3 lg:px-3">El número es cuántos valores de la sección aplican hoy.</p>
              </nav>

              <div ref={contenidoRef} className="min-w-0">
                {vista === 'resumen' ? (
                  <Resumen params={params} valores={valores} tablas={tablas} ultimo={ultimo} onAbrir={setAbierto} onIr={irA} />
                ) : vista === 'indicadores' ? (
                  <>
                    <Encabezado titulo="Indicadores de los últimos 30 días" ayuda="Cómo se están comportando las centrales y la revisión manual. Sirven para decidir si conviene mover un valor." />
                    <Indicadores cascada={cascada} revision={revision} />
                  </>
                ) : vista === 'historial' ? (
                  <>
                    <Encabezado titulo="Historial de cambios" ayuda="Cada cambio con la fecha, quién lo hizo, el valor anterior, el nuevo y el motivo." />
                    <Historial historial={historial} params={params} error={errorHistorial} onReintentar={reintentar} />
                  </>
                ) : (
                  <Seccion id={vista} params={params} valores={valores} tablas={tablas} fila={fila} onAbrir={setAbierto} onIr={irA} />
                )}
              </div>
            </div>
          )}

          {pAbierto && (
            <EditarParametro
              key={pAbierto.clave}
              p={pAbierto}
              valores={valores}
              params={params}
              historial={historial}
              onClose={() => setAbierto(null)}
              onGuardado={cargar}
            />
          )}
        </>
      )}
    </div>
  )
}

function Encabezado({ titulo, ayuda, grupo }: { titulo: string; ayuda: string; grupo?: string }) {
  return (
    <div className="mb-4">
      {grupo && <p className="text-xs font-semibold text-primary-700">{grupo}</p>}
      <h2 tabIndex={-1} className="text-lg font-bold text-gray-900 text-balance focus:outline-none">
        {titulo}
      </h2>
      <p className="mt-0.5 max-w-prose text-sm text-gray-600">{ayuda}</p>
    </div>
  )
}

/**
 * Una sección: sus valores por subtema y, plegados al final, los que no
 * cambian nada con las reglas encendidas hoy (siguen editables para dejarlos
 * listos). Las de la Adenda 5 definitiva, mientras esté apagada, no pliegan
 * nada: se muestran enteras, con el aviso de que aplican al encenderla.
 */
function Seccion({
  id,
  params,
  valores,
  tablas,
  fila,
  onAbrir,
  onIr,
}: {
  id: SeccionId
  params: IParametroCalibracion[]
  valores: Valores
  tablas: ITablasPuntaje | null
  fila: (p: IParametroCalibracion) => ReactNode
  onAbrir: (clave: string) => void
  onIr: (v: SeccionId) => void
}) {
  const s = SECCIONES.find((x) => x.id === id)!
  const propios = params.filter((p) => metaDe(p.clave).seccion === id)
  const previa = previaA5d(s.grupo, valores)
  const vigentes = previa ? propios : propios.filter((p) => rigeHoy(metaDe(p.clave), valores))
  const inactivos = previa ? [] : propios.filter((p) => !rigeHoy(metaDe(p.clave), valores))
  const subtemas = [...new Set(vigentes.map((p) => metaDe(p.clave).sub ?? ''))]
  const de = (sub: string) => vigentes.filter((p) => (metaDe(p.clave).sub ?? '') === sub)
  // El aviso y el resumen visual van antes del primer subtema que solo aplica con la Adenda 5 (en el motor, después del interruptor).
  const primeroA5d = subtemas.find((sub) => de(sub).some((p) => metaDe(p.clave).rige === 'a5d'))

  const cabecera = (
    <>
      {previa && <AvisoA5d onIr={id === 'a5d_motor' ? undefined : onIr} />}
      {id === 'a5d_motor' && (
        <section aria-labelledby="como-decide-a5d" className="rounded-xl border border-gray-200 bg-white px-4 py-4 sm:px-5">
          <h3 id="como-decide-a5d" className="text-sm font-bold text-gray-900">
            Cómo decide
          </h3>
          <p className="mt-0.5 max-w-prose text-sm text-gray-600">Con los valores de esta sección. Toque un número para cambiarlo.</p>
          <div className="mt-4">
            <EscalaA5D valores={valores} onAbrir={onAbrir} />
          </div>
        </section>
      )}
      {id === 'a5d_mora' && <BandasMora valores={valores} />}
    </>
  )

  return (
    <section>
      <Encabezado titulo={s.titulo} ayuda={s.ayuda} grupo={s.grupo === 'a5d' ? 'Adenda 5 definitiva' : undefined} />
      <div className="space-y-6">
        {primeroA5d === undefined && cabecera}
        {subtemas.map((sub) => (
          <div key={sub} className="space-y-6">
            {sub === primeroA5d && cabecera}
            <div>
              {sub && <h3 className="mb-2 text-sm font-semibold text-gray-700">{sub}</h3>}
              {sub === SUB_ANCLAJES ? (
                <TablaAnclajes valores={valores} params={params} onAbrir={onAbrir} />
              ) : (
                <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">{de(sub).map(fila)}</div>
              )}
            </div>
          </div>
        ))}
        {id === 'a5d_score' && (
          <details className="group rounded-xl border border-gray-200 bg-white">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 sm:px-5 [&::-webkit-details-marker]:hidden">
              Cómo se calcula el puntaje con la Adenda 5 definitiva
              <IconChevronDown size={18} className="shrink-0 text-gray-500 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="border-t border-gray-100 px-4 py-4 sm:px-5">
              <ComoSeCalculaA5D valores={valores} tablas={tablas} />
            </div>
          </details>
        )}
        {s.relacionados && <Relacionados titulo={s.relacionados.titulo} claves={s.relacionados.claves} params={params} onAbrir={onAbrir} />}
        {inactivos.length > 0 && (
          <details className="group rounded-xl border border-dashed border-gray-300 bg-gray-50">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="font-semibold">No aplican hoy ({inactivos.length})</span>
                <span className="block text-xs text-gray-600">Con las reglas encendidas hoy no cambian ningún resultado.</span>
              </span>
              <IconChevronDown size={18} className="shrink-0 text-gray-500 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-b-xl border-t border-gray-200 bg-white">{inactivos.map(fila)}</div>
          </details>
        )}
      </div>
    </section>
  )
}
