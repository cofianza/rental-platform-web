/**
 * Ruta B (Adenda 1 del módulo de contratos, respuesta 6): la inmobiliaria marca
 * sobre su propio contrato dónde firma cada parte. El PDF no se modifica: las
 * marcas van a Auco como coordenadas. Una marca es el punto de la raya donde se
 * apoya la firma (x, y relativos a la página como se ve, origen arriba a la
 * izquierda) y el recuadro que se dibuja es el que ocupará la firma: 150×50 pt
 * a la escala de la página, centrado en la marca y apoyado en ella (el mismo
 * que calcula el API en posicionAuco).
 *
 * Las marcas en pantalla las guarda la página (borrador): aquí solo se pintan y
 * se editan. Se carga con next/dynamic (ssr: false): react-pdf usa el navegador.
 */

'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Document, Page } from 'react-pdf'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { usePdfjsActivo } from '@/components/ui/PdfViewer'
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconChevronLeft,
  IconChevronRight,
  IconLoader,
  IconMapPin,
  IconRefresh,
  IconX,
} from '@/components/icons'
import { cn } from '@/lib/utils'
import type { MarcaFirma, PdfPropio } from '@/types/contratoV3'

/** Lo que ocupa una firma en Auco, en puntos (RECUADRO_FIRMA del API). */
const FIRMA = { w: 150, h: 50 }
/** Tope del API (MAX_MARCAS_FIRMA). */
const MAX_MARCAS = 30
const ANCHO_MAXIMO = 900

/** Una parte que firma: el coarrendatario, con su índice (desde 0). */
export interface ParteFirma {
  parte: MarcaFirma['parte']
  indice?: number
  nombre: string
}

const ROTULO: Record<MarcaFirma['parte'], string> = {
  arrendatario: 'Arrendatario',
  coarrendatario: 'Coarrendatario',
  arrendador: 'Arrendador',
}
const COLOR: Record<MarcaFirma['parte'], string> = {
  arrendatario: 'border-blue-600 bg-blue-500/15 text-blue-900',
  coarrendatario: 'border-amber-600 bg-amber-500/15 text-amber-900',
  arrendador: 'border-primary-700 bg-primary-500/15 text-primary-900',
}

const clave = (m: { parte: MarcaFirma['parte']; indice?: number }) =>
  m.parte === 'coarrendatario' ? `coarrendatario:${m.indice ?? 0}` : m.parte

interface Props {
  propio: PdfPropio
  partes: ParteFirma[]
  /** Las marcas en pantalla: las guardadas o el borrador. */
  marcas: MarcaFirma[]
  sinGuardar: boolean
  editable: boolean
  ocupado: boolean
  guardando: boolean
  /** URL firmada del contrato de la inmobiliaria. */
  cargarUrl: () => Promise<string>
  onCambiar: (marcas: MarcaFirma[]) => void
  onGuardar: () => void
  onDescartar: () => void
}

export function UbicarFirmas({
  propio,
  partes,
  marcas,
  sinGuardar,
  editable,
  ocupado,
  guardando,
  cargarUrl,
  onCambiar,
  onGuardar,
  onDescartar,
}: Props) {
  usePdfjsActivo()
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  // Tamaño en puntos de la página como se ve (con /Rotate y CropBox): el recuadro va a esa escala.
  const [tamano, setTamano] = useState<{ w: number; h: number } | null>(null)
  const [ancho, setAncho] = useState(0)
  const caja = useRef<HTMLDivElement>(null)
  const primeraSinMarca = partes.find((p) => !marcas.some((m) => clave(m) === clave(p)))
  const [sel, setSel] = useState(clave(primeraSinMarca ?? partes[0] ?? { parte: 'arrendatario' }))

  // La URL firmada se pide una vez por PDF (la página monta este bloque con key = sha256) y al
  // reintentar: con la del primer render, así un callback nuevo del padre no recarga el PDF.
  const [cargar] = useState(() => cargarUrl)
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    let vigente = true
    cargar().then(
      (u) => vigente && setUrl(u),
      (err: unknown) => vigente && setError(err instanceof Error ? err.message : 'No pudimos abrir el contrato de la inmobiliaria.'),
    )
    return () => {
      vigente = false
    }
  }, [cargar, intento])
  const reintentar = () => {
    setError(null)
    setUrl(null)
    setIntento((n) => n + 1)
  }

  useEffect(() => {
    const el = caja.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setAncho(Math.min(Math.floor(e.contentRect.width), ANCHO_MAXIMO)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const deParte = (p: ParteFirma) => marcas.filter((m) => clave(m) === clave(p))
  const faltan = partes.filter((p) => deParte(p).length === 0)
  const nombreDe = (m: MarcaFirma) => partes.find((p) => clave(p) === clave(m))?.nombre
  const enPagina = (n: number) => marcas.filter((m) => m.pagina === n).length

  const marcar = (e: MouseEvent<HTMLDivElement>) => {
    if (!editable || ocupado) return
    const parte = partes.find((p) => clave(p) === sel)
    if (!parte) return
    if (marcas.length >= MAX_MARCAS) {
      toast.error(`Máximo ${MAX_MARCAS} firmas sobre el contrato. Quita alguna para ubicar otra.`)
      return
    }
    const r = e.currentTarget.getBoundingClientRect()
    const rel = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 1e4) / 1e4
    const nueva: MarcaFirma = {
      parte: parte.parte,
      ...(parte.parte === 'coarrendatario' ? { indice: parte.indice ?? 0 } : {}),
      pagina,
      x: rel((e.clientX - r.left) / r.width),
      y: rel((e.clientY - r.top) / r.height),
    }
    onCambiar([...marcas, nueva])
  }

  const quitar = (m: MarcaFirma) => onCambiar(marcas.filter((x) => x !== m))
  // Sin el tamaño de la página anterior: una girada tiene otro.
  const irA = (n: number) => {
    setTamano(null)
    setPagina(n)
  }

  return (
    <div className="space-y-3 border-t border-gray-200 pt-4">
      <div className="flex items-center gap-2">
        <IconMapPin size={18} className="text-primary-600" />
        <h4 className="text-sm font-semibold text-gray-900">Ubica las firmas</h4>
      </div>
      <p className="text-sm text-gray-600">
        {editable
          ? 'Elige una parte y haz clic sobre la raya donde firma. El recuadro es el espacio que ocupará su firma; puedes ubicar varias por parte (por ejemplo, firma e iniciales en cada página). Tu PDF no se modifica.'
          : 'Dónde firma cada parte sobre el contrato de la inmobiliaria.'}
      </p>
      {editable && <p className="text-xs text-gray-500 sm:hidden">Para ubicar las firmas con precisión, usa un computador.</p>}

      <div role="group" aria-label="Parte que firma" className="flex flex-wrap gap-2">
        {partes.map((p) => {
          const n = deParte(p).length
          const activa = editable && clave(p) === sel
          return (
            <button
              key={clave(p)}
              type="button"
              aria-pressed={activa}
              disabled={!editable}
              onClick={() => setSel(clave(p))}
              className={cn(
                'flex min-w-0 flex-col items-start rounded-lg border-2 px-3 py-1.5 text-left text-sm transition-colors',
                'disabled:cursor-default',
                activa ? COLOR[p.parte] : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
              )}
            >
              <span className="font-semibold">{ROTULO[p.parte]}</span>
              <span className="max-w-56 truncate text-xs">{p.nombre}</span>
              <span className="mt-0.5 flex items-center gap-1 text-xs">
                {n > 0 ? (
                  <>
                    <IconCheckCircle size={12} className="text-primary-700" />
                    {n === 1 ? '1 firma' : `${n} firmas`} (pág. {[...new Set(deParte(p).map((m) => m.pagina))].join(', ')})
                  </>
                ) : (
                  <span className="text-amber-800">Sin ubicar</span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <p aria-live="polite" className={cn('text-sm', faltan.length ? 'text-amber-800' : 'text-primary-800')}>
        {faltan.length
          ? `Falta ubicar dónde firma: ${faltan.map((p) => `${ROTULO[p.parte]} (${p.nombre})`).join(', ')}.`
          : 'Todas las partes tienen dónde firmar.'}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variante="secondary"
            tamano="sm"
            onClick={() => irA(pagina - 1)}
            disabled={pagina <= 1}
            aria-label="Página anterior"
          >
            <IconChevronLeft size={14} />
          </Button>
          <label className="sr-only" htmlFor="ubicar-firmas-pagina">
            Página
          </label>
          <select
            id="ubicar-firmas-pagina"
            value={pagina}
            onChange={(e) => irA(Number(e.target.value))}
            className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
          >
            {Array.from({ length: propio.paginas }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Página {n} de {propio.paginas}
                {enPagina(n) ? ` · ${enPagina(n) === 1 ? '1 firma' : `${enPagina(n)} firmas`}` : ''}
              </option>
            ))}
          </select>
          <Button
            variante="secondary"
            tamano="sm"
            onClick={() => irA(pagina + 1)}
            disabled={pagina >= propio.paginas}
            aria-label="Página siguiente"
          >
            <IconChevronRight size={14} />
          </Button>
        </div>
        {editable && (
          <div className="flex gap-2">
            {sinGuardar && (
              <Button variante="secondary" tamano="sm" onClick={onDescartar} disabled={ocupado}>
                Descartar cambios
              </Button>
            )}
            <Button variante="primary" tamano="sm" onClick={onGuardar} disabled={!sinGuardar || ocupado}>
              {guardando && <IconLoader size={14} className="animate-spin" />}
              {guardando ? 'Guardando…' : 'Guardar ubicación de firmas'}
            </Button>
          </div>
        )}
      </div>

      <div ref={caja} className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
        {error ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <IconAlertTriangle size={24} className="text-red-500" />
            <p className="text-sm text-red-800">{error}</p>
            <Button variante="secondary" tamano="sm" onClick={reintentar}>
              <IconRefresh size={14} /> Reintentar
            </Button>
          </div>
        ) : !url ? (
          <div role="status" className="flex h-40 items-center justify-center gap-2 text-sm text-gray-500">
            <IconLoader size={18} className="animate-spin" /> Cargando el contrato…
          </div>
        ) : (
          <Document
            file={url}
            loading={
              <div role="status" className="flex h-40 items-center justify-center gap-2 text-sm text-gray-500">
                <IconLoader size={18} className="animate-spin" /> Cargando el contrato…
              </div>
            }
            onLoadError={() => setError('No pudimos abrir el contrato de la inmobiliaria.')}
          >
            {ancho > 0 && (
              <div className="relative mx-auto" style={{ width: ancho }}>
                <Page
                  pageNumber={pagina}
                  width={ancho}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={null}
                  onLoadSuccess={(p) => setTamano({ w: p.originalWidth, h: p.originalHeight })}
                />
                {tamano && (
                  <div
                    className={cn('absolute inset-0', editable && !ocupado && 'cursor-crosshair')}
                    onClick={marcar}
                  >
                    {marcas
                      .filter((m) => m.pagina === pagina)
                      .map((m, i) => {
                        const w = (FIRMA.w / tamano.w) * 100
                        const h = (FIRMA.h / tamano.h) * 100
                        return (
                          <div
                            key={`${clave(m)}-${m.x}-${m.y}-${i}`}
                            className={cn(
                              'pointer-events-none absolute flex items-end rounded-sm border-2 border-dashed px-1',
                              COLOR[m.parte],
                            )}
                            style={{ left: `${m.x * 100 - w / 2}%`, top: `${m.y * 100 - h}%`, width: `${w}%`, height: `${h}%` }}
                          >
                            <span className="truncate text-[10px] leading-tight font-semibold">
                              {ROTULO[m.parte]}
                              {nombreDe(m) ? ` · ${nombreDe(m)}` : ''}
                            </span>
                            {editable && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  quitar(m)
                                }}
                                disabled={ocupado}
                                aria-label={`Quitar la firma de ${ROTULO[m.parte]} en la página ${m.pagina}`}
                                className="pointer-events-auto absolute -top-2.5 -right-2.5 rounded-full border border-gray-300 bg-white p-0.5 text-gray-700 shadow-sm hover:bg-red-50 hover:text-red-700"
                              >
                                <IconX size={12} />
                              </button>
                            )}
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )}
          </Document>
        )}
      </div>
    </div>
  )
}
