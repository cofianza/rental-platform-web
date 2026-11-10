'use client'

import { useId, useState, type RefObject } from 'react'
import { IconShieldCheck } from '@/components/icons'
import { useComprobarDocumento } from '@/hooks/useComprobarDocumento'

/**
 * «Número de documento» del invitado. Solo se muestra cuando la API lo pide
 * (contacto_resultado.documento_requerido): la persona lo escribe completo y,
 * si coincide con el de la invitación, sigue (se le muestra el correo para el
 * resultado). Si no coincide, el mensaje de la API va debajo del campo.
 */
export function CampoComprobarDocumento({
  token,
  onComprobado,
  onNoDisponible,
  inputRef,
  disabled = false,
}: {
  token: string | undefined
  /** La comprobación ya no aplica (la pantalla cambió): se vuelve a cargar la invitación. */
  onNoDisponible?: () => void
  /** Para llevar el foco al campo desde otro lugar de la pantalla. */
  inputRef?: RefObject<HTMLInputElement | null>
  /** `correo`: el que se prellena ('' si no hay); `numero`: lo que escribió, para la aceptación. */
  onComprobado: (correo: string, numero: string) => void
  disabled?: boolean
}) {
  const id = useId()
  const [numero, setNumero] = useState('')
  const [faltaNumero, setFaltaNumero] = useState(false)
  const { comprobar, comprobando, error, limpiarError } = useComprobarDocumento(token, onNoDisponible)
  const mensaje = faltaNumero ? 'Escriba su número de documento.' : error

  const enviar = async () => {
    if (!numero.trim()) {
      setFaltaNumero(true)
      return
    }
    const correo = await comprobar(numero)
    if (correo !== null) onComprobado(correo, numero.trim())
  }

  return (
    <div className="mt-3">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-900">
        Número de documento
      </label>
      <p id={`${id}-ayuda`} className="mt-0.5 text-xs text-gray-600">
        Escríbalo completo para confirmar que la invitación es para usted.
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={30}
          value={numero}
          disabled={disabled || comprobando}
          onChange={(e) => {
            setNumero(e.target.value)
            if (faltaNumero) setFaltaNumero(false)
            if (error) limpiarError()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void enviar()
            }
          }}
          aria-invalid={!!mensaje}
          aria-describedby={mensaje ? `${id}-ayuda ${id}-error` : `${id}-ayuda`}
          className={`w-full min-w-0 rounded-lg border bg-white px-3 py-2.5 text-base tabular-nums text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:flex-1 ${mensaje ? 'border-red-400' : 'border-gray-300'}`}
        />
        <button
          type="button"
          onClick={() => void enviar()}
          disabled={disabled || comprobando}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary-600 bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50 sm:w-auto"
        >
          <IconShieldCheck size={16} /> {comprobando ? 'Comprobando…' : 'Comprobar'}
        </button>
      </div>
      <p id={`${id}-error`} role="alert" className={mensaje ? 'mt-1 text-xs text-red-600' : 'sr-only'}>
        {mensaje ?? ''}
      </p>
    </div>
  )
}
