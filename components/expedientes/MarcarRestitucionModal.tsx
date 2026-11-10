'use client'

/**
 * Marca de restitución sobre una persona del estudio. Solo la ofrece la
 * tarjeta de la evaluación cuando la API lo indica (`restitucion.puede_marcar`);
 * la explicación de qué hace la marca también llega de la API. Soporte y motivo
 * son obligatorios y quedan en el registro.
 */

import { useId, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useMarcaEstudio, type DatosMarca } from '@/hooks/useMarcaEstudio'

const MIN_SOPORTE = 5
const MIN_MOTIVO = 10
const CAMPO =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

export interface MarcarRestitucionModalProps {
  isOpen: boolean
  onClose: () => void
  estudioId: string
  /** Explicación de la marca, redactada por la API. */
  ayuda: string
  /** Nombre del titular y, si lo hay, del segundo firmante: a quién corresponde la marca. */
  titular: string
  segundoFirmante?: string | null
  onGuardado?: () => void
}

export function MarcarRestitucionModal({ isOpen, onClose, estudioId, ayuda, titular, segundoFirmante, onGuardado }: MarcarRestitucionModalProps) {
  const [persona, setPersona] = useState<DatosMarca['persona']>('solicitante')
  const [soporte, setSoporte] = useState('')
  const [motivo, setMotivo] = useState('')
  const { marcar, guardando } = useMarcaEstudio(estudioId, onGuardado)
  const ids = { persona: useId(), soporte: useId(), motivo: useId(), ayuda: useId() }
  const completo = soporte.trim().length >= MIN_SOPORTE && motivo.trim().length >= MIN_MOTIVO

  // El diálogo se cierra solo al terminar la acción; si falló, se queda abierto con lo escrito.
  const fallo = useRef(false)
  const cerrar = () => {
    if (guardando) return
    if (fallo.current) {
      fallo.current = false
      return
    }
    onClose()
  }

  const guardar = async () => {
    if (!completo) return
    if (await marcar({ persona, soporte: soporte.trim(), motivo: motivo.trim() })) {
      setSoporte('')
      setMotivo('')
      setPersona('solicitante')
    } else {
      fallo.current = true
    }
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={cerrar}
      onConfirm={guardar}
      title="Marcar proceso de restitución"
      variant="danger"
      confirmLabel="Registrar marca"
      isLoading={guardando}
      confirmDisabled={!completo}
      message={
        <div className="space-y-3 text-left">
          <p id={ids.ayuda}>{ayuda}</p>
          {segundoFirmante ? (
            <div>
              <label htmlFor={ids.persona} className="mb-1 block text-xs font-medium text-gray-700">
                Persona
              </label>
              <select
                id={ids.persona}
                value={persona}
                onChange={(e) => setPersona(e.target.value as DatosMarca['persona'])}
                disabled={guardando}
                className={CAMPO}
              >
                <option value="solicitante">{titular || 'Titular'} (titular)</option>
                <option value="coarrendatario">{segundoFirmante} (segundo firmante)</option>
              </select>
            </div>
          ) : (
            <p className="text-xs text-gray-600">Persona: {titular || 'titular del estudio'}.</p>
          )}
          <div>
            <label htmlFor={ids.soporte} className="mb-1 block text-xs font-medium text-gray-700">
              Soporte (obligatorio)
            </label>
            <input
              required
              aria-required="true"
              id={ids.soporte}
              type="text"
              value={soporte}
              onChange={(e) => setSoporte(e.target.value)}
              disabled={guardando}
              maxLength={500}
              aria-describedby={ids.ayuda}
              placeholder="Dónde consta: documento, consulta o radicado"
              className={CAMPO}
            />
            <p className="mt-1 text-xs text-gray-600">Mínimo {MIN_SOPORTE} caracteres.</p>
          </div>
          <div>
            <label htmlFor={ids.motivo} className="mb-1 block text-xs font-medium text-gray-700">
              Motivo (obligatorio)
            </label>
            <textarea
              required
              aria-required="true"
              id={ids.motivo}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={guardando}
              rows={3}
              maxLength={500}
              className={CAMPO}
            />
            <p className="mt-1 text-xs text-gray-600">Mínimo {MIN_MOTIVO} caracteres. Queda en el registro del estudio.</p>
          </div>
        </div>
      }
    />
  )
}
