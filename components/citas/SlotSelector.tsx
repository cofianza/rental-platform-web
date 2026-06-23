/**
 * SlotSelector — grid tipo Doctoralia/Calendly para elegir slot de cita.
 * Fuente: GET /api/v1/disponibilidad/slots. Ventana de 7 días, navegable
 * hasta +30 desde hoy (Bogotá). En móvil el grid hace scroll horizontal
 * (grid-cols-7 + min-w-[640px]), cortando la 4ª columna a medio pill para
 * señalar "hay más a la derecha".
 *
 * Todos los tiempos se renderizan en zona America/Bogota explícitamente
 * (independiente de la zona del browser del solicitante).
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  IconChevronLeft,
  IconChevronRight,
  IconAlertTriangle,
} from '@/components/icons'
import {
  disponibilidadService,
  type IDiaDisponibilidad,
} from '@/services/disponibilidadService'
import { cn } from '@/lib/utils'

interface SlotSelectorProps {
  inmuebleId: string
  value: string | null
  onChange: (slotIso: string | null) => void
  className?: string
}

const DIAS_POR_VENTANA = 7
const MAX_DIAS_ADELANTE = 30 // debe coincidir con el límite del RPC backend

export default function SlotSelector({
  inmuebleId,
  value,
  onChange,
  className,
}: SlotSelectorProps) {
  // offsetDias = primer día visible de la ventana, contado desde HOY (Bogotá).
  // Arranca en 0 (hoy); cuando llega la antelación del inmueble se sube al
  // primer día permitido (offsetMinimo): 0=mismo día/2h, 1=24h, 2=48h.
  const [offsetDias, setOffsetDias] = useState(0)
  const [offsetMinimo, setOffsetMinimo] = useState(0)
  const [diasData, setDiasData] = useState<IDiaDisponibilidad[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  const { desde, hasta } = useMemo(() => {
    const todayBogota = todayISOBogota()
    const d = addDaysYMD(todayBogota, offsetDias)
    const h = addDaysYMD(d, DIAS_POR_VENTANA - 1)
    return { desde: d, hasta: h }
  }, [offsetDias])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    disponibilidadService
      .getSlots({ inmuebleId, desde, hasta })
      .then((res) => {
        if (cancelled) return
        setDiasData(res.dias)
        // Primer día permitido según la antelación del propietario: 0/0/1/2
        // para mismo día / 2h / 24h / 48h. Si la ventana arrancó antes (p. ej.
        // en 24h aún estábamos en hoy), saltamos al primer día útil.
        const min = Math.max(0, Math.floor((res.antelacion_minima_horas ?? 24) / 24))
        setOffsetMinimo(min)
        setOffsetDias((cur) => (cur < min ? min : cur))
      })
      .catch(() => {
        if (cancelled) return
        setError('No se pudieron cargar los horarios. Intenta de nuevo.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [inmuebleId, desde, hasta, reloadTick])

  const puedeRetroceder = offsetDias > offsetMinimo
  const puedeAvanzar = offsetDias + DIAS_POR_VENTANA <= MAX_DIAS_ADELANTE

  const handleRetroceder = () => {
    setOffsetDias(Math.max(offsetMinimo, offsetDias - DIAS_POR_VENTANA))
  }

  const handleAvanzar = () => {
    const max = MAX_DIAS_ADELANTE - DIAS_POR_VENTANA + 1
    setOffsetDias(Math.min(max, offsetDias + DIAS_POR_VENTANA))
  }

  const semanaSinSlots =
    !isLoading && !error && diasData.length > 0 && diasData.every((d) => d.slots.length === 0)

  return (
    <div className={cn('border border-gray-200 rounded-lg bg-white', className)}>
      {/* Header con navegación */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <button
          type="button"
          onClick={handleRetroceder}
          disabled={!puedeRetroceder || isLoading}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Semana anterior"
        >
          <IconChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-gray-700">Selecciona fecha y hora</span>
        <button
          type="button"
          onClick={handleAvanzar}
          disabled={!puedeAvanzar || isLoading}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Semana siguiente"
        >
          <IconChevronRight size={18} />
        </button>
      </div>

      {/* Banner: semana vacía (informativo, grid sigue visible) */}
      {semanaSinSlots && (
        <div className="px-3 py-2 bg-amber-50 border-l-4 border-amber-400 text-sm text-amber-800">
          Sin horarios disponibles esta semana. Prueba semanas siguientes con la flecha ›.
        </div>
      )}

      {/* Error + reintentar */}
      {error && !isLoading && (
        <div className="px-3 py-6 text-center">
          <div className="flex items-center justify-center gap-2 text-red-600 mb-3">
            <IconAlertTriangle size={18} />
            <span className="text-sm">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setReloadTick((t) => t + 1)}
            className="px-4 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 rounded hover:bg-primary-100"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="p-3 overflow-x-auto">
          <div className="grid grid-cols-7 gap-1 min-w-[640px]">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-10 rounded bg-gray-100 animate-pulse" />
                <div className="h-7 rounded-full bg-gray-100 animate-pulse" />
                <div className="h-7 rounded-full bg-gray-100 animate-pulse" />
                <div className="h-7 rounded-full bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid principal */}
      {!isLoading && !error && diasData.length > 0 && (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-1 min-w-[640px] p-3">
            {diasData.map((dia) => {
              const header = formatDiaHeader(dia.fecha)
              return (
                <div key={dia.fecha} className="flex flex-col items-stretch gap-1.5">
                  <div className="text-xs text-gray-600 text-center pb-2 border-b border-gray-100">
                    <div className="uppercase tracking-wide">{header.diaCorto}</div>
                    <div className="font-semibold text-gray-900 mt-0.5">{header.diaMes}</div>
                  </div>

                  {dia.slots.length === 0 ? (
                    <span className="text-center text-gray-300 text-sm py-2 select-none">—</span>
                  ) : (
                    dia.slots.map((slot) => {
                      const selected = value === slot.inicio
                      return (
                        <button
                          type="button"
                          key={slot.inicio}
                          onClick={() => onChange(slot.inicio)}
                          className={cn(
                            'px-2 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap',
                            selected
                              ? 'bg-primary-600 text-white'
                              : 'bg-primary-50 text-primary-700 hover:bg-primary-100',
                          )}
                        >
                          {formatSlotHora(slot.inicio)}
                        </button>
                      )
                    })
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Helpers (inline, exportados para reuso en MeInteresaCTA)
// ============================================================

/** Fecha civil actual en Bogotá como "YYYY-MM-DD". */
function todayISOBogota(): string {
  // 'sv-SE' formatea como YYYY-MM-DD por default
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Bogota',
  }).format(new Date())
}

/** Suma N días a un "YYYY-MM-DD" usando aritmética UTC (sin drift por DST). */
function addDaysYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

/**
 * Formatea "YYYY-MM-DD" → { diaCorto: "Mié", diaMes: "22 Abr" } en zona Bogotá.
 * Anclamos a mediodía Bogotá para que Intl no renderice el día anterior/siguiente
 * en browsers con zona extrema.
 */
function formatDiaHeader(ymd: string): { diaCorto: string; diaMes: string } {
  const d = new Date(`${ymd}T12:00:00-05:00`)
  const diaCortoRaw = d.toLocaleDateString('es-CO', {
    weekday: 'short',
    timeZone: 'America/Bogota',
  })
  const diaCorto = capitalize(diaCortoRaw.replace('.', '').slice(0, 3))
  const diaNum = d.toLocaleDateString('es-CO', { day: 'numeric', timeZone: 'America/Bogota' })
  const mes = d
    .toLocaleDateString('es-CO', { month: 'short', timeZone: 'America/Bogota' })
    .replace('.', '')
  return { diaCorto, diaMes: `${diaNum} ${capitalize(mes)}` }
}

/** ISO -05:00 → "09:00" hora Bogotá. */
export function formatSlotHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** ISO -05:00 → "miércoles, 22 de abril de 2026" hora Bogotá. */
export function formatFechaCompleta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
