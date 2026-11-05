/**
 * ExpedienteExternoModal — Crear expediente y enviar invitación por email
 * El cliente se registra y va directo al estudio (salta la cita)
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { IconLoader, IconMail } from '@/components/icons'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { expedienteService } from '@/services/expedienteService'
import { isValidEmail } from '@/lib/utils'

interface ExpedienteExternoModalProps {
  isOpen: boolean
  onClose: () => void
  inmuebleId: string
  inmuebleLabel?: string
  onCreated?: (expedienteId: string) => void
}

export function ExpedienteExternoModal({
  isOpen,
  onClose,
  inmuebleId,
  inmuebleLabel,
  onCreated,
}: ExpedienteExternoModalProps) {
  const [email, setEmail] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (isSubmitting) return
    setError('')

    if (!email.trim()) {
      setError('Escriba el correo del cliente.')
      return
    }
    if (!isValidEmail(email)) {
      setError('El correo no es válido. Revise que tenga la forma nombre@dominio.com.')
      return
    }

    setIsSubmitting(true)
    try {
      const expediente = await expedienteService.crearExpedienteExterno({
        inmueble_id: inmuebleId,
        email_invitacion: email,
        notas: notas || undefined,
      })
      toast.success('Invitación enviada.')
      setEmail('')
      setNotas('')
      onClose()
      onCreated?.(expediente.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo crear el estudio.'
      toast.error(msg)
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const cerrar = () => {
    if (isSubmitting) return
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title="Estudio externo"
      description="Se crea el estudio y se le envía al cliente una invitación por correo: se registra y pasa directo a la evaluación crediticia, sin agendar cita."
      footer={
        <ModalAcciones>
          <button type="button" onClick={cerrar} disabled={isSubmitting} className={botonModal('secondary')}>
            Cancelar
          </button>
          <button
            type="submit"
            form="expediente-externo-form"
            disabled={isSubmitting || !email.trim()}
            aria-busy={isSubmitting || undefined}
            className={botonModal('primary')}
          >
            {isSubmitting ? <IconLoader size={16} className="animate-spin" /> : <IconMail size={16} />}
            {isSubmitting ? 'Enviando…' : 'Enviar invitación'}
          </button>
        </ModalAcciones>
      }
    >
      <form
        id="expediente-externo-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
        className="space-y-4"
      >
        {inmuebleLabel && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-sm">
            <dt className="text-gray-500">Inmueble</dt>
            <dd className="min-w-0 break-words font-medium text-gray-900">{inmuebleLabel}</dd>
          </dl>
        )}

        <div>
          <label htmlFor="expediente-externo-modal-email-del-cliente" className="block text-sm font-medium text-gray-700 mb-1">
            Correo del cliente <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <div className="relative">
            <IconMail size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input id="expediente-externo-modal-email-del-cliente"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="cliente@ejemplo.com"
              required
              autoComplete="off"
              disabled={isSubmitting}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'expediente-externo-email-error' : undefined}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                error ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
          </div>
          {error && <p id="expediente-externo-email-error" role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
        </div>

        <div>
          <label htmlFor="expediente-externo-modal-notas-opcional" className="block text-sm font-medium text-gray-700 mb-1">
            Notas <span className="font-normal text-gray-500">(opcional)</span>
          </label>
          <textarea id="expediente-externo-modal-notas-opcional"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            disabled={isSubmitting}
            placeholder="Notas internas sobre este estudio"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </form>
    </Modal>
  )
}
