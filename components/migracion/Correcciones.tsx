/**
 * Acta de corrección de contratos activados por migración (Spec §3.8: «Una
 * corrección posterior a la firma requiere acta nueva»). Lo comparten el
 * tablero del lote (backoffice) y el detalle del contrato (inmobiliaria).
 */

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, Modal } from '@/components/ui'
import { IconAlertTriangle, IconScrollText, IconTrash } from '@/components/icons'
import { fechaCorta, money, type ChipTone } from '@/components/dashboard/secciones/_shared'
import { ApiClientError } from '@/lib/api'
import { migracionService } from '@/services/migracionService'
import type { CampoCorregible, CampoCorregido, DatosFilaMigrada, DetalleFilaMigrada, EstadoCorreccion } from '@/types/migracion'

export const ESTADO_CORRECCION_TONO: Record<EstadoCorreccion, ChipTone> = {
  en_firma: 'yellow',
  firmada: 'blue',
  aplicada: 'green',
  sin_efecto: 'gray',
}

const TIPOS_DOC = ['CC', 'CE', 'PPT', 'PEP', 'Pasaporte', 'NIT'] as const
const tipoDoc = (v: string) => TIPOS_DOC.find((t) => t.toLowerCase() === v.toLowerCase()) ?? v

/** La API entrega los valores sin formato (canon número, fechas AAAA-MM-DD, tipo de documento en minúscula). */
export function valorCorreccion(campo: CampoCorregible, v: string | number | null | undefined): string {
  if (v == null || v === '') return '—'
  if (campo === 'canon') return money(Number(v))
  if (campo === 'fecha_inicio' || campo === 'fecha_vencimiento') return fechaCorta(String(v))
  if (campo === 'arrendatario_tipo_documento') return tipoDoc(String(v))
  return String(v)
}

/** Valor anterior → valor corregido, dato por dato. */
export function CambiosCorreccion({ campos }: { campos: Pick<CampoCorregido, 'campo' | 'etiqueta' | 'anterior' | 'nuevo'>[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500">
          <th className="py-1 pr-2 font-semibold">Dato</th>
          <th className="py-1 pr-2 font-semibold">Antes</th>
          <th className="py-1 font-semibold">Corregido</th>
        </tr>
      </thead>
      <tbody>
        {campos.map((c) => (
          <tr key={c.campo} className="border-t border-gray-100 align-top">
            <td className="py-1 pr-2 text-gray-600">{c.etiqueta}</td>
            <td className="py-1 pr-2 text-gray-500 line-through decoration-gray-300">{valorCorreccion(c.campo, c.anterior)}</td>
            <td className="py-1 font-medium text-gray-900">{valorCorreccion(c.campo, c.nuevo)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Modal «Corregir con acta» ──

type Entrada = 'text' | 'number' | 'date' | 'email' | 'tipo'

/** Columnas de la plantilla que se corrigen por acta, con su valor actual (mismo orden y regla que la API). */
const CAMPOS: { campo: CampoCorregible; etiqueta: string; entrada: Entrada; actual: (d: DatosFilaMigrada) => string | number | null }[] = [
  { campo: 'direccion', etiqueta: 'Dirección', entrada: 'text', actual: (d) => d.direccion },
  { campo: 'municipio', etiqueta: 'Municipio', entrada: 'text', actual: (d) => d.municipio },
  { campo: 'codigo_interno', etiqueta: 'Código interno', entrada: 'text', actual: (d) => d.codigo_interno },
  { campo: 'canon', etiqueta: 'Canon sin IVA', entrada: 'number', actual: (d) => d.canon },
  { campo: 'fecha_inicio', etiqueta: 'Fecha de inicio', entrada: 'date', actual: (d) => d.fecha_inicio },
  { campo: 'fecha_vencimiento', etiqueta: 'Fecha de vencimiento', entrada: 'date', actual: (d) => d.fecha_vencimiento },
  { campo: 'arrendatario_nombre', etiqueta: 'Nombre del arrendatario', entrada: 'text', actual: (d) => d.arrendatario.nombre },
  { campo: 'arrendatario_apellido', etiqueta: 'Apellido del arrendatario', entrada: 'text', actual: (d) => d.arrendatario.apellido || null },
  { campo: 'arrendatario_tipo_documento', etiqueta: 'Tipo de documento', entrada: 'tipo', actual: (d) => d.arrendatario.tipo_documento },
  { campo: 'arrendatario_numero_documento', etiqueta: 'Número de documento', entrada: 'text', actual: (d) => d.arrendatario.numero_documento },
  { campo: 'arrendatario_celular', etiqueta: 'Celular', entrada: 'text', actual: (d) => d.arrendatario.celular },
  { campo: 'arrendatario_email', etiqueta: 'Correo', entrada: 'email', actual: (d) => d.arrendatario.email },
]

interface Item {
  det: DetalleFilaMigrada
  valores: Partial<Record<CampoCorregible, string>>
}

/** Lo que cambia en un contrato: solo los datos escritos y distintos del actual. */
function cambiosDe(it: Item) {
  return CAMPOS.flatMap(({ campo, etiqueta, actual }) => {
    const v = it.valores[campo]?.trim()
    if (!v) return []
    const anterior = actual(it.det.datos)
    const nuevo = campo === 'canon' ? Number(v) : v
    const igual = campo === 'arrendatario_tipo_documento' ? tipoDoc(String(anterior ?? '')) === v : String(anterior ?? '') === String(nuevo)
    return igual ? [] : [{ campo, etiqueta, anterior, nuevo }]
  })
}

type Falla = { n_fila?: number | null; contrato_numero?: string | null; motivos?: string[]; firmante?: string; motivo?: string }

const INPUT =
  'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

export function CorreccionModal({
  isOpen,
  onClose,
  loteId,
  elegibles,
  inicial,
  onEnviada,
}: {
  isOpen: boolean
  onClose: () => void
  loteId: string
  /** Contratos del lote con fianza activa por migración (los únicos que se corrigen, §3.8). */
  elegibles: { fila_id: string; etiqueta: string }[]
  /** Contrato desde el que se abrió (detalle de la fila). */
  inicial: DetalleFilaMigrada | null
  onEnviada: () => void
}) {
  const [items, setItems] = useState<Item[]>([])
  const [motivo, setMotivo] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fallas, setFallas] = useState<Falla[]>([])

  useEffect(() => {
    if (!isOpen) return
    setItems(inicial ? [{ det: inicial, valores: {} }] : [])
    setMotivo('')
    setFallas([])
  }, [isOpen, inicial])

  const agregar = async (filaId: string) => {
    if (!filaId || items.some((i) => i.det.id === filaId)) return
    setAgregando(true)
    try {
      const det = await migracionService.detalleFila(filaId)
      setItems((xs) => [...xs, { det, valores: {} }])
    } catch (e) {
      toast.error((e instanceof Error && e.message) || 'No se pudo cargar el contrato')
    } finally {
      setAgregando(false)
    }
  }

  const poner = (filaId: string, campo: CampoCorregible, v: string) =>
    setItems((xs) => xs.map((x) => (x.det.id === filaId ? { ...x, valores: { ...x.valores, [campo]: v } } : x)))

  const conCambios = items.map((it) => ({ it, cambios: cambiosDe(it) }))
  const listo = items.length > 0 && conCambios.every((c) => c.cambios.length > 0) && motivo.trim().length >= 5

  const enviar = async () => {
    setEnviando(true)
    setFallas([])
    try {
      await migracionService.proponerCorreccion(loteId, {
        motivo: motivo.trim(),
        contratos: conCambios.map(({ it, cambios }) => ({
          fila_id: it.det.id,
          cambios: Object.fromEntries(cambios.map((c) => [c.campo, c.nuevo as string | number])),
        })),
      })
      toast.success('Acta de corrección enviada a firma por Auco')
      onEnviada()
    } catch (e) {
      const f = e instanceof ApiClientError ? ((e.details as { fallas?: Falla[] } | undefined)?.fallas ?? []) : []
      setFallas(f)
      toast.error((e instanceof Error && e.message) || 'No se pudo enviar el acta de corrección')
    } finally {
      setEnviando(false)
    }
  }

  const disponibles = elegibles.filter((e) => !items.some((i) => i.det.id === e.fila_id))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Corregir con acta" size="2xl" closeOnBackdrop={false}>
      <div className="space-y-5">
        <p className="text-sm text-gray-600">
          Un contrato activado por migración solo se corrige con un acta nueva firmada por el representante legal de la inmobiliaria y por
          Cofianza. Escriba solo los datos que cambian. Nada se modifica hasta que las dos partes firmen.
        </p>

        {items.map((it) => (
          <div key={it.det.id} className="rounded-xl border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900">
                Contrato {it.det.contrato?.numero ?? `fila ${it.det.n_fila}`}
                <span className="ml-2 font-normal text-gray-500">
                  {it.det.datos.direccion}
                  {it.det.datos.municipio ? `, ${it.det.datos.municipio}` : ''}
                </span>
              </p>
              <Button
                variante="secondary"
                tamano="sm"
                onClick={() => setItems((xs) => xs.filter((x) => x.det.id !== it.det.id))}
                disabled={enviando}
              >
                <IconTrash size={14} /> Quitar
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,1fr)]">
              <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:block">Dato</span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:block">Valor actual</span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:block">Nuevo valor</span>
              {CAMPOS.map(({ campo, etiqueta, entrada, actual }) => {
                const id = `${it.det.id}-${campo}`
                const v = it.valores[campo] ?? ''
                return (
                  <div key={campo} className="contents">
                    <label htmlFor={id} className="pt-1.5 text-xs font-medium text-gray-700">
                      {etiqueta}
                    </label>
                    <span className="pt-1.5 text-xs text-gray-500">{valorCorreccion(campo, actual(it.det.datos))}</span>
                    {entrada === 'tipo' ? (
                      <select id={id} value={v} onChange={(e) => poner(it.det.id, campo, e.target.value)} className={INPUT} disabled={enviando}>
                        <option value="">Sin cambio</option>
                        {TIPOS_DOC.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={id}
                        type={entrada}
                        min={entrada === 'number' ? 1 : undefined}
                        value={v}
                        placeholder="Sin cambio"
                        onChange={(e) => poner(it.det.id, campo, e.target.value)}
                        className={INPUT}
                        disabled={enviando}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {disponibles.length > 0 && (
          <label className="block text-xs font-medium text-gray-700">
            {items.length ? 'Agregar otro contrato del lote a esta acta' : 'Contrato que se corrige'}
            <select
              value=""
              onChange={(e) => void agregar(e.target.value)}
              disabled={agregando || enviando}
              className={`${INPUT} mt-1`}
            >
              <option value="">{agregando ? 'Cargando…' : 'Elija un contrato'}</option>
              {disponibles.map((e) => (
                <option key={e.fila_id} value={e.fila_id}>
                  {e.etiqueta}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-xs font-medium text-gray-700">
          Motivo de la corrección
          <textarea
            rows={2}
            maxLength={1000}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Por ejemplo: error de digitación en el canon al cargar el archivo"
            className={`${INPUT} mt-1`}
            disabled={enviando}
          />
        </label>

        {items.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="mb-2 text-sm font-semibold text-gray-900">Vista previa: lo que dirá el acta</p>
            <div className="space-y-3">
              {conCambios.map(({ it, cambios }) => (
                <div key={it.det.id}>
                  <p className="text-xs font-semibold text-gray-700">Contrato {it.det.contrato?.numero ?? `fila ${it.det.n_fila}`}</p>
                  {cambios.length ? (
                    <CambiosCorreccion campos={cambios} />
                  ) : (
                    <p className="text-xs text-amber-700">Aún no hay cambios en este contrato. Escriba al menos un dato nuevo o quítelo del acta.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {fallas.length > 0 && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
            <ul className="space-y-1">
              {fallas.map((f, i) => (
                <li key={i}>
                  {f.motivos
                    ? `Contrato ${f.contrato_numero ?? (f.n_fila != null ? `fila ${f.n_fila}` : '')}: ${f.motivos.join(' ')}`
                    : `${f.firmante ?? 'Firmante'}: ${f.motivo ?? ''}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
          <Button variante="secondary" onClick={onClose} disabled={enviando}>
            Cerrar
          </Button>
          <Button onClick={enviar} disabled={!listo || enviando}>
            <IconScrollText size={16} /> {enviando ? 'Enviando…' : 'Enviar a firma'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
