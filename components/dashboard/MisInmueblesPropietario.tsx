/**
 * "Mis inmuebles" — vista principal del propietario (mockup 14).
 * 5 KPIs + tarjetas de propiedad (con inquilino/contrato/pago/garantía reales y
 * toggle de vitrina) + solicitudes de visita (Aprobar/Rechazar).
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { dashboardService, type MiInmueble, type HistorialInquilino } from '@/services/dashboardService'
import { citaService } from '@/services/citaService'
import { inmuebleService } from '@/services/inmuebleService'
import type { ICita } from '@/types/cita'
import { TIPO_LABELS } from '@/components/inmuebles/constants'
import {
  IconHome,
  IconCheckCircle,
  IconClock,
  IconBuilding2,
  IconDollarSign,
  IconPlus,
  IconLoader,
} from '@/components/icons'
import {
  money,
  moneyCompact,
  fechaCorta,
  Kpi,
  KpiRow,
  Chip,
  Tabla,
  Td,
  SeccionEstado,
  SeccionHeader,
  useSeccion,
  type ChipTone,
} from '@/components/dashboard/secciones/_shared'

const cap = (s: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—')
// Label legible del tipo de inmueble (los tipos nuevos llevan guion bajo:
// 'casa_finca' -> 'Casa finca'). Cae a cap() si el tipo no esta en el map.
const tipoLabel = (t: string | null) => (t && TIPO_LABELS[t as keyof typeof TIPO_LABELS]) || cap(t)

const btnS =
  'inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-ink-50'
const btnP =
  'inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700'
const btnD =
  'inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-t border-ink-50 py-1.5 first:border-t-0">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold text-ink-800">{children}</span>
    </div>
  )
}

function PropCard({ p, onChanged }: { p: MiInmueble; onChanged: () => void }) {
  const [vitrina, setVitrina] = useState(p.visibleVitrina)
  const [saving, setSaving] = useState(false)
  const arrendado = p.garantiaActiva

  const detalles =
    [
      p.habitaciones != null ? `${p.habitaciones} hab` : null,
      p.banos != null ? `${p.banos} baños` : null,
      p.area != null ? `${p.area} m²` : null,
    ]
      .filter(Boolean)
      .join(' · ') || '—'

  const toggleVitrina = async (checked: boolean) => {
    setVitrina(checked)
    setSaving(true)
    try {
      await inmuebleService.toggleVisibleVitrina(p.id, checked)
      toast.success(checked ? 'Publicado en la vitrina Cofianza' : 'Retirado de la vitrina')
      onChanged()
    } catch (e) {
      setVitrina(!checked)
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar la vitrina')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-white transition hover:border-primary-400 hover:shadow-sm">
      {/* Foto de la fachada con los estados superpuestos */}
      <Link href={`/inmuebles/${p.id}`} className="relative block h-32 w-full overflow-hidden bg-ink-100">
        {p.fotoFachadaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.fotoFachadaUrl}
            alt={p.direccion ?? 'Inmueble'}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-300">
            <IconHome size={32} />
          </div>
        )}
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          <Chip tone={arrendado ? 'green' : 'orange'}>{arrendado ? 'Arrendado' : 'Disponible'}</Chip>
          {/* Publicado real = flag + disponible + sin arriendo (mismo guard que
              el toggle de abajo): un arrendado con flag residual NO está en la
              vitrina pública — no mostrar "En vitrina" encima de "Arrendado". */}
          {!arrendado && p.estado === 'disponible' && p.visibleVitrina && (
            <Chip tone="blue">En vitrina</Chip>
          )}
        </div>
      </Link>

      <div className="border-b border-ink-200 px-4 py-3">
        <h3 className="truncate text-sm font-bold text-ink-900">
          {p.codigo ? `${p.codigo} — ` : ''}
          {tipoLabel(p.tipo)}
        </h3>
        <p className="truncate text-[11px] text-ink-500">
          {p.direccion ?? 'Sin dirección'}
          {p.ciudad ? `, ${p.ciudad}` : ''}
        </p>
      </div>

      <div className="px-4 py-3 text-[13px]">
        <Row label="Tipo">{tipoLabel(p.tipo)}</Row>
        <Row label="Canon">{money(p.canon)}</Row>
        <Row label="Detalles">{detalles}</Row>
        {arrendado ? (
          <>
            <Row label="Inquilino">{p.inquilino ?? '—'}</Row>
            <Row label="Vence contrato">{fechaCorta(p.venceContrato)}</Row>
            <Row label="Pago mes">
              {p.pago === 'mora' ? <Chip tone="red">En mora</Chip> : <Chip tone="green">Al día</Chip>}
            </Row>
            <Row label="Garantía Cofianza">
              <Chip tone="green">Activo</Chip>
            </Row>
          </>
        ) : (
          <Row label="Estado">
            <Chip tone="orange">Disponible ahora</Chip>
          </Row>
        )}

        {!arrendado && p.estado === 'disponible' && (
          <>
            <div className="mt-2 flex items-center justify-between border-t border-ink-200 pt-3">
              <span className="text-xs font-medium text-ink-600">Publicar en vitrina Cofianza</span>
              <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={vitrina}
                  disabled={saving}
                  onChange={(e) => toggleVitrina(e.target.checked)}
                  aria-label="Publicar en vitrina Cofianza"
                />
                <span className="h-6 w-11 rounded-full bg-ink-300 transition-colors peer-checked:bg-primary-600" />
                <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </label>
            </div>
            {vitrina && (
              <div className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
                Este inmueble aparece en la vitrina comercial de Cofianza y es visible para prospectos.
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-ink-200 bg-ink-50/60 px-4 py-2.5">
        {p.expedienteId && (
          <Link href={`/expedientes/${p.expedienteId}`} className={btnS}>
            Ver expediente
          </Link>
        )}
        <Link href={`/inmuebles/${p.id}/editar`} className={btnS}>
          Editar
        </Link>
        {!arrendado && (
          <Link href="/estudios" className={btnP}>
            Evaluar candidato
          </Link>
        )}
        {p.pago === 'mora' && (
          <Link href="/moras" className={btnD}>
            Reportar mora
          </Link>
        )}
      </div>
    </div>
  )
}

function SolicitudesVisita() {
  const [citas, setCitas] = useState<ICita[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    citaService
      .listMisCitas({ estado: 'solicitada', limit: 20, page: 1 })
      .then((r) => {
        if (!cancel) setCitas(r.data)
      })
      .catch(() => {
        if (!cancel) setCitas([])
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [version])

  const aprobar = async (c: ICita) => {
    setBusy(c.id)
    try {
      await citaService.confirmarCita(c.id, c.fecha_propuesta ? { fecha_confirmada: c.fecha_propuesta } : {})
      toast.success('Visita aprobada.')
      setVersion((v) => v + 1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo aprobar la visita.')
    } finally {
      setBusy(null)
    }
  }

  const rechazar = async (c: ICita) => {
    setBusy(c.id)
    try {
      await citaService.cancelarCita(c.id, { motivo_cancelacion: 'Rechazada por el propietario' })
      toast.success('Visita rechazada.')
      setVersion((v) => v + 1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo rechazar la visita.')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-ink-200 bg-white p-6 text-center" role="status" aria-live="polite">
        <IconLoader size={20} className="mx-auto animate-spin text-primary-600" />
        <span className="sr-only">Cargando solicitudes…</span>
      </div>
    )
  }

  if (citas.length === 0) {
    return (
      <div className="rounded-xl border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
        No hay solicitudes de visita pendientes.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {citas.map((c) => {
        const sol = c.expediente?.solicitante
        const inm = c.expediente?.inmueble
        const nombre = sol ? `${sol.nombre} ${sol.apellido}`.trim() : 'Sin solicitante'
        return (
          <div
            key={c.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 transition-colors hover:border-primary-400"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink-900">{nombre}</div>
              <div className="text-xs text-ink-500">
                {inm ? inm.direccion : '—'}
                {c.fecha_propuesta ? ` · ${fechaCorta(c.fecha_propuesta)}` : ''}
                {sol?.telefono ? ` · Tel: ${sol.telefono}` : ''}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" disabled={busy === c.id} onClick={() => aprobar(c)} className={`${btnP} disabled:opacity-50`}>
                Aprobar
              </button>
              <button type="button" disabled={busy === c.id} onClick={() => rechazar(c)} className={`${btnS} disabled:opacity-50`}>
                Rechazar
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const ESTADO_HIST: Record<string, { label: string; tone: ChipTone }> = {
  vigente: { label: 'Vigente', tone: 'green' },
  firmado: { label: 'Vigente', tone: 'green' },
  finalizado: { label: 'Finalizó', tone: 'gray' },
  cancelado: { label: 'Cancelado', tone: 'red' },
}

function periodo(h: HistorialInquilino): string {
  const vigente = h.estado === 'vigente' || h.estado === 'firmado'
  return `${fechaCorta(h.desde)} → ${vigente ? 'presente' : fechaCorta(h.hasta)}`
}

function HistorialInquilinos({ inmuebles }: { inmuebles: MiInmueble[] }) {
  const conHistorial = inmuebles.filter((i) => i.historial.length > 0)
  if (conHistorial.length === 0) return null
  return (
    <div className="space-y-4">
      {conHistorial.map((i) => (
        <div key={i.id}>
          <div className="mb-1.5 text-xs font-bold text-ink-700">
            {i.codigo ? `${i.codigo} — ` : ''}
            {tipoLabel(i.tipo)}
          </div>
          <Tabla head={['Inquilino', 'Período', 'Estado']} density="compact">
            {i.historial.map((h, idx) => {
              const e = ESTADO_HIST[h.estado] ?? { label: h.estado, tone: 'gray' as ChipTone }
              return (
                <tr key={idx}>
                  <Td>
                    <span className="font-semibold text-ink-900">{h.inquilino}</span>
                  </Td>
                  <Td>{periodo(h)}</Td>
                  <Td>
                    <Chip tone={e.tone}>{e.label}</Chip>
                  </Td>
                </tr>
              )
            })}
          </Tabla>
        </div>
      ))}
    </div>
  )
}

export function MisInmueblesPropietario() {
  const { data, loading, error, reload } = useSeccion(() => dashboardService.getMisInmuebles())
  const r = data?.resumen
  const inmuebles = data?.inmuebles ?? []

  const agregarBtn = (
    <Link href="/inmuebles/nuevo" className={`${btnP} px-4 py-2 text-sm`}>
      <IconPlus size={16} /> Agregar inmueble
    </Link>
  )

  return (
    <div>
      <SeccionHeader
        title="Mis inmuebles"
        subtitle="Gestiona tus propiedades, agrégalas a la vitrina comercial de Cofianza y administra inquilinos."
      />

      <KpiRow cols={5}>
        <Kpi label="Total" value={r?.total ?? 0} Icon={IconHome} />
        <Kpi label="Arrendados" value={r?.arrendados ?? 0} tone="green" Icon={IconCheckCircle} />
        <Kpi label="Disponibles" value={r?.disponibles ?? 0} tone="orange" Icon={IconClock} />
        <Kpi label="En vitrina" value={r?.enVitrina ?? 0} tone="blue" Icon={IconBuilding2} />
        <Kpi label="Ingreso mes" value={moneyCompact(r?.ingresoMes ?? 0)} tone="green" Icon={IconDollarSign} />
      </KpiRow>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-ink-900">Propiedades</h3>
        {agregarBtn}
      </div>

      <SeccionEstado
        loading={loading}
        error={error}
        onRetry={reload}
        vacio={
          !loading && inmuebles.length === 0
            ? {
                icon: IconHome,
                titulo: 'Aún no tienes inmuebles',
                descripcion: 'Agrega tu primera propiedad para gestionarla con Cofianza.',
                action: agregarBtn,
              }
            : false
        }
      >
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {inmuebles.map((p) => (
            <PropCard key={p.id} p={p} onChanged={reload} />
          ))}
        </div>
      </SeccionEstado>

      <h3 className="mb-3 mt-8 text-base font-bold text-ink-900">Solicitudes de visita</h3>
      <SolicitudesVisita />

      {inmuebles.some((i) => i.historial.length > 0) && (
        <>
          <h3 className="mb-3 mt-8 text-base font-bold text-ink-900">Historial de inquilinos</h3>
          <HistorialInquilinos inmuebles={inmuebles} />
        </>
      )}
    </div>
  )
}
