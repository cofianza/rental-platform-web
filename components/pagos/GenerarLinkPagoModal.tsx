/**
 * GenerarLinkPagoModal - HP-351
 * Modal para generar link de pago via pasarela
 */

'use client'

import { useState, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { pagoService } from '@/services/pagoService'

// ============================================
// Types
// ============================================

interface GenerarLinkPagoModalProps {
  isOpen: boolean
  onClose: () => void
  expedienteId: string
  onSuccess: () => void
}

const CONCEPTOS = [
  { value: 'estudio', label: 'Estudio de riesgo crediticio' },
  { value: 'garantia', label: 'Garantia de arrendamiento' },
  { value: 'primer_canon', label: 'Primer canon de arrendamiento' },
  { value: 'deposito', label: 'Deposito de garantia' },
  { value: 'otro', label: 'Otro' },
]

// ============================================
// Component
// ============================================

export function GenerarLinkPagoModal({
  isOpen,
  onClose,
  expedienteId,
  onSuccess,
}: GenerarLinkPagoModalProps) {
  const [concepto, setConcepto] = useState<string>('')
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [emailPagador, setEmailPagador] = useState('')
  const [nombrePagador, setNombrePagador] = useState('')
  const [enviarEmail, setEnviarEmail] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setConcepto('')
    setMonto('')
    setDescripcion('')
    setEmailPagador('')
    setNombrePagador('')
    setEnviarEmail(true)
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }, [isSubmitting, resetForm, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validations
    if (!concepto) {
      setError('Selecciona un concepto')
      return
    }

    const montoNum = parseInt(monto, 10)
    if (!monto || montoNum <= 0 || isNaN(montoNum)) {
      setError('Ingresa un monto valido mayor a 0')
      return
    }

    if (!descripcion.trim()) {
      setError('Ingresa una descripcion')
      return
    }

    if (!emailPagador.trim()) {
      setError('Ingresa el email del pagador')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailPagador)) {
      setError('Ingresa un email valido')
      return
    }

    if (!nombrePagador.trim()) {
      setError('Ingresa el nombre del pagador')
      return
    }

    setIsSubmitting(true)

    try {
      await pagoService.createPaymentLink(expedienteId, {
        concepto: concepto as 'estudio' | 'garantia' | 'primer_canon' | 'deposito' | 'otro',
        monto: montoNum,
        descripcion: descripcion.trim(),
        email_pagador: emailPagador.trim(),
        nombre_pagador: nombrePagador.trim(),
        enviar_email: enviarEmail,
      })

      resetForm()
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el link de pago')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format monto for display
  const formatMontoDisplay = (value: string) => {
    const num = parseInt(value, 10)
    if (isNaN(num)) return ''
    return new Intl.NumberFormat('es-CO').format(num)
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Generar Link de Pago" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Concepto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Concepto <span className="text-red-500">*</span>
          </label>
          <select
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          >
            <option value="">Seleccionar...</option>
            {CONCEPTOS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Monto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monto (COP) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej: 150000"
              min="1"
              className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              disabled={isSubmitting}
            />
          </div>
          {monto && (
            <p className="mt-1 text-xs text-gray-500">
              ${formatMontoDisplay(monto)} COP
            </p>
          )}
        </div>

        {/* Descripcion */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripcion <span className="text-red-500">*</span>
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripcion del pago que vera el cliente"
            maxLength={500}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-400 text-right">{descripcion.length}/500</p>
        </div>

        {/* Nombre del pagador */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del pagador <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nombrePagador}
            onChange={(e) => setNombrePagador(e.target.value)}
            placeholder="Nombre completo"
            maxLength={200}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Email del pagador */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email del pagador <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={emailPagador}
            onChange={(e) => setEmailPagador(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Enviar email */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enviarEmail"
            checked={enviarEmail}
            onChange={(e) => setEnviarEmail(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            disabled={isSubmitting}
          />
          <label htmlFor="enviarEmail" className="text-sm text-gray-700">
            Enviar link por email automaticamente
          </label>
        </div>

        {/* Info box */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Se generara un link de pago seguro que el cliente podra usar para pagar con tarjeta de credito/debito o PSE.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
              </svg>
            )}
            {isSubmitting ? 'Generando...' : 'Generar Link'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
