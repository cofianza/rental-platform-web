'use client'

import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheckCircle,
  IconClock,
  IconCreditCard,
  IconDollarSign,
  IconLoader,
  IconMail,
  IconRefresh,
  IconShieldCheck,
} from '@/components/icons'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { pagoEstudioService, type IPagoEstudioEstado } from '@/services/pagoEstudioService'
import { creditosEstudiosService, type ISaldoCreditos } from '@/services/creditosEstudiosService'
import { facturacionService, type IDatosFiscalesPagoFactura } from '@/services/facturacionService'
import { useAuthStore } from '@/stores/auth.store'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'
import { MunicipioCombobox } from '@/components/registro/MunicipioCombobox'

/** `paga` (A10): quién paga el cobro según el API — 'gestor' en la opción B. */
type IEstadoConPagador = IPagoEstudioEstado & { paga?: 'gestor' | 'arrendatario' | null }

interface PagoEstudioSectionProps {
  expedienteId: string
  onPagoCompletado?: () => void
  /** Rol del usuario actual — el solicitante ve un CTA "Pagar ahora" en lugar
   *  de los controles del gestor (enviar link / pagar él). */
  userRole?: string
  /** Si true, renderiza null cuando no hay acción relevante (sin_definir /
   *  cancelado). Útil para incluir la sección en el tab Resumen sin dejar
   *  un bloque vacío cuando el pago aún no aplica. */
  hideIfNoAction?: boolean
  /** Datos del solicitante del expediente — precargan el modal "Enviar link de
   *  pago al arrendatario" (el usuario igual puede editarlos antes de enviar). */
  solicitanteNombre?: string
  solicitanteEmail?: string
  solicitanteTelefono?: string | null
}

export function PagoEstudioSection({ expedienteId, onPagoCompletado, userRole, hideIfNoAction, solicitanteNombre, solicitanteEmail, solicitanteTelefono }: PagoEstudioSectionProps) {
  // Refresco en sitio cuando el detalle del estudio recarga.
  const version = useRefrescoExpediente()
  const [estado, setEstado] = useState<IPagoEstudioEstado | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmLiberar, setConfirmLiberar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // No se pudo LEER el estado (la primera vez): sin esto la tarjeta desaparecía
  // y el prospecto no veía ni "Pagar" ni un error.
  const [errorCarga, setErrorCarga] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [saldoCreditos, setSaldoCreditos] = useState<ISaldoCreditos | null>(null)
  const puedeUsarCreditos = userRole === 'inmobiliaria'
  // Opción B (Adenda 2 §7): el gestor paga él mismo por Mercado Pago. Ya no
  // existe "el costo queda a mi cargo" (a cuenta): no se aprobó.
  const numOpcionesPago = (puedeUsarCreditos ? 1 : 0) + 2
  // El checkout pendiente es de la agencia (opción B), no un enlace enviado al
  // prospecto: se ofrece reabrirlo en vez de "reenviar correo". Lo dice el API
  // (`paga`), no el correo de quien mira: otro miembro de la agencia veía el
  // cobro B como "Esperando pago del arrendatario" y se lo reenviaba al prospecto.
  const pagaGestor = (estado as IEstadoConPagador | null)?.paga === 'gestor'

  const fetchEstado = useCallback(async () => {
    try {
      const data = await pagoEstudioService.getEstado(expedienteId)
      setEstado(data)
      setErrorCarga(false)
    } catch {
      // Con un estado ya cargado se sigue mostrando el último.
      setErrorCarga(true)
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

  useEffect(() => { fetchEstado() }, [fetchEstado, version])
  useEffect(() => { fetchSaldo() }, [fetchSaldo, version])

  // Polling automático mientras esperamos pago. Cuando el solicitante paga
  // por Stripe, el webhook tarda 1-3 seg en marcar el pago como 'completado'
  // — sin esto el panel queda mostrando "pendiente" hasta que el usuario
  // refresque a mano. Polling cada 12 seg, solo en estados donde tiene sentido.
  // Cuando detectamos que ya no está pendiente, llamamos onPagoCompletado
  // para que el expediente padre haga refetch (estudio + UI).
  useEffect(() => {
    if (!estado) return
    // 'esperando_autorizacion' también es espera: cuando el arrendatario firme,
    // el backend le genera el cobro solo y este panel tiene que enterarse.
    const enEspera =
      estado.estado === 'pendiente' || estado.estado === 'procesando' || estado.estado === 'esperando_autorizacion'
    if (!enEspera) return

    const id = setInterval(async () => {
      if (document.hidden) return // pestaña oculta: no se pregunta
      const fresco = await pagoEstudioService.getEstado(expedienteId).catch(() => null)
      if (!fresco) return
      setEstado(fresco)
      if (fresco.estado !== 'pendiente' && fresco.estado !== 'procesando' && fresco.estado !== 'esperando_autorizacion') {
        onPagoCompletado?.()
      }
    }, 12000)
    return () => clearInterval(id)
  }, [estado, expedienteId, onPagoCompletado])

  // P22: el saldo en contra (compra contracargada) se resta de lo disponible;
  // se ofrece crédito solo si queda saldo efectivo (si no, la API da 409).
  const creditosEnContra = saldoCreditos?.creditos_en_contra ?? 0
  const saldoUsable = saldoCreditos?.saldo_efectivo ?? saldoCreditos?.saldo_total ?? 0
  const hayCreditosUsables = saldoUsable > 0

  const handleLiberarCredito = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await creditosEstudiosService.liberarEstudio(expedienteId)
      await Promise.all([fetchEstado(), fetchSaldo()])
      toast.success('Crédito descontado. La evaluación arranca de inmediato.')
      onPagoCompletado?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al liberar el estudio con credito')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Opción B: abre el checkout de Mercado Pago. Al volver, /pago/resultado
  // concilia el pago y trae al gestor de vuelta a este estudio.
  const handlePagar = async (reemplazarPendiente = false) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const pago = await pagoEstudioService.pagar(expedienteId, reemplazarPendiente)
      if (!pago.payment_link_url) throw new Error('La pasarela no devolvió el enlace de pago. Intenta de nuevo.')
      window.location.assign(pago.payment_link_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el pago')
      setIsSubmitting(false)
    }
  }

  // Email corregido para el reenvío del link. null = no está editando (el
  // reenvío va al email guardado). Un email mal escrito no debe ser callejón
  // sin salida: /enviar-link responde 409 mientras haya un pago pendiente.
  const [reenviarEmail, setReenviarEmail] = useState<string | null>(null)

  const handleReenviar = async () => {
    const emailNuevo = reenviarEmail?.trim().toLowerCase()
    if (reenviarEmail !== null && (!emailNuevo || !/.+@.+\..+/.test(emailNuevo))) {
      setError('Ingresa un correo válido para reenviar el link')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const registrado = (estado?.pago?.email_pagador ?? '').toLowerCase()
      await pagoEstudioService.reenviar(
        expedienteId,
        emailNuevo && emailNuevo !== registrado ? { email_pagador: emailNuevo } : undefined,
      )
      setError(null)
      setReenviarEmail(null)
      await fetchEstado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reenviar link')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Inmobiliaria: el "cancelar" del estado pendiente cobra con crédito (no asume gratis).
  const handleCancelarYLiberar = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await pagoEstudioService.cancelarYLiberarCredito(expedienteId)
      await Promise.all([fetchEstado(), fetchSaldo()])
      onPagoCompletado?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar y liberar con crédito')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Inmobiliaria paga con crédito; los demás (propietario/admin) pagan ellos
  // mismos por Mercado Pago (opción B).
  const cancelarConCredito = userRole === 'inmobiliaria'
  const onCancelar = cancelarConCredito ? handleCancelarYLiberar : () => { void handlePagar(true) }
  const labelCancelar = cancelarConCredito ? 'Cancelar y liberar con crédito' : 'Cancelar y pagar yo (Mercado Pago)'

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg p-6 h-32" />
    )
  }

  if (!estado) {
    if (!errorCarga) return null
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">No pudimos consultar el estado del pago del estudio.</p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true)
            void fetchEstado()
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          <IconRefresh size={16} /> Reintentar
        </button>
      </div>
    )
  }

  // ── Vista solicitante ─────────────────────────────────────────────────
  // El solicitante no puede "pagar por el gestor" ni "enviar link". Solo paga si hay
  // link de Stripe generado, o espera a que definan la forma de pago.
  if (userRole === 'solicitante') {
    if (hideIfNoAction && (estado.estado === 'sin_definir' || estado.estado === 'cancelado' || estado.estado === 'esperando_autorizacion')) {
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
              <IconAlertTriangle size={20} className="text-amber-600" />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Acción requerida: define quién paga el estudio
                <span className="ml-2 inline-flex px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide rounded-full bg-amber-200 text-amber-900">paso obligatorio</span>
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">
                La evaluación crediticia <span className="font-semibold">no puede ejecutarse</span> hasta que elijas una de
                estas opciones. Monto: <span className="font-semibold text-gray-900">{estado.monto_formateado} COP</span>.
              </p>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${numOpcionesPago >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
              {/* Liberar con credito (inmobiliaria) */}
              {puedeUsarCreditos && (
                hayCreditosUsables ? (
                  <>
              <ConfirmDialog
                    isOpen={confirmLiberar}
                    onClose={() => setConfirmLiberar(false)}
                    onConfirm={() => {
                      setConfirmLiberar(false)
                      return handleLiberarCredito()
                    }}
                    isLoading={isSubmitting}
                    title="Liberar con crédito"
                    message={`Se descuenta 1 crédito de tu saldo (${saldoUsable} disponibles) y la evaluación arranca de inmediato. No se puede deshacer.`}
                    confirmLabel="Descontar 1 crédito"
                  />
                  <button
                    onClick={() => setConfirmLiberar(true)}
                    disabled={isSubmitting}
                    className="flex flex-col items-center gap-1.5 p-4 bg-white border-2 border-emerald-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-colors disabled:opacity-50 text-center"
                  >
                    <IconShieldCheck size={32} className="text-emerald-600" />
                    <span className="text-sm font-semibold text-gray-900">Liberar con crédito</span>
                    <span className="text-xs text-emerald-700 font-medium">Saldo: {saldoUsable} estudios</span>
                    <span className="text-[11px] text-gray-500 leading-snug">Descuenta 1 crédito y el proceso sigue de inmediato.</span>
                  </button>
                  </>
                ) : (
                  <Link
                    href="/configuracion/creditos-estudios"
                    className="flex flex-col items-center gap-1.5 p-4 bg-white border-2 border-amber-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-colors text-center"
                  >
                    <IconDollarSign size={32} className="text-amber-600" />
                    <span className="text-sm font-semibold text-gray-900">Comprar paquete</span>
                    <span className="text-xs text-amber-700">
                      {creditosEnContra > 0 ? `${creditosEnContra} en contra` : 'Sin créditos disponibles'}
                    </span>
                    <span className="text-[11px] text-gray-500 leading-snug">
                      {creditosEnContra > 0
                        ? 'Una compra se reversó con el banco: lo usado se descuenta de tu próxima compra.'
                        : 'Compra créditos con descuento por volumen.'}
                    </span>
                  </Link>
                )
              )}
              <button
                onClick={() => { void handlePagar() }}
                disabled={isSubmitting}
                className="flex flex-col items-center gap-1.5 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50/50 transition-colors disabled:opacity-50 text-center"
              >
                <IconCreditCard size={32} className="text-primary-600" />
                <span className="text-sm font-semibold text-gray-900">Pagar ahora con Mercado Pago</span>
                <span className="text-xs text-gray-500">Tarjeta o PSE</span>
                <span className="text-[11px] text-gray-500 leading-snug">El estudio sigue cuando se confirma el pago.</span>
              </button>
              <button
                onClick={() => setShowLinkModal(true)}
                disabled={isSubmitting}
                className="flex flex-col items-center gap-1.5 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50/50 transition-colors disabled:opacity-50 text-center"
              >
                <IconMail size={32} className="text-primary-600" />
                <span className="text-sm font-semibold text-gray-900">Enviar link al arrendatario</span>
                <span className="text-xs text-gray-500">Él paga con tarjeta o PSE</span>
                <span className="text-[11px] text-gray-500 leading-snug">Primero le pedimos la autorización; el cobro le llega apenas la firme.</span>
              </button>
          </div>
        </div>
      )}

      {/* Opción C antes de la autorización (§6.3). Todavía no hay fila de
          pago: el cobro se le genera al autorizar. La espera ya la dicen la
          tarjeta del estado y la de autorización; aquí va solo lo del cobro.
          Los escapes siguen disponibles porque no hay link vivo que cancelar. */}
      {estado.estado === 'esperando_autorizacion' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <IconClock size={20} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Cobro al prospecto: {estado.monto_formateado} COP</p>
              <p className="text-xs text-amber-600">
                Le llega apenas autorice la consulta, y la evaluación corre cuando el pago se confirme.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {puedeUsarCreditos && hayCreditosUsables && (
              <>
              <ConfirmDialog
                    isOpen={confirmLiberar}
                    onClose={() => setConfirmLiberar(false)}
                    onConfirm={() => {
                      setConfirmLiberar(false)
                      return handleLiberarCredito()
                    }}
                    isLoading={isSubmitting}
                    title="Liberar con crédito"
                    message={`Se descuenta 1 crédito de tu saldo (${saldoUsable} disponibles) y la evaluación arranca de inmediato. No se puede deshacer.`}
                    confirmLabel="Descontar 1 crédito"
                  />
                  <button
                onClick={() => setConfirmLiberar(true)}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-md hover:bg-amber-200 transition-colors disabled:opacity-50"
              >
                Liberar con crédito
              </button>
              </>
            )}
            <button
              onClick={() => { void handlePagar() }}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              Pagar yo con Mercado Pago
            </button>
          </div>
        </div>
      )}

      {/* Asumido por inmobiliaria */}
      {estado.estado === 'asumido_inmobiliaria' && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <IconCheckCircle size={20} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Cubierto por inmobiliaria</p>
            <p className="text-xs text-green-600">
              {estado.monto_formateado} COP — el enlace de autorización ya se envió al arrendatario; el estudio corre cuando firme.
            </p>
          </div>
        </div>
      )}

      {/* P1: la evaluación se devolvió. El API no manda el motivo (estudio sin
          consulta, contracargo, reembolso a mano): el texto no lo supone. */}
      {estado.estado === 'reembolsado' && (
        <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <IconRefresh size={20} className="text-gray-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-800">Evaluación devuelta</p>
            <p className="text-xs text-gray-600">{estado.monto_formateado} COP — esta evaluación se devolvió.</p>
          </div>
        </div>
      )}

      {/* Completado (via pasarela) */}
      {estado.estado === 'completado' && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <IconCheckCircle size={20} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Pago confirmado</p>
            <p className="text-xs text-green-600">{estado.monto_formateado} COP — la evaluación crediticia ya puede ejecutarse</p>
          </div>
        </div>
      )}

      {/* Pendiente — checkout del propio gestor (opción B) */}
      {estado.estado === 'pendiente' && pagaGestor && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-amber-800">El pago de la agencia está pendiente en Mercado Pago</p>
            <p className="text-xs text-amber-600">{estado.monto_formateado} COP — el estudio sigue cuando se confirme.</p>
          </div>
          {estado.pago?.payment_link_url && (
            <a
              href={estado.pago.payment_link_url}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-primary-700 rounded-md hover:bg-primary-800 transition-colors"
            >
              Abrir Mercado Pago
            </a>
          )}
        </div>
      )}

      {/* Pendiente — enlace enviado al arrendatario */}
      {estado.estado === 'pendiente' && !pagaGestor && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <IconClock size={20} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {estado.autorizado ? 'Ya autorizó — esperando su pago' : 'Esperando pago del arrendatario'}
              </p>
              <p className="text-xs text-amber-600">{estado.monto_formateado} COP — Link enviado a {estado.pago?.email_pagador}</p>
            </div>
          </div>

          {/* Corregir el email destino: el mismo link se reenvía al corregido
              (no se puede re-crear el link mientras el pago siga pendiente). */}
          {reenviarEmail !== null && (
            <div className="mb-3">
              <label htmlFor="pago-reenviarEmail" className="block text-[11px] font-medium text-amber-800 mb-1">
                Correo destino corregido
              </label>
              <input id="pago-reenviarEmail"
                type="email"
                value={reenviarEmail}
                onChange={(e) => setReenviarEmail(e.target.value)}
                disabled={isSubmitting}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleReenviar}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-md hover:bg-amber-200 transition-colors disabled:opacity-50"
            >
              {reenviarEmail !== null ? 'Reenviar al correo corregido' : 'Reenviar correo'}
            </button>
            {reenviarEmail === null ? (
              <button
                onClick={() => setReenviarEmail(estado.pago?.email_pagador ?? '')}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                Corregir correo
              </button>
            ) : (
              <button
                onClick={() => setReenviarEmail(null)}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancelar corrección
              </button>
            )}
            <button
              onClick={onCancelar}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {labelCancelar}
            </button>
          </div>
        </div>
      )}

      {/* Procesando — PSE/efectivo en proceso en la pasarela */}
      {estado.estado === 'procesando' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconLoader size={20} className="text-blue-600 shrink-0 animate-spin" />
            <div>
              <p className="text-sm font-medium text-blue-800">Pago en proceso</p>
              <p className="text-xs text-blue-600">
                {estado.monto_formateado} COP — el pago se inició (PSE/efectivo); se confirma automáticamente.
              </p>
              {/* Sin "cancelar": el PSE o el recibo de efectivo ya salió y
                  cancelarlo cobraría el estudio dos veces (el API responde 409). */}
              <p className="text-xs text-blue-600">
                Si el pago vence, podrás {cancelarConCredito ? 'liberarlo con crédito' : 'pagarlo tú'}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fallido */}
      {estado.estado === 'fallido' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <IconAlertTriangle size={20} className="text-red-600 shrink-0" />
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
              onClick={() => { void handlePagar() }}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Pagar yo con Mercado Pago
            </button>
            {/* El API cierra el cobro fallido (su link seguía pagable) y descuenta el crédito. */}
            {cancelarConCredito && hayCreditosUsables && (
              <button
                onClick={handleCancelarYLiberar}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Liberar con crédito
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal: enviar link al arrendatario */}
      <EnviarLinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        expedienteId={expedienteId}
        montoFormateado={estado.monto_formateado}
        defaultNombre={solicitanteNombre}
        defaultEmail={solicitanteEmail}
        defaultTelefono={solicitanteTelefono}
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
  defaultNombre,
  defaultEmail,
  defaultTelefono,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  expedienteId: string
  montoFormateado: string
  defaultNombre?: string
  defaultEmail?: string
  defaultTelefono?: string | null
  onSuccess: () => void
}) {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Precargar con los datos del solicitante del expediente cada vez que se abre
  // el modal. Son editables antes de enviar.
  useEffect(() => {
    if (isOpen) {
      setNombre(defaultNombre ?? '')
      setEmail(defaultEmail ?? '')
      setTelefono(defaultTelefono ?? '')
      setError(null)
    }
  }, [isOpen, defaultNombre, defaultEmail, defaultTelefono])

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
    <Modal isOpen={isOpen} onClose={handleClose} title="Enviar al arrendatario (autorización y luego el cobro)" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
          {/* §6.3: lo primero que recibe el arrendatario es la AUTORIZACIÓN.
              El cobro se le genera y se le envía cuando la firme. */}
          <p className="text-sm text-primary-800 mb-2">
            Le enviaremos primero el enlace para <span className="font-medium">autorizar la consulta en centrales</span>.
            Apenas lo firme le llega automáticamente el cobro a este mismo correo y WhatsApp.
          </p>
          <p className="text-sm text-primary-800">
            <span className="font-medium">Concepto:</span> Estudio de arrendamiento
          </p>
          <p className="text-sm text-primary-800">
            <span className="font-medium">Monto:</span> {montoFormateado} COP
          </p>
        </div>

        <div>
          <label htmlFor="pago-nombre" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del arrendatario <span className="text-red-500">*</span>
          </label>
          <input id="pago-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="pago-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email del arrendatario <span className="text-red-500">*</span>
          </label>
          <input id="pago-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </div>

        <PhoneInput
          label="Teléfono (opcional)"
          value={telefono}
          onChange={setTelefono}
          placeholder="300 123 4567"
          disabled={isSubmitting}
        />

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
            className="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <IconLoader size={16} className="animate-spin" />
            )}
            {isSubmitting ? 'Enviando...' : 'Enviar al arrendatario'}
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
  // Solo "recibimos tu pago" (y su factura) si pagó él: en la opción B el pago
  // lo hace el gestor con su correo y el estado igual es 'completado'.
  const pagoPropio = estado.estado === 'completado' && (estado as IEstadoConPagador).paga === 'arrendatario'
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
      // Adenda 2 §7, opción B: el estudio lo pagó la inmobiliaria (o el
      // propietario). La factura va a su nombre y no la emite el solicitante.
      if (preview.a_nombre_de_quien_pago || !preview.datos_actuales) {
        toast.message('Este estudio lo pagó quien te arrienda: la factura sale a su nombre.')
        return
      }
      if (preview.faltantes.length > 0) {
        toast.error(
          'Completa tus datos fiscales en Facturación → Datos Fiscales antes de emitir la factura.',
        )
        // Damos un beat para que el toast se vea antes de navegar.
        setTimeout(() => {
          window.location.href = '/facturacion#datos-fiscales'
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
            <IconCheckCircle size={20} className="text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">
                {pagoPropio
                  ? '¡Pago confirmado!'
                  : estado.estado === 'asumido_inmobiliaria'
                    ? 'Costo cubierto por la inmobiliaria'
                    : 'Costo de la evaluación cubierto'}
              </p>
              <p className="text-xs text-green-600">
                {estado.monto_formateado} COP — {pagoPropio ? 'Recibimos tu pago correctamente.' : 'El costo de la evaluación ya está cubierto.'}
              </p>
            </div>
          </div>

          {/* Acciones de facturacion — solo si fue un pago propio (no asumido) y hay pagoId */}
          {pagoPropio && pagoId && (
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
                  <IconArrowRight size={14} />
                </Link>
              ) : (
                <button
                  onClick={handleFacturarClick}
                  disabled={facturando}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {facturando && (
                    <IconLoader size={14} className="animate-spin" />
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

  // Opción B: la agencia paga la evaluación. Su checkout no es del prospecto
  // (el API ni siquiera le manda el enlace).
  if ((estado as IEstadoConPagador).paga === 'gestor' && ['pendiente', 'procesando', 'fallido'].includes(estado.estado)) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-semibold text-blue-900 mb-0.5">Quien gestiona tu estudio está pagando la evaluación</p>
        <p className="text-sm text-blue-800">No tienes que pagar nada. Te avisaremos cuando la evaluación avance.</p>
      </div>
    )
  }

  // Procesando (PSE/efectivo): el pago está en manos del medio de pago — no
  // ofrecer "Pagar ahora" de nuevo ni decir que falta definir la forma de pago.
  if (estado.estado === 'procesando') {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <IconLoader size={20} className="text-blue-700 shrink-0 animate-spin mt-0.5" />
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
            <IconCreditCard size={24} className="text-primary-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Paga tu evaluación crediticia</h3>
            <p className="text-sm text-gray-600 mb-1">
              Monto a pagar: <span className="font-semibold text-gray-900">{estado.monto_formateado} COP</span>
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Ya firmaste tu autorización. Serás redirigido a la pasarela de pago segura y, al confirmarse el pago,
              ejecutamos la consulta en centrales de riesgo.
            </p>
            <a
              href={linkPago}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 transition-colors shadow-sm"
            >
              Pagar ahora
              <IconArrowRight size={16} />
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

  // P1: la evaluación se devolvió. Sin motivo del API, el texto no lo supone.
  if (estado.estado === 'reembolsado') {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm font-medium text-gray-800">La evaluación se devolvió</p>
        <p className="text-xs text-gray-500 mt-1">Esta evaluación se devolvió a quien la pagó.</p>
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

  // §6.3: ya se definió que paga él, pero primero tiene que autorizar. NO se le
  // muestra ningún CTA de pago: cobrar antes de autorizar es justo lo que el
  // requisito prohíbe (y todavía no existe fila de pago que cobrar).
  if (estado.estado === 'esperando_autorizacion') {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-medium text-blue-800">Firma primero tu autorización</p>
        <p className="text-xs text-blue-600 mt-1">
          Te enviamos por correo y WhatsApp el enlace para autorizar la consulta en centrales de riesgo.
          Apenas lo firmes te llega el enlace de pago ({estado.monto_formateado} COP).
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
  municipio_codigo: 'Municipio',
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
  const accessToken = useAuthStore((s) => s.accessToken)
  // Solo se guarda el código DANE; el nombre es para que el campo lo muestre.
  const [municipioNombre, setMunicipioNombre] = useState('')

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
        Necesitamos completar tus datos para emitir la factura electrónica ante la DIAN. Solo se
        usan en esta factura — no se guardan en tu perfil.
      </div>

      {faltantes.includes('numero_documento') && (
        <div>
          <label htmlFor="pago-datos-numero_documento" className="block text-sm font-medium text-gray-700 mb-1">
            {PAGO_FACTURA_LABEL.numero_documento} <span className="text-red-500">*</span>
          </label>
          <input id="pago-datos-numero_documento"
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
          <label htmlFor="pago-datos-direccion" className="block text-sm font-medium text-gray-700 mb-1">
            {PAGO_FACTURA_LABEL.direccion} <span className="text-red-500">*</span>
          </label>
          <input id="pago-datos-direccion"
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
            <label htmlFor="pago-datos-email" className="block text-sm font-medium text-gray-700 mb-1">
              {PAGO_FACTURA_LABEL.email} <span className="text-red-500">*</span>
            </label>
            <input id="pago-datos-email"
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
            <label htmlFor="pago-datos-telefono" className="block text-sm font-medium text-gray-700 mb-1">
              {PAGO_FACTURA_LABEL.telefono} <span className="text-red-500">*</span>
            </label>
            <input id="pago-datos-telefono"
              type="tel"
              value={datos.telefono || ''}
              onChange={(e) => set('telefono', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="3001234567"
            />
          </div>
        )}
      </div>

      {/* El buscador de municipios en vez de pedir el "código DANE": el
          arrendatario escribe "Medellín" y el código lo pone el catálogo. */}
      {faltantes.includes('municipio_codigo') && (
        <MunicipioCombobox
          value={datos.municipio_codigo ? { codigo: datos.municipio_codigo, nombre: municipioNombre } : null}
          onChange={(v) => {
            set('municipio_codigo', v?.codigo ?? '')
            setMunicipioNombre(v?.nombre ?? '')
          }}
          authToken={accessToken ?? undefined}
        />
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
          className="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-md hover:bg-primary-800 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && (
            <IconLoader size={16} className="animate-spin" />
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
  ppt: 'Permiso por Protección Temporal (PPT)',
  pep: 'Permiso Especial de Permanencia (PEP)',
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
          className="px-4 py-2 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && (
            <IconLoader size={16} className="animate-spin" />
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
