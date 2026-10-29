/**
 * De quién es el turno del estudio: la misma pastilla y las mismas palabras en
 * la lista y en la franja «Qué sigue» del detalle.
 */

import type { Turno, VistaTurno } from '@/lib/etapaEstudio'
import { cn } from '@/lib/utils'

export type { VistaTurno }

export function textoTurno(turno: Turno, vista: VistaTurno, o: { revision?: boolean; accion?: string } = {}): string {
  switch (turno) {
    case 'gestor': {
      // A Cofianza «Su turno» le decía que actuara ella.
      const base = vista === 'gestor' ? 'Su turno' : vista === 'cofianza' ? 'Turno del gestor' : 'Turno de su equipo'
      return o.accion ? `${base}: ${o.accion}` : base
    }
    case 'prospecto':
      return 'Esperando al prospecto'
    case 'cofianza':
      // El condicionado lo decide un analista (Adenda 2 §5): no es una consulta en curso.
      if (o.revision) return vista === 'cofianza' ? 'Revisión del analista' : 'En revisión de Cofianza'
      return 'Cofianza procesando'
    case 'firmas':
      return 'Esperando las firmas'
  }
}

export function PastillaTurno({
  turno,
  vista,
  revision,
  accion,
  className,
}: {
  turno: Turno
  vista: VistaTurno
  revision?: boolean
  accion?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        turno === 'gestor' ? 'border-coral-200 bg-coral-50 text-coral-700' : 'border-gray-200 bg-gray-50 text-gray-600',
        className,
      )}
    >
      {textoTurno(turno, vista, { revision, accion })}
    </span>
  )
}
