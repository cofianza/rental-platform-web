/**
 * De quién es el turno del estudio: la misma pastilla y las mismas palabras en
 * la lista y en la franja «Qué sigue» del detalle.
 */

import type { Turno, VistaTurno } from '@/lib/etapaEstudio'
import { cn } from '@/lib/utils'

export type { VistaTurno }

export interface OpcionesTurno {
  revision?: boolean
  accion?: string
  /** Administrador u operador: deciden la revisión y pueden ejecutar la consulta. */
  analista?: boolean
  /** U2: autorizó y pagó, pero la consulta no arrancó sola. */
  sinEjecutar?: boolean
  /**
   * Revisión que ya tomó OTRO analista (nombre): para quien mira no es «Su turno»,
   * es el de esa persona. Solo aplica a la revisión de Cofianza.
   */
  tomadoPor?: string | null
  /**
   * Adenda 3 §6: aprobado con la condición de sumar un coarrendatario. Fuera de Cofianza
   * lo que se espera es el coarrendatario (lo agrega la persona o lo invita quien gestiona).
   */
  condicion?: boolean
}

/** «Nombre Apellido» del analista asignado si no es quien mira; null si es él o no hay. */
export function analistaAjeno(
  analista: { id: string; nombre: string; apellido?: string | null } | null | undefined,
  yo: string | null | undefined,
): string | null {
  if (!analista || !yo || analista.id === yo) return null
  return `${analista.nombre} ${analista.apellido ?? ''}`.trim() || 'otro analista'
}

/** ¿Le toca actuar a quien mira? Coral, como «Su turno». */
export function turnoPropio(turno: Turno, vista: VistaTurno, o: OpcionesTurno = {}): boolean {
  // Solo lectura («equipo») ve el turno de su equipo, pero no puede actuar: sin coral.
  if (turno === 'gestor') return vista === 'gestor' || (vista === 'cofianza' && !!o.analista && !!o.sinEjecutar)
  return turno === 'cofianza' && vista === 'cofianza' && !!o.analista && !!o.revision && !o.tomadoPor
}

export function textoTurno(turno: Turno, vista: VistaTurno, o: OpcionesTurno = {}): string {
  switch (turno) {
    case 'gestor': {
      // U2: Cofianza también puede ejecutar la consulta que no arrancó.
      if (vista === 'cofianza' && o.analista && o.sinEjecutar) return 'Arranque fallido: ejecute la consulta'
      // A Cofianza «Su turno» le decía que actuara ella.
      const base = vista === 'gestor' ? 'Su turno' : vista === 'cofianza' ? 'Turno del gestor' : 'Turno de su equipo'
      return o.accion ? `${base}: ${o.accion}` : base
    }
    case 'prospecto':
      return o.condicion && vista !== 'cofianza' ? 'Esperando al coarrendatario' : 'Esperando al prospecto'
    case 'cofianza':
      // El condicionado lo decide un analista (Adenda 2 §5): no es una consulta en curso.
      // U1: al analista le toca decidir; a Gerencia, solo mirar.
      if (o.revision) {
        if (vista !== 'cofianza') return 'En revisión de Cofianza'
        if (!o.analista) return 'En revisión de un analista'
        if (o.tomadoPor) return `En revisión de ${o.tomadoPor}`
        return 'Su turno: decidir el estudio'
      }
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
  analista,
  sinEjecutar,
  condicion,
  className,
}: {
  turno: Turno
  vista: VistaTurno
  className?: string
} & OpcionesTurno) {
  const o = { revision, accion, analista, sinEjecutar, condicion }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        // Coral solo para lo que le toca a quien mira; solo lectura («Turno de su equipo») va en gris.
        // Cofianza conserva el coral de «Turno del gestor».
        turnoPropio(turno, vista, o) || (turno === 'gestor' && vista === 'cofianza')
          ? 'border-coral-200 bg-coral-50 text-coral-700'
          : 'border-gray-200 bg-gray-50 text-gray-600',
        className,
      )}
    >
      {textoTurno(turno, vista, o)}
    </span>
  )
}
