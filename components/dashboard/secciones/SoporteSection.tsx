'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  soporteService,
  type TicketSoporte,
  type TicketEstado,
  type TicketPrioridad,
} from '@/services/soporteService'
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconClock,
  IconInbox,
  IconPlus,
  IconLoader,
} from '@/components/icons'
import { Modal } from '@/components/ui/Modal'
import {
  Chip,
  FiltroBar,
  FiltroSelect,
  Kpi,
  KpiRow,
  SeccionEstado,
  SeccionHeader,
  Tabla,
  Td,
  fechaCorta,
  fechaRelativa,
  useSeccion,
  type ChipTone,
} from '@/components/dashboard/secciones/_shared'

// Targets de SLA (en horas) por prioridad.
const SLA_TARGET: Record<TicketPrioridad, number> = { alta: 24, media: 48, baja: 72 }

function calcularSla(t: TicketSoporte) {
  const target = SLA_TARGET[t.prioridad]
  if (t.estado === 'resuelto') return { horas: 0, target, vencido: false, resuelto: true }
  const inicio = new Date(t.createdAt).getTime()
  const horas = Number.isNaN(inicio) ? 0 : (Date.now() - inicio) / 3.6e6
  return { horas, target, vencido: horas > target, resuelto: false }
}

/** Horas reales de resolución (resolvedAt - createdAt). null si falta algún timestamp. */
function horasResolucion(t: TicketSoporte): number | null {
  if (!t.resolvedAt) return null
  const fin = new Date(t.resolvedAt).getTime()
  const ini = new Date(t.createdAt).getTime()
  if (Number.isNaN(fin) || Number.isNaN(ini)) return null
  return Math.max(0, (fin - ini) / 3.6e6)
}

const PRIORIDAD_TONE: Record<TicketPrioridad, ChipTone> = { alta: 'red', media: 'orange', baja: 'gray' }
const PRIORIDAD_LABEL: Record<TicketPrioridad, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' }
const ESTADO_TONE: Record<TicketEstado, ChipTone> = { abierto: 'red', en_proceso: 'orange', resuelto: 'green' }
const ESTADO_LABEL: Record<TicketEstado, string> = { abierto: 'Nuevo', en_proceso: 'En proceso', resuelto: 'Resuelto' }

const TIPOS = ['Consulta', 'Reporte de mora', 'Soporte técnico', 'Consulta comercial', 'Otro']

// Peso para el orden accionable: no resueltos primero, dentro de ellos vencidos primero,
// y a igualdad mayor % de SLA consumido arriba. Resueltos al fondo (consumo 0).
function ordenPeso(t: TicketSoporte): number {
  const sla = calcularSla(t)
  if (sla.resuelto) return -1
  const consumo = sla.target > 0 ? sla.horas / sla.target : 0
  // Vencidos quedan por encima de no vencidos sumando un offset grande.
  return (sla.vencido ? 1000 : 0) + consumo
}

export function SoporteSection() {
  const { data, loading, error, reload } = useSeccion(() => soporteService.listTickets())

  const [estado, setEstado] = useState<string>('todos')
  const [prioridad, setPrioridad] = useState<string>('todas')
  // Filtro especial activado desde el KPI "SLA vencido".
  const [soloVencidos, setSoloVencidos] = useState(false)

  // Crear ticket
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ tipo: 'Consulta', asunto: '', descripcion: '', prioridad: 'media' as TicketPrioridad })
  const [creating, setCreating] = useState(false)

  // Detalle
  const [detail, setDetail] = useState<TicketSoporte | null>(null)
  const [savingEstado, setSavingEstado] = useState(false)

  const tickets = data ?? []

  const filtrados = tickets
    .filter((t: TicketSoporte) => {
      if (estado !== 'todos' && t.estado !== estado) return false
      if (prioridad !== 'todas' && t.prioridad !== prioridad) return false
      if (soloVencidos && !(t.estado !== 'resuelto' && calcularSla(t).vencido)) return false
      return true
    })
    // Orden accionable por defecto.
    .sort((a, b) => ordenPeso(b) - ordenPeso(a))

  const abiertos = tickets.filter((t) => t.estado === 'abierto').length
  const enProceso = tickets.filter((t) => t.estado === 'en_proceso').length
  const resueltos = tickets.filter((t) => t.estado === 'resuelto').length
  const slaVencido = tickets.filter((t) => t.estado !== 'resuelto' && calcularSla(t).vencido).length

  const filtroActivo = estado !== 'todos' || prioridad !== 'todas' || soloVencidos

  const limpiarFiltros = () => {
    setEstado('todos')
    setPrioridad('todas')
    setSoloVencidos(false)
  }

  // KPI clicable de estado: alterna el filtro de estado y desactiva el de vencidos.
  const toggleEstado = (es: TicketEstado) => {
    setSoloVencidos(false)
    setEstado((prev) => (prev === es ? 'todos' : es))
  }

  // KPI clicable de SLA vencido: alterna su filtro y limpia el de estado.
  const toggleVencidos = () => {
    setEstado('todos')
    setSoloVencidos((prev) => !prev)
  }

  const handleCreate = async () => {
    if (!form.asunto.trim()) {
      toast.error('El asunto es requerido.')
      return
    }
    setCreating(true)
    try {
      await soporteService.createTicket({
        tipo: form.tipo,
        asunto: form.asunto.trim(),
        descripcion: form.descripcion.trim() || undefined,
        prioridad: form.prioridad,
      })
      toast.success('Ticket creado.')
      setCreateOpen(false)
      setForm({ tipo: 'Consulta', asunto: '', descripcion: '', prioridad: 'media' })
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo crear el ticket.')
    } finally {
      setCreating(false)
    }
  }

  const cambiarEstado = async (nuevo: TicketEstado) => {
    if (!detail) return
    setSavingEstado(true)
    try {
      const updated = await soporteService.updateEstado(detail.id, nuevo)
      setDetail(updated)
      toast.success('Estado actualizado.')
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar.')
    } finally {
      setSavingEstado(false)
    }
  }

  const openDetail = async (id: string) => {
    try {
      const t = await soporteService.getById(id)
      setDetail(t)
    } catch {
      toast.error('No pudimos cargar el ticket.')
    }
  }

  // ¿Está la tabla totalmente vacía (no hay ningún ticket) vs vacía por filtros?
  const sinTickets = tickets.length === 0

  return (
    <div>
      <SeccionHeader
        title="Soporte"
        subtitle="SLA: Alta 24h · Media 48h · Baja 72h"
        right={
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-600 transition-colors"
          >
            <IconPlus size={16} /> Nuevo ticket
          </button>
        }
      />

      <KpiRow>
        <Kpi
          label="Abiertos"
          value={abiertos}
          tone="orange"
          Icon={IconInbox}
          onClick={() => toggleEstado('abierto')}
          active={estado === 'abierto'}
        />
        <Kpi
          label="En proceso"
          value={enProceso}
          tone="blue"
          Icon={IconClock}
          onClick={() => toggleEstado('en_proceso')}
          active={estado === 'en_proceso'}
        />
        <Kpi
          label="Resueltos"
          value={resueltos}
          tone="green"
          Icon={IconCheckCircle}
          onClick={() => toggleEstado('resuelto')}
          active={estado === 'resuelto'}
        />
        <Kpi
          label="SLA vencido"
          value={slaVencido}
          tone="red"
          Icon={IconAlertTriangle}
          accent={slaVencido > 0 ? 'danger' : 'none'}
          onClick={toggleVencidos}
          active={soloVencidos}
        />
      </KpiRow>

      <FiltroBar
        count={`${filtrados.length} de ${tickets.length}`}
        onClear={filtroActivo ? limpiarFiltros : undefined}
      >
        <FiltroSelect
          label="Estado"
          value={estado}
          onChange={(v) => {
            setSoloVencidos(false)
            setEstado(v)
          }}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'abierto', label: 'Nuevo' },
            { value: 'en_proceso', label: 'En proceso' },
            { value: 'resuelto', label: 'Resuelto' },
          ]}
        />
        <FiltroSelect
          label="Prioridad"
          value={prioridad}
          onChange={setPrioridad}
          options={[
            { value: 'todas', label: 'Todas' },
            { value: 'alta', label: 'Alta' },
            { value: 'media', label: 'Media' },
            { value: 'baja', label: 'Baja' },
          ]}
        />
      </FiltroBar>

      <SeccionEstado
        loading={loading}
        error={error}
        onRetry={reload}
        vacio={
          !loading && filtrados.length === 0
            ? sinTickets
              ? {
                  icon: IconInbox,
                  titulo: 'Sin tickets de soporte',
                  descripcion: 'Aún no hay solicitudes registradas. Crea el primer ticket para darle seguimiento con SLA.',
                  action: (
                    <button
                      onClick={() => setCreateOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-600 transition-colors"
                    >
                      <IconPlus size={16} /> Nuevo ticket
                    </button>
                  ),
                }
              : {
                  icon: IconInbox,
                  titulo: 'Ningún ticket coincide',
                  descripcion: 'Ajusta o limpia los filtros para ver más resultados.',
                  action: (
                    <button
                      onClick={limpiarFiltros}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:border-primary-400 hover:text-primary-600 transition-colors"
                    >
                      Limpiar filtros
                    </button>
                  ),
                }
            : false
        }
      >
        <Tabla head={['Ticket', 'Remitente', 'Tipo', 'Asunto', 'Fecha', 'Prioridad', 'Estado', 'SLA', '']}>
          {filtrados.map((t) => {
            const sla = calcularSla(t)
            const remitente = t.remitente ? `${t.remitente.nombre} ${t.remitente.apellido}`.trim() : '—'
            return (
              <tr key={t.id} className="hover:bg-ink-50">
                <Td className="font-semibold text-ink-900">{t.ticketNumero}</Td>
                <Td>{remitente}</Td>
                <Td>{t.tipo}</Td>
                <Td>
                  <span className="block max-w-[16rem] truncate" title={t.asunto}>{t.asunto}</span>
                </Td>
                <Td>
                  <span title={fechaCorta(t.createdAt)} className="text-ink-600">
                    {fechaRelativa(t.createdAt)}
                  </span>
                </Td>
                <Td><Chip tone={PRIORIDAD_TONE[t.prioridad]}>{PRIORIDAD_LABEL[t.prioridad]}</Chip></Td>
                <Td><Chip tone={ESTADO_TONE[t.estado]}>{ESTADO_LABEL[t.estado]}</Chip></Td>
                <Td>
                  <CeldaSla ticket={t} sla={sla} />
                </Td>
                <Td className="text-right">
                  <button
                    onClick={() => openDetail(t.id)}
                    className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-coral-400 hover:text-coral-600 transition-colors"
                  >
                    Ver
                  </button>
                </Td>
              </tr>
            )
          })}
        </Tabla>
      </SeccionEstado>

      {/* Modal crear ticket */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo ticket de soporte" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label>
            <input
              type="text"
              value={form.asunto}
              onChange={(e) => setForm({ ...form, asunto: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              placeholder="Resumen del caso"
              maxLength={300}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={4}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              placeholder="Detalle del ticket (opcional)"
              maxLength={5000}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
            <select
              value={form.prioridad}
              onChange={(e) => setForm({ ...form, prioridad: e.target.value as TicketPrioridad })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <button
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {creating && <IconLoader size={16} className="animate-spin" />}
              Crear ticket
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal detalle + cambio de estado */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail ? detail.ticketNumero : ''} size="md">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-400">Remitente</div>
                <div className="font-medium text-gray-900">
                  {detail.remitente ? `${detail.remitente.nombre} ${detail.remitente.apellido}`.trim() : '—'}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-400">Tipo</div>
                <div className="text-gray-700">{detail.tipo}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-400">Prioridad</div>
                <Chip tone={PRIORIDAD_TONE[detail.prioridad]}>{PRIORIDAD_LABEL[detail.prioridad]}</Chip>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-400">Creado</div>
                <div className="text-gray-700">{fechaCorta(detail.createdAt)}</div>
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Asunto</div>
              <p className="text-sm font-medium text-gray-900">{detail.asunto}</p>
              {detail.descripcion && <p className="mt-1 text-sm text-gray-600 leading-relaxed">{detail.descripcion}</p>}
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">Cambiar estado</div>
              <div className="flex flex-wrap gap-2">
                {(['abierto', 'en_proceso', 'resuelto'] as TicketEstado[]).map((es) => (
                  <button
                    key={es}
                    onClick={() => cambiarEstado(es)}
                    disabled={savingEstado || detail.estado === es}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                      detail.estado === es
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-700 hover:border-primary-400 hover:text-primary-600'
                    }`}
                  >
                    {ESTADO_LABEL[es]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Celda SLA con barra de progreso / resumen de resolución ──

function CeldaSla({
  ticket,
  sla,
}: {
  ticket: TicketSoporte
  sla: { horas: number; target: number; vencido: boolean; resuelto: boolean }
}) {
  // Tickets resueltos: tiempo real de resolución + cumplimiento vs target.
  if (sla.resuelto) {
    const reales = horasResolucion(ticket)
    if (reales === null) {
      return <span className="text-ink-500">—</span>
    }
    const cumplido = reales <= sla.target
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="tabular-nums text-ink-600">Resuelto en {Math.round(reales)}h</span>
        <Chip tone={cumplido ? 'green' : 'red'}>{cumplido ? 'Cumplido' : 'Incumplido'}</Chip>
      </span>
    )
  }

  const pct = Math.min((sla.horas / sla.target) * 100, 100)
  // Verde por defecto, ámbar/coral al pasar 75% consumido, rojo al vencer.
  const estado: 'ok' | 'warning' | 'vencido' = sla.vencido ? 'vencido' : pct > 75 ? 'warning' : 'ok'
  const barColor =
    estado === 'vencido' ? 'bg-red-500' : estado === 'warning' ? 'bg-coral-500' : 'bg-primary-500'
  const textColor =
    estado === 'vencido' ? 'text-red-600' : estado === 'warning' ? 'text-coral-600' : 'text-primary-700'

  return (
    <div className="min-w-26">
      <span className="inline-flex items-center gap-1.5">
        <span className={`tabular-nums font-semibold ${textColor}`}>
          {Math.round(sla.horas)}h / {sla.target}h
        </span>
        {sla.vencido && <Chip tone="red">SLA</Chip>}
      </span>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
