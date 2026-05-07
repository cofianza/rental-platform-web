/**
 * Dashboard Operativo — HP-359
 * KPIs reales, gráfica de dona, listado de pendientes con acciones rápidas
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader, KPICard, Badge } from '@/components/ui'
import {
  IconFolderOpen, IconCheck, IconClock, IconDollarSign,
  IconChevronRight, IconRefresh, IconLoader, IconCalendar,
} from '@/components/icons'
import { dashboardService } from '@/services/dashboardService'
import { expedienteService } from '@/services/expedienteService'
import { citaService } from '@/services/citaService'
import { pagoEstudioService } from '@/services/pagoEstudioService'
import { usePermissions } from '@/hooks/usePermissions'
import { formatCurrency, formatDate, ESTADOS_EXPEDIENTE } from '@/lib/constants'
import type { DashboardSummary, ExpedientePorEstado, DashboardFilters } from '@/services/dashboardService'
import type { IExpediente } from '@/types/expediente'
import { AccionesPendientesWidget } from '@/components/dashboard/AccionesPendientesWidget'
import { SaldoCreditosCard } from '@/components/dashboard/SaldoCreditosCard'

// ── Date filter presets ─────────────────────────────────────

const DATE_PRESETS = [
  { label: 'Hoy', getValue: () => { const d = new Date(); return { dateFrom: startOfDay(d), dateTo: d.toISOString() } } },
  { label: 'Semana', getValue: () => { const d = new Date(); d.setDate(d.getDate() - 7); return { dateFrom: startOfDay(d), dateTo: new Date().toISOString() } } },
  { label: 'Mes', getValue: () => { const d = new Date(); return { dateFrom: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(), dateTo: d.toISOString() } } },
  { label: 'Trimestre', getValue: () => { const d = new Date(); d.setMonth(d.getMonth() - 3); return { dateFrom: startOfDay(d), dateTo: new Date().toISOString() } } },
] as const

function startOfDay(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
}

// ── Donut chart colors per estado ───────────────────────────

const ESTADO_COLORS: Record<string, string> = {
  borrador: '#9ca3af',
  en_revision: '#f59e0b',
  informacion_incompleta: '#f97316',
  aprobado: '#22c55e',
  rechazado: '#ef4444',
  condicionado: '#a855f7',
  cerrado: '#64748b',
}

const AUTO_REFRESH_MS = 5 * 60 * 1000 // 5 minutes

// ── Page Component ──────────────────────────────────────────

export default function DashboardPage() {
  const { canAccess, hasRole } = usePermissions()
  const canDoActions = hasRole('administrador') || hasRole('operador_analista')
  const isPropietario = hasRole('propietario')
  const isInmobiliaria = hasRole('inmobiliaria')
  const isSolicitante = hasRole('solicitante')
  const isExternalUser = isPropietario || isInmobiliaria || isSolicitante

  // State
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [porEstado, setPorEstado] = useState<ExpedientePorEstado[]>([])
  const [pendientes, setPendientes] = useState<IExpediente[]>([])
  const [loading, setLoading] = useState(true)
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({})
  const [activePreset, setActivePreset] = useState(2) // "Mes" by default
  const [filters, setFilters] = useState<DashboardFilters>(() => DATE_PRESETS[2].getValue())
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Fetch data ──────────────────────────────────────────

  const fetchAll = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const errors: Record<string, string> = {}

    // Fetch all 3 sections in parallel, errors are isolated per section
    const [summaryResult, estadoResult, pendientesResult] = await Promise.allSettled([
      dashboardService.getSummary(filters),
      dashboardService.getExpedientesPorEstado(filters),
      expedienteService.getExpedientes({
        search: '',
        estado: ['borrador', 'en_revision', 'informacion_incompleta'],
        analista_id: '',
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'asc',
      }),
    ])

    if (summaryResult.status === 'fulfilled') {
      setSummary(summaryResult.value)
    } else {
      errors.summary = 'Error al cargar indicadores'
    }

    if (estadoResult.status === 'fulfilled') {
      setPorEstado(estadoResult.value)
    } else {
      errors.chart = 'Error al cargar grafica'
    }

    if (pendientesResult.status === 'fulfilled') {
      setPendientes(pendientesResult.value.data)
    } else {
      errors.pendientes = 'Error al cargar pendientes'
    }

    setSectionErrors(errors)
    setLoading(false)
  }, [filters])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    refreshTimer.current = setInterval(() => {
      fetchAll(false) // silent refresh without loading skeleton
    }, AUTO_REFRESH_MS)
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current)
    }
  }, [fetchAll])

  // ── Filter handlers ─────────────────────────────────────

  const handlePresetClick = (index: number) => {
    setActivePreset(index)
    setFilters(DATE_PRESETS[index].getValue())
  }

  // ── Render ──────────────────────────────────────────────

  // Vista simplificada para solicitante
  if (isSolicitante) {
    return <SolicitanteDashboard />
  }

  // Vista simplificada para propietario/inmobiliaria
  if (isExternalUser) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={isPropietario ? 'Mi Panel' : 'Panel Inmobiliaria'}
          subtitle={isPropietario ? 'Gestiona tus inmuebles y solicitudes' : 'Gestiona inmuebles y expedientes'}
        />

        {/* Widget de acciones pendientes (citas por confirmar, realizar, habilitar estudio) */}
        <AccionesPendientesWidget />

        {/* Creditos de estudios — exclusivo para inmobiliaria */}
        {isInmobiliaria && <SaldoCreditosCard />}

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/inmuebles"
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-primary-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-50 rounded-lg group-hover:bg-primary-100">
                <IconFolderOpen size={24} className="text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Mis Inmuebles</h3>
                <p className="text-sm text-gray-500">Ver y gestionar propiedades</p>
              </div>
            </div>
          </Link>

          <Link
            href="/expedientes"
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-primary-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-lg group-hover:bg-amber-100">
                <IconClock size={24} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Solicitudes</h3>
                <p className="text-sm text-gray-500">Expedientes de arrendamiento</p>
              </div>
            </div>
          </Link>

          <Link
            href="/contratos"
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-primary-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100">
                <IconCheck size={24} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Contratos</h3>
                <p className="text-sm text-gray-500">Contratos activos y firmados</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Info banner */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-start gap-3">
          <IconFolderOpen size={20} className="text-primary-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-primary-800">
              {isPropietario
                ? 'Publica tus inmuebles en la vitrina para recibir solicitudes de arrendatarios automaticamente.'
                : 'Gestiona los inmuebles de tus clientes y recibe solicitudes de arrendatarios desde la vitrina publica.'}
            </p>
            <Link href="/inmuebles" className="text-sm text-primary-600 font-medium hover:underline mt-1 inline-block">
              Ir a Inmuebles →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Vista completa para admin/operador/gerencia
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Indicadores operativos"
      />

      {/* Date filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <IconCalendar size={16} className="text-gray-400" />
        {DATE_PRESETS.map((preset, idx) => (
          <button
            key={preset.label}
            onClick={() => handlePresetClick(idx)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              activePreset === idx
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => fetchAll()}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50"
        >
          <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
              <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-32 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : sectionErrors.summary ? (
        <SectionError message={sectionErrors.summary} onRetry={() => fetchAll()} />
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Expedientes activos"
            value={summary.totalExpedientesActivos}
            icon={IconFolderOpen}
            accentColor="bg-primary-600"
          />
          <KPICard
            title="Tasa de aprobacion"
            value={`${summary.tasaAprobacion}%`}
            icon={IconCheck}
            accentColor="bg-green-600"
          />
          <KPICard
            title="Tiempo promedio"
            value={`${summary.tiempoPromedioResolucionDias} dias`}
            icon={IconClock}
            accentColor="bg-amber-600"
          />
          <KPICard
            title="Ingresos del periodo"
            value={formatCurrency(summary.ingresosDelPeriodo)}
            icon={IconDollarSign}
            accentColor="bg-blue-600"
          />
        </div>
      ) : null}

      {/* Main content: Chart + Pendientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart — 1 col */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expedientes por estado</h2>
          {loading ? (
            <div className="flex items-center justify-center h-64 animate-pulse">
              <div className="w-48 h-48 bg-gray-200 rounded-full" />
            </div>
          ) : sectionErrors.chart ? (
            <SectionError message={sectionErrors.chart} onRetry={() => fetchAll()} />
          ) : (
            <DonutChart data={porEstado} />
          )}
        </div>

        {/* Pendientes — 2 col */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pendientes prioritarios</h2>
            <Link
              href="/expedientes"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Ver todos
            </Link>
          </div>
          {loading ? (
            <div className="divide-y divide-gray-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-6 py-4 animate-pulse">
                  <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-48 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : sectionErrors.pendientes ? (
            <div className="p-6">
              <SectionError message={sectionErrors.pendientes} onRetry={() => fetchAll()} />
            </div>
          ) : pendientes.length === 0 ? (
            <div className="text-center py-12">
              <IconCheck size={40} className="mx-auto text-green-300 mb-3" />
              <p className="text-sm text-gray-500">No hay expedientes pendientes</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendientes.map((exp) => (
                <Link
                  key={exp.id}
                  href={`/expedientes/${exp.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900">
                        {exp.numero_expediente || 'Sin numero'}
                      </span>
                      <Badge estado={exp.estado} />
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {exp.solicitante
                        ? exp.solicitante.nombre
                        : 'Sin solicitante'}
                      {exp.inmueble?.direccion ? ` · ${exp.inmueble.direccion}` : ''}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatDate(exp.created_at)}
                      {exp.analista ? ` · ${exp.analista.nombre} ${exp.analista.apellido}` : ''}
                    </p>
                  </div>
                  <IconChevronRight size={16} className="text-gray-400 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Solicitante Dashboard ────────────────────────────────────

const PROCESS_STEPS = [
  { id: 'expediente', label: 'Solicitud', description: 'Tu expediente esta registrado' },
  { id: 'cita', label: 'Cita previa', description: 'Agenda una visita al inmueble' },
  { id: 'estudio', label: 'Estudio', description: 'Evaluacion de riesgo en proceso' },
  { id: 'aprobado', label: 'Aprobacion', description: 'Resultado del estudio' },
  { id: 'contrato', label: 'Contrato', description: 'Generacion y revision del contrato' },
  { id: 'firma', label: 'Firma', description: 'Firma electronica del contrato' },
  { id: 'vigente', label: 'Listo', description: 'Contrato vigente' },
]

function getProcessStep(expedienteEstado: string, citaRealizada: boolean): number {
  // Si todavia no hay cita realizada, el solicitante esta en el paso de "Cita previa"
  // (excepto si el expediente ya esta en un estado terminal o avanzado)
  if (!citaRealizada && (expedienteEstado === 'borrador' || expedienteEstado === 'en_revision' || expedienteEstado === 'informacion_incompleta')) {
    return 1 // Cita previa
  }

  // Una vez la cita esta realizada, seguimos el flujo normal
  switch (expedienteEstado) {
    case 'borrador': return 2 // cita realizada, tocaria estudio
    case 'en_revision': return 2 // estudio en proceso
    case 'informacion_incompleta': return 2
    case 'aprobado': return 4
    case 'condicionado': return 3
    case 'rechazado': return 3
    case 'cerrado': return 6
    default: return 0
  }
}

/** Info de la cita "activa" de un expediente para el dashboard del solicitante. */
type CitaActivaEstado = 'solicitada' | 'confirmada' | 'realizada'
interface CitaActivaInfo {
  estado: CitaActivaEstado
  fecha: string | null // fecha_confirmada || fecha_propuesta, ISO
  estudioHabilitado: boolean // para banner "esperando que el propietario habilite el estudio"
}

/** Elige la cita más relevante para mostrar: prioriza realizada > confirmada > solicitada. */
function resolverCitaActiva(
  citas: Array<{
    estado: string
    fecha_propuesta: string | null
    fecha_confirmada: string | null
    expediente?: { estudio_habilitado: boolean } | null
  }>,
): CitaActivaInfo | null {
  const activas = citas.filter((c) => c.estado === 'realizada' || c.estado === 'confirmada' || c.estado === 'solicitada')
  if (activas.length === 0) return null
  const prioridad: Record<string, number> = { realizada: 3, confirmada: 2, solicitada: 1 }
  activas.sort((a, b) => prioridad[b.estado] - prioridad[a.estado])
  const pick = activas[0]
  return {
    estado: pick.estado as CitaActivaEstado,
    fecha: pick.fecha_confirmada || pick.fecha_propuesta,
    estudioHabilitado: pick.expediente?.estudio_habilitado ?? false,
  }
}

/** "23 abr 2026, 3:00 p. m." en zona Bogotá (independiente del browser). */
function formatCitaFecha(iso: string | null): string {
  if (!iso) return 'Fecha por confirmar'
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Info del pago del estudio por expediente (cuando ya aplica). */
interface PagoEstudioInfo {
  estado: string // 'sin_definir' | 'pendiente' | 'procesando' | 'completado' | 'fallido' | 'cancelado' | 'asumido_inmobiliaria'
  linkPago: string | null // payment_link_url de Stripe si existe
}

function SolicitanteDashboard() {
  const [expedientes, setExpedientes] = useState<IExpediente[]>([])
  const [citasByExpediente, setCitasByExpediente] = useState<Record<string, CitaActivaInfo | null>>({})
  const [pagoByExpediente, setPagoByExpediente] = useState<Record<string, PagoEstudioInfo | null>>({})
  const [loadingExp, setLoadingExp] = useState(true)

  useEffect(() => {
    expedienteService.getExpedientes({ page: 1, limit: 5, sortBy: 'created_at', sortOrder: 'desc' })
      .then(async (res) => {
        setExpedientes(res.data)
        const citasMap: Record<string, CitaActivaInfo | null> = {}
        await Promise.all(
          res.data.map(async (exp) => {
            try {
              const citas = await citaService.getCitasByExpediente(exp.id)
              citasMap[exp.id] = resolverCitaActiva(citas)
            } catch {
              citasMap[exp.id] = null
            }
          })
        )
        setCitasByExpediente(citasMap)

        // Para expedientes con cita realizada + estudio habilitado, consultar
        // estado del pago — así podemos mostrar CTA "Pagar ahora" si aplica.
        const pagoMap: Record<string, PagoEstudioInfo | null> = {}
        await Promise.all(
          res.data.map(async (exp) => {
            const cita = citasMap[exp.id]
            if (!cita || cita.estado !== 'realizada' || !cita.estudioHabilitado) {
              pagoMap[exp.id] = null
              return
            }
            try {
              const estado = await pagoEstudioService.getEstado(exp.id)
              pagoMap[exp.id] = {
                estado: estado.estado,
                linkPago: estado.pago?.payment_link_url || null,
              }
            } catch {
              pagoMap[exp.id] = null
            }
          }),
        )
        setPagoByExpediente(pagoMap)
      })
      .catch(() => {})
      .finally(() => setLoadingExp(false))
  }, [])

  // Clasificar expedientes según el estado de su cita activa, para apilar banners.
  const estadoActivo = (exp: IExpediente) =>
    exp.estado === 'borrador' || exp.estado === 'en_revision' || exp.estado === 'informacion_incompleta'

  const expedientesSinCita = expedientes.filter((exp) => estadoActivo(exp) && !citasByExpediente[exp.id])
  const expedientesCitaSolicitada = expedientes.filter(
    (exp) => estadoActivo(exp) && citasByExpediente[exp.id]?.estado === 'solicitada',
  )
  const expedientesCitaConfirmada = expedientes.filter(
    (exp) => estadoActivo(exp) && citasByExpediente[exp.id]?.estado === 'confirmada',
  )
  // Cita realizada pero el propietario aún no habilita el estudio: el solicitante
  // depende de una acción externa — mostramos banner ámbar sutil.
  const expedientesEsperandoHabilitacion = expedientes.filter(
    (exp) =>
      estadoActivo(exp) &&
      citasByExpediente[exp.id]?.estado === 'realizada' &&
      citasByExpediente[exp.id]?.estudioHabilitado === false,
  )
  // Estudio habilitado + pago pendiente: acción activa del solicitante.
  const expedientesPagoPendiente = expedientes.filter(
    (exp) =>
      estadoActivo(exp) &&
      citasByExpediente[exp.id]?.estado === 'realizada' &&
      citasByExpediente[exp.id]?.estudioHabilitado === true &&
      (pagoByExpediente[exp.id]?.estado === 'pendiente' ||
        pagoByExpediente[exp.id]?.estado === 'fallido'),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi Panel de Arrendatario"
        subtitle="Consulta el estado de tus solicitudes de arrendamiento"
      />

      {/* Banners apilados: uno por expediente + estado de cita.
          Naranja/gradient: sin cita → CTA "Agendar cita".
          Azul: cita solicitada → esperando confirmación del propietario.
          Verde: cita confirmada → fecha lista para la visita.
          Ámbar: cita realizada pero el propietario aún no habilita el estudio.
          Primario/gradient: estudio habilitado + pago pendiente → CTA "Pagar estudio".
          Si el pago está completado o asumido, no mostramos banner; el stepper de la card toma el relevo. */}
      {!loadingExp && (expedientesSinCita.length + expedientesCitaSolicitada.length + expedientesCitaConfirmada.length + expedientesEsperandoHabilitacion.length + expedientesPagoPendiente.length) > 0 && (
        <div className="space-y-3">
          {/* Sin cita */}
          {expedientesSinCita.map((exp) => (
            <div key={`sin-${exp.id}`} className="relative overflow-hidden bg-gradient-to-r from-primary-600 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-cyan-300/20 rounded-full blur-3xl pointer-events-none" />
              <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0">
                  <IconCalendar size={28} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold mb-1">Tienes una visita pendiente por agendar</h3>
                  <p className="text-sm text-white/90">
                    Antes de continuar con tu estudio crediticio, agenda una visita al inmueble. El propietario debera confirmar la fecha.
                  </p>
                </div>
                <Link
                  href={`/expedientes/${exp.id}`}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-primary-700 bg-white rounded-lg hover:bg-primary-50 shadow-md transition-all shrink-0"
                >
                  <IconCalendar size={16} />
                  Ver detalles de la cita
                </Link>
              </div>
            </div>
          ))}

          {/* Cita solicitada — azul */}
          {expedientesCitaSolicitada.map((exp) => {
            const cita = citasByExpediente[exp.id]!
            return (
              <div key={`sol-${exp.id}`} className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                    <IconClock size={22} className="text-blue-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-blue-900 mb-0.5">
                      Solicitud de visita enviada
                    </h3>
                    <p className="text-sm text-blue-800">
                      El propietario revisará tu fecha propuesta. Te notificaremos cuando la confirme.
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Fecha propuesta: <strong>{formatCitaFecha(cita.fecha)}</strong>
                    </p>
                  </div>
                  <Link
                    href={`/expedientes/${exp.id}`}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-800 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 shadow-sm transition-colors shrink-0"
                  >
                    Ver detalles de la cita
                  </Link>
                </div>
              </div>
            )
          })}

          {/* Estudio habilitado, pago pendiente → CTA "Pagar ahora" (gradient primario) */}
          {expedientesPagoPendiente.map((exp) => {
            const pago = pagoByExpediente[exp.id]
            const esFallido = pago?.estado === 'fallido'
            return (
              <div key={`pago-${exp.id}`} className="relative overflow-hidden bg-gradient-to-r from-primary-600 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-cyan-300/20 rounded-full blur-3xl pointer-events-none" />
                <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0">
                    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold mb-1">
                      {esFallido ? 'No pudimos procesar tu pago' : 'Paga tu estudio crediticio'}
                    </h3>
                    <p className="text-sm text-white/90">
                      {esFallido
                        ? 'Hubo un problema con el pago anterior. Intenta de nuevo para continuar con tu estudio.'
                        : 'Tu estudio ya está habilitado. Realiza el pago para que podamos ejecutarlo y avancemos a la aprobación.'}
                    </p>
                  </div>
                  {pago?.linkPago ? (
                    <a
                      href={pago.linkPago}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-primary-700 bg-white rounded-lg hover:bg-primary-50 shadow-md transition-all shrink-0"
                    >
                      {esFallido ? 'Reintentar pago' : 'Pagar ahora'}
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </a>
                  ) : (
                    <Link
                      href={`/expedientes/${exp.id}`}
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-primary-700 bg-white rounded-lg hover:bg-primary-50 shadow-md transition-all shrink-0"
                    >
                      Ver detalles del pago
                    </Link>
                  )}
                </div>
              </div>
            )
          })}

          {/* Cita realizada, estudio pendiente de habilitar — ámbar sutil */}
          {expedientesEsperandoHabilitacion.map((exp) => (
            <div key={`esp-${exp.id}`} className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                  <IconClock size={22} className="text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-amber-900 mb-0.5">
                    Esperando que el propietario habilite tu estudio
                  </h3>
                  <p className="text-sm text-amber-800">
                    Tu visita ya se realizó. En cuanto el propietario autorice el siguiente paso, podrás pagar el estudio crediticio y continuar con tu solicitud.
                  </p>
                </div>
                <Link
                  href={`/expedientes/${exp.id}`}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-amber-800 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 shadow-sm transition-colors shrink-0"
                >
                  Ver mi solicitud
                </Link>
              </div>
            </div>
          ))}

          {/* Cita confirmada — verde */}
          {expedientesCitaConfirmada.map((exp) => {
            const cita = citasByExpediente[exp.id]!
            return (
              <div key={`conf-${exp.id}`} className="bg-green-50 border border-green-200 rounded-xl p-5 shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 border border-green-200 flex items-center justify-center shrink-0">
                    <IconCheck size={22} className="text-green-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-green-900 mb-0.5">
                      ¡Cita confirmada!
                    </h3>
                    <p className="text-sm text-green-800">
                      Te esperamos el <strong>{formatCitaFecha(cita.fecha)}</strong>.
                    </p>
                  </div>
                  <Link
                    href={`/expedientes/${exp.id}`}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-800 bg-white border border-green-300 rounded-lg hover:bg-green-50 shadow-sm transition-colors shrink-0"
                  >
                    Ver detalles de la cita
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Active processes */}
      {loadingExp ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 animate-pulse">
          <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
          <div className="h-4 w-full bg-gray-200 rounded mb-2" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
        </div>
      ) : expedientes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <IconFolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin solicitudes activas</h3>
          <p className="text-sm text-gray-500 mb-4">Aun no tienes solicitudes de arrendamiento. Explora la vitrina para encontrar tu proximo hogar.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors">
            Explorar inmuebles
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {expedientes.map((exp) => {
            const citaRealizada = citasByExpediente[exp.id]?.estado === 'realizada'
            const currentStep = getProcessStep(exp.estado, citaRealizada)
            const isRejected = exp.estado === 'rechazado'
            const isConditioned = exp.estado === 'condicionado'

            return (
              <Link
                key={exp.id}
                href={`/expedientes/${exp.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-primary-300 hover:shadow-sm transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{exp.numero_expediente || 'Expediente'}</span>
                      <Badge estado={exp.estado} />
                    </div>
                    <p className="text-sm text-gray-500">
                      {exp.inmueble?.direccion || exp.inmueble?.titulo || 'Inmueble'}
                      {exp.inmueble?.ciudad ? `, ${exp.inmueble.ciudad}` : ''}
                    </p>
                  </div>
                  <IconChevronRight size={20} className="text-gray-400 mt-1" />
                </div>

                {/* Stepper */}
                {isRejected ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700 font-medium">Estudio no aprobado</p>
                    <p className="text-xs text-red-600 mt-0.5">El expediente fue rechazado tras el estudio crediticio.</p>
                  </div>
                ) : isConditioned ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-700 font-medium">Estudio condicionado</p>
                    <p className="text-xs text-amber-600 mt-0.5">Invita a un co-arrendatario para que los respaldemos juntos.</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    {PROCESS_STEPS.map((step, idx) => {
                      const isComplete = idx < currentStep
                      const isCurrent = idx === currentStep
                      return (
                        <div key={step.id} className="flex items-center flex-1">
                          <div className="flex flex-col items-center flex-1">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                isComplete
                                  ? 'bg-primary-600 text-white'
                                  : isCurrent
                                    ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600'
                                    : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {isComplete ? (
                                <IconCheck size={14} />
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <span className={`text-[9px] mt-1 text-center leading-tight ${isCurrent ? 'text-primary-700 font-semibold' : 'text-gray-400'}`}>
                              {step.label}
                            </span>
                          </div>
                          {idx < PROCESS_STEPS.length - 1 && (
                            <div className={`h-0.5 w-full mx-0.5 mt-[-12px] ${isComplete ? 'bg-primary-600' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/expedientes" className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 transition-colors">
          <IconClock size={20} className="text-primary-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Mis solicitudes</p>
            <p className="text-xs text-gray-500">Ver todas mis solicitudes</p>
          </div>
        </Link>
        <Link href="/" className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 transition-colors">
          <IconFolderOpen size={20} className="text-primary-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Explorar vitrina</p>
            <p className="text-xs text-gray-500">Buscar mas inmuebles</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

// ── Section Error ───────────────────────────────────────────

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-red-600 mb-2">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
      >
        <IconRefresh size={14} />
        Reintentar
      </button>
    </div>
  )
}

// ── Donut Chart (SVG) ───────────────────────────────────────

function DonutChart({ data }: { data: ExpedientePorEstado[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-gray-400">Sin datos para el periodo</p>
      </div>
    )
  }

  const total = data.reduce((sum, d) => sum + d.count, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-gray-400">Sin expedientes en el periodo</p>
      </div>
    )
  }

  const cx = 100
  const cy = 100
  const radius = 70
  const innerRadius = 45
  let cumulativeAngle = -90 // start at top

  const segments = data
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((d) => {
      const angle = (d.count / total) * 360
      const startAngle = cumulativeAngle
      cumulativeAngle += angle
      return { ...d, startAngle, angle }
    })

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 200 200" className="w-48 h-48" role="img" aria-label="Distribucion de expedientes por estado">
        {segments.map((seg) => {
          const color = ESTADO_COLORS[seg.estado] || '#9ca3af'
          return (
            <DonutSegment
              key={seg.estado}
              cx={cx}
              cy={cy}
              radius={radius}
              innerRadius={innerRadius}
              startAngle={seg.startAngle}
              angle={seg.angle}
              color={color}
            />
          )
        })}
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-gray-900 text-2xl font-bold" fontSize="24">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-gray-500" fontSize="10">
          expedientes
        </text>
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full">
        {segments.map((seg) => {
          const estadoConfig = ESTADOS_EXPEDIENTE[seg.estado as keyof typeof ESTADOS_EXPEDIENTE]
          return (
            <div key={seg.estado} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: ESTADO_COLORS[seg.estado] || '#9ca3af' }}
              />
              <span className="text-xs text-gray-600 truncate">
                {estadoConfig?.label || seg.estado}
              </span>
              <span className="text-xs font-semibold text-gray-900 ml-auto">{seg.count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── SVG Donut Segment ───────────────────────────────────────

function DonutSegment({
  cx, cy, radius, innerRadius, startAngle, angle, color,
}: {
  cx: number; cy: number; radius: number; innerRadius: number
  startAngle: number; angle: number; color: string
}) {
  if (angle >= 360) {
    // Full circle
    return (
      <>
        <circle cx={cx} cy={cy} r={radius} fill={color} />
        <circle cx={cx} cy={cy} r={innerRadius} fill="white" />
      </>
    )
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const x1 = cx + radius * Math.cos(toRad(startAngle))
  const y1 = cy + radius * Math.sin(toRad(startAngle))
  const x2 = cx + radius * Math.cos(toRad(startAngle + angle))
  const y2 = cy + radius * Math.sin(toRad(startAngle + angle))
  const ix1 = cx + innerRadius * Math.cos(toRad(startAngle + angle))
  const iy1 = cy + innerRadius * Math.sin(toRad(startAngle + angle))
  const ix2 = cx + innerRadius * Math.cos(toRad(startAngle))
  const iy2 = cy + innerRadius * Math.sin(toRad(startAngle))
  const largeArc = angle > 180 ? 1 : 0

  const d = [
    `M ${x1} ${y1}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${ix1} ${iy1}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2}`,
    'Z',
  ].join(' ')

  return <path d={d} fill={color} />
}
