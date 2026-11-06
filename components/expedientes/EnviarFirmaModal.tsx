'use client'

import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { useState } from 'react'
import { toast } from 'sonner'
import { IconLoader, IconMail, IconWhatsapp } from '@/components/icons'
import { firmaService } from '@/services/firmaService'
import { bloqueoDeEvaluacion } from '@/components/contratos/v3/BloqueosContrato'
import type { Bloqueo } from '@/types/contratoV3'

interface EnviarFirmaModalProps {
  isOpen: boolean
  onClose: () => void
  contratoId: string
  onSuccess: () => void
  defaultNombre?: string
  defaultEmail?: string
  defaultTelefono?: string
  /** La evaluación ya no alcanza para firmar (CRC_SIN_MARGEN / CRC_VENCIDO / ESTUDIO_VENCIDO): la salida es un estudio nuevo. */
  onEvaluacionVencida?: (bloqueo: Bloqueo) => void
}

export function EnviarFirmaModal({
  isOpen,
  onClose,
  contratoId,
  onSuccess,
  defaultNombre = '',
  defaultEmail = '',
  defaultTelefono = '',
  onEvaluacionVencida,
}: EnviarFirmaModalProps) {
  const [nombre, setNombre] = useState(defaultNombre)
  const [email, setEmail] = useState(defaultEmail)
  const [telefono, setTelefono] = useState(defaultTelefono)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  function handleClose() {
    if (isSubmitting) return
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting || !nombre.trim() || !email.trim()) return

    setIsSubmitting(true)
    try {
      await firmaService.crearSolicitud({
        contrato_id: contratoId,
        nombre_firmante: nombre.trim(),
        email_firmante: email.trim(),
        telefono_firmante: telefono.trim() || undefined,
      })
      toast.success('Solicitud de firma enviada correctamente')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const bloqueo = bloqueoDeEvaluacion(err)
      if (bloqueo && onEvaluacionVencida) {
        onClose()
        onEvaluacionVencida(bloqueo)
        return
      }
      const message = err instanceof Error ? err.message : 'Error al enviar la solicitud'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Enviar para firma"
      description="El firmante recibe un enlace seguro para revisar y firmar el contrato. El plazo para firmar nunca pasa la vigencia del certificado de riesgo."
      size="md"
      footer={
        <ModalAcciones>
          <button type="button" onClick={handleClose} disabled={isSubmitting} className={botonModal('secondary')}>
            Cancelar
          </button>
          <button
            type="submit"
            form="enviar-firma-form"
            disabled={isSubmitting || !nombre.trim() || !email.trim()}
            aria-busy={isSubmitting || undefined}
            className={botonModal('primary')}
          >
            {isSubmitting ? <IconLoader size={16} className="animate-spin" /> : <IconMail size={16} />}
            {isSubmitting ? 'Enviando…' : 'Enviar enlace de firma'}
          </button>
        </ModalAcciones>
      }
    >
      <form id="enviar-firma-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="enviar-firma-modal-nombre-completo-del-firmante" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo del firmante <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <input id="enviar-firma-modal-nombre-completo-del-firmante"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            disabled={isSubmitting}
            maxLength={200}
            autoComplete="name"
            placeholder="Nombre del firmante"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50"
          />
        </div>

        <div>
          <label htmlFor="enviar-firma-modal-email-del-firmante" className="block text-sm font-medium text-gray-700 mb-1">
            Correo del firmante <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <input id="enviar-firma-modal-email-del-firmante"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting}
            maxLength={255}
            autoComplete="email"
            placeholder="correo@ejemplo.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50"
          />
        </div>

        <div>
          <label htmlFor="enviar-firma-modal-celular-whatsapp-opcional-recomendado" className="block text-sm font-medium text-gray-700 mb-1">
            Celular (WhatsApp) <span className="text-gray-500 font-normal">(opcional, recomendado)</span>
          </label>
          <input id="enviar-firma-modal-celular-whatsapp-opcional-recomendado"
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            disabled={isSubmitting}
            maxLength={20}
            autoComplete="tel"
            placeholder="+57 300 123 4567"
            aria-describedby="enviar-firma-whatsapp-ayuda"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50"
          />
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <IconWhatsapp size={16} className="mt-0.5 shrink-0 text-green-700" aria-hidden="true" />
            <p id="enviar-firma-whatsapp-ayuda" className="text-xs text-green-800">
              Si escribe el celular con el código de país, Auco también envía el enlace de firma por <strong>WhatsApp</strong>, además del correo. Formato: <span className="tabular-nums">+57 3001234567</span>.
            </p>
          </div>
        </div>
      </form>
    </Modal>
  )
}
