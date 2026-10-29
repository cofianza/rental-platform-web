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
 * Adenda 1 del módulo de contratos, respuesta 17: los parámetros de riesgo
 * solo los cambia la Gerencia General; a otro administrador le llegan con
 * `editable: false` y se ven de solo lectura (el API igual responde 403).
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import {
  calibracionService,
  type IParametroCalibracion,
  type IHistorialCalibracion,
  type ICascadaCentrales,
  type IRevisionManual,
} from '@/services/calibracionService'
import { IconLoader, IconLock, IconSearch, IconChevronDown } from '@/components/icons'
import { cn } from '@/lib/utils'
import { EditarParametro } from '@/components/calibracion/EditarParametro'
import { Historial } from '@/components/calibracion/Historial'
import { Indicadores } from '@/components/calibracion/Indicadores'
import { ParametroFila } from '@/components/calibracion/ParametroFila'
import { Resumen } from '@/components/calibracion/Resumen'
import { metaDe, porOrden, rigeHoy, SECCIONES, type SeccionId, type Valores } from '@/components/calibracion/parametros'

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
  const [loading, setLoading] = useState(true)
  // Un fallo de carga no es «sin cambios registrados»: se dice y se reintenta.
  const [errorCarga, setErrorCarga] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<Vista>('resumen')
  const [abierto, setAbierto] = useState<string | null>(null)

  const cargar = async () => {
    try {
      const [p, h, c, r] = await Promise.all([
        calibracionService.listar(),
        calibracionService.historial(),
        calibracionService.getCascada(30).catch(() => null),
        calibracionService.getRevisionManual(30).catch(() => null),
      ])
      setParams([...p].sort(porOrden))
      setHistorial(h)
      setCascada(c)
      setRevision(r)
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
        return `${m.nombre} ${m.queHace} ${p.descripcion} ${p.clave}`.toLowerCase().includes(q)
      })
    : []
  const conteo =
    encontrados.length === 0
      ? `Ningún valor coincide con «${busqueda.trim()}».`
      : `${encontrados.length} ${encontrados.length === 1 ? 'valor coincide' : 'valores coinciden'} con «${busqueda.trim()}».`
  const pAbierto = params.find((p) => p.clave === abierto)

  const fila = (p: IParametroCalibracion) => (
    <ParametroFila key={p.clave} p={p} valores={valores} ultimo={ultimo.get(p.clave)} onAbrir={setAbierto} />
  )

  if (user?.rol !== 'administrador') {
    return (
      <div className="space-y-6">
        <PageHeader title="Calibración del modelo" />
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6">
          <IconLock className="text-red-600" size={20} />
          <p className="text-sm text-red-800">Solo la Gerencia (administrador) puede acceder a esta sección.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calibración del modelo"
        subtitle="Los valores con los que la plataforma decide, cobra y fija plazos. Un cambio aplica de inmediato y queda en el historial."
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <IconLoader size={28} className="animate-spin text-primary-600" />
        </div>
      ) : errorCarga ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">No se pudo cargar la calibración.</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              void cargar()
            }}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <label className="relative block">
            <span className="sr-only">Buscar un valor</span>
            <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar un valor: precio, IVA, tarifa, días, coarrendatario…"
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-3 text-sm shadow-sm"
            />
          </label>

          {/* Solo el conteo se anuncia (siempre montado): con la lista entera en la región viva, el lector la leía a cada tecla. */}
          <p role="status" className="sr-only">
            {q ? conteo : ''}
          </p>
          {q ? (
            <section>
              <p aria-hidden className="mb-2 text-sm text-gray-600">
                {conteo}
              </p>
              {SECCIONES.map((s) => {
                const items = encontrados.filter((p) => metaDe(p.clave).seccion === s.id)
                if (items.length === 0) return null
                return (
                  <div key={s.id} className="mb-4">
                    <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">{s.titulo}</h2>
                    <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">{items.map(fila)}</div>
                  </div>
                )
              })}
            </section>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
              <nav aria-label="Secciones de la calibración" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
                <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
                  {VISTAS.map((v) => {
                    const propios = esSeccion(v.id) ? params.filter((p) => metaDe(p.clave).seccion === v.id) : null
                    // «Otros» solo aparece si el API trae un valor que esta pantalla todavía no conoce.
                    if (propios?.length === 0) return null
                    const n = propios?.filter((p) => rigeHoy(metaDe(p.clave).rige, valores)).length ?? null
                    return (
                      <li key={v.id} className="shrink-0">
                        <button
                          type="button"
                          onClick={() => irA(v.id)}
                          aria-current={vista === v.id ? 'page' : undefined}
                          className={cn(
                            'flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm',
                            vista === v.id
                              ? 'bg-primary-50 font-semibold text-primary-800'
                              : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 lg:border-0 lg:bg-transparent',
                          )}
                        >
                          {v.titulo}
                          {n !== null && <span className="text-xs font-normal text-gray-400">{n}</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </nav>

              <div className="min-w-0">
                {vista === 'resumen' ? (
                  <Resumen params={params} valores={valores} ultimo={ultimo} onAbrir={setAbierto} onIr={irA} />
                ) : vista === 'indicadores' ? (
                  <>
                    <Encabezado titulo="Indicadores de los últimos 30 días" ayuda="Cómo se están comportando las centrales y la revisión manual. Sirven para decidir si conviene mover un valor." />
                    <Indicadores cascada={cascada} revision={revision} />
                  </>
                ) : vista === 'historial' ? (
                  <>
                    <Encabezado titulo="Historial de cambios" ayuda="Cada cambio con la fecha, quién lo hizo, el valor anterior, el nuevo y el motivo." />
                    <Historial historial={historial} params={params} />
                  </>
                ) : (
                  <Seccion id={vista} params={params} valores={valores} fila={fila} />
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

function Encabezado({ titulo, ayuda }: { titulo: string; ayuda: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-bold text-gray-900">{titulo}</h2>
      <p className="text-sm text-gray-600">{ayuda}</p>
    </div>
  )
}

/**
 * Una sección: sus valores por subtema y, plegados al final, los que no
 * cambian nada con las reglas encendidas hoy (siguen editables para dejarlos
 * listos).
 */
function Seccion({
  id,
  params,
  valores,
  fila,
}: {
  id: SeccionId
  params: IParametroCalibracion[]
  valores: Valores
  fila: (p: IParametroCalibracion) => React.ReactNode
}) {
  const s = SECCIONES.find((x) => x.id === id)!
  const propios = params.filter((p) => metaDe(p.clave).seccion === id)
  const vigentes = propios.filter((p) => rigeHoy(metaDe(p.clave).rige, valores))
  const inactivos = propios.filter((p) => !rigeHoy(metaDe(p.clave).rige, valores))
  const subtemas = [...new Set(vigentes.map((p) => metaDe(p.clave).sub ?? ''))]

  return (
    <section>
      <Encabezado titulo={s.titulo} ayuda={s.ayuda} />
      <div className="space-y-4">
        {subtemas.map((sub) => (
          <div key={sub}>
            {sub && <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">{sub}</h3>}
            <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {vigentes.filter((p) => (metaDe(p.clave).sub ?? '') === sub).map(fila)}
            </div>
          </div>
        ))}
        {inactivos.length > 0 && (
          <details className="group rounded-xl border border-dashed border-gray-300 bg-gray-50">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-gray-600">
              <span>
                <span className="font-semibold">No aplican hoy ({inactivos.length})</span>
                <span className="block text-xs">Con las reglas encendidas hoy no cambian ningún resultado.</span>
              </span>
              <IconChevronDown size={18} className="text-gray-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="divide-y divide-gray-100 border-t border-gray-200 bg-white opacity-75">{inactivos.map(fila)}</div>
          </details>
        )}
      </div>
    </section>
  )
}
