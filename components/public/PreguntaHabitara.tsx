'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'
import { HABITARA_OPCIONES, type Habitara } from '@/lib/habitara'

/**
 * Adenda 6 §8: «¿Vivirá usted en el inmueble?», con Sí, No y «Prefiero no indicarlo» (la opción por
 * defecto, que quien tramita ve como «No lo indicó»). Se usa en la autorización del solicitante y en la
 * del segundo firmante. Es informativo: la evaluación no lo usa.
 */
export function PreguntaHabitara({
  valor,
  onCambio,
  disabled = false,
  className,
}: {
  valor: Habitara
  onCambio: (v: Habitara) => void
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <p id={`${id}-pregunta`} className="text-sm font-bold text-gray-900">
        ¿Vivirá usted en el inmueble que se va a arrendar?
      </p>
      <p id={`${id}-ayuda`} className="mt-0.5 text-xs text-gray-500">
        Es solo informativo: no cambia el resultado de su evaluación. Su respuesta la verá quien tramita el arriendo.
      </p>
      <div
        role="group"
        aria-labelledby={`${id}-pregunta`}
        aria-describedby={`${id}-ayuda`}
        className="mt-2 grid grid-cols-[minmax(3.5rem,auto)_minmax(3.5rem,auto)_1fr] gap-2"
      >
        {HABITARA_OPCIONES.map((op) => {
          const on = valor === op.valor
          return (
            <button
              key={op.valor}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onCambio(op.valor)}
              className={cn(
                'min-h-11 rounded-xl border px-2 py-2.5 text-sm font-semibold leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                on ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-700',
              )}
            >
              {op.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
