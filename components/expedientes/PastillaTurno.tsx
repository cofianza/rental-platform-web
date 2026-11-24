/**
 * De quién es el turno del estudio: la misma pastilla y las mismas palabras en
 * la lista y en la franja «Qué sigue» del detalle.
 */

import type { Turno, VistaTurno } from '@/lib/etapaEstudio'
import { analistaAjeno, textoTurno, turnoPropio, type OpcionesTurno } from '@/lib/turnoEstudio'
import { cn } from '@/lib/utils'

export type { VistaTurno }

export { analistaAjeno, textoTurno, turnoPropio, type OpcionesTurno }

export function PastillaTurno({
  turno,
  vista,
  revision,
  accion,
  analista,
  sinEjecutar,
  condicion,
  invitado,
  adenda3,
  verificacion,
  tomadoPor,
  className,
}: {
  turno: Turno
  vista: VistaTurno
  className?: string
} & OpcionesTurno) {
  const o = { revision, accion, analista, sinEjecutar, condicion, invitado, adenda3, verificacion, tomadoPor }
  return (
    <span
      className={cn(
        // rounded-xl (como PastillaEtapa): en una línea se ve igual que rounded-full; con un texto largo que baja
        // a dos líneas (a 390 px, «Su turno: esperar la verificación…») no queda una cápsula estirada.
        'inline-flex items-center rounded-xl border px-2 py-0.5 text-[11px] font-medium',
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
