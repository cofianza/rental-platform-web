/**
 * BandejaTabs - Bandejas operativas de estudios (solo Cofianza: la inmobiliaria
 * y el propietario usan EstudiosExpedientesFusion).
 * Tabs con contadores por estado y toggle "Mis estudios". Sin fila de KPIs:
 * cada pestaña ya trae su contador, y los KPIs contaban mal («En proceso»
 * dejaba fuera los estudios en curso; «Requieren acción» sumaba los aprobados
 * con condición, que esperan al prospecto).
 */

'use client'

import { ESTADOS_EXPEDIENTE, type EstadoExpediente } from '@/lib/constants'
import type { IExpedientesStats } from '@/types/expediente'
import { cn } from '@/lib/utils'
import { IconX } from '@/components/icons'

// Bandejas en el orden del recorrido. «En curso» es el estado 'borrador': ahí
// están los estudios enviados al prospecto, no solo los sin enviar.
const BANDEJAS: Array<{
  label: string
  estado: EstadoExpediente | null
  /** Solo se muestra con contador mayor que 0 o activa (casi siempre vacía). */
  siHay?: boolean
}> = [
  { label: 'Todos', estado: null },
  { label: 'En curso', estado: 'borrador' },
  { label: 'En revisión', estado: 'en_revision', siHay: true },
  { label: 'Incompletos', estado: 'informacion_incompleta', siHay: true },
  // Adenda 3 §6: los aprobados con condición también caen aquí. Sin texto de
  // ayuda en la pestaña: con el cuarto desenlace apagado describiría un caso
  // que no puede darse.
  { label: 'Condicionados', estado: 'condicionado' },
  { label: 'Aprobados', estado: 'aprobado' },
  { label: 'No aprobables', estado: 'rechazado' },
  { label: 'Cerrados', estado: 'cerrado' },
]

export interface BandejaTabsProps {
  activeBandeja: EstadoExpediente | null
  misExpedientes: boolean
  stats: IExpedientesStats | null
  onBandejaChange: (bandeja: EstadoExpediente | null) => void
  onToggleMisExpedientes: () => void
  /** Filtro «Turno del gestor» activo (llega por el enlace del aviso de bloqueos). */
  requiereAccionActivo?: boolean
}

export function BandejaTabs({
  activeBandeja,
  misExpedientes,
  stats,
  onBandejaChange,
  onToggleMisExpedientes,
  requiereAccionActivo = false,
}: BandejaTabsProps) {
  const getCount = (estado: EstadoExpediente | null): number => {
    if (!stats) return 0
    if (estado === null) return stats.total
    return stats.por_estado[estado] || 0
  }

  return (
    <div className="space-y-4">
      {/* Tabs + Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Bandeja tabs con scroll horizontal */}
        <div className="flex-1 overflow-x-auto">
          <nav className="flex gap-1 min-w-max" aria-label="Bandejas">
            {/* Cofianza no tiene esa pestaña: llega al filtro por el enlace del aviso
                de bloqueos, y sin este chip quedaba activo sin decirlo ni poder quitarse. */}
            {requiereAccionActivo && (
              <button
                type="button"
                onClick={() => onBandejaChange(null)}
                aria-label="Quitar el filtro Turno del gestor"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border bg-coral-50 text-coral-700 border-coral-300 hover:bg-coral-100"
              >
                Turno del gestor
                <IconX size={14} />
              </button>
            )}
            {BANDEJAS.map((bandeja) => {
              const isActive = !requiereAccionActivo && activeBandeja === bandeja.estado
              const count = getCount(bandeja.estado)
              if (bandeja.siHay && count === 0 && !isActive) return null
              const config = bandeja.estado ? ESTADOS_EXPEDIENTE[bandeja.estado] : null

              return (
                <button
                  key={bandeja.label}
                  onClick={() => onBandejaChange(bandeja.estado)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                    isActive
                      ? config
                        ? `${config.bgColor} ${config.textColor} ${config.borderColor} border`
                        : 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'text-gray-600 hover:bg-gray-100 border border-transparent'
                  )}
                >
                  {bandeja.estado && (
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        isActive && config
                          ? config.textColor.replace('text-', 'bg-')
                          : 'bg-gray-400'
                      )}
                    />
                  )}
                  {bandeja.label}
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-xs font-semibold',
                      isActive
                        ? config
                          ? `${config.textColor} bg-white/60`
                          : 'text-primary-700 bg-white/60'
                        : 'text-gray-500 bg-gray-100'
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Toggle Mis Expedientes (analista de Cofianza) */}
        <button
          type="button"
          aria-pressed={misExpedientes}
          onClick={onToggleMisExpedientes}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border shrink-0',
            misExpedientes
              ? 'bg-primary-50 text-primary-700 border-primary-300'
              : 'text-gray-600 hover:bg-gray-100 border-gray-200'
          )}
        >
          <span
            className={cn(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
              misExpedientes ? 'bg-primary-600' : 'bg-gray-300'
            )}
          >
            <span
              className={cn(
                'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                misExpedientes ? 'translate-x-4' : 'translate-x-1'
              )}
            />
          </span>
          Mis estudios
        </button>
      </div>
    </div>
  )
}
