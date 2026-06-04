/**
 * Reportar Mora — módulo completo de 3 fases (Mario 12-may-2026,
 * mockup 13_*propietario.html). Reemplaza al stub anterior:
 *   - KPIs reales (reportadas mes / resueltas / en gestión / monto total)
 *   - Form de reporte (contrato + fecha vencimiento + monto + descripción)
 *   - Tabla con filter chips por fase
 *   - Modal de detalle con chat + acciones (escalar / marcar pagada / cancelar)
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui'
import {
  IconAlertTriangle,
  IconClock,
  IconCheck,
  IconLoader,
  IconX,
  IconChevronRight,
} from '@/components/icons'
import { contratoService } from '@/services/contratoService'
import {
  morasService,
  type IMoraTicket,
  type IMoraDetalle,
  type IMorasStats,
  type MoraEstado,
} from '@/services/morasService'
import { formatCurrency } from '@/lib/constants'

interface ContratoSelectItem {
  id: string
  numero: string
  inquilino: string
  monto: number
}

const FASE_CONFIG: Record<MoraEstado, { label: string; chip: string; chipText: string; bdot: string }> = {
  fase_1: {
    label: 'Fase 1 — Recordatorio',
    chip: 'bg-amber-50 border-amber-200',
    chipText: 'text-amber-700',
    bdot: 'bg-amber-500',
  },
  fase_2: {
    label: 'Fase 2 — Urgencia',
    chip: 'bg-coral-50 border-coral-200',
    chipText: 'text-coral-700',
    bdot: 'bg-coral-500',
  },
  fase_3: {
    label: 'Fase 3 — Legal',
    chip: 'bg-red-50 border-red-200',
    chipText: 'text-red-700',
    bdot: 'bg-red-500',
  },
  pagada: {
    label: 'Pagada',
    chip: 'bg-primary-50 border-primary-200',
    chipText: 'text-primary-700',
    bdot: 'bg-primary-500',
  },
  cancelada: {
    label: 'Cancelada',
    chip: 'bg-gray-100 border-gray-200',
    chipText: 'text-gray-600',
    bdot: 'bg-gray-400',
  },
}

const FILTROS: Array<{ key: 'todas' | MoraEstado; label: string }> = [
  { key: 'todas', label: 'Todas' },
  { key: 'fase_1', label: 'Fase 1' },
  { key: 'fase_2', label: 'Fase 2' },
  { key: 'fase_3', label: 'Fase 3' },
  { key: 'pagada', label: 'Pagadas' },
]

export default function ReportarMoraPage() {
  const [stats, setStats] = useState<IMorasStats | null>(null)
  const [moras, setMoras] = useState<IMoraTicket[]>([])
  const [contratos, setContratos] = useState<ContratoSelectItem[]>([])
  const [filtro, setFiltro] = useState<'todas' | MoraEstado>('todas')
  const [loading, setLoading] = useState(true)
  const [detalleId, setDetalleId] = useState<string | null>(null)
  const [reportando, setReportando] = useState(false)

  // Form state
  const [contratoId, setContratoId] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')

  // Default: día 5 del mes actual (vencimiento típico).
  useEffect(() => {
    const ahora = new Date()
    const def = new Date(ahora.getFullYear(), ahora.getMonth(), 5)
    setFechaVencimiento(def.toISOString().split('T')[0])
  }, [])

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, morasRes] = await Promise.all([
        morasService.stats(),
        morasService.list({ estado: filtro, limit: 100 }),
      ])
      setStats(statsRes)
      setMoras(morasRes.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar moras')
    } finally {
      setLoading(false)
    }
  }, [filtro])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // Contratos vigentes para el dropdown — separado del refresh principal.
  useEffect(() => {
    contratoService
      .getAllContratos({ estado: 'vigente', limit: 100 })
      .then((res) => {
        // El listado embebe expedientes.solicitantes + inmuebles.codigo, así
        // que mostramos arrendatario + código del inmueble (auto-llenado).
        const items: ContratoSelectItem[] = res.data.map((c) => {
          const sol = c.expedientes?.solicitantes
          const inquilino = sol ? `${sol.nombre ?? ''} ${sol.apellido ?? ''}`.trim() : ''
          return {
            id: c.id,
            numero: c.expedientes?.inmuebles?.codigo || c.expedientes?.numero || c.id.slice(0, 8),
            inquilino: inquilino || '—',
            monto: c.valor_arriendo ?? 0,
          }
        })
        setContratos(items)
      })
      .catch(() => setContratos([]))
  }, [])

  const contratoSeleccionado = contratos.find((c) => c.id === contratoId)
  useEffect(() => {
    // Pre-llenar monto al elegir contrato (puede editarse si difiere).
    if (contratoSeleccionado && !monto) {
      setMonto(String(contratoSeleccionado.monto))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratoId])

  async function handleReportar(e: React.FormEvent) {
    e.preventDefault()
    if (!contratoId) {
      toast.error('Selecciona un contrato')
      return
    }
    const montoNum = Number(monto.replace(/\D/g, ''))
    if (!montoNum) {
      toast.error('Monto inválido')
      return
    }
    setReportando(true)
    try {
      await morasService.reportar({
        contrato_id: contratoId,
        fecha_vencimiento_canon: fechaVencimiento,
        monto_mora: montoNum,
        descripcion: descripcion.trim() || undefined,
      })
      toast.success('Mora reportada — se notificó al inquilino vía WhatsApp')
      setContratoId('')
      setMonto('')
      setDescripcion('')
      cargarDatos()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al reportar la mora')
    } finally {
      setReportando(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportar Mora"
        subtitle="Avisa a Cofianza cuando un inquilino se atrasa. El sistema escala automáticamente en 3 fases (Recordatorio → Urgencia → Legal)."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Moras reportadas" value={stats?.reportadas_mes ?? 0} sub="Este mes" />
        <KpiCard label="Resueltas" value={stats?.resueltas ?? 0} color="primary" sub="Pagadas" />
        <KpiCard label="En gestión" value={stats?.en_gestion ?? 0} color="coral" sub="Activas" />
        <KpiCard
          label="Monto en mora"
          value={formatCompactCOP(stats?.monto_total ?? 0)}
          color="red"
          sub="Total adeudado"
        />
      </div>

      {/* Form de reporte */}
      <form
        onSubmit={handleReportar}
        className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
      >
        <div className="flex items-start gap-3 bg-primary-50 border-l-4 border-primary-500 rounded-r-lg p-3 text-sm text-primary-900">
          <IconAlertTriangle size={18} className="text-primary-600 shrink-0 mt-0.5" />
          <p>
            <strong>Flujo automático de 3 fases:</strong> al reportar enviamos un WhatsApp amistoso
            al inquilino (Fase 1). Si no paga en 4 días escalamos a Fase 2 (Urgencia). A los 10 días
            entra en Fase 3 (Legal) y Cofianza toma control.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contrato <span className="text-coral-500">*</span>
            </label>
            <select
              value={contratoId}
              onChange={(e) => setContratoId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">— Selecciona contrato —</option>
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero}
                  {c.inquilino !== '—' ? ` — ${c.inquilino}` : ''} · {formatCurrency(c.monto)}
                </option>
              ))}
            </select>
            {contratos.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No hay contratos vigentes para reportar
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de vencimiento del canon <span className="text-coral-500">*</span>
            </label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
        </div>

        {/* Datos auto-llenados del contrato seleccionado (mockup 13_v2). */}
        {contratoId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inquilino</label>
              <input
                type="text"
                readOnly
                value={contratoSeleccionado?.inquilino ?? '—'}
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-600 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha del reporte <span className="text-gray-400 font-normal">(hoy)</span>
              </label>
              <input
                type="text"
                readOnly
                value={new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-600 rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto en mora <span className="text-coral-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              placeholder="1200000"
              required
            />
            {monto && (
              <p className="text-xs text-gray-500 mt-1">{formatCurrency(Number(monto))}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              placeholder="Ej: No respondió mensajes esta semana"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={reportando || !contratoId || !monto}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-coral-500 hover:bg-coral-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
          >
            {reportando ? <IconLoader size={16} className="animate-spin" /> : <IconAlertTriangle size={16} />}
            {reportando ? 'Reportando…' : 'Reportar a Cofianza'}
          </button>
        </div>
      </form>

      {/* Tabla de moras */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h3 className="flex items-center gap-2.5 text-base font-bold text-gray-900">
              <span className="inline-block h-2 w-2 rounded-full bg-coral-500" />
              Seguimiento de moras
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Haz clic en una fila para ver el detalle y el chat del inquilino.
            </p>
          </div>
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1 text-xs font-bold transition-colors ${
                filtro === f.key
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-primary-600'
              }`}
            >
              {f.key !== 'todas' && (
                <span className={`h-1.5 w-1.5 rounded-full ${FASE_CONFIG[f.key as MoraEstado].bdot}`} />
              )}
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
            <IconLoader size={16} className="animate-spin" /> Cargando moras…
          </div>
        ) : moras.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            {filtro === 'todas'
              ? 'Aún no hay moras reportadas. Cuando reportes una aparecerá aquí.'
              : 'Sin resultados para este filtro.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Ticket
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Inquilino
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Inmueble
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Monto
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Días
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Coa.
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Fase
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Expediente
                </th>
              </tr>
            </thead>
            <tbody>
              {moras.map((m) => {
                const dias = Math.floor(
                  (Date.now() - new Date(m.reportado_at).getTime()) / 86_400_000,
                )
                const cfg = FASE_CONFIG[m.estado]
                return (
                  <tr
                    key={m.id}
                    onClick={() => setDetalleId(m.id)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-bold text-gray-900">
                      {m.ticket_numero}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{m.inquilino_nombre}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">
                      {m.inmueble_codigo && (
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded mr-1.5">
                          {m.inmueble_codigo}
                        </span>
                      )}
                      {m.inmueble_direccion ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {formatCurrency(m.monto_mora)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{dias}</td>
                    <td className="px-4 py-3 text-center">
                      {m.coarrendatario_nombre ? (
                        <span className="inline-flex items-center rounded-md bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
                          Sí
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold border ${cfg.chip} ${cfg.chipText}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.bdot}`} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/expedientes/${m.expediente_id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900 whitespace-nowrap"
                      >
                        Ver expediente <IconChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Modal detalle */}
      {detalleId && (
        <MoraDetalleModal
          moraId={detalleId}
          onClose={() => setDetalleId(null)}
          onChange={cargarDatos}
        />
      )}
    </div>
  )
}

// ============================================================
// KPI card
// ============================================================

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: number | string
  sub?: string
  color?: 'primary' | 'coral' | 'red'
}) {
  const colorClass =
    color === 'primary'
      ? 'text-primary-600'
      : color === 'coral'
        ? 'text-coral-500'
        : color === 'red'
          ? 'text-red-500'
          : 'text-gray-900'
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-3xl font-black leading-none tracking-tight ${colorClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

function formatCompactCOP(monto: number): string {
  if (monto >= 1_000_000) {
    const m = monto / 1_000_000
    return `$${m.toFixed(m >= 10 ? 0 : 1)}M`
  }
  if (monto >= 1_000) return `$${(monto / 1_000).toFixed(0)}K`
  return formatCurrency(monto)
}

// ============================================================
// Modal detalle + chat
// ============================================================

function MoraDetalleModal({
  moraId,
  onClose,
  onChange,
}: {
  moraId: string
  onClose: () => void
  onChange: () => void
}) {
  const [mora, setMora] = useState<IMoraDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [acting, setActing] = useState(false)

  const recargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await morasService.getById(moraId)
      setMora(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar el detalle')
    } finally {
      setLoading(false)
    }
  }, [moraId])

  useEffect(() => {
    recargar()
  }, [recargar])

  async function handleEnviarMensaje() {
    if (!mensaje.trim()) return
    setEnviando(true)
    try {
      await morasService.agregarMensaje(moraId, mensaje.trim())
      setMensaje('')
      await recargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar mensaje')
    } finally {
      setEnviando(false)
    }
  }

  async function handleEscalar() {
    setActing(true)
    try {
      await morasService.escalar(moraId)
      toast.success('Mora escalada y WhatsApp enviado')
      await recargar()
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al escalar')
    } finally {
      setActing(false)
    }
  }

  async function handlePagar() {
    setActing(true)
    try {
      await morasService.marcarPagada(moraId)
      toast.success('Mora marcada como pagada')
      await recargar()
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al marcar pagada')
    } finally {
      setActing(false)
    }
  }

  async function handleCancelar() {
    const motivo = window.prompt('Motivo de la cancelación:')
    if (!motivo) return
    setActing(true)
    try {
      await morasService.cancelar(moraId, motivo)
      toast.success('Mora cancelada')
      await recargar()
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cancelar')
    } finally {
      setActing(false)
    }
  }

  const cfg = mora ? FASE_CONFIG[mora.estado] : null
  const esTerminal = mora?.estado === 'pagada' || mora?.estado === 'cancelada'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              {mora?.ticket_numero ?? 'Cargando…'}
              {cfg && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.chip} ${cfg.chipText}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.bdot}`} />
                  {cfg.label}
                </span>
              )}
            </h2>
            {mora && (
              <p className="text-sm text-gray-500 mt-0.5">
                {mora.inquilino_nombre} · {mora.inmueble_direccion ?? '—'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading || !mora ? (
            <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2">
              <IconLoader size={16} className="animate-spin" /> Cargando…
            </div>
          ) : (
            <>
              {/* Detalle resumen */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Monto" value={formatCurrency(mora.monto_mora)} />
                <Field
                  label="Vencimiento canon"
                  value={new Date(mora.fecha_vencimiento_canon).toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                />
                <Field
                  label="Reportada el"
                  value={new Date(mora.reportado_at).toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                />
                <Field label="Teléfono inquilino" value={mora.inquilino_telefono ?? '—'} />
              </div>

              {mora.descripcion && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Nota inicial
                  </p>
                  {mora.descripcion}
                </div>
              )}

              {/* Chat */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Historial y chat
                </h3>
                <div className="bg-gray-100 rounded-lg p-3 max-h-72 overflow-y-auto space-y-2">
                  {mora.mensajes.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Sin mensajes todavía</p>
                  ) : (
                    mora.mensajes.map((msg) => {
                      const esSistema = msg.autor_tipo === 'sistema'
                      const esInquilino = msg.autor_tipo === 'inquilino'
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${esSistema ? 'justify-center' : esInquilino ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                              esSistema
                                ? 'bg-white/60 border border-gray-200 text-gray-500 italic text-xs text-center max-w-full'
                                : esInquilino
                                  ? 'bg-primary-100 border border-primary-200 text-primary-900'
                                  : 'bg-white border border-gray-200 text-gray-800'
                            }`}
                          >
                            {!esSistema && (
                              <p className="text-[10px] font-bold uppercase tracking-wide opacity-60 mb-0.5">
                                {msg.autor_tipo}
                              </p>
                            )}
                            <p>{msg.mensaje}</p>
                            <p className="text-[10px] opacity-60 mt-1">
                              {new Date(msg.created_at).toLocaleString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {!esTerminal && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && mensaje.trim()) {
                          e.preventDefault()
                          handleEnviarMensaje()
                        }
                      }}
                      placeholder="Escribe una nota interna…"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={handleEnviarMensaje}
                      disabled={enviando || !mensaje.trim()}
                      className="px-4 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg"
                    >
                      {enviando ? <IconLoader size={14} className="animate-spin" /> : 'Enviar'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {mora && !esTerminal && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center gap-2 justify-end">
            <button
              type="button"
              onClick={handleCancelar}
              disabled={acting}
              className="px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              Cancelar caso
            </button>
            <button
              type="button"
              onClick={handlePagar}
              disabled={acting}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-primary-700 bg-primary-50 border border-primary-300 rounded-lg hover:bg-primary-100 disabled:opacity-50"
            >
              <IconCheck size={14} /> Marcar pagada
            </button>
            {mora.estado !== 'fase_3' && (
              <button
                type="button"
                onClick={handleEscalar}
                disabled={acting}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 rounded-lg disabled:opacity-50"
              >
                {acting ? <IconLoader size={14} className="animate-spin" /> : <IconClock size={14} />}
                Escalar a {mora.estado === 'fase_1' ? 'Fase 2 (Urgencia)' : 'Fase 3 (Legal)'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}
