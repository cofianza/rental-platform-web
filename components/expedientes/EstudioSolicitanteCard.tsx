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

// TransUnion Colombia solo soporta documentos colombianos. Pasaporte y otros
// documentos extranjeros no estan en las centrales de riesgo locales — el
// estudio falla con 'tercero no existe'. Restringimos las opciones desde
// el dropdown para evitar el error.
type TipoDoc = 'cc' | 'nit' | 'ce' | 'ti'

export function EstudioSolicitanteCard({ expedienteId, onEjecutado }: EstudioSolicitanteCardProps) {
  const [estudio, setEstudio] = useState<IEstudio | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tipoDoc, setTipoDoc] = useState<TipoDoc>('cc')
  const [numeroDoc, setNumeroDoc] = useState('')

  const fetchEstudio = useCallback(async () => {
    try {
      const res = await estudioService.getEstudiosForExpediente(expedienteId, 1, 5)
      // Tomamos el estudio activo más reciente (ignoramos cancelados).
      const activos = res.data.filter((e) => e.estado !== 'cancelado')
      activos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const elegido = activos[0] ?? null
      setEstudio(elegido)

      // Prefill del form (si datos_formulario viene del backend). Si el tipo
      // anterior era no soportado (eg. 'pasaporte' de registros previos a la
      // restriccion CO), NO prefilamos ni el tipo ni el numero — forzamos al
      // solicitante a elegir un documento valido en el reintento.
      const datos = (elegido?.datos_formulario || {}) as { tipo_documento?: string; numero_documento?: string }
      const t = datos.tipo_documento?.toLowerCase()
      const tipoValido = t === 'cc' || t === 'nit' || t === 'ce' || t === 'ti'
      if (tipoValido) {
        setTipoDoc(t as TipoDoc)
        if (datos.numero_documento) setNumeroDoc(datos.numero_documento)
      }
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
    const numero = numeroDoc.trim()
    if (!numero) {
      toast.error('Ingresa tu número de cédula para continuar')
      return
    }
    setSubmitting(true)
    try {
      await estudioService.ejecutarEstudio(estudio.id, {
        tipo_documento: tipoDoc,
        numero_documento: numero,
      })
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

  // Form "Confirma tu cédula y envía". Tambien aplica a 'fallido' para que
  // el solicitante pueda corregir el documento (eg. uso pasaporte extranjero
  // y necesita cambiar a CC) y reintentar sobre el mismo estudio.
  const enFormulario = estudio.estado === 'formulario_completado'
    || estudio.estado === 'formulario_enviado'
    || estudio.estado === 'documentos_cargados'
    || estudio.estado === 'fallido'

  if (enFormulario) {
    const canSubmit = numeroDoc.trim().length >= 5 && !submitting
    const esReintento = estudio.estado === 'fallido'
    return (
      <div className={`border-2 rounded-lg p-6 ${esReintento ? 'border-red-200 bg-red-50/40' : 'border-primary-200 bg-primary-50/40'}`}>
        {esReintento && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-semibold text-red-900 mb-0.5">El intento anterior fallo</p>
            <p className="text-sm text-red-800">
              Verifica que tu tipo y numero de documento sean correctos. Cofianza solo
              consulta documentos colombianos (CC, CE, TI, NIT).
            </p>
          </div>
        )}
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          {esReintento ? 'Corrige tus datos y reintenta' : 'Confirma tus datos para el estudio crediticio'}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Al hacer click en <strong>Enviar</strong>, consultaremos tu historial crediticio con <strong>TransUnion</strong>. El resultado llega en unos minutos.
        </p>

        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tipo de documento
            </label>
            <select
              value={tipoDoc}
              onChange={(e) => setTipoDoc(e.target.value as TipoDoc)}
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <option value="cc">Cédula de ciudadanía (CC)</option>
              <option value="ce">Cédula de extranjería (CE)</option>
              <option value="ti">Tarjeta de identidad (TI)</option>
              <option value="nit">NIT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Número de documento
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={numeroDoc}
              onChange={(e) => setNumeroDoc(e.target.value.replace(/[^\w]/g, ''))}
              placeholder="Ingresa tu número de cédula"
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              maxLength={20}
            />
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4 space-y-1">
          <p>
            Verifica que tu número de documento sea correcto antes de enviar — es el que consultaremos en el buró de crédito.
          </p>
          <p className="text-amber-700">
            <strong>Importante:</strong> solo consultamos documentos colombianos. Si eres extranjero residente, usa tu Cédula de Extranjería (CE).
          </p>
        </div>

        <button
          onClick={handleEjecutar}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {submitting && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
            </svg>
          )}
          {submitting
            ? (esReintento ? 'Reintentando...' : 'Enviando...')
            : (esReintento ? 'Reintentar estudio' : 'Enviar para estudio')}
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
                Tu perfil quedó marginal. En Cofianza no pedimos fiador — para continuar, invita a un co-arrendatario
                (la persona con quien vas a vivir) y los respaldamos juntos como un solo arrendatario.
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
  // 'fallido' ya se maneja en el bloque de formulario arriba (enFormulario).

  return null
}
