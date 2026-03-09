'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { IconX, IconLoader, IconMail } from '@/components/icons'
import { firmaService } from '@/services/firmaService'

interface EnviarFirmaModalProps {
  isOpen: boolean
  onClose: () => void
  contratoId: string
  onSuccess: () => void
  defaultNombre?: string
  defaultEmail?: string
  defaultTelefono?: string
}

export function EnviarFirmaModal({
  isOpen,
  onClose,
  contratoId,
  onSuccess,
  defaultNombre = '',
  defaultEmail = '',
  defaultTelefono = '',
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
      const message = err instanceof Error ? err.message : 'Error al enviar la solicitud'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Enviar para Firma</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <IconX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-500">
              Se enviará un enlace seguro al firmante para que revise y firme el contrato. El enlace expira en 72 horas.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo del firmante <span className="text-red-500">*</span>
              </label>
              <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email del firmante <span className="text-red-500">*</span>
              </label>
              <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                maxLength={20}
                placeholder="+57 300 123 4567"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
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
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
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
      </div>
    </div>
  )
}
