/**
 * BandejaTabs - Bandejas operativas de estudios (solo Cofianza: la inmobiliaria
 * y el propietario usan EstudiosExpedientesFusion).
 * Tabs con contadores por estado y toggle «Asignados a mí». Sin fila de KPIs:
 * cada pestaña ya trae su contador, y los KPIs contaban mal («En proceso»
 * dejaba fuera los estudios en curso; «Requieren acción» sumaba los aprobados
 * con condición, que esperan al prospecto).
 */

'use client'

import { ESTADOS_EXPEDIENTE, type EstadoExpediente } from '@/lib/constants'
import type { IExpedientesStats } from '@/types/expediente'
import { revisionCofianzaDisponible } from '@/lib/bandejaCofianza'
import { cn } from '@/lib/utils'
import { IconX } from '@/components/icons'

// Bandejas en el orden del recorrido. «Antes del resultado» es el estado
// 'borrador': ahí están los estudios enviados al prospecto, no solo los sin
// enviar (U13: el mismo nombre que en la lista de la inmobiliaria).
const BANDEJAS: Array<{
  label: string
  estado: EstadoExpediente | null
  /** Solo se muestra con contador mayor que 0 o activa (casi siempre vacía). */
  siHay?: boolean
  /** Rótulo visible bajo las pestañas cuando está activa (U12). */
  nota?: string
}> = [
  { label: 'Todos', estado: null },
  { label: 'Antes del resultado', estado: 'borrador' },
  // Bloque 4: el estado 'en_revision' trae los estudios reabiertos por un cambio de persona (esperan a la persona
  // nueva) y los que alguien devolvió a revisión a mano. Con el nombre «En revisión» quedaban junto a «En revisión
  // de Cofianza» como si fueran lo mismo; el nombre dice las dos cosas que trae.
  {
    label: 'Reabiertos y devueltos',
    estado: 'en_revision',
    siHay: true,
    nota: 'Estudios no aprobados que se reabrieron por un cambio de persona (esperan a la persona nueva) y estudios devueltos a revisión a mano.',
  },
  { label: 'Incompletos', estado: 'informacion_incompleta', siHay: true },
  // Reporte de Gerencia (21-nov), punto 6: «En revisión de Cofianza», con el conteo y el filtro del chip
  // `revision_cofianza` (sin el segundo firmante ni el bloqueo por listas). Si la API no lo sabe, la bandeja
  // vuelve a ser todo el estado condicionado y se llama «Condicionados» (ver revisionCofianzaDisponible).
  { label: 'En revisión de Cofianza', estado: 'condicionado' },
  { label: 'Aprobados', estado: 'aprobado' },
  // U12: un no aprobable que ya se cerró pasa a «Cerrados» (el estado formal es cerrado).
  { label: 'No aprobados', estado: 'rechazado', nota: 'Los no aprobados que ya se cerraron están en «Cerrados».' },
  { label: 'Cerrados', estado: 'cerrado', nota: 'Incluye los cancelados, los finalizados y los no aprobados que ya se cerraron.' },
]

export interface BandejaTabsProps {
  activeBandeja: EstadoExpediente | null
  misExpedientes: boolean
  stats: IExpedientesStats | null
  onBandejaChange: (bandeja: EstadoExpediente | null) => void
  onToggleMisExpedientes: () => void
  /** Filtro «Turno del gestor» activo (llega por el enlace del aviso de bloqueos). */
  requiereAccionActivo?: boolean
  /** false: el interruptor va en la barra de filtros (ToggleAsignados). */
  mostrarToggle?: boolean
  /** Los contadores son de otro filtro: no se muestran sus números ('cargando' mientras llegan; 'sin_dato' si fallaron). */
  conteosOcultos?: 'cargando' | 'sin_dato'
}

export function BandejaTabs({
  activeBandeja,
  misExpedientes,
  stats,
  onBandejaChange,
  onToggleMisExpedientes,
  requiereAccionActivo = false,
  mostrarToggle = true,
  conteosOcultos,
}: BandejaTabsProps) {
  const conRevision = revisionCofianzaDisponible(stats)
  const getCount = (estado: EstadoExpediente | null): number => {
    if (!stats) return 0
    if (estado === null) return stats.total
    if (estado === 'condicionado' && conRevision) return stats.revision_cofianza ?? 0
    return stats.por_estado[estado] || 0
  }
  const rotulo = (b: (typeof BANDEJAS)[number]) => (b.estado === 'condicionado' && !conRevision ? 'Condicionados' : b.label)

  return (
    <div className="space-y-4">
      {/* Tabs + Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Bandeja tabs con scroll horizontal. En móvil el borde derecho se
            desvanece: sin esa pista, una pestaña cortada no parecía deslizable. */}
        <div className="-mx-4 flex-1 overflow-x-auto px-4 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] sm:mx-0 sm:px-0 sm:[mask-image:none]">
          <nav className="flex gap-1 min-w-max pr-6 sm:min-w-0 sm:flex-wrap sm:pr-0" aria-label="Bandejas">
            {/* Cofianza no tiene esa pestaña: llega al filtro por el enlace del aviso
                de bloqueos, y sin este chip quedaba activo sin decirlo ni poder quitarse. */}
            {requiereAccionActivo && (
              <button
                type="button"
                onClick={() => onBandejaChange(null)}
                aria-label="Quitar el filtro Turno del gestor"
                className="flex h-10 items-center gap-1.5 px-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border bg-coral-50 text-coral-700 border-coral-300 hover:bg-coral-100"
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
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onBandejaChange(bandeja.estado)}
                  className={cn(
                    'flex h-10 items-center gap-1.5 px-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? config
                        ? `${config.bgColor} ${config.textColor} ${config.borderColor} border`
                        : 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
                  )}
                >
                  {/* Sin punto de color: en las inactivas era un punto gris en cada una, y el
                      color de la activa ya lo da el fondo. */}
                  {rotulo(bandeja)}
                  {conteosOcultos === 'cargando' ? (
                    <span aria-hidden="true" className="inline-block h-4 w-5 animate-pulse rounded-full bg-gray-200" />
                  ) : conteosOcultos === 'sin_dato' ? (
                    <span title="No se pudo contar" className="text-xs text-gray-500">
                      <span aria-hidden="true">—</span>
                      <span className="sr-only">no se pudo contar</span>
                    </span>
                  ) : (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-xs font-semibold tabular-nums',
                      isActive
                        ? config
                          ? `${config.textColor} bg-white/60`
                          : 'text-primary-700 bg-white/60'
                        : 'text-gray-600 bg-gray-100'
                    )}
                  >
                    {count}
                  </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {mostrarToggle && <ToggleAsignados activo={misExpedientes} onToggle={onToggleMisExpedientes} />}
      </div>
      {(() => {
        const nota = !requiereAccionActivo ? BANDEJAS.find((b) => b.estado !== null && b.estado === activeBandeja)?.nota : undefined
        return nota ? <p className="text-xs text-gray-500">{nota}</p> : null
      })()}
    </div>
  )
}

/** «Asignados a mí» (analista de Cofianza): filtra la lista por quien mira. */
export function ToggleAsignados({ activo, onToggle }: { activo: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onToggle}
      className={cn(
        'flex h-10 items-center gap-2 px-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border shrink-0',
        activo
          ? 'bg-primary-50 text-primary-700 border-primary-300'
          : 'text-gray-600 hover:bg-gray-100 border-gray-200'
      )}
    >
      <span
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
          activo ? 'bg-primary-600' : 'bg-gray-300'
        )}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
            activo ? 'translate-x-4' : 'translate-x-1'
          )}
        />
      </span>
      Asignados a mí
    </button>
  )
}
