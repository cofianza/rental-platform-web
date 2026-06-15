'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { pagoEstudioService, type IPagoEstudioEstado } from '@/services/pagoEstudioService'
import { creditosEstudiosService, type ISaldoCreditos } from '@/services/creditosEstudiosService'
import { facturacionService, type IDatosFiscalesPagoFactura } from '@/services/facturacionService'

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
  // Confirmación inline de "La inmobiliaria paga": antes de registrar, se
  // explica qué va a pasar (registro interno + autorización auto-enviada).
  const [confirmAsumir, setConfirmAsumir] = useState(false)

  const puedeUsarCreditos = userRole === 'inmobiliaria'
  // "Yo asumo el costo" queda OCULTO (no eliminado — el botón y su flujo siguen
  // abajo intactos) para:
  //   - inmobiliaria → ya paga al comprar créditos (sería redundante)
  //   - propietario  → decisión: el propietario solo envía link al solicitante
  // Para reactivarlo en alguno de los dos, quita su rol de esta condición.
  // Sigue disponible para admin/operador.
  const mostrarAsumir = userRole !== 'inmobiliaria' && userRole !== 'propietario'
  const numOpcionesPago = (puedeUsarCreditos ? 1 : 0) + (mostrarAsumir ? 1 : 0) + 1

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

  // Polling automático mientras esperamos pago. Cuando el solicitante paga
  // por Stripe, el webhook tarda 1-3 seg en marcar el pago como 'completado'
  // — sin esto el panel queda mostrando "pendiente" hasta que el usuario
  // refresque a mano. Polling cada 4 seg, solo en estados donde tiene sentido.
  // Cuando detectamos que ya no está pendiente, llamamos onPagoCompletado
  // para que el expediente padre haga refetch (estudio + UI).
  useEffect(() => {
    if (!estado) return
    const enEspera = estado.estado === 'pendiente' || estado.estado === 'procesando'
    if (!enEspera) return

    const id = setInterval(async () => {
      const fresco = await pagoEstudioService.getEstado(expedienteId).catch(() => null)
      if (!fresco) return
      setEstado(fresco)
      if (fresco.estado !== 'pendiente' && fresco.estado !== 'procesando') {
        onPagoCompletado?.()
      }
    }, 4000)
    return () => clearInterval(id)
  }, [estado, expedienteId, onPagoCompletado])

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

      {/* Sin definir — mostrar selector (acción requerida) */}
      {estado.estado === 'sin_definir' && (
        <div className="border-2 border-amber-300 bg-amber-50/30 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <span className="shrink-0 mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Acción requerida: define quién paga el estudio
                <span className="ml-2 inline-flex px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide rounded-full bg-amber-200 text-amber-900">paso obligatorio</span>
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">
                El estudio crediticio <span className="font-semibold">no puede ejecutarse</span> hasta que elijas una de
                estas opciones. Monto: <span className="font-semibold text-gray-900">{estado.monto_formateado} COP</span>.
              </p>
            </div>
          </div>

          {!confirmAsumir ? (
            <div className={`grid grid-cols-1 ${numOpcionesPago >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
              {/* Liberar con credito (inmobiliaria) */}
              {puedeUsarCreditos && (
                (saldoCreditos?.saldo_total ?? 0) > 0 ? (
                  <button
                    onClick={handleLiberarCredito}
                    disabled={isSubmitting}
                    className="flex flex-col items-center gap-1.5 p-4 bg-white border-2 border-emerald-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-colors disabled:opacity-50 text-center"
                  >
                    <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">Liberar con crédito</span>
                    <span className="text-xs text-emerald-700 font-medium">Saldo: {saldoCreditos?.saldo_total} estudios</span>
                    <span className="text-[11px] text-gray-500 leading-snug">Descuenta 1 crédito y el proceso sigue de inmediato.</span>
                  </button>
                ) : (
                  <Link
                    href="/configuracion/creditos-estudios"
                    className="flex flex-col items-center gap-1.5 p-4 bg-white border-2 border-amber-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-colors text-center"
                  >
                    <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">Comprar paquete</span>
                    <span className="text-xs text-amber-700">Sin créditos disponibles</span>
                    <span className="text-[11px] text-gray-500 leading-snug">Compra créditos con descuento por volumen.</span>
                  </Link>
                )
              )}
              {mostrarAsumir && (
                <button
                  onClick={() => setConfirmAsumir(true)}
                  disabled={isSubmitting}
                  className="flex flex-col items-center gap-1.5 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50/50 transition-colors disabled:opacity-50 text-center"
                >
                  <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-900">Yo asumo el costo</span>
                  <span className="text-xs text-gray-500">Se registra internamente</span>
                  <span className="text-[11px] text-gray-500 leading-snug">Sin cobro en línea; el costo queda a tu cargo.</span>
                </button>
              )}
              <button
                onClick={() => setShowLinkModal(true)}
                disabled={isSubmitting}
                className="flex flex-col items-center gap-1.5 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50/50 transition-colors disabled:opacity-50 text-center"
              >
                <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-gray-900">Enviar link al arrendatario</span>
                <span className="text-xs text-gray-500">Él paga con tarjeta o PSE</span>
                <span className="text-[11px] text-gray-500 leading-snug">Le llega por correo y WhatsApp; al pagar, el proceso sigue solo.</span>
              </button>
            </div>
          ) : (
            /* Confirmación de "Yo asumo el costo": explica las consecuencias
               ANTES de registrar — evita clicks a ciegas. Solo la alcanzan
               propietario/admin (la inmobiliaria no tiene esta opción). */
            <div className="bg-white border-2 border-primary-200 rounded-lg p-5">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                ¿Confirmas que asumes el costo del estudio ({estado.monto_formateado} COP)?
              </p>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-4 list-disc pl-5">
                <li>El pago se registra internamente — <span className="font-medium">no hay cobro en línea</span>.</li>
                <li>Le enviaremos <span className="font-medium">automáticamente</span> el enlace de autorización al arrendatario (correo y WhatsApp).</li>
                <li>Cuando él firme la autorización, el estudio crediticio corre solo y te avisamos del resultado.</li>
              </ul>
              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmAsumir(false); void handleAsumir() }}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  Sí, registrar y continuar
                </button>
                <button
                  onClick={() => setConfirmAsumir(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Volver
                </button>
              </div>
            </div>
          )}
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
            <p className="text-xs text-green-600">
              {estado.monto_formateado} COP — el enlace de autorización ya se envió al arrendatario; el estudio corre cuando firme.
            </p>
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

      {/* Procesando — PSE/efectivo en proceso en la pasarela */}
      {estado.estado === 'procesando' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-blue-600 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">Pago en proceso</p>
              <p className="text-xs text-blue-600">
                {estado.monto_formateado} COP — el arrendatario inició el pago (PSE/efectivo); se confirma automáticamente.
              </p>
            </div>
          </div>
          <button
            onClick={handleCancelarYAsumir}
            disabled={isSubmitting}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar y asumir costo
          </button>
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
            Teléfono <span className="text-xs text-gray-400">(opcional)</span>
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
  const pagoId = estado.pago?.id || null
  // Si el backend ya adjunto la factura al pago (attachFacturas), la usamos.
  const facturaExistente = (estado.pago as unknown as { factura?: { id: string; numero?: string | null; estado: string } | null } | null)?.factura || null

  const [facturaModal, setFacturaModal] = useState<{
    faltantes: string[]
    datos: IDatosFiscalesPagoFactura
  } | null>(null)
  /** Modal de confirmacion previo a emitir: muestra los datos que se usaran
   *  para que el solicitante verifique o ajuste antes de tocar Factus. */
  const [confirmModal, setConfirmModal] = useState<{
    datos: {
      nombre_completo: string
      tipo_documento: string
      numero_documento: string
      email: string
      telefono: string
      direccion: string
      municipio_codigo: string
      municipio_nombre: string
    }
    monto: number
  } | null>(null)
  const [facturando, setFacturando] = useState(false)
  const [facturaIdEmitida, setFacturaIdEmitida] = useState<string | null>(facturaExistente?.id || null)

  // Sincronizar el state local cuando el backend reporta una factura emitida.
  // Sin este efecto, useState(facturaExistente?.id) solo evalua al montar — si
  // estado.pago.factura llega despues del primer render (lo normal: el padre
  // hace fetch async), el boton seguia mostrando "Facturar" hasta que el usuario
  // lo presionaba y recibia "La factura ya estaba emitida". Ahora la UI se
  // ajusta sola en cuanto el backend trae el dato.
  useEffect(() => {
    if (facturaExistente?.id && facturaExistente.id !== facturaIdEmitida) {
      setFacturaIdEmitida(facturaExistente.id)
    }
  }, [facturaExistente?.id, facturaIdEmitida])

  const tryFacturar = async (datos?: IDatosFiscalesPagoFactura): Promise<boolean> => {
    if (!pagoId) return false
    try {
      const factura = await facturacionService.facturarPago(pagoId, datos)
      toast.success(`Factura emitida${factura.numero ? `: ${factura.numero}` : ''}`)
      setFacturaIdEmitida(factura.id)
      setFacturaModal(null)
      setConfirmModal(null)
      return true
    } catch (err: unknown) {
      const e = err as { code?: string; details?: { faltantes?: string[] }; message?: string }
      if (e.code === 'CLIENTE_DATOS_INCOMPLETOS' && Array.isArray(e.details?.faltantes)) {
        setFacturaModal({ faltantes: e.details!.faltantes!, datos: datos || {} })
        setConfirmModal(null)
        return false
      }
      toast.error(e.message || 'Error al emitir la factura')
      return false
    }
  }

  // Click inicial: pide preview al backend y abre modal de confirmacion.
  // Si faltan datos, redirige al solicitante a /facturacion para que los
  // complete (la pantalla dedicada es la fuente de verdad). Para otros
  // roles abrimos el form inline como antes.
  const handleFacturarClick = async () => {
    if (!pagoId) return
    setFacturando(true)
    try {
      const preview = await facturacionService.previewFacturaPago(pagoId)
      if (preview.ya_emitida && preview.factura_id) {
        setFacturaIdEmitida(preview.factura_id)
        toast.message('La factura ya estaba emitida.')
        return
      }
      if (preview.faltantes.length > 0) {
        toast.error(
          'Completa tus datos fiscales en Facturación → Datos Fiscales antes de emitir la factura.',
        )
        // Damos un beat para que el toast se vea antes de navegar.
        setTimeout(() => {
          window.location.href = '/facturacion'
        }, 600)
        return
      }
      // Datos completos: abrir modal de confirmacion para que verifique.
      setConfirmModal({ datos: preview.datos_actuales, monto: preview.monto })
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || 'No pudimos cargar los datos de facturacion')
    } finally {
      setFacturando(false)
    }
  }

  const handleConfirmEmitir = async () => {
    setFacturando(true)
    try {
      // Sin datos -> backend usa los del solicitante (mismos del preview).
      await tryFacturar()
    } finally {
      setFacturando(false)
    }
  }

  const handleAjustarDesdeConfirm = () => {
    // Permite editar los datos antes de emitir. Usamos FacturaModal con
    // todos los campos como "faltantes" para que el form los muestre todos.
    if (!confirmModal) return
    setFacturaModal({
      faltantes: ['numero_documento', 'email', 'telefono', 'direccion', 'municipio_codigo'],
      datos: {
        numero_documento: confirmModal.datos.numero_documento,
        tipo_documento: confirmModal.datos.tipo_documento,
        nombre_completo: confirmModal.datos.nombre_completo,
        direccion: confirmModal.datos.direccion,
        email: confirmModal.datos.email,
        telefono: confirmModal.datos.telefono,
        municipio_codigo: confirmModal.datos.municipio_codigo,
      },
    })
    setConfirmModal(null)
  }

  const handleSubmitFacturaModal = async () => {
    if (!facturaModal) return
    setFacturando(true)
    try {
      await tryFacturar(facturaModal.datos)
    } finally {
      setFacturando(false)
    }
  }

  // Pago completado → banner verde + boton "Facturar".
  if (estado.estado === 'completado' || estado.estado === 'asumido_inmobiliaria') {
    return (
      <>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">
                {estado.estado === 'asumido_inmobiliaria' ? 'Costo cubierto por la inmobiliaria' : '¡Pago confirmado!'}
              </p>
              <p className="text-xs text-green-600">
                {estado.monto_formateado} COP — Recibimos tu pago correctamente.
              </p>
            </div>
          </div>

          {/* Acciones de facturacion — solo si fue un pago propio (no asumido) y hay pagoId */}
          {estado.estado === 'completado' && pagoId && (
            <div className="mt-3 pt-3 border-t border-green-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-xs text-green-700">
                {facturaIdEmitida || facturaExistente
                  ? '¿Necesitas tu factura electrónica?'
                  : '¿Necesitas factura electrónica de este pago?'}
              </p>
              {facturaIdEmitida || facturaExistente ? (
                <Link
                  href={`/facturacion/${facturaIdEmitida || facturaExistente!.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-800 bg-white border border-green-300 rounded-md hover:bg-green-50 transition"
                >
                  Ver factura
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              ) : (
                <button
                  onClick={handleFacturarClick}
                  disabled={facturando}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {facturando && (
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                    </svg>
                  )}
                  Facturar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal pidiendo datos fiscales que falten */}
        <Modal
          isOpen={!!facturaModal}
          onClose={() => !facturando && setFacturaModal(null)}
          title="Datos fiscales para tu factura"
          size="md"
        >
          {facturaModal && (
            <PagoFacturaDatosForm
              faltantes={facturaModal.faltantes}
              datos={facturaModal.datos}
              onChange={(d) => setFacturaModal({ ...facturaModal, datos: d })}
              onSubmit={handleSubmitFacturaModal}
              onCancel={() => setFacturaModal(null)}
              loading={facturando}
            />
          )}
        </Modal>

        {/* Modal de confirmacion previo a emitir — muestra los datos y permite ajustar */}
        <Modal
          isOpen={!!confirmModal}
          onClose={() => !facturando && setConfirmModal(null)}
          title="Confirma los datos de tu factura"
          size="md"
        >
          {confirmModal && (
            <ConfirmFacturaModal
              datos={confirmModal.datos}
              monto={confirmModal.monto}
              onConfirmar={handleConfirmEmitir}
              onAjustar={handleAjustarDesdeConfirm}
              onCancelar={() => setConfirmModal(null)}
              loading={facturando}
            />
          )}
        </Modal>
      </>
    )
  }

  // Procesando (PSE/efectivo): el pago está en manos del medio de pago — no
  // ofrecer "Pagar ahora" de nuevo ni decir que falta definir la forma de pago.
  if (estado.estado === 'procesando') {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-blue-700 shrink-0 animate-spin mt-0.5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-0.5">Tu pago está en proceso</p>
            <p className="text-sm text-blue-800">
              El medio de pago está procesando tu transacción (PSE/efectivo puede tardar desde minutos hasta horas).
              Te avisaremos cuando se confirme — no necesitas volver a pagar.
            </p>
          </div>
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
              Serás redirigido a la pasarela de pago segura. Al completar el pago, tu estudio se ejecuta automáticamente.
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

// ============================================
// Form de datos fiscales (faltantes) — usado por el solicitante al
// facturar su pago de estudio.
// ============================================

const PAGO_FACTURA_LABEL: Record<string, string> = {
  numero_documento: 'Número de documento',
  tipo_documento: 'Tipo de documento',
  nombre_completo: 'Nombre completo',
  direccion: 'Dirección',
  email: 'Email',
  telefono: 'Teléfono',
  municipio_codigo: 'Código DANE del municipio',
}

interface PagoFacturaDatosFormProps {
  faltantes: string[]
  datos: IDatosFiscalesPagoFactura
  onChange: (d: IDatosFiscalesPagoFactura) => void
  onSubmit: () => void
  onCancel: () => void
  loading: boolean
}

function PagoFacturaDatosForm({ faltantes, datos, onChange, onSubmit, onCancel, loading }: PagoFacturaDatosFormProps) {
  const set = (key: keyof IDatosFiscalesPagoFactura, value: string) => {
    onChange({ ...datos, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
        Necesitamos completar tus datos para emitir la factura electrónica ante la DIAN. Solo se
        usan en esta factura — no se guardan en tu perfil.
      </div>

      {faltantes.includes('numero_documento') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {PAGO_FACTURA_LABEL.numero_documento} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={datos.numero_documento || ''}
            onChange={(e) => set('numero_documento', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="1234567890"
          />
        </div>
      )}

      {faltantes.includes('direccion') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {PAGO_FACTURA_LABEL.direccion} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={datos.direccion || ''}
            onChange={(e) => set('direccion', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Calle 100 # 20-30"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {faltantes.includes('email') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {PAGO_FACTURA_LABEL.email} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={datos.email || ''}
              onChange={(e) => set('email', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="tu@correo.com"
            />
          </div>
        )}

        {faltantes.includes('telefono') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {PAGO_FACTURA_LABEL.telefono} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={datos.telefono || ''}
              onChange={(e) => set('telefono', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="3001234567"
            />
          </div>
        )}
      </div>

      {faltantes.includes('municipio_codigo') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Municipio <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={datos.municipio_codigo || ''}
            onChange={(e) => set('municipio_codigo', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="11001 (Bogotá)"
            maxLength={5}
          />
          <p className="text-xs text-gray-500 mt-1">
            Código DANE de 5 dígitos. Bogotá = 11001, Medellín = 05001, Cali = 76001.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={onSubmit}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
            </svg>
          )}
          Emitir factura
        </button>
      </div>
    </div>
  )
}

// ============================================
// Modal de confirmacion previo a emitir factura
// ============================================

const TIPO_DOC_LABEL: Record<string, string> = {
  cc: 'Cédula de Ciudadanía',
  ce: 'Cédula de Extranjería',
  ti: 'Tarjeta de Identidad',
  nit: 'NIT',
  pasaporte: 'Pasaporte',
}

function ConfirmFacturaModal({
  datos,
  monto,
  onConfirmar,
  onAjustar,
  onCancelar,
  loading,
}: {
  datos: {
    nombre_completo: string
    tipo_documento: string
    numero_documento: string
    email: string
    telefono: string
    direccion: string
    municipio_codigo: string
    municipio_nombre: string
  }
  monto: number
  onConfirmar: () => void | Promise<void>
  onAjustar: () => void
  onCancelar: () => void
  loading: boolean
}) {
  const tipoDocLabel = TIPO_DOC_LABEL[datos.tipo_documento?.toLowerCase()] || datos.tipo_documento || '—'
  const formattedMonto = monto > 0
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(monto)
    : ''

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Vamos a emitir tu factura electrónica con los datos de tu registro.
        Verifica que sean correctos — la factura no puede modificarse después de emitirse.
      </p>

      {formattedMonto && (
        <div className="px-3 py-2 bg-primary-50 border border-primary-200 rounded text-sm">
          <p className="text-xs text-primary-700">Monto a facturar:</p>
          <p className="font-semibold text-primary-900">{formattedMonto}</p>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg divide-y divide-gray-200">
        <DataRow label="Nombre" value={datos.nombre_completo || '—'} />
        <DataRow label="Tipo de documento" value={tipoDocLabel} />
        <DataRow label="Número de documento" value={datos.numero_documento || '—'} />
        <DataRow label="Email" value={datos.email || '—'} />
        <DataRow label="Teléfono" value={datos.telefono || '—'} />
        <DataRow label="Dirección" value={datos.direccion || '—'} />
        <DataRow
          label="Municipio"
          value={
            datos.municipio_nombre
              ? `${datos.municipio_nombre}${datos.municipio_codigo ? ` (${datos.municipio_codigo})` : ''}`
              : datos.municipio_codigo || '—'
          }
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
        <button
          onClick={onCancelar}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={onAjustar}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50"
        >
          Ajustar datos
        </button>
        <button
          onClick={onConfirmar}
          disabled={loading}
          className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
            </svg>
          )}
          Confirmar y emitir
        </button>
      </div>
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 px-3 py-2 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 font-medium text-right break-words">{value}</span>
    </div>
  )
}
