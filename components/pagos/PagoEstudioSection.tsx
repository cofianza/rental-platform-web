'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { pagoEstudioService, type IPagoEstudioEstado } from '@/services/pagoEstudioService'

interface PagoEstudioSectionProps {
  expedienteId: string
  onPagoCompletado?: () => void
}

export function PagoEstudioSection({ expedienteId, onPagoCompletado }: PagoEstudioSectionProps) {
  const [estado, setEstado] = useState<IPagoEstudioEstado | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)

  const fetchEstado = useCallback(async () => {
    try {
      const data = await pagoEstudioService.getEstado(expedienteId)
      setEstado(data)
    } catch {
      setError('Error al consultar estado del pago')
    } finally {
      setIsLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchEstado() }, [fetchEstado])

  const handleAsumir = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await pagoEstudioService.asumir(expedienteId)
      await fetchEstado()
      onPagoCompletado?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar pago')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReenviar = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await pagoEstudioService.reenviar(expedienteId)
      setError(null)
      await fetchEstado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reenviar link')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelarYAsumir = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await pagoEstudioService.cancelarYAsumir(expedienteId)
      await fetchEstado()
      onPagoCompletado?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar y asumir')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg p-6 h-32" />
    )
  }

  if (!estado) return null

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Sin definir — mostrar selector */}
      {estado.estado === 'sin_definir' && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Pago del estudio</h3>
          <p className="text-sm text-gray-500 mb-4">
            Monto: <span className="font-semibold text-gray-900">{estado.monto_formateado} COP</span>
          </p>
          <p className="text-sm text-gray-600 mb-5">Selecciona quien asume el costo del estudio de arrendamiento:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleAsumir}
              disabled={isSubmitting}
              className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50/50 transition-colors disabled:opacity-50"
            >
              <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-sm font-medium text-gray-900">La inmobiliaria paga</span>
              <span className="text-xs text-gray-500">Se registra internamente</span>
            </button>
            <button
              onClick={() => setShowLinkModal(true)}
              disabled={isSubmitting}
              className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50/50 transition-colors disabled:opacity-50"
            >
              <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">Enviar link al arrendatario</span>
              <span className="text-xs text-gray-500">Pago via Stripe por correo</span>
            </button>
          </div>
        </div>
      )}

      {/* Asumido por inmobiliaria */}
      {estado.estado === 'asumido_inmobiliaria' && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <svg className="h-5 w-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-green-800">Cubierto por inmobiliaria</p>
            <p className="text-xs text-green-600">{estado.monto_formateado} COP — Siguiente paso desbloqueado</p>
          </div>
        </div>
      )}

      {/* Completado (via pasarela) */}
      {estado.estado === 'completado' && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <svg className="h-5 w-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-green-800">Pago confirmado</p>
            <p className="text-xs text-green-600">{estado.monto_formateado} COP — Siguiente paso desbloqueado</p>
          </div>
        </div>
      )}

      {/* Pendiente */}
      {estado.estado === 'pendiente' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <svg className="h-5 w-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">Esperando pago del arrendatario</p>
              <p className="text-xs text-amber-600">{estado.monto_formateado} COP — Link enviado a {estado.pago?.email_pagador}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReenviar}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-md hover:bg-amber-200 transition-colors disabled:opacity-50"
            >
              Reenviar correo
            </button>
            <button
              onClick={handleCancelarYAsumir}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancelar y asumir costo
            </button>
          </div>
        </div>
      )}

      {/* Fallido */}
      {estado.estado === 'fallido' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <svg className="h-5 w-5 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">Pago fallido</p>
              <p className="text-xs text-red-600">{estado.monto_formateado} COP</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLinkModal(true)}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              Reenviar link
            </button>
            <button
              onClick={handleAsumir}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Inmobiliaria asume
            </button>
          </div>
        </div>
      )}

      {/* Modal: enviar link al arrendatario */}
      <EnviarLinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        expedienteId={expedienteId}
        montoFormateado={estado.monto_formateado}
        onSuccess={() => {
          setShowLinkModal(false)
          fetchEstado()
        }}
      />
    </div>
  )
}

// ============================================
// Modal: Enviar link de pago
// ============================================

function EnviarLinkModal({
  isOpen,
  onClose,
  expedienteId,
  montoFormateado,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  expedienteId: string
  montoFormateado: string
  onSuccess: () => void
}) {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setEmail('')
    setNombre('')
    setTelefono('')
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

    if (!email || !nombre) {
      setError('Email y nombre son requeridos')
      return
    }

    setIsSubmitting(true)
    try {
      await pagoEstudioService.enviarLink(expedienteId, {
        email_pagador: email,
        nombre_pagador: nombre,
        telefono: telefono || undefined,
      })
      resetForm()
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar link')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Enviar link de pago al arrendatario" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <p className="text-sm text-primary-800">
            <span className="font-medium">Concepto:</span> Estudio de arrendamiento
          </p>
          <p className="text-sm text-primary-800">
            <span className="font-medium">Monto:</span> {montoFormateado} COP
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del arrendatario <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email del arrendatario <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefono <span className="text-xs text-gray-400">(opcional)</span>
          </label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+57 300 123 4567"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </div>

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
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
              </svg>
            )}
            {isSubmitting ? 'Enviando...' : 'Enviar link de pago'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
