/**
 * /disponibilidad — configuración de horarios del propietario/inmobiliaria.
 * Roles permitidos: propietario | inmobiliaria | administrador.
 *
 * TODO(UX): los días desactivados pierden sus horas configuradas porque el
 * backend los borra (DELETE atómico del PUT). Si el propietario reactiva un
 * día, aparece con defaults 09:00-17:00 en vez de sus últimas horas. Si esto
 * genera fricción en uso real, migrar a enviar los 7 días con flag `activo`
 * y filtrar solo por `activo=true` en el RPC.
 *
 * NOTA (P2 múltiples rangos por día): el modelo actual solo admite UN rango
 * por día — la tabla `disponibilidad_propietario` tiene UNIQUE(propietario_id,
 * dia_semana) y el RPC fn_slots_disponibles asume una fila por día. Soportar
 * dos rangos requiere migración (quitar el unique) + reescribir el RPC; queda
 * como cambio aparte.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui'
import { IconLoader, IconPlus, IconTrash, IconAlertTriangle } from '@/components/icons'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/stores/auth.store'
import {
  disponibilidadService,
  type IHorarioDia,
  type IFechaBloqueada,
} from '@/services/disponibilidadService'

const ALLOWED_ROLES = ['propietario', 'inmobiliaria', 'administrador'] as const

// dia_semana sigue la convención de Postgres (0=Dom … 6=Sáb). El estado guarda
// los 7 días en este orden; solo el RENDER se reordena a Lun→Dom (P2c).
const DIAS_LABELS: { value: number; label: string }[] = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
]

// Orden de presentación Lunes → Domingo (convención en español).
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0]

function nombreDia(value: number): string {
  return DIAS_LABELS.find((d) => d.value === value)?.label ?? ''
}

const DURACIONES: { value: 30 | 60 | 120; label: string }[] = [
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 120, label: '2 horas' },
]

// Anticipación mínima con la que un arrendatario puede agendar (horas).
// 0 = puede agendar el mismo día. Se persiste en antelacion_minima_horas.
const ANTELACIONES: { value: number; label: string }[] = [
  { value: 0, label: 'Mismo día' },
  { value: 2, label: '2 horas antes' },
  { value: 24, label: '1 día (24 h)' },
  { value: 48, label: '2 días (48 h)' },
]

function antelacionLabel(horas: number): string {
  if (horas <= 0) return 'el mismo día (sin anticipación)'
  if (horas < 24) return `${horas} horas antes`
  const dias = Math.round(horas / 24)
  return dias === 1 ? '1 día antes' : `${dias} días antes`
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' sin pasar por Date (evita corrimiento de zona). */
function fechaCO(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Fecha de hoy en hora Colombia (UTC-5) como 'YYYY-MM-DD'. */
function hoyBogotaISO(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function makeDefaultHorarios(): IHorarioDia[] {
  return DIAS_LABELS.map(({ value }) => ({
    dia_semana: value,
    hora_inicio: '09:00',
    hora_fin: '17:00',
    // L-V (1..5) activos por default, Dom (0) y Sáb (6) inactivos.
    activo: value >= 1 && value <= 5,
  }))
}

/** Completa el array del backend con todos los 7 días (inactivos faltantes).
 *  El backend devuelve las horas como "HH:MM:SS" (TIME de Postgres); las
 *  normalizamos a "HH:MM" para el <input type="time"> y para reenviar. */
function completarDias(fromBackend: IHorarioDia[]): IHorarioDia[] {
  return DIAS_LABELS.map(({ value }) => {
    const existing = fromBackend.find((h) => h.dia_semana === value)
    return existing
      ? {
          ...existing,
          hora_inicio: existing.hora_inicio.slice(0, 5),
          hora_fin: existing.hora_fin.slice(0, 5),
        }
      : { dia_semana: value, hora_inicio: '09:00', hora_fin: '17:00', activo: false }
  })
}

function minutosEntre(inicio: string, fin: string): number {
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fin.split(':').map(Number)
  return hf * 60 + mf - (hi * 60 + mi)
}

/** Valida los días activos. Devuelve un mapa dia_semana → mensaje de error
 *  (solo días con problema), para pintar la fila en rojo en tiempo real. */
function validarHorarios(horarios: IHorarioDia[], duracion: number): Map<number, string> {
  const errores = new Map<number, string>()
  for (const h of horarios.filter((x) => x.activo)) {
    // Hora vacía (el usuario borró el <input type="time">): comparar cadenas
    // vacías da falsos negativos, así que se marca explícitamente.
    if (!h.hora_inicio || !h.hora_fin) {
      errores.set(h.dia_semana, 'Completa las horas de inicio y fin.')
      continue
    }
    if (h.hora_fin <= h.hora_inicio) {
      errores.set(h.dia_semana, 'La hora de fin debe ser posterior a la de inicio.')
      continue
    }
    if (minutosEntre(h.hora_inicio, h.hora_fin) < duracion) {
      errores.set(
        h.dia_semana,
        `La ventana es menor a ${duracion} min: no cabrá ningún horario de visita.`,
      )
    }
  }
  return errores
}

export default function DisponibilidadPage() {
  const router = useRouter()
  const { hasRole } = usePermissions()
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [horarios, setHorarios] = useState<IHorarioDia[]>(makeDefaultHorarios())
  const [duracion, setDuracion] = useState<30 | 60 | 120>(60)
  const [antelacion, setAntelacion] = useState<number>(24)
  const [maxCitas, setMaxCitas] = useState<number>(0)
  const [bloqueadas, setBloqueadas] = useState<IFechaBloqueada[]>([])
  const [nuevaFecha, setNuevaFecha] = useState<string>('')
  const [nuevoMotivo, setNuevoMotivo] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [initial, setInitial] = useState<string>('')
  const [loadError, setLoadError] = useState(false)

  // Guard de rol: misma pauta que /citas del Prompt 7.
  useEffect(() => {
    if (!isInitialized) return
    if (!isAuthenticated) return
    if (!hasRole([...ALLOWED_ROLES])) {
      router.replace('/dashboard/403')
    }
  }, [isInitialized, isAuthenticated, hasRole, router])

  // Carga inicial. `initial` se alinea con el estado visible al usuario
  // para que el botón "Guardar" NO quede dirty en el primer render.
  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return

    let cancelled = false
    setIsLoading(true)
    disponibilidadService
      .getMiDisponibilidad()
      .then((data) => {
        if (cancelled) return
        const horariosUI =
          data.horarios && data.horarios.length > 0
            ? completarDias(data.horarios)
            : makeDefaultHorarios()
        const duracionUI = (data.configuracion?.slot_duracion_minutos ?? 60) as 30 | 60 | 120
        const antelacionUI = data.configuracion?.antelacion_minima_horas ?? 24
        const maxCitasUI = data.configuracion?.max_citas_por_dia ?? 0
        const bloqueadasUI = (data.fechas_bloqueadas ?? []).map((b) => ({
          fecha: b.fecha,
          motivo: b.motivo ?? null,
        }))

        setHorarios(horariosUI)
        setDuracion(duracionUI)
        setAntelacion(antelacionUI)
        setMaxCitas(maxCitasUI)
        setBloqueadas(bloqueadasUI)
        setInitial(
          JSON.stringify({
            horarios: horariosUI,
            duracion: duracionUI,
            antelacion: antelacionUI,
            maxCitas: maxCitasUI,
            bloqueadas: bloqueadasUI,
          }),
        )
      })
      .catch(() => {
        if (cancelled) return
        toast.error('No se pudieron cargar tus horarios.')
        // Sembrar `initial` con el estado por defecto que se está mostrando:
        // sin esto `initial` queda '' y isDirty sería siempre true, mostrando la
        // barra de "cambios sin guardar" con Guardar habilitado — y guardar
        // sobrescribiría (DELETE+INSERT) la config real que NO pudimos leer.
        setLoadError(true)
        setInitial(
          JSON.stringify({
            horarios: makeDefaultHorarios(),
            duracion: 60,
            antelacion: 24,
            maxCitas: 0,
            bloqueadas: [],
          }),
        )
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isInitialized, isAuthenticated])

  const isDirty = useMemo(
    () => JSON.stringify({ horarios, duracion, antelacion, maxCitas, bloqueadas }) !== initial,
    [horarios, duracion, antelacion, maxCitas, bloqueadas, initial],
  )

  // P1a — validación en tiempo real: se recalcula en cada cambio de hora/duración.
  const erroresPorDia = useMemo(() => validarHorarios(horarios, duracion), [horarios, duracion])
  const hayErrores = erroresPorDia.size > 0

  // Avisar si intentan cerrar/recargar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Revertir todos los cambios al último estado guardado.
  function discardChanges() {
    if (!initial) return
    try {
      const s = JSON.parse(initial) as {
        horarios: IHorarioDia[]
        duracion: 30 | 60 | 120
        antelacion: number
        maxCitas: number
        bloqueadas: IFechaBloqueada[]
      }
      setHorarios(s.horarios)
      setDuracion(s.duracion)
      setAntelacion(s.antelacion)
      setMaxCitas(s.maxCitas)
      setBloqueadas(s.bloqueadas)
    } catch {
      /* initial siempre es JSON válido; el catch es defensivo */
    }
  }

  function updateDia(dia: number, patch: Partial<IHorarioDia>) {
    setHorarios((prev) => prev.map((h) => (h.dia_semana === dia ? { ...h, ...patch } : h)))
  }

  // P1b — acciones rápidas. Toman el horario del PRIMER día activo (o Lunes si
  // ninguno está activo) como plantilla y lo replican.
  function horarioPlantilla(): { hora_inicio: string; hora_fin: string } {
    const primerActivo = ORDEN_SEMANA.map((v) => horarios.find((h) => h.dia_semana === v)).find(
      (h) => h?.activo,
    )
    const base = primerActivo ?? horarios.find((h) => h.dia_semana === 1)
    return { hora_inicio: base?.hora_inicio ?? '09:00', hora_fin: base?.hora_fin ?? '17:00' }
  }

  function copiarATodos() {
    const { hora_inicio, hora_fin } = horarioPlantilla()
    setHorarios((prev) => prev.map((h) => ({ ...h, hora_inicio, hora_fin, activo: true })))
    toast.success('Horario aplicado a los 7 días.')
  }

  function aplicarLaborables() {
    const { hora_inicio, hora_fin } = horarioPlantilla()
    setHorarios((prev) =>
      prev.map((h) =>
        h.dia_semana >= 1 && h.dia_semana <= 5
          ? { ...h, hora_inicio, hora_fin, activo: true }
          : h,
      ),
    )
    toast.success('Horario aplicado a Lunes–Viernes.')
  }

  // P2b — "Sin límite" como toggle explícito (0 internamente = sin tope).
  const sinLimite = maxCitas === 0
  function toggleSinLimite(activar: boolean) {
    setMaxCitas(activar ? 0 : 1)
  }

  function agregarFechaBloqueada() {
    if (!nuevaFecha) return
    if (nuevaFecha < hoyBogotaISO()) {
      toast.error('No puedes bloquear una fecha pasada.')
      return
    }
    if (bloqueadas.some((b) => b.fecha === nuevaFecha)) {
      toast.error('Esa fecha ya está bloqueada.')
      return
    }
    const motivo = nuevoMotivo.trim() || null
    setBloqueadas((prev) =>
      [...prev, { fecha: nuevaFecha, motivo }].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    )
    setNuevaFecha('')
    setNuevoMotivo('')
  }

  function quitarFechaBloqueada(fecha: string) {
    setBloqueadas((prev) => prev.filter((b) => b.fecha !== fecha))
  }

  async function handleSave() {
    // Defensa: los botones ya se deshabilitan con hayErrores, pero validamos igual.
    if (hayErrores) return

    setIsSaving(true)
    try {
      const horariosActivos = horarios.filter((h) => h.activo)
      await disponibilidadService.updateMiDisponibilidad({
        slot_duracion_minutos: duracion,
        antelacion_minima_horas: antelacion,
        max_citas_por_dia: maxCitas,
        horarios: horariosActivos,
        fechas_bloqueadas: bloqueadas,
      })
      toast.success('Horarios actualizados.')
      setInitial(JSON.stringify({ horarios, duracion, antelacion, maxCitas, bloqueadas }))
    } catch (err: unknown) {
      const errObj = err as { message?: string; details?: unknown }
      let msg = errObj.message || 'No se pudieron guardar los cambios.'
      // Si el backend devolvió errores de validación por campo, mostrar el primero
      // (p.ej. "antelacion_minima_horas: ...") para saber exactamente qué falla.
      if (Array.isArray(errObj.details) && errObj.details.length > 0) {
        const d = errObj.details[0] as { field?: string; message?: string }
        if (d?.field) msg = `${d.field}: ${d.message ?? msg}`
      }
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isInitialized || isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Disponibilidad"
          subtitle="Configura cuándo puedes recibir visitas de arrendatarios interesados"
        />
        <div className="max-w-3xl space-y-3">
          <div className="h-20 bg-gray-100 rounded animate-pulse" />
          <div className="h-96 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  const timeInputBase =
    'px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className={'space-y-6' + (isDirty ? ' pb-28' : '')}>
      <PageHeader
        title="Disponibilidad"
        subtitle="Configura cuándo puedes recibir visitas de arrendatarios interesados"
      />

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-3xl">
        {/* Aviso si la carga falló: mostramos valores por defecto, no la config
            real. Evita que el usuario crea que estos son sus horarios guardados
            (y solo guardaría si edita algo a propósito). */}
        {loadError && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              No pudimos cargar tu configuración guardada; se muestran los valores por defecto.
              Recarga la página para reintentar antes de guardar.
            </p>
          </div>
        )}

        {/* Selector de duración */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duración de cada visita
          </label>
          <div className="flex flex-wrap gap-2">
            {DURACIONES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setDuracion(value)}
                aria-pressed={duracion === value}
                className={
                  'px-4 py-2 rounded-lg border text-sm font-medium transition ' +
                  (duracion === value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')
                }
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Duración de cada slot que verán los arrendatarios al agendar.
          </p>
        </div>

        {/* Selector de anticipación mínima */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Anticipación mínima para agendar
          </label>
          <div className="flex flex-wrap gap-2">
            {ANTELACIONES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setAntelacion(value)}
                aria-pressed={antelacion === value}
                className={
                  'px-4 py-2 rounded-lg border text-sm font-medium transition ' +
                  (antelacion === value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')
                }
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Con cuánta antelación debe agendar el arrendatario. Elige{' '}
            <strong>Mismo día</strong> para permitir visitas el mismo día.
          </p>
        </div>

        {/* Tope de visitas por día (P2b — toggle "Sin límite") */}
        <div className="mb-6">
          <label htmlFor="max-citas" className="block text-sm font-medium text-gray-700 mb-2">
            Tope de visitas por día
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="max-citas"
              type="number"
              min={1}
              max={50}
              value={sinLimite ? '' : maxCitas}
              disabled={sinLimite}
              onChange={(e) =>
                setMaxCitas(Math.max(1, Math.min(50, Math.floor(Number(e.target.value) || 1))))
              }
              placeholder={sinLimite ? 'Sin límite' : ''}
              className="w-24 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-400"
            />
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                checked={sinLimite}
                onChange={(e) => toggleSinLimite(e.target.checked)}
                className="w-4 h-4 accent-primary-600"
              />
              Sin límite
            </label>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Máximo de visitas que aceptas en un mismo día (sumando todas tus propiedades). Activa{' '}
            <strong>Sin límite</strong> para no poner tope.
          </p>
        </div>

        {/* Horarios por día */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Horarios por día de la semana
            </label>
            {/* P1b — acciones rápidas */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copiarATodos}
                className="px-2.5 py-1 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Copiar a todos los días
              </button>
              <button
                type="button"
                onClick={aplicarLaborables}
                className="px-2.5 py-1 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Aplicar a Lun–Vie
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-600 mb-2">
            Las acciones rápidas usan el horario del primer día activo (o Lunes) como plantilla.
          </p>

          {ORDEN_SEMANA.map((value) => {
            const horario = horarios.find((h) => h.dia_semana === value)
            if (!horario) return null
            const label = nombreDia(value)
            const error = erroresPorDia.get(value)
            const invalido = !!error
            return (
              <div
                key={value}
                className={
                  'rounded-lg border p-3 transition-colors ' +
                  (invalido
                    ? 'border-red-300 bg-red-50/40'
                    : horario.activo
                      ? 'border-gray-200 hover:bg-gray-50'
                      : 'border-gray-200 bg-gray-50/60')
                }
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <label className="flex items-center gap-2 sm:min-w-[140px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={horario.activo}
                      onChange={(e) => updateDia(value, { activo: e.target.checked })}
                      className="w-4 h-4 accent-primary-600"
                    />
                    <span
                      className={
                        'font-medium ' + (horario.activo ? 'text-gray-900' : 'text-gray-500')
                      }
                    >
                      {label}
                    </span>
                  </label>

                  {horario.activo ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        aria-label={`Hora de inicio, ${label}`}
                        aria-invalid={invalido}
                        value={horario.hora_inicio}
                        onChange={(e) => updateDia(value, { hora_inicio: e.target.value })}
                        step={900}
                        className={
                          timeInputBase + (invalido ? ' border-red-400' : ' border-gray-300')
                        }
                      />
                      <span className="text-gray-500 text-sm">a</span>
                      <input
                        type="time"
                        aria-label={`Hora de fin, ${label}`}
                        aria-invalid={invalido}
                        value={horario.hora_fin}
                        onChange={(e) => updateDia(value, { hora_fin: e.target.value })}
                        step={900}
                        className={
                          timeInputBase + (invalido ? ' border-red-400' : ' border-gray-300')
                        }
                      />
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm italic">No disponible</span>
                  )}
                </div>

                {/* P1a — error inline debajo de la fila afectada */}
                {invalido && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
                    <IconAlertTriangle size={13} className="shrink-0" />
                    {error}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Fechas bloqueadas */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <label htmlFor="fecha-bloqueada" className="block text-sm font-medium text-gray-700 mb-2">
            Fechas bloqueadas
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Días puntuales en los que no recibirás visitas (feriados, vacaciones), aunque ese día de
            la semana esté habilitado.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <input
              id="fecha-bloqueada"
              type="date"
              aria-label="Fecha a bloquear"
              value={nuevaFecha}
              min={hoyBogotaISO()}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="text"
              aria-label="Motivo del bloqueo (opcional)"
              value={nuevoMotivo}
              onChange={(e) => setNuevoMotivo(e.target.value)}
              placeholder="Motivo (opcional)"
              maxLength={200}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={agregarFechaBloqueada}
              disabled={!nuevaFecha}
              title={!nuevaFecha ? 'Selecciona una fecha primero' : undefined}
              className="px-4 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <IconPlus size={16} />
              Agregar
            </button>
          </div>

          {bloqueadas.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Sin fechas bloqueadas.</p>
          ) : (
            <ul className="space-y-2">
              {bloqueadas.map((b) => (
                <li
                  key={b.fecha}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-gray-200 bg-gray-50"
                >
                  <span className="text-sm text-gray-900">
                    <span className="font-medium">{fechaCO(b.fecha)}</span>
                    {b.motivo && <span className="text-gray-600"> — {b.motivo}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => quitarFechaBloqueada(b.fecha)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    aria-label={`Quitar ${fechaCO(b.fecha)}`}
                  >
                    <IconTrash size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Botón guardar — P3b: solo visible cuando NO hay barra fija (estado
            limpio). Al haber cambios, la barra inferior toma el control. */}
        {!isDirty && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled
              className="px-5 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg opacity-50 cursor-not-allowed flex items-center gap-2"
            >
              Guardar cambios
            </button>
          </div>
        )}
      </div>

      {/* Infobox explicativo */}
      <div className="max-w-3xl p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Cómo funciona:</strong> Los arrendatarios solo podrán agendar visitas en los
          horarios que marques como disponibles, con una anticipación mínima de{' '}
          <strong>{antelacionLabel(antelacion)}</strong>. Si no configuras nada, se aplican
          horarios por defecto Lunes a Viernes de 9:00 a 17:00.
        </p>
      </div>

      {/* Barra fija de "cambios sin guardar": aparece al tocar cualquier campo
          y sigue visible mientras se hace scroll del formulario (largo). El
          usuario DEBE guardar (o descartar) para que apliquen a sus visitas.
          Único botón "Guardar" cuando está visible (P3b). */}
      {isDirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-amber-300 bg-amber-50/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                className={
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ' +
                  (hayErrores ? 'bg-red-100' : 'bg-amber-100')
                }
              >
                <IconAlertTriangle size={18} className={hayErrores ? 'text-red-600' : 'text-amber-600'} />
              </span>
              <div>
                <p
                  className={
                    'text-sm font-bold sm:text-base ' +
                    (hayErrores ? 'text-red-800' : 'text-amber-900')
                  }
                >
                  {hayErrores ? 'Corrige los horarios en rojo' : 'Tienes cambios sin guardar'}
                </p>
                <p className={'text-xs ' + (hayErrores ? 'text-red-700' : 'text-amber-800')}>
                  {hayErrores
                    ? 'Hay días con horarios inválidos. Corrígelos para poder guardar.'
                    : 'Guárdalos para que apliquen a tus visitas. Si sales sin guardar, se perderán.'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={discardChanges}
                disabled={isSaving}
                className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || hayErrores}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving && <IconLoader size={14} className="animate-spin" />}
                {isSaving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
