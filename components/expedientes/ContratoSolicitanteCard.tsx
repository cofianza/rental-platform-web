/**
 * ContratoSolicitanteCard — estado del contrato visto desde el solicitante.
 *
 * Estados visibles:
 *   - borrador / en_revision / aprobado → "Preparando su contrato..." (no accionable)
 *   - pendiente_firma → CTA revisar PDF + aviso: primero el correo de identidad, luego el WhatsApp de firma
 *   - firma_incompleta (V3) → la firma venció o alguien la rechazó; la inmobiliaria la reenvía
 *   - firmado (por ambas partes, pendiente activación) → "Contrato firmado, esperando activación"
 *   - vigente → "¡Contrato activo!" con botón descargar firmado
 *   - cancelado / finalizado → banner informativo
 *
 * Auto-oculto si no existe contrato aún (p. ej. estudio apenas aprobado).
 * Patrón idéntico al de EstudioSolicitanteCard.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { contratoService } from '@/services/contratoService'
import { firmaService } from '@/services/firmaService'
import type { IContrato } from '@/types/contrato'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'
import { abrirEnPestana } from '@/lib/utils'
import { IconAlertTriangle, IconCheckCircle, IconClock, IconDownload, IconRefresh } from '@/components/icons'

// Fechas date-only (YYYY-MM-DD): construir al mediodia UTC para que toLocaleDateString
// con cualquier zona horaria America no reste un dia. Sin esto, "2026-06-02" sale
// como "1 de junio" en Colombia (UTC-5) porque Date('2026-06-02') es UTC midnight.
function parseDateOnly(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) {
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0))
  }
  return new Date(s)
}

interface ContratoSolicitanteCardProps {
  expedienteId: string
  /** Estado actual del expediente. Permite mostrar "esperando contrato" cuando
   *  el expediente ya está aprobado pero todavía no hay contrato generado. */
  expedienteEstado?: string
}

export function ContratoSolicitanteCard({ expedienteId, expedienteEstado }: ContratoSolicitanteCardProps) {
  // Refresco en sitio cuando el detalle del estudio recarga.
  const version = useRefrescoExpediente()
  const [contrato, setContrato] = useState<IContrato | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [solicitudId, setSolicitudId] = useState<string | null>(null)
  // Multi-parte (un sobre para todos): la API no deja cambiar el correo del
  // firmante, así que "Reenviar a otro correo" siempre fallaba.
  const [esMultiparte, setEsMultiparte] = useState(false)
  const [showResendForm, setShowResendForm] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)

  const fetchContrato = useCallback(async () => {
    try {
      const res = await contratoService.getContratosForExpediente(expedienteId, { page: 1, limit: 5 })
      // Tomamos el contrato activo más reciente (ignoramos cancelados/finalizados
      // salvo que sea el único). Prioridad: vigente > firmado > pendiente_firma > resto.
      const prioridad: Record<string, number> = {
        vigente: 5, firmado: 4, pendiente_firma: 3, firma_incompleta: 3, aprobado: 2,
        en_revision: 1, borrador: 1, cancelado: 0, finalizado: 0,
      }
      const ordered = [...res.data].sort((a, b) => {
        const p = (prioridad[b.estado] ?? 0) - (prioridad[a.estado] ?? 0)
        if (p !== 0) return p
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setContrato(ordered[0] ?? null)
      setErrorCarga(false)
    } catch {
      // Se conserva lo ya cargado (un refresco que falla no borra la tarjeta).
      setErrorCarga(true)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchContrato() }, [fetchContrato, version])

  // Polling sutil mientras está en estados previos a pendiente_firma, para
  // que el solicitante no tenga que recargar al momento en que se genera/aprueba.
  useEffect(() => {
    if (!contrato) return
    const esperando = ['borrador', 'en_revision', 'aprobado', 'firmado'].includes(contrato.estado)
    if (!esperando) return
    const id = setInterval(() => {
      if (!document.hidden) fetchContrato() // pestaña oculta: no se pregunta
    }, 10000)
    return () => clearInterval(id)
  }, [contrato, fetchContrato])

  // Cuando el contrato pasa a pendiente_firma, cargamos el id de la solicitud
  // de firma activa para poder ofrecer "reenviar correo a otro destinatario".
  // Un V3 no tiene solicitudes (su firma va por Auco, en orden): no aplica.
  useEffect(() => {
    if (contrato?.estado !== 'pendiente_firma' || contrato.destinacion) {
      setSolicitudId(null)
      setEsMultiparte(false)
      return
    }
    firmaService
      .listarPorContrato(contrato.id)
      .then((solicitudes) => {
        const activa = solicitudes.find(
          (s) => s.estado !== 'cancelado' && s.estado !== 'firmado',
        )
        setSolicitudId(activa?.id ?? null)
      })
      .catch(() => setSolicitudId(null))
    firmaService
      .listarFirmantes(contrato.id)
      .then(({ firmantes }) => setEsMultiparte(firmantes.length > 0))
      .catch(() => setEsMultiparte(false))
  }, [contrato])

  const handleResend = async (toAlternativeEmail: boolean) => {
    if (!solicitudId) {
      toast.error('No se encontró la solicitud de firma activa.')
      return
    }
    if (toAlternativeEmail) {
      const email = resendEmail.trim()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error('Ingrese un correo válido.')
        return
      }
    }
    setResending(true)
    try {
      await firmaService.reenviarSolicitudSelf(solicitudId, {
        email_alternativo: toAlternativeEmail ? resendEmail.trim() : undefined,
      })
      toast.success(
        toAlternativeEmail
          ? `Enlace de firma reenviado a ${resendEmail.trim()}`
          : 'Enlace de firma reenviado a su WhatsApp y correo registrados.',
      )
      setShowResendForm(false)
      setResendEmail('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo reenviar el correo.'
      toast.error(msg)
    } finally {
      setResending(false)
    }
  }

  const handleDescargar = async (firmado: boolean) => {
    if (!contrato) return
    setDownloading(true)
    try {
      const abierto = await abrirEnPestana(async () => {
        const res = firmado
          ? await contratoService.descargarContratoFirmado(contrato.id)
          : await contratoService.descargarContrato(contrato.id)
        return res?.url
      })
      if (!abierto) {
        toast.error('No pudimos generar el enlace de descarga. Intente de nuevo.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No pudimos descargar el contrato.'
      toast.error(msg)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return null

  if (errorCarga && !contrato) {
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-red-800">No pudimos cargar el estado de su contrato.</p>
        <button
          type="button"
          onClick={() => fetchContrato()}
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 sm:self-auto"
        >
          <IconRefresh size={16} /> Reintentar
        </button>
      </div>
    )
  }

  // Sin contrato todavía.
  //   - Si el expediente está APROBADO → aviso "preparando contrato".
  //   - Si está CONDICIONADO → no mostramos nada del contrato. El propietario
  //     debe revisar la documentación adicional y aprobar manualmente; recién
  //     ahí pasa a 'aprobado' y se genera el contrato. La card "Estudio
  //     condicionado" (mostrada en otro componente) ya explica el siguiente
  //     paso al solicitante, así que aquí ocultamos para no confundirlo con
  //     un mensaje incorrecto que promete contrato inminente.
  //   - Otros estados → el siguiente paso aún no es contrato.
  if (!contrato) {
    if (expedienteEstado === 'aprobado') {
      return (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <IconClock size={20} className="text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-0.5">Preparando su contrato</p>
              <p className="text-sm text-blue-800">
                ¡Su estudio fue aprobado! Quien tramita su arriendo está preparando el contrato de arrendamiento; le llegará por WhatsApp en cuanto esté listo para firmar.
              </p>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Borrador / en_revision / aprobado → contrato aún no listo para el solicitante.
  if (contrato.estado === 'borrador' || contrato.estado === 'en_revision' || contrato.estado === 'aprobado') {
    return (
      <div className="border border-blue-200 bg-blue-50 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <IconClock size={20} className="text-blue-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-0.5">Preparando su contrato</p>
            <p className="text-sm text-blue-800">
              Quien tramita su arriendo está preparando y revisando su contrato de arrendamiento. Le avisaremos por WhatsApp cuando esté listo para firmar.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // pendiente_firma → revisar + aviso de firma por WhatsApp.
  if (contrato.estado === 'pendiente_firma') {
    const tienePdf = Boolean(contrato.contenido_pdf_url || contrato.storage_key)
    return (
      <div className="border-2 border-primary-200 bg-primary-50/40 rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Su contrato está listo para firmar</h3>
        <p className="text-sm text-gray-600 mb-4">
          Revise el contrato antes de firmar. Primero le llega un correo de Cofianza para confirmar su identidad (el
          enlace vence en 72 horas). Cuando lo haga, le llega por WhatsApp el enlace seguro para firmar, cuando sea su
          turno: ábralo y siga las instrucciones.
        </p>

        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-2">
          {/* "Versión: v1" es numeración interna: al arrendatario no le dice
              nada. Solo aporta cuando hubo una versión anterior. */}
          {contrato.version > 1 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Versión:</span>
              <span className="font-medium text-gray-900">v{contrato.version}</span>
            </div>
          )}
          {contrato.duracion_meses && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Duración:</span>
              <span className="font-medium text-gray-900">{contrato.duracion_meses} meses</span>
            </div>
          )}
          {contrato.fecha_inicio && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Inicio:</span>
              <span className="font-medium text-gray-900">
                {parseDateOnly(contrato.fecha_inicio).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        {tienePdf ? (
          <button
            onClick={() => handleDescargar(false)}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary-700 bg-white border-2 border-primary-600 rounded-lg hover:bg-primary-50 disabled:opacity-50 transition-colors"
          >
            {downloading ? 'Abriendo…' : 'Revisar contrato (PDF)'}
            <IconDownload size={16} />
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
            <IconAlertTriangle size={16} className="shrink-0" />
            <span>El PDF del contrato aún no está disponible. Quien tramita su arriendo lo adjuntará en breve; le avisaremos por WhatsApp.</span>
          </div>
        )}

        {/* Reenviar la solicitud es del flujo anterior: un V3 no tiene solicitudes (Auco avisa en orden). */}
        {!contrato.destinacion && (
          <div className="mt-4 pt-4 border-t border-primary-100">
            {!showResendForm ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                {/* "Auco" es el proveedor de firma: el arrendatario no sabe
                    quién es y leerlo aquí solo genera desconfianza. */}
                <p className="text-xs text-gray-500">
                  {esMultiparte
                    ? '¿No le llegó el WhatsApp de firma? Pídalo de nuevo. Si su número o correo cambió, pídale a quien tramita su arriendo que lo actualice.'
                    : '¿No recibió el WhatsApp de firma? Pídalo de nuevo: le llega por WhatsApp y correo, o rediríjalo a otra dirección.'}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleResend(false)}
                    disabled={resending || !solicitudId}
                    className="inline-flex min-h-11 items-center text-sm font-medium text-primary-700 hover:text-primary-800 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {resending ? 'Reenviando…' : 'Reenviar WhatsApp / correo'}
                  </button>
                  {!esMultiparte && (
                    <>
                      <span className="self-center text-xs text-gray-300">·</span>
                      <button
                        onClick={() => setShowResendForm(true)}
                        disabled={resending || !solicitudId}
                        className="inline-flex min-h-11 items-center text-sm font-medium text-primary-700 hover:text-primary-800 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Reenviar a otro correo
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="contrato-solicitante-card-reenviar-a-otro-correo" className="block text-xs font-medium text-gray-700">
                  Reenviar a otro correo
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input id="contrato-solicitante-card-reenviar-a-otro-correo"
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="otro@correo.com"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    disabled={resending}
                    autoFocus
                  />
                  <button
                    onClick={() => handleResend(true)}
                    disabled={resending || !resendEmail.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-md hover:bg-primary-800 disabled:opacity-50 transition-colors"
                  >
                    {resending ? 'Enviando…' : 'Enviar'}
                  </button>
                  <button
                    onClick={() => {
                      setShowResendForm(false)
                      setResendEmail('')
                    }}
                    disabled={resending}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Le enviaremos un nuevo enlace de firma a esta dirección.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // firma_incompleta (V3): el proceso de firma venció o una parte lo rechazó.
  if (contrato.estado === 'firma_incompleta') {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-lg p-5">
        <p className="text-sm font-semibold text-amber-900 mb-1">La firma del contrato quedó incompleta</p>
        <p className="text-sm text-amber-800">
          El proceso de firma terminó sin la firma de todas las partes (venció el plazo o alguien la rechazó). Quien
          tramita su arriendo puede enviarlo de nuevo a firma: si lo hace, le llegará otra vez el mensaje por WhatsApp.
        </p>
      </div>
    )
  }

  // firmado (por ambas partes, aún no vigente).
  if (contrato.estado === 'firmado') {
    return (
      <div className="border border-green-200 bg-green-50 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <IconCheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-900 mb-0.5">¡Contrato firmado!</p>
            <p className="text-sm text-green-800 mb-3">
              Todas las partes firmaron. Quien tramita su arriendo está activando el contrato; le notificaremos cuando entre en vigencia.
            </p>
            <button
              onClick={() => handleDescargar(true)}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-800 bg-white border border-green-300 rounded-lg hover:bg-green-50 disabled:opacity-50 transition-colors"
            >
              {downloading ? 'Abriendo...' : 'Descargar contrato firmado'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // vigente → contrato activo.
  if (contrato.estado === 'vigente') {
    return (
      <div className="border-2 border-green-200 bg-green-50 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <IconCheckCircle size={24} className="text-green-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-green-900 mb-1">¡Contrato activo!</h3>
            <p className="text-sm text-green-800 mb-3">
              Su arrendamiento está vigente. Ya puede disfrutar de su nuevo hogar.
            </p>
            <button
              onClick={() => handleDescargar(true)}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {downloading ? 'Abriendo…' : 'Descargar contrato'}
              <IconDownload size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // cancelado.
  if (contrato.estado === 'cancelado') {
    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-5">
        <p className="text-sm font-semibold text-red-900 mb-1">Contrato cancelado</p>
        <p className="text-sm text-red-800">
          {contrato.motivo_cancelacion
            ? `Motivo: ${contrato.motivo_cancelacion}`
            : 'Este contrato se canceló. Para más detalles, escríbale a quien tramita su arriendo.'}
        </p>
      </div>
    )
  }

  // finalizado.
  if (contrato.estado === 'finalizado') {
    return (
      <div className="border border-gray-200 bg-gray-50 rounded-lg p-5">
        <p className="text-sm font-semibold text-gray-900 mb-1">Contrato finalizado</p>
        <p className="text-sm text-gray-600">
          Este contrato ya no está vigente. Puede descargarlo para sus registros.
        </p>
        <button
          onClick={() => handleDescargar(true)}
          disabled={downloading}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {downloading ? 'Abriendo...' : 'Descargar copia'}
        </button>
      </div>
    )
  }

  return null
}
