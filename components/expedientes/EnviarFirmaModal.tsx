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
                Celular (WhatsApp) <span className="text-gray-400 font-normal">(opcional, recomendado)</span>
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                maxLength={20}
                placeholder="+57 300 123 4567"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <svg className="h-4 w-4 text-green-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <p className="text-xs text-green-800">
                  Si ingresas el celular con código de país, Auco enviará el link de firma también por <strong>WhatsApp</strong> (además del email). Formato: <code className="text-[11px] font-mono">+57 3001234567</code>.
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
