/**
 * /disponibilidad — configuración de horarios del propietario/inmobiliaria.
 * Roles permitidos: propietario | inmobiliaria | administrador.
 *
 * TODO(UX): los días desactivados pierden sus horas configuradas porque el
 * backend los borra (DELETE atómico del PUT). Si el propietario reactiva un
 * día, aparece con defaults 09:00-17:00 en vez de sus últimas horas. Si esto
 * genera fricción en uso real, migrar a enviar los 7 días con flag `activo`
 * y filtrar solo por `activo=true` en el RPC.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui'
import { IconLoader } from '@/components/icons'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/stores/auth.store'
import {
  disponibilidadService,
  type IHorarioDia,
} from '@/services/disponibilidadService'

const ALLOWED_ROLES = ['propietario', 'inmobiliaria', 'administrador'] as const

const DIAS_LABELS: { value: number; label: string }[] = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
]

const DURACIONES: { value: 30 | 60 | 120; label: string }[] = [
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 120, label: '2 horas' },
]

function makeDefaultHorarios(): IHorarioDia[] {
  return DIAS_LABELS.map(({ value }) => ({
    dia_semana: value,
    hora_inicio: '09:00',
    hora_fin: '17:00',
    // L-V (1..5) activos por default, Dom (0) y Sáb (6) inactivos.
    activo: value >= 1 && value <= 5,
  }))
}

/** Completa el array del backend con todos los 7 días (inactivos faltantes). */
function completarDias(fromBackend: IHorarioDia[]): IHorarioDia[] {
  return DIAS_LABELS.map(({ value }) => {
    const existing = fromBackend.find((h) => h.dia_semana === value)
    return (
      existing ?? {
        dia_semana: value,
        hora_inicio: '09:00',
        hora_fin: '17:00',
        activo: false,
      }
    )
  })
}

function minutosEntre(inicio: string, fin: string): number {
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fin.split(':').map(Number)
  return hf * 60 + mf - (hi * 60 + mi)
}

interface ErrorValidacion {
  dia: number
  msg: string
}

function validarHorarios(horarios: IHorarioDia[], duracion: number): ErrorValidacion[] {
  const errores: ErrorValidacion[] = []
  for (const h of horarios.filter((x) => x.activo)) {
    if (h.hora_fin <= h.hora_inicio) {
      errores.push({ dia: h.dia_semana, msg: 'Hora fin debe ser mayor a hora inicio' })
      continue
    }
    const minutos = minutosEntre(h.hora_inicio, h.hora_fin)
    if (minutos < duracion) {
      errores.push({
        dia: h.dia_semana,
        msg: `La ventana es menor a ${duracion} min. No cabrá ningún slot.`,
      })
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
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [initial, setInitial] = useState<string>('')

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

        setHorarios(horariosUI)
        setDuracion(duracionUI)
        setInitial(JSON.stringify({ horarios: horariosUI, duracion: duracionUI }))
      })
      .catch(() => {
        if (!cancelled) toast.error('No se pudieron cargar tus horarios.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isInitialized, isAuthenticated])

  const isDirty = useMemo(
    () => JSON.stringify({ horarios, duracion }) !== initial,
    [horarios, duracion, initial],
  )

  function updateDia(dia: number, patch: Partial<IHorarioDia>) {
    setHorarios((prev) => prev.map((h) => (h.dia_semana === dia ? { ...h, ...patch } : h)))
  }

  async function handleSave() {
    const errores = validarHorarios(horarios, duracion)
    if (errores.length > 0) {
      const resumen = errores
        .map((e) => `${DIAS_LABELS[e.dia].label}: ${e.msg}`)
        .join(' · ')
      toast.error(resumen)
      return
    }

    setIsSaving(true)
    try {
      const horariosActivos = horarios.filter((h) => h.activo)
      await disponibilidadService.updateMiDisponibilidad({
        slot_duracion_minutos: duracion,
        horarios: horariosActivos,
      })
      toast.success('Horarios actualizados.')
      setInitial(JSON.stringify({ horarios, duracion }))
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      toast.error(errObj.message || 'No se pudieron guardar los cambios.')
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disponibilidad"
        subtitle="Configura cuándo puedes recibir visitas de arrendatarios interesados"
      />

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-3xl">
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
          <p className="text-xs text-gray-500 mt-1">
            Duración de cada slot que verán los arrendatarios al agendar.
          </p>
        </div>

        {/* Tabla de días */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Horarios por día de la semana
          </label>
          {DIAS_LABELS.map(({ value, label }) => {
            const horario = horarios.find((h) => h.dia_semana === value)
            if (!horario) return null
            return (
              <div
                key={value}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                <label className="flex items-center gap-2 sm:min-w-[140px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={horario.activo}
                    onChange={(e) => updateDia(value, { activo: e.target.checked })}
                    className="w-4 h-4 accent-primary-600"
                  />
                  <span className="font-medium text-gray-900">{label}</span>
                </label>

                {horario.activo ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={horario.hora_inicio}
                      onChange={(e) => updateDia(value, { hora_inicio: e.target.value })}
                      step={900}
                      className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-gray-500 text-sm">a</span>
                    <input
                      type="time"
                      value={horario.hora_fin}
                      onChange={(e) => updateDia(value, { hora_fin: e.target.value })}
                      step={900}
                      className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm italic">No disponible</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Botón guardar */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="px-5 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <IconLoader size={14} className="animate-spin" />}
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Infobox explicativo */}
      <div className="max-w-3xl p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Cómo funciona:</strong> Los arrendatarios solo podrán agendar visitas en los
          horarios que marques como disponibles. La antelación mínima es de 24 horas. Si no
          configuras nada, se aplican horarios por defecto Lunes a Viernes de 9:00 a 17:00.
        </p>
      </div>
    </div>
  )
}
