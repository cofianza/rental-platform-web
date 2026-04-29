/**
 * ContratoSolicitanteCard — estado del contrato visto desde el solicitante.
 *
 * Estados visibles:
 *   - borrador / en_revision / aprobado → "Preparando tu contrato..." (no accionable)
 *   - pendiente_firma → CTA revisar PDF + aviso "te enviamos el link de firma por correo"
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

interface ContratoSolicitanteCardProps {
  expedienteId: string
  /** Estado actual del expediente. Permite mostrar "esperando contrato" cuando
   *  el expediente ya está aprobado pero todavía no hay contrato generado. */
  expedienteEstado?: string
}

export function ContratoSolicitanteCard({ expedienteId, expedienteEstado }: ContratoSolicitanteCardProps) {
  const [contrato, setContrato] = useState<IContrato | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [solicitudId, setSolicitudId] = useState<string | null>(null)
  const [showResendForm, setShowResendForm] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)

  const fetchContrato = useCallback(async () => {
    try {
      const res = await contratoService.getContratosForExpediente(expedienteId, { page: 1, limit: 5 })
      // Tomamos el contrato activo más reciente (ignoramos cancelados/finalizados
      // salvo que sea el único). Prioridad: vigente > firmado > pendiente_firma > resto.
      const prioridad: Record<string, number> = {
        vigente: 5, firmado: 4, pendiente_firma: 3, aprobado: 2,
        en_revision: 1, borrador: 1, cancelado: 0, finalizado: 0,
      }
      const ordered = [...res.data].sort((a, b) => {
        const p = (prioridad[b.estado] ?? 0) - (prioridad[a.estado] ?? 0)
        if (p !== 0) return p
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setContrato(ordered[0] ?? null)
    } catch {
      setContrato(null)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchContrato() }, [fetchContrato])

  // Polling sutil mientras está en estados previos a pendiente_firma, para
  // que el solicitante no tenga que recargar al momento en que se genera/aprueba.
  useEffect(() => {
    if (!contrato) return
    const esperando = ['borrador', 'en_revision', 'aprobado', 'firmado'].includes(contrato.estado)
    if (!esperando) return
    const id = setInterval(fetchContrato, 10000)
    return () => clearInterval(id)
  }, [contrato, fetchContrato])

  // Cuando el contrato pasa a pendiente_firma, cargamos el id de la solicitud
  // de firma activa para poder ofrecer "reenviar correo a otro destinatario".
  useEffect(() => {
    if (contrato?.estado !== 'pendiente_firma') {
      setSolicitudId(null)
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
  }, [contrato])

  const handleResend = async (toAlternativeEmail: boolean) => {
    if (!solicitudId) {
      toast.error('No se encontró la solicitud de firma activa.')
      return
    }
    if (toAlternativeEmail) {
      const email = resendEmail.trim()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error('Ingresa un correo válido.')
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
          ? `Correo de firma reenviado a ${resendEmail.trim()}`
          : 'Correo de firma reenviado a tu dirección registrada.',
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
      const res = firmado
        ? await contratoService.descargarContratoFirmado(contrato.id)
        : await contratoService.descargarContrato(contrato.id)
      if (res?.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer')
      } else {
        toast.error('No pudimos generar el link de descarga. Intenta de nuevo.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No pudimos descargar el contrato.'
      toast.error(msg)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return null

  // Sin contrato todavía. Si el expediente ya fue aprobado, mostramos un
  // mensaje "esperando generación" para que el solicitante sepa qué viene;
  // si no, el siguiente paso aún no corresponde al contrato → ocultamos.
  if (!contrato) {
    if (expedienteEstado === 'aprobado' || expedienteEstado === 'condicionado') {
      return (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-blue-700 shrink-0 animate-spin mt-0.5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-0.5">Preparando tu contrato</p>
              <p className="text-sm text-blue-800">
                ¡Tu estudio fue aprobado! La inmobiliaria está generando el contrato de arrendamiento — te llegará por correo y WhatsApp en cuanto esté listo para firmar.
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
          <svg className="h-5 w-5 text-blue-700 shrink-0 animate-spin mt-0.5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-0.5">Preparando tu contrato</p>
            <p className="text-sm text-blue-800">
              La inmobiliaria está generando y revisando tu contrato de arrendamiento. Te avisaremos por correo cuando esté listo para firmar.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // pendiente_firma → revisar + aviso de firma por correo.
  if (contrato.estado === 'pendiente_firma') {
    const tienePdf = Boolean(contrato.contenido_pdf_url || contrato.storage_key)
    return (
      <div className="border-2 border-primary-200 bg-primary-50/40 rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Tu contrato está listo para firmar</h3>
        <p className="text-sm text-gray-600 mb-4">
          Revisa el contrato antes de firmar. Enviamos a tu correo un enlace seguro con instrucciones — abre el correo desde el mismo dispositivo donde quieras firmar.
        </p>

        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Versión:</span>
            <span className="font-medium text-gray-900">v{contrato.version}</span>
          </div>
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
                {new Date(contrato.fecha_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
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
            {downloading ? 'Abriendo...' : 'Revisar contrato (PDF)'}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.76-2.93L13.76 4a2 2 0 00-3.52 0L3.17 16.07A2 2 0 004.93 19z" />
            </svg>
            <span>El PDF del contrato aún no está disponible. La inmobiliaria lo adjuntará en breve — te avisaremos por correo.</span>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-primary-100">
          {!showResendForm ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-xs text-gray-500">
                ¿No recibiste el correo de firma? Revisa tu carpeta de spam o reenvíalo a otra dirección.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleResend(false)}
                  disabled={resending || !solicitudId}
                  className="text-xs font-medium text-primary-700 hover:text-primary-800 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {resending ? 'Reenviando…' : 'Reenviar al correo registrado'}
                </button>
                <span className="text-xs text-gray-300">·</span>
                <button
                  onClick={() => setShowResendForm(true)}
                  disabled={resending || !solicitudId}
                  className="text-xs font-medium text-primary-700 hover:text-primary-800 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reenviar a otro correo
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Reenviar a otro correo
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
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
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
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
                Te enviaremos un nuevo enlace de firma a esta dirección.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // firmado (por ambas partes, aún no vigente).
  if (contrato.estado === 'firmado') {
    return (
      <div className="border border-green-200 bg-green-50 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-green-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-900 mb-0.5">¡Contrato firmado!</p>
            <p className="text-sm text-green-800 mb-3">
              Ambas partes firmaron. La inmobiliaria está activando el contrato — te notificaremos cuando entre en vigencia.
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
            <svg className="h-6 w-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-green-900 mb-1">¡Contrato activo!</h3>
            <p className="text-sm text-green-800 mb-3">
              Tu arrendamiento está vigente. Ya puedes disfrutar de tu nuevo hogar. 🏠
            </p>
            <button
              onClick={() => handleDescargar(true)}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {downloading ? 'Abriendo...' : 'Descargar contrato'}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
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
            : 'La inmobiliaria canceló este contrato. Contactalos para más detalles.'}
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
          Este contrato ya no está vigente. Puedes descargarlo para tus registros.
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
