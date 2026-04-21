/**
 * ExpedienteExternoModal — Crear expediente y enviar invitación por email
 * El cliente se registra y va directo al estudio (salta la cita)
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { IconLoader, IconMail } from '@/components/icons'
import { Modal } from '@/components/ui'
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
    setError('')

    if (!email.trim()) {
      setError('Email requerido')
      return
    }
    if (!isValidEmail(email)) {
      setError('Email invalido')
      return
    }

    setIsSubmitting(true)
    try {
      const expediente = await expedienteService.crearExpedienteExterno({
        inmueble_id: inmuebleId,
        email_invitacion: email,
        notas: notas || undefined,
      })
      toast.success('Invitacion enviada exitosamente')
      setEmail('')
      setNotas('')
      onClose()
      onCreated?.(expediente.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear expediente'
      toast.error(msg)
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Expediente Externo">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            Genera un expediente y envia una invitacion por correo al cliente.
            El cliente se registrara en la plataforma y pasara directamente al estudio crediticio
            <strong> sin necesidad de agendar cita</strong>.
          </p>
        </div>

        {inmuebleLabel && (
          <div className="text-sm text-gray-500">
            Inmueble: <span className="font-medium text-gray-700">{inmuebleLabel}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email del cliente
          </label>
          <div className="relative">
            <IconMail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="cliente@email.com"
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                error ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas (opcional)
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Notas internas sobre este expediente..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !email.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <><IconLoader size={14} className="animate-spin" /> Enviando...</>
            ) : (
              <><IconMail size={14} /> Enviar invitacion</>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
