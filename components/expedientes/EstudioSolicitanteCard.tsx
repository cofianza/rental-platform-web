/**
 * EstudioSolicitanteCard — UI del estudio crediticio desde la vista del solicitante.
 *
 * Flujo:
 *   - formulario_completado  → formulario "Confirma tu cédula y envía".
 *   - en_proceso             → "Consultando tu historial...".
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

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { estudioService } from '@/services/estudioService'
import { autorizacionService } from '@/services/autorizacionService'
import type { IEstudio } from '@/types/estudio'
import type { IAutorizacion } from '@/types/autorizacion'

interface EstudioSolicitanteCardProps {
  expedienteId: string
  onEjecutado?: () => void
  /** Documento del solicitante segun la tabla `solicitantes`. Se usa como
   *  prefill cuando `datos_formulario` aun no tiene un documento (primer
   *  intento). Si despues escribe otro CC y envia, el backend sincroniza
   *  el solicitante con lo nuevo (ver estudios.service.ejecutarEstudio). */
  prefillTipoDocumento?: string | null
  prefillNumeroDocumento?: string | null
  /** Teléfono del solicitante — solo para el copy del card de autorización
   *  (el enlace va por email siempre y por WhatsApp solo si hay número). */
  solicitanteTelefono?: string | null
}

// TransUnion Colombia solo soporta documentos colombianos. Pasaporte y otros
// documentos extranjeros no estan en las centrales de riesgo locales — el
// estudio falla con 'tercero no existe'. Restringimos las opciones desde
// el dropdown para evitar el error.
type TipoDoc = 'cc' | 'nit' | 'ce' | 'ti'

export function EstudioSolicitanteCard({
  expedienteId,
  onEjecutado,
  prefillTipoDocumento,
  prefillNumeroDocumento,
  solicitanteTelefono,
}: EstudioSolicitanteCardProps) {
  const [estudio, setEstudio] = useState<IEstudio | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tipoDoc, setTipoDoc] = useState<TipoDoc>('cc')
  const [numeroDoc, setNumeroDoc] = useState('')
  // Autorización habeas data del expediente. Si hay una pendiente, el camino
  // correcto es firmarla (el estudio corre solo al firmar) — ocultamos el form
  // manual para no ofrecer dos caminos contradictorios.
  const [autorizacion, setAutorizacion] = useState<IAutorizacion | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // El prefill solo se aplica UNA vez (primer fetch). Sin esta guarda, los
  // pollings que llaman fetchEstudio re-aplicarían el prefill cada tick y
  // pisarían lo que el solicitante está escribiendo en el input (p. ej. al
  // corregir su cédula tras un estudio fallido).
  const prefillAppliedRef = useRef(false)
  // Igual que authLoadedRef: tras el primer load exitoso, un error transitorio
  // de un tick del polling NO debe poner estudio=null (dejaría la card en
  // blanco y mataría el polling sin recuperación).
  const estudioLoadedRef = useRef(false)

  const fetchEstudio = useCallback(async () => {
    try {
      const res = await estudioService.getEstudiosForExpediente(expedienteId, 1, 5)
      // Tomamos el estudio activo más reciente (ignoramos cancelados).
      const activos = res.data.filter((e) => e.estado !== 'cancelado')
      activos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const elegido = activos[0] ?? null
      setEstudio(elegido)
      estudioLoadedRef.current = true

      if (prefillAppliedRef.current) return
      prefillAppliedRef.current = true

      // Prefill del form, en orden de prioridad:
      //   1. datos_formulario del estudio (lo ultimo que el solicitante escribio).
      //   2. solicitante.tipo_documento + numero_documento (lo del registro).
      // Si el tipo no esta en el set soportado por TransUnion CO, lo ignoramos
      // y forzamos al solicitante a elegir uno valido (cc/ce/ti/nit).
      const datos = (elegido?.datos_formulario || {}) as { tipo_documento?: string; numero_documento?: string }
      const tipoFromDatos = datos.tipo_documento?.toLowerCase()
      const tipoFromPrefill = prefillTipoDocumento?.toLowerCase()
      const numeroFromDatos = datos.numero_documento?.trim() || ''
      const numeroFromPrefill = prefillNumeroDocumento?.trim() || ''

      const isTipoValido = (t: string | undefined): t is TipoDoc =>
        t === 'cc' || t === 'nit' || t === 'ce' || t === 'ti'

      if (isTipoValido(tipoFromDatos)) {
        setTipoDoc(tipoFromDatos)
      } else if (isTipoValido(tipoFromPrefill)) {
        setTipoDoc(tipoFromPrefill)
      }

      if (numeroFromDatos) {
        setNumeroDoc(numeroFromDatos)
      } else if (numeroFromPrefill) {
        setNumeroDoc(numeroFromPrefill)
      }
    } catch {
      // Solo en el primer load tratamos el error como "sin estudio".
      if (!estudioLoadedRef.current) setEstudio(null)
    } finally {
      setLoading(false)
    }
  }, [expedienteId, prefillTipoDocumento, prefillNumeroDocumento])

  useEffect(() => {
    fetchEstudio()
  }, [fetchEstudio])

  // Si ya cargamos la autorización al menos una vez, un error transitorio en un
  // tick del polling (red móvil, 502) NO debe resetearla a null — eso haría
  // "flip" del card de firma al form manual y mataría el polling.
  const authLoadedRef = useRef(false)

  const fetchAutorizacion = useCallback(async () => {
    try {
      const auth = await autorizacionService.getStatus(expedienteId)
      setAutorizacion(auth)
      authLoadedRef.current = true
    } catch {
      // Solo en el primer load asumimos "sin autorización" (deja el form manual).
      if (!authLoadedRef.current) setAutorizacion(null)
    } finally {
      setAuthLoading(false)
    }
  }, [expedienteId])

  useEffect(() => {
    fetchAutorizacion()
  }, [fetchAutorizacion])

  // Polling suave mientras el estudio está "en_proceso" para detectar el
  // resultado sin que el usuario tenga que recargar.
  useEffect(() => {
    if (estudio?.estado !== 'en_proceso') return
    const id = setInterval(fetchEstudio, 5000)
    return () => clearInterval(id)
  }, [estudio?.estado, fetchEstudio])

  // Una autorización 'pendiente' con token vencido NO cuenta: el backend solo la
  // marca 'expirado' lazy (cuando alguien abre el link). Si la tratáramos como
  // pendiente, el card de firma taparía el form manual para siempre.
  const tokenVencido = !!(
    autorizacion?.token_expiracion
    && new Date(autorizacion.token_expiracion).getTime() < Date.now()
  )
  const autorizacionPendiente = autorizacion?.estado === 'pendiente' && !tokenVencido

  // Polling mientras la autorización está pendiente: el solicitante la firma
  // en otra pestaña (link de WhatsApp/correo) y al firmar el estudio corre
  // solo — refrescamos ambos para que esta card avance sin recargar la página.
  // En 'fallido' no se pollea: el camino ahí es el form manual de reintento.
  useEffect(() => {
    if (!autorizacionPendiente || estudio?.estado === 'fallido') return
    const id = setInterval(() => {
      fetchAutorizacion()
      fetchEstudio()
    }, 8000)
    return () => clearInterval(id)
  }, [autorizacionPendiente, estudio?.estado, fetchAutorizacion, fetchEstudio])

  // Al detectar la firma (pendiente → autorizado), el backend ejecuta el estudio
  // pero tarda unos segundos en marcarlo 'en_proceso'. Sin esta espera, la UI
  // caería al form manual justo mientras el estudio arranca en el servidor
  // (doble camino + posible doble ejecución). Esperamos acotado (~60s) y si el
  // estudio no avanza, caemos al form como respaldo (el arranque pudo fallar).
  const MAX_INICIO_TICKS = 12
  const [esperandoInicio, setEsperandoInicio] = useState(false)
  const [inicioTicks, setInicioTicks] = useState(0)
  const prevAuthEstadoRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const prev = prevAuthEstadoRef.current
    prevAuthEstadoRef.current = autorizacion?.estado
    if (prev === 'pendiente' && autorizacion?.estado === 'autorizado') {
      setEsperandoInicio(true)
      setInicioTicks(0)
    }
  }, [autorizacion?.estado])

  useEffect(() => {
    if (!esperandoInicio) return
    const st = estudio?.estado
    if (st === 'en_proceso' || st === 'completado' || st === 'fallido' || inicioTicks >= MAX_INICIO_TICKS) {
      setEsperandoInicio(false)
      return
    }
    const id = setTimeout(() => {
      setInicioTicks((t) => t + 1)
      fetchEstudio()
    }, 5000)
    return () => clearTimeout(id)
  }, [esperandoInicio, inicioTicks, estudio?.estado, fetchEstudio])

  // Cuando el estudio transiciona de en_proceso a completado/fallido, le
  // avisamos al padre via onEjecutado para que recargue el expediente. Si
  // no hacemos esto, el expediente.estado se queda en 'borrador' y la
  // CoarrendatarioCard (que depende de estado='condicionado') no aparece
  // hasta que el solicitante refresque manualmente.
  const prevEstadoRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const prev = prevEstadoRef.current
    const curr = estudio?.estado
    prevEstadoRef.current = curr
    if (prev === 'en_proceso' && (curr === 'completado' || curr === 'fallido')) {
      onEjecutado?.()
    }
  }, [estudio?.estado, onEjecutado])

  const handleEjecutar = async () => {
    if (!estudio) return
    const numero = numeroDoc.trim()
    if (!numero) {
      toast.error('Ingresa tu número de cédula para continuar')
      return
    }
    setSubmitting(true)

    // Safety net: si la llamada tarda más de 90s (TransUnion intermitente,
    // Railway timeout, etc.), bajamos el spinner y refrescamos el estudio
    // desde BD para ver el estado real. Si el backend ya completó la
    // consulta pero la respuesta HTTP se perdió, el polling lo va a captar.
    const safetyTimer = setTimeout(async () => {
      toast.message('Está tomando más de lo esperado. Verificando estado…')
      await fetchEstudio()
      setSubmitting(false)
    }, 90000)

    try {
      await estudioService.ejecutarEstudio(estudio.id, {
        tipo_documento: tipoDoc,
        numero_documento: numero,
      })
      clearTimeout(safetyTimer)
      toast.success('Estudio enviado. Te avisaremos cuando tengamos el resultado.')
      await fetchEstudio()
      onEjecutado?.()
    } catch (err) {
      clearTimeout(safetyTimer)
      // Aunque haya error, refrescamos: el backend puede haber procesado
      // y el error venir del HTTP layer. Si el estado ya cambió, es éxito.
      await fetchEstudio()
      const msg = err instanceof Error ? err.message : 'No pudimos ejecutar el estudio. Intenta de nuevo.'
      toast.error(msg)
    } finally {
      clearTimeout(safetyTimer)
      setSubmitting(false)
    }
  }

  if (loading || authLoading) return null

  // Antes del pago (solicitado / pago_pendiente) NO mostramos nada — el
  // PagoEstudioSection se encarga de ese paso.
  if (!estudio) return null

  // Card "Firma tu autorización": el camino correcto cuando hay un enlace de
  // habeas data pendiente — al firmar, el estudio corre automáticamente
  // (orchestrator.onHabeasDataAutorizado). Vence con fecha real del token.
  const venceTexto = autorizacion?.token_expiracion
    ? `vence el ${new Date(autorizacion.token_expiracion).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}`
    : 'vence en 48 horas'
  const cardFirmaAutorizacion = (
    <div className="border-2 border-primary-200 bg-primary-50/40 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <svg className="h-6 w-6 text-primary-700 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Firma tu autorización para continuar</h3>
          <p className="text-sm text-gray-700 mb-2">
            Te enviamos un enlace a tu {solicitanteTelefono
              ? <strong>WhatsApp y correo</strong>
              : <strong>correo</strong>} para autorizar el tratamiento
            de tus datos y la consulta a las centrales de riesgo. Ábrelo y fírmalo — apenas autorices,
            tu estudio crediticio se ejecuta automáticamente.
          </p>
          <p className="text-xs text-gray-500">
            El enlace es personal y {venceTexto}. ¿No te llegó? Revisa tu correo (incluido spam)
            o pide al propietario o a tu asesor que te lo reenvíe.
          </p>
        </div>
      </div>
    </div>
  )

  // Card "iniciando tu estudio": ventana entre la firma y que el backend marque
  // el estudio 'en_proceso' — sin esto la UI caería al form manual justo
  // mientras el estudio arranca en el servidor.
  const cardIniciandoEstudio = (
    <div className="border border-blue-200 bg-blue-50 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <svg className="h-5 w-5 text-blue-700 shrink-0 animate-spin mt-0.5" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-0.5">¡Autorización firmada! Iniciando tu estudio…</p>
          <p className="text-sm text-blue-800">
            Recibimos tu autorización y estamos iniciando la consulta de tu historial. Esto toma unos segundos.
          </p>
        </div>
      </div>
    </div>
  )

  // Estados tempranos (antes del formulario): si ya hay un enlace de autorización
  // pendiente (flujo manual: el link se envía tras el pago aunque el estudio siga
  // en 'solicitado'/'pagado'), guiamos a firmarlo en lugar de no mostrar nada.
  if (estudio.estado === 'solicitado' || estudio.estado === 'pago_pendiente' || estudio.estado === 'pagado' || estudio.estado === 'autorizado') {
    if (estudio.estado !== 'pago_pendiente') {
      if (esperandoInicio) return cardIniciandoEstudio
      if (autorizacionPendiente) return cardFirmaAutorizacion
      // Enlace vencido/invalidado sin firmar: cubre también 'expirado'/'revocado'
      // (el backend marca 'expirado' lazy al abrir el link) — sin este aviso el
      // solicitante quedaba ante una pantalla vacía sin saber que debe pedir reenvío.
      if (
        (autorizacion?.estado === 'pendiente' && tokenVencido)
        || autorizacion?.estado === 'expirado'
        || autorizacion?.estado === 'revocado'
      ) {
        return (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-semibold text-amber-900 mb-0.5">Tu enlace de autorización ya no está vigente</p>
            <p className="text-sm text-amber-800">
              El enlace para autorizar la consulta a centrales de riesgo venció o fue reemplazado sin firmarse.
              Pide al propietario o a tu asesor que te lo reenvíe desde el expediente.
            </p>
          </div>
        )
      }
      // Firmó pero el estudio no avanzó (el inicio automático falló): mensaje
      // honesto en lugar de pantalla vacía — el equipo ya tiene el evento en
      // el timeline para retomarlo.
      if (autorizacion?.estado === 'autorizado') {
        return (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-0.5">Autorización recibida</p>
            <p className="text-sm text-blue-800">
              Recibimos tu autorización. Tu estudio se está preparando — si no avanza en unos
              minutos, contacta al propietario o a tu asesor para iniciarlo.
            </p>
          </div>
        )
      }
    }
    return null
  }

  // Form "Confirma tu cédula y envía". Tambien aplica a 'fallido' para que
  // el solicitante pueda corregir el documento (eg. uso pasaporte extranjero
  // y necesita cambiar a CC) y reintentar sobre el mismo estudio.
  const enFormulario = estudio.estado === 'formulario_completado'
    || estudio.estado === 'formulario_enviado'
    || estudio.estado === 'documentos_cargados'
    || estudio.estado === 'fallido'

  // Acaba de firmar → el estudio está arrancando en el servidor.
  if (enFormulario && estudio.estado !== 'fallido' && esperandoInicio) {
    return cardIniciandoEstudio
  }

  // Hay una autorización pendiente vigente: mostrar a la vez el form manual
  // confundiría — solo queda como respaldo (sin autorización en curso o con el
  // token vencido) o como reintento si el estudio falló.
  if (enFormulario && estudio.estado !== 'fallido' && autorizacionPendiente) {
    return cardFirmaAutorizacion
  }

  if (enFormulario) {
    const canSubmit = numeroDoc.trim().length >= 5 && !submitting
    const esReintento = estudio.estado === 'fallido'
    return (
      <div className={`border-2 rounded-lg p-6 ${esReintento ? 'border-red-200 bg-red-50/40' : 'border-primary-200 bg-primary-50/40'}`}>
        {esReintento && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-semibold text-red-900 mb-0.5">El intento anterior falló</p>
            <p className="text-sm text-red-800">
              {estudio.observaciones
                || 'Verifica que tu tipo y número de documento sean correctos. Cofianza solo consulta documentos colombianos (CC, CE, TI, NIT).'}
            </p>
          </div>
        )}
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          {esReintento ? 'Corrige tus datos y reintenta' : 'Confirma tus datos para el estudio crediticio'}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Al hacer click en <strong>Enviar</strong>, consultaremos tu historial en las <strong>centrales de riesgo</strong>. El resultado llega en unos minutos.
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
            <p className="text-sm font-semibold text-blue-900 mb-0.5">Consultando tu historial...</p>
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
                Pronto el propietario te liberará el contrato para firmar. Te avisaremos en cuanto esté listo.
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
