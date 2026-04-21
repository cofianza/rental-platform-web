/**
 * EstudioSolicitanteCard — UI del estudio crediticio desde la vista del solicitante.
 *
 * Flujo:
 *   - formulario_completado  → formulario "Confirma tu cédula y envía".
 *   - en_proceso             → "Consultando TransUnion...".
 *   - completado + aprobado  → banner verde.
 *   - completado + condicionado → banner ámbar.
 *   - completado + rechazado → banner rojo.
 *   - fallido                → reintentar.
 *
 * Se auto-oculta si todavía no existe un estudio en un estado relevante
 * (p. ej. antes del pago). Consume /expedientes/:id/estudios y
 * POST /estudios/:id/ejecutar.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { estudioService } from '@/services/estudioService'
import type { IEstudio } from '@/types/estudio'

interface EstudioSolicitanteCardProps {
  expedienteId: string
  onEjecutado?: () => void
}

export function EstudioSolicitanteCard({ expedienteId, onEjecutado }: EstudioSolicitanteCardProps) {
  const [estudio, setEstudio] = useState<IEstudio | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchEstudio = useCallback(async () => {
    try {
      const res = await estudioService.getEstudiosForExpediente(expedienteId, 1, 5)
      // Tomamos el estudio activo más reciente (ignoramos cancelados).
      const activos = res.data.filter((e) => e.estado !== 'cancelado')
      activos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setEstudio(activos[0] ?? null)
    } catch {
      setEstudio(null)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => {
    fetchEstudio()
  }, [fetchEstudio])

  // Polling suave mientras el estudio está "en_proceso" para detectar el
  // resultado sin que el usuario tenga que recargar.
  useEffect(() => {
    if (estudio?.estado !== 'en_proceso') return
    const id = setInterval(fetchEstudio, 5000)
    return () => clearInterval(id)
  }, [estudio?.estado, fetchEstudio])

  const handleEjecutar = async () => {
    if (!estudio) return
    setSubmitting(true)
    try {
      await estudioService.ejecutarEstudio(estudio.id)
      toast.success('Estudio enviado a TransUnion. Te avisaremos cuando tengamos el resultado.')
      await fetchEstudio()
      onEjecutado?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No pudimos ejecutar el estudio. Intenta de nuevo.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  // Antes del pago (solicitado / pago_pendiente) NO mostramos nada — el
  // PagoEstudioSection se encarga de ese paso.
  if (!estudio) return null
  if (estudio.estado === 'solicitado' || estudio.estado === 'pago_pendiente' || estudio.estado === 'pagado' || estudio.estado === 'autorizado') {
    return null
  }

  // Form "Confirma tu cédula y envía".
  if (estudio.estado === 'formulario_completado' || estudio.estado === 'formulario_enviado' || estudio.estado === 'documentos_cargados') {
    const datos = (estudio.datos_formulario || {}) as { tipo_documento?: string; numero_documento?: string; nombre_completo?: string }
    return (
      <div className="border-2 border-primary-200 bg-primary-50/40 rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Confirma tus datos para el estudio crediticio</h3>
        <p className="text-sm text-gray-600 mb-4">
          Al hacer click en <strong>Enviar</strong>, consultaremos tu historial crediticio con <strong>TransUnion</strong>. El resultado llega en unos minutos.
        </p>

        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 mb-4">
          {datos.nombre_completo && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Nombre:</span>
              <span className="font-medium text-gray-900">{datos.nombre_completo}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Tipo de documento:</span>
            <span className="font-medium text-gray-900 uppercase">{datos.tipo_documento || 'CC'}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Número de cédula:</span>
            <span className="font-mono font-semibold text-gray-900 text-base">{datos.numero_documento || '—'}</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Si tu cédula no es correcta, contacta a la inmobiliaria antes de enviar.
        </p>

        <button
          onClick={handleEjecutar}
          disabled={submitting || !datos.numero_documento}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {submitting && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
            </svg>
          )}
          {submitting ? 'Enviando...' : 'Enviar para estudio'}
        </button>
      </div>
    )
  }

  // Consultando TransUnion (en_proceso).
  if (estudio.estado === 'en_proceso') {
    return (
      <div className="border border-blue-200 bg-blue-50 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-blue-700 shrink-0 animate-spin mt-0.5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-0.5">Consultando TransUnion...</p>
            <p className="text-sm text-blue-800">
              Estamos evaluando tu historial crediticio. Esto suele tardar menos de un minuto — te avisaremos por correo cuando termine.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Resultado completado.
  if (estudio.estado === 'completado') {
    if (estudio.resultado === 'aprobado') {
      return (
        <div className="border border-green-200 bg-green-50 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-green-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-green-900 mb-0.5">¡Estudio aprobado!</p>
              <p className="text-sm text-green-800">
                Tu solicitud avanza al siguiente paso: generación del contrato. Te notificaremos cuando esté listo para revisar.
              </p>
            </div>
          </div>
        </div>
      )
    }
    if (estudio.resultado === 'condicionado') {
      return (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.76-2.93L13.76 4a2 2 0 00-3.52 0L3.17 16.07A2 2 0 004.93 19z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-900 mb-0.5">Estudio condicionado</p>
              <p className="text-sm text-amber-800">
                Necesitamos información adicional (codeudor, póliza o documentos extra). La inmobiliaria te contactará con los próximos pasos.
              </p>
            </div>
          </div>
        </div>
      )
    }
    if (estudio.resultado === 'rechazado') {
      return (
        <div className="border border-red-200 bg-red-50 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-900 mb-0.5">Estudio no aprobado</p>
              <p className="text-sm text-red-800">
                Tu historial crediticio actual no cumple los requisitos. Puedes mejorar tu perfil y volver a intentarlo más adelante.
              </p>
            </div>
          </div>
        </div>
      )
    }
  }

  // Fallido → ofrecer reintento.
  if (estudio.estado === 'fallido') {
    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-5">
        <p className="text-sm font-semibold text-red-900 mb-1">No pudimos completar el estudio</p>
        <p className="text-sm text-red-800 mb-3">
          Hubo un problema técnico consultando TransUnion. Puedes intentarlo de nuevo.
        </p>
        <button
          onClick={handleEjecutar}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Reintentando...' : 'Reintentar estudio'}
        </button>
      </div>
    )
  }

  return null
}
