'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'
import { correoResultadoValido } from '@/lib/correoResultado'

/**
 * «Correo donde quiere recibir el resultado de su evaluación». Va FUERA del
 * texto legal (ese no cambia sin una versión nueva). Solo se muestra cuando la
 * API lo pide; la persona puede corregir el que viene prellenado.
 */
export function CampoCorreoResultado({
  valor,
  onCambio,
  mostrarError,
  disabled = false,
}: {
  valor: string
  onCambio: (v: string) => void
  /** Mostrar el error de formato (después de que la persona intentó seguir). */
  mostrarError: boolean
  disabled?: boolean
}) {
  const id = useId()
  const invalido = mostrarError && !correoResultadoValido(valor)
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5">
      <label htmlFor={id} className="block text-sm font-bold text-gray-900">
        Correo donde quiere recibir el resultado de su evaluación
      </label>
      <p id={`${id}-ayuda`} className="mt-0.5 text-xs text-gray-500">
        Si en su evaluación hay información que solo usted debe conocer, se la enviaremos a este correo.
        Revíselo y corríjalo si no es el suyo.
      </p>
      <input
        id={id}
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        disabled={disabled}
        maxLength={254}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        aria-invalid={invalido}
        aria-describedby={invalido ? `${id}-ayuda ${id}-error` : `${id}-ayuda`}
        placeholder="nombre@correo.com"
        className={cn(
          'mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500',
          invalido ? 'border-red-400' : 'border-gray-200',
        )}
      />
      {invalido && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
          Escriba un correo válido, por ejemplo nombre@correo.com.
        </p>
      )}
    </div>
  )
}
