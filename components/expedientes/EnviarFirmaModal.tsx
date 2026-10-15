'use client'

import { Modal } from '@/components/ui/Modal'
import { useState } from 'react'
import { toast } from 'sonner'
import { IconX, IconLoader, IconMail, IconWhatsapp } from '@/components/icons'
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !email.trim()) return

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
    <Modal isOpen={isOpen} onClose={onClose} bare ariaLabel="Enviar para firma" closeOnBackdrop={false} className="rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Enviar para Firma</h2>
        <button type="button" data-modal-close aria-label="Cerrar" onClick={onClose} className="p-1 text-gray-500 hover:text-gray-600 rounded">
          <IconX size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Se enviará un enlace seguro al firmante para que revise y firme el contrato. El plazo para firmar nunca pasa la vigencia del certificado de riesgo.
          </p>

          <div>
            <label htmlFor="enviar-firma-modal-nombre-completo-del-firmante" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo del firmante <span className="text-red-500">*</span>
            </label>
            <input id="enviar-firma-modal-nombre-completo-del-firmante"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={200}
              placeholder="Nombre del firmante"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label htmlFor="enviar-firma-modal-email-del-firmante" className="block text-sm font-medium text-gray-700 mb-1">
              Email del firmante <span className="text-red-500">*</span>
            </label>
            <input id="enviar-firma-modal-email-del-firmante"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
              placeholder="email@ejemplo.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
              maxLength={20}
              placeholder="+57 300 123 4567"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <IconWhatsapp size={16} className="text-green-600 shrink-0 mt-0.5" />
              <p className="text-xs text-green-800">
                Si ingresa el celular con código de país, Auco enviará el link de firma también por <strong>WhatsApp</strong> (además del correo). Formato: <code className="text-[11px] font-mono">+57 3001234567</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !nombre.trim() || !email.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <IconLoader size={16} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <IconMail size={16} />
                Enviar enlace de firma
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
