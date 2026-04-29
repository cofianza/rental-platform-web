'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { pagoEstudioService, type IPagoEstudioEstado } from '@/services/pagoEstudioService'
import { creditosEstudiosService, type ISaldoCreditos } from '@/services/creditosEstudiosService'

interface PagoEstudioSectionProps {
  expedienteId: string
  onPagoCompletado?: () => void
  /** Rol del usuario actual — el solicitante ve un CTA "Pagar ahora" en lugar
   *  de los controles admin (enviar link / asumir costo). */
  userRole?: string
  /** Si true, renderiza null cuando no hay acción relevante (sin_definir /
   *  cancelado). Útil para incluir la sección en el tab Resumen sin dejar
   *  un bloque vacío cuando el pago aún no aplica. */
  hideIfNoAction?: boolean
}

export function PagoEstudioSection({ expedienteId, onPagoCompletado, userRole, hideIfNoAction }: PagoEstudioSectionProps) {
  const [estado, setEstado] = useState<IPagoEstudioEstado | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [saldoCreditos, setSaldoCreditos] = useState<ISaldoCreditos | null>(null)

  const puedeUsarCreditos = userRole === 'inmobiliaria'

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

  const fetchSaldo = useCallback(async () => {
    if (!puedeUsarCreditos) return
    try {
      const data = await creditosEstudiosService.getMiSaldo()
      setSaldoCreditos(data)
    } catch {
      setSaldoCreditos(null)
    }
  }, [puedeUsarCreditos])

  useEffect(() => { fetchEstado() }, [fetchEstado])
  useEffect(() => { fetchSaldo() }, [fetchSaldo])

  const handleLiberarCredito = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await creditosEstudiosService.liberarEstudio(expedienteId)
      await Promise.all([fetchEstado(), fetchSaldo()])
      onPagoCompletado?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al liberar el estudio con credito')
    } finally {
      setIsSubmitting(false)
    }
  }

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

  // ── Vista solicitante ─────────────────────────────────────────────────
  // El solicitante no puede "asumir" ni "enviar link". Solo paga si hay
  // link de Stripe generado, o espera a que definan la forma de pago.
  if (userRole === 'solicitante') {
    if (hideIfNoAction && (estado.estado === 'sin_definir' || estado.estado === 'cancelado')) {
      return null
    }
    return <PagoEstudioSolicitanteView estado={estado} />
  }

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
          <div className={`grid grid-cols-1 ${puedeUsarCreditos ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
            {/* Liberar con credito (inmobiliaria/propietario) */}
            {puedeUsarCreditos && (
              (saldoCreditos?.saldo_total ?? 0) > 0 ? (
                <button
                  onClick={handleLiberarCredito}
                  disabled={isSubmitting}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-emerald-300 bg-emerald-50/40 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                >
                  <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900">Liberar con crédito</span>
                  <span className="text-xs text-emerald-700 font-medium">
                    Saldo: {saldoCreditos?.saldo_total} estudios
                  </span>
                </button>
              ) : (
                <Link
                  href="/configuracion/creditos-estudios"
                  className="flex flex-col items-center gap-2 p-4 border-2 border-amber-200 bg-amber-50/40 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-colors"
                >
                  <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900">Comprar paquete</span>
                  <span className="text-xs text-amber-700">Sin créditos disponibles</span>
                </Link>
              )
            )}
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

// ============================================
// Vista para el solicitante: ver estado + pagar
// ============================================

function PagoEstudioSolicitanteView({ estado }: { estado: IPagoEstudioEstado }) {
  const linkPago = estado.pago?.payment_link_url || null

  // Pago completado → banner verde corto. El siguiente paso (confirmar CC
  // y ejecutar estudio) lo maneja EstudioSolicitanteCard.
  if (estado.estado === 'completado' || estado.estado === 'asumido_inmobiliaria') {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
        <svg className="h-5 w-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-green-800">
            {estado.estado === 'asumido_inmobiliaria' ? 'Costo cubierto por la inmobiliaria' : '¡Pago confirmado!'}
          </p>
          <p className="text-xs text-green-600">
            {estado.monto_formateado} COP — Recibimos tu pago correctamente.
          </p>
        </div>
      </div>
    )
  }

  // Pendiente con link de Stripe → CTA grande "Pagar ahora".
  if (estado.estado === 'pendiente' && linkPago) {
    return (
      <div className="border-2 border-primary-200 bg-primary-50/40 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <svg className="h-6 w-6 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Paga tu estudio crediticio</h3>
            <p className="text-sm text-gray-600 mb-1">
              Monto a pagar: <span className="font-semibold text-gray-900">{estado.monto_formateado} COP</span>
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Serás redirigido a Stripe (pasarela segura). Al completar el pago, tu estudio se ejecuta automáticamente.
            </p>
            <a
              href={linkPago}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              Pagar ahora
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Pendiente sin link todavía (propietario habilitó pero aún no hay checkout).
  if (estado.estado === 'pendiente') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm font-medium text-amber-800">Preparando tu link de pago</p>
        <p className="text-xs text-amber-600 mt-1">
          El link llegará a tu correo en unos momentos. También aparecerá aquí en tu panel.
        </p>
      </div>
    )
  }

  // Pago fallido → ofrecer reintentar con el mismo link (si sigue válido).
  if (estado.estado === 'fallido') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm font-medium text-red-800 mb-1">No pudimos procesar tu pago</p>
        <p className="text-xs text-red-600 mb-3">
          Monto: {estado.monto_formateado} COP. Puedes intentarlo de nuevo.
        </p>
        {linkPago && (
          <a
            href={linkPago}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Reintentar pago
          </a>
        )}
      </div>
    )
  }

  // Cancelado o sin definir → mensaje neutro.
  if (estado.estado === 'cancelado') {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm font-medium text-gray-800">El pago fue cancelado</p>
        <p className="text-xs text-gray-500 mt-1">
          Contacta al propietario o a la inmobiliaria para retomar el proceso.
        </p>
      </div>
    )
  }

  // sin_definir — esperando que admin/inmobiliaria configure el cobro.
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-sm font-medium text-blue-800">Esperando que definan la forma de pago</p>
      <p className="text-xs text-blue-600 mt-1">
        Tu estudio ya fue habilitado. Te avisaremos por correo cuando esté listo el link de pago.
      </p>
    </div>
  )
}
