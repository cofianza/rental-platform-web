/**
 * EstudioSolicitanteCard — UI de la evaluación crediticia desde la vista del solicitante.
 *
 * Flujo:
 *   - formulario_completado  → formulario "Confirma tu cédula y envía".
 *   - en_proceso             → "Consultando su historial...".
 *   - completado + aprobado  → banner verde.
 *   - completado + condicionado → banner ámbar.
 *   - completado + rechazado → banner "No aprobable por ahora" (§10: nunca
 *     la palabra "rechazado" en pantallas del prospecto, §13).
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
import { coarrendatarioService } from '@/services/coarrendatarioService'
import {
  IconInfo,
  IconClock,
  IconUsers,
  IconCheckCircle,
  IconDownload,
  IconShieldCheck,
  IconLoader,
  IconAlertTriangle,
  IconRefresh,
} from '@/components/icons'
import { CONTACTO_COFIANZA, formatDate } from '@/lib/constants'
import { mensajeParaProspecto } from '@/lib/errorMessages'
import type { IEstudio } from '@/types/estudio'
import type { IAutorizacion } from '@/types/autorizacion'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'
import { abrirEnPestana } from '@/lib/utils'
import { textoVisible, textoCondicionCoarrendatario } from './textoVisible'

interface EstudioSolicitanteCardProps {
  expedienteId: string
  onEjecutado?: () => void
  /** Documento del solicitante segun la tabla `solicitantes`. Se muestra
   *  cuando `datos_formulario` aun no tiene uno (solo lectura: BLQ §3.5). */
  prefillTipoDocumento?: string | null
  prefillNumeroDocumento?: string | null
  /** Teléfono del solicitante — solo para el copy del card de autorización
   *  (el enlace va por email siempre y por WhatsApp solo si hay número). */
  solicitanteTelefono?: string | null
}

/**
 * §10: "Nunca es un portazo", pero sin saber la causa (la API manda el motivo
 * solo si decidió una regla dura, con la salida de cada causa) no se sugiere
 * nada a ciegas (P30): se ofrece revisar el caso. La nota de apelación la pone
 * una sola vez el banner del estudio, en esta misma pantalla.
 */
function SinMotivo({ className }: { className: string }) {
  return (
    <p className={className}>
      Escríbanos a{' '}
      <a href={`mailto:${CONTACTO_COFIANZA.email}`} className="font-medium underline">
        {CONTACTO_COFIANZA.email}
      </a>{' '}
      y revisamos su caso.
    </p>
  )
}

export function EstudioSolicitanteCard({
  expedienteId,
  onEjecutado,
  prefillTipoDocumento,
  prefillNumeroDocumento,
  solicitanteTelefono,
}: EstudioSolicitanteCardProps) {
  // Refresco en sitio cuando el detalle del estudio recarga.
  const version = useRefrescoExpediente()
  const [estudio, setEstudio] = useState<IEstudio | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tipoDoc, setTipoDoc] = useState('')
  const [numeroDoc, setNumeroDoc] = useState('')
  // Autorización habeas data del expediente. Si hay una pendiente, el camino
  // correcto es firmarla (el estudio corre solo al firmar) — ocultamos el form
  // manual para no ofrecer dos caminos contradictorios.
  const [autorizacion, setAutorizacion] = useState<IAutorizacion | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  // No se pudo LEER la autorización: no es «falta su autorización».
  const [authError, setAuthError] = useState(false)
  const [descargandoCert, setDescargandoCert] = useState(false)
  // Decisión 2 (2026-09-25): el aprobado puede sumar coarrendatario antes del
  // contrato y pagar la prima del 10 %. La oferta sale solo si el API abre la
  // ventana (sin contrato fijo, sin otra invitación, canal de inmobiliaria).
  const [puedeSumarCoa, setPuedeSumarCoa] = useState(false)

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

      // Documento que se consultará (solo lectura): el del estudio, que la
      // corrección actualiza, o el de la ficha. Se relee en cada refresco.
      const datos = (elegido?.datos_formulario || {}) as { tipo_documento?: string; numero_documento?: string }
      const deDatos = !!datos.numero_documento?.trim()
      setTipoDoc((deDatos ? datos.tipo_documento : prefillTipoDocumento) || '')
      setNumeroDoc((deDatos ? datos.numero_documento : prefillNumeroDocumento)?.trim() || '')
    } catch {
      // Solo en el primer load tratamos el error como "sin estudio".
      if (!estudioLoadedRef.current) setEstudio(null)
    } finally {
      setLoading(false)
    }
  }, [expedienteId, prefillTipoDocumento, prefillNumeroDocumento])

  const abarata = !!estudio?.ruta?.coarrendatarioAbarataPrima
  useEffect(() => {
    if (!abarata) return
    let vivo = true
    coarrendatarioService.getVentana(expedienteId).then(
      (v) => { if (vivo) setPuedeSumarCoa(v.puede_invitar) },
      () => { if (vivo) setPuedeSumarCoa(false) },
    )
    return () => { vivo = false }
  }, [abarata, expedienteId, version])

  useEffect(() => {
    fetchEstudio()
  }, [fetchEstudio, version])

  // Si ya cargamos la autorización al menos una vez, un error transitorio en un
  // tick del polling (red móvil, 502) NO debe resetearla a null — eso haría
  // "flip" del card de firma al form manual y mataría el polling.
  const authLoadedRef = useRef(false)

  const fetchAutorizacion = useCallback(async () => {
    try {
      const auth = await autorizacionService.getStatus(expedienteId)
      setAutorizacion(auth)
      authLoadedRef.current = true
      setAuthError(false)
    } catch {
      // Solo en el primer load: sin dato, se dice que falló (con Reintentar).
      if (!authLoadedRef.current) {
        setAutorizacion(null)
        setAuthError(true)
      }
    } finally {
      setAuthLoading(false)
    }
  }, [expedienteId])

  useEffect(() => {
    fetchAutorizacion()
  }, [fetchAutorizacion, version])

  // Polling suave mientras el estudio está "en_proceso" para detectar el
  // resultado sin que el usuario tenga que recargar.
  useEffect(() => {
    if (estudio?.estado !== 'en_proceso') return
    const id = setInterval(() => {
      if (!document.hidden) fetchEstudio() // pestaña oculta: no se pregunta
    }, 5000)
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
      if (document.hidden) return // pestaña oculta: no se pregunta
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
    if (!numeroDoc.trim()) {
      toast.error('Falta su documento. Pídale a quien tramita su arriendo que lo registre.')
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
      await estudioService.ejecutarEstudio(estudio.id)
      clearTimeout(safetyTimer)
      toast.success('Evaluación iniciada. Le avisaremos cuando tengamos el resultado.')
      await fetchEstudio()
      onEjecutado?.()
    } catch (err) {
      clearTimeout(safetyTimer)
      // Aunque haya error, refrescamos: el backend puede haber procesado
      // y el error venir del HTTP layer. Si el estado ya cambió, es éxito.
      await fetchEstudio()
      // El texto de la compuerta 8.4 está escrito para el gestor («reenvíe el enlace»).
      if ((err as { code?: string }).code === 'AUTORIZACION_PREVIA_REQUERIDA') {
        fetchAutorizacion()
        toast.error('Primero debe firmar su autorización de consulta. Si el enlace ya no le sirve, pídale a quien tramita su arriendo que se lo reenvíe.')
      } else {
        toast.error(mensajeParaProspecto(err, 'No pudimos iniciar la evaluación. Intente de nuevo.'))
      }
    } finally {
      clearTimeout(safetyTimer)
      setSubmitting(false)
    }
  }

  // Flujo §11: el CRC es del prospecto. GET /estudios/:id/certificado/descargar
  // admite al rol 'solicitante' (authorize expedientes:read + assertExpedienteAccess
  // por solicitante_id), así que el botón no promete nada que la API niegue.
  const handleDescargarCertificado = async () => {
    if (!estudio) return
    setDescargandoCert(true)
    try {
      await abrirEnPestana(async () => (await estudioService.descargarCertificado(estudio.id)).url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pudimos descargar el certificado. Intente de nuevo.')
    } finally {
      setDescargandoCert(false)
    }
  }

  if (loading || authLoading) return null

  // Antes del pago (solicitado / pago_pendiente) NO mostramos nada — el
  // PagoEstudioSection se encarga de ese paso. Con el §6.3 'pago_pendiente' es
  // justo la espera nueva: el prospecto YA autorizó y lo que falta es su pago,
  // así que la card que corresponde ahí es la del cobro, no ésta.
  if (!estudio) return null

  // Card "Firma tu autorización": el camino correcto cuando hay un enlace de
  // habeas data pendiente — al firmar, el estudio corre automáticamente
  // (orchestrator.onHabeasDataAutorizado). Vence con fecha real del token; si
  // no la hay, con el plazo del §12 que la API deriva (`expiracion`, que ya
  // viaja en el listado). El "48 horas" de antes era una promesa de la web.
  const venceTexto = autorizacion?.token_expiracion
    ? `vence el ${new Date(autorizacion.token_expiracion).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}`
    : estudio.expiracion?.expiraEn
      ? `vence el ${formatDate(estudio.expiracion.expiraEn)}`
      : 'vence en 15 días'
  const cardFirmaAutorizacion = (
    <div className="border-2 border-primary-200 bg-primary-50/40 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <IconShieldCheck size={24} className="text-primary-700 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Firme su autorización para continuar</h3>
          <p className="text-sm text-gray-700 mb-2">
            Le enviamos un enlace a su {solicitanteTelefono
              ? <strong>WhatsApp y correo</strong>
              : <strong>correo</strong>} para autorizar el tratamiento
            de sus datos y la consulta a las centrales de riesgo. Ábralo y fírmelo: es el primer paso,
            {/* Solo en la opción C paga el prospecto; en A/B ya lo cubrió la agencia. */}
            {estudio.pago_por === 'arrendatario'
              ? ' y apenas autorice le llega el enlace para pagar el estudio.'
              : ' y apenas autorice empezamos su evaluación.'}
          </p>
          <p className="text-xs text-gray-500">
            El enlace es personal y {venceTexto}. ¿No le llegó? Revise su correo (incluido spam)
            o pídale a quien tramita su arriendo que se lo reenvíe.
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
        <IconLoader size={20} className="text-blue-700 shrink-0 animate-spin mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-0.5">¡Autorización firmada! Iniciando su evaluación…</p>
          <p className="text-sm text-blue-800">
            Recibimos su autorización y estamos iniciando la consulta de su historial. Esto toma unos segundos.
          </p>
        </div>
      </div>
    </div>
  )

  // Sin autorización vigente (vencida, reemplazada, detenida por documento o
  // sin enviar): la API rechaza la evaluación (compuerta 8.4). BLQ §8: con
  // bloqueo el motivo real no es que «venció», y un reenvío sin corregir el
  // documento fallaría igual; con 'identidad_rechazada' solo Cofianza reenvía.
  const bloqueo = autorizacion?.estado_bloqueo
  const [avisoTitulo, avisoTexto] =
    bloqueo === 'bloqueado_documento'
      ? [
          'Detuvimos su autorización',
          autorizacion?.motivo_bloqueo === 'datos_incorrectos'
            ? 'Nos indicó que sus datos registrados no son correctos. Quien tramita su arriendo los revisará y le enviará un enlace nuevo; usted no tiene que hacer nada.'
            : 'El número de documento no coincidió con el registrado. Quien tramita su arriendo revisará el dato y le enviará un enlace nuevo; usted no tiene que hacer nada.',
        ]
      : bloqueo === 'pendiente_reenvio'
        ? ['Pronto le llega un enlace nuevo', 'Ya corregimos sus datos. Quien tramita su arriendo le enviará un enlace nuevo para autorizar la consulta.']
        : bloqueo === 'identidad_rechazada'
          ? [
              'Su autorización quedó detenida',
              `Desde el enlace nos indicaron que los datos no corresponden a quien lo abrió, así que no consultamos ninguna central de riesgo. Para continuar, escríbanos a ${CONTACTO_COFIANZA.email}.`,
            ]
          : autorizacion
            ? [
                'Su enlace de autorización ya no está vigente',
                'El enlace para autorizar la consulta a centrales de riesgo venció o fue reemplazado sin firmarse. Pídale a quien tramita su arriendo que se lo reenvíe.',
              ]
            : [
                'Falta su autorización de consulta',
                'Para iniciar su evaluación necesitamos que firme la autorización de consulta a centrales de riesgo. Pídale a quien tramita su arriendo que le envíe el enlace.',
              ]
  const avisoSinAutorizacion = (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <p className="text-sm font-semibold text-amber-900 mb-0.5">{avisoTitulo}</p>
      <p className="text-sm text-amber-800">{avisoTexto}</p>
    </div>
  )

  // Estados tempranos (antes del formulario): si ya hay un enlace de autorización
  // pendiente, guiamos a firmarlo en lugar de no mostrar nada. Desde el §6.3 el
  // enlace de autorización es lo PRIMERO que recibe (antes iba después del
  // pago), así que este es el camino normal y no el excepcional.
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
        return avisoSinAutorizacion
      }
      // Firmó pero el estudio no avanzó (el inicio automático falló): mensaje
      // honesto en lugar de pantalla vacía — el equipo ya tiene el evento en
      // el timeline para retomarlo.
      if (autorizacion?.estado === 'autorizado') {
        return (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-0.5">Autorización recibida</p>
            <p className="text-sm text-blue-800">
              Recibimos su autorización. Su evaluación se está preparando. Si no avanza en unos
              minutos, escríbale a quien tramita su arriendo para iniciarla.
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

  // Sin autorización firmada la API rechaza la evaluación: no se ofrece un
  // botón que va a fallar, se dice qué falta.
  if (enFormulario && autorizacion?.estado !== 'autorizado') {
    if (!autorizacion && authError) {
      return (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">No pudimos consultar su autorización de consulta.</p>
          <button
            type="button"
            onClick={() => void fetchAutorizacion()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <IconRefresh size={16} /> Reintentar
          </button>
        </div>
      )
    }
    return autorizacionPendiente ? cardFirmaAutorizacion : avisoSinAutorizacion
  }

  if (enFormulario) {
    const canSubmit = !!numeroDoc.trim() && !submitting
    const esReintento = estudio.estado === 'fallido'
    return (
      <div className={`border-2 rounded-lg p-6 ${esReintento ? 'border-red-200 bg-red-50/40' : 'border-primary-200 bg-primary-50/40'}`}>
        {esReintento && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-semibold text-red-900 mb-0.5">El intento anterior falló</p>
            <p className="text-sm text-red-800">
              {textoVisible(estudio.observaciones, { externo: true })
                || 'Si su documento está mal, pídale a quien tramita su arriendo que lo corrija y luego reintente.'}
            </p>
          </div>
        )}
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          {esReintento ? 'Reintente la evaluación' : 'Confirme sus datos para la evaluación crediticia'}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Al tocar <strong>{esReintento ? 'Reintentar evaluación' : 'Iniciar evaluación'}</strong>, consultaremos su historial en las <strong>centrales de riesgo</strong>. El resultado llega en unos minutos.
        </p>

        {/* BLQ §3.5: el documento solo lo corrige quien tramita el arriendo
            («Corregir documento»); la API ya no acepta cambiarlo aquí. */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <p className="text-xs font-medium text-gray-700 mb-1">Documento que se consultará</p>
          <p className="font-mono text-sm font-semibold text-gray-900">
            {numeroDoc.trim() ? `${tipoDoc.toUpperCase()} ${numeroDoc}` : 'Sin documento registrado'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Si su documento está mal, pídale a quien tramita su arriendo que lo corrija.
          </p>
        </div>

        <button
          onClick={handleEjecutar}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {submitting && <IconLoader size={16} className="animate-spin" />}
          {submitting
            ? (esReintento ? 'Reintentando…' : 'Iniciando…')
            : (esReintento ? 'Reintentar evaluación' : 'Iniciar evaluación')}
        </button>
      </div>
    )
  }

  // Consultando TransUnion (en_proceso).
  if (estudio.estado === 'en_proceso') {
    return (
      <div className="border border-blue-200 bg-blue-50 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <IconLoader size={20} className="text-blue-700 shrink-0 animate-spin mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-0.5">Consultando su historial…</p>
            <p className="text-sm text-blue-800">
              Estamos evaluando su historial crediticio. Esto suele tardar menos de un minuto — le avisaremos por correo cuando termine.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Resultado completado.
  if (estudio.estado === 'completado') {
    // Cerrado sin aprobarse (cancelado en revisión): la página ya muestra
    // «Estudio cancelado», y «Estamos revisando tu estudio» debajo lo contradecía.
    if (estudio.decision_cofianza === 'sin_aprobar') return null

    // Flujo §10: cuando la API manda la ruta, ELLA manda. El titulo y el
    // mensaje vienen calculados en modules/estudios/rutas-resultado.ts para
    // que el lenguaje del §10/§13 viva en un solo sitio y no se desincronice
    // entre esta card, los correos y el WhatsApp.
    //
    // Los bloques por `resultado` de mas abajo se conservan como fallback: la
    // web y la API se despliegan por separado, y sin esto una web nueva contra
    // una API vieja dejaria al prospecto sin ningun mensaje.
    //
    // El CRC (§11) solo existe para aprobado/condicionado y solo cuando la API
    // ya lo emitió (certificado_url); se ofrece en la ruta y en los fallbacks.
    // Sin efecto (P32), la API lo niega: no se ofrece.
    const botonCertificado =
      estudio.certificado_url &&
      !estudio.certificado_sin_efecto &&
      (estudio.resultado === 'aprobado' || estudio.resultado === 'condicionado') ? (
        <button
          type="button"
          onClick={handleDescargarCertificado}
          disabled={descargandoCert}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <IconDownload size={14} />
          {descargandoCert ? 'Preparando certificado…' : 'Descargar certificado del resultado'}
        </button>
      ) : null

    if (estudio.ruta) {
      const r = estudio.ruta
      const tono =
        r.ruta === 'perfil_fuerte' || r.ruta === 'perfil_medio'
          ? { borde: 'border-green-200', fondo: 'bg-green-50', titulo: 'text-green-900', texto: 'text-green-800', icono: 'text-green-600' }
          : r.ruta === 'coarrendatario_requerido'
            ? { borde: 'border-amber-200', fondo: 'bg-amber-50', titulo: 'text-amber-900', texto: 'text-amber-800', icono: 'text-amber-600' }
            : r.ruta === 'en_revision'
              ? { borde: 'border-blue-200', fondo: 'bg-blue-50', titulo: 'text-blue-900', texto: 'text-blue-800', icono: 'text-blue-600' }
              // 'no_aprobable' va en slate, no en rojo: el §10 pide que nunca sea
              // un portazo. El ambar queda para lo que si tiene salida.
              : { borde: 'border-slate-200', fondo: 'bg-slate-50', titulo: 'text-slate-900', texto: 'text-slate-700', icono: 'text-slate-500' }

      return (
        <div className={`border ${tono.borde} ${tono.fondo} rounded-lg p-5`}>
          <div className="flex items-start gap-3">
            <span className={`shrink-0 mt-0.5 ${tono.icono}`}>
              {r.ruta === 'no_aprobable' ? (
                <IconInfo size={20} />
              ) : r.ruta === 'en_revision' ? (
                <IconClock size={20} />
              ) : r.ruta === 'coarrendatario_requerido' ? (
                <IconUsers size={20} />
              ) : (
                <IconCheckCircle size={20} />
              )}
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${tono.titulo} mb-0.5`}>{r.titulo}</p>
              <p className={`text-sm ${tono.texto}`}>{r.mensaje}</p>

              {/* §10: "se indica que puede mejorar. Nunca es un portazo." El
                  motivo de la regla dura ya trae la salida de su causa (P30). */}
              {r.ruta === 'no_aprobable' && textoVisible(estudio.motivo_rechazo, { externo: true }) && (
                <p className={`mt-3 text-sm ${tono.texto}`}>{textoVisible(estudio.motivo_rechazo, { externo: true })}</p>
              )}
              {r.ruta === 'no_aprobable' && !textoVisible(estudio.motivo_rechazo, { externo: true }) && (
                <SinMotivo className={`mt-3 text-sm ${tono.texto}`} />
              )}

              {/* §10: el incentivo comercial del aprobado (Decisión 2). El
                  formulario es la tarjeta del coarrendatario, debajo. */}
              {r.coarrendatarioAbarataPrima && puedeSumarCoa && (
                <div className="mt-3">
                  <p className={`text-sm ${tono.texto}`}>
                    Si antes del contrato suma como coarrendatario a la persona con quien va a vivir, la prima de
                    vinculación baja del 20 % al 10 % del canon. Esa persona no necesita tener finca raíz.
                  </p>
                  <a
                    href="#coarrendatario"
                    className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <IconUsers size={14} />
                    Invitar a mi coarrendatario
                  </a>
                </div>
              )}
              {/* Adenda 3 §6: aprobado con condición. El mensaje de la ruta ya
                  trae el puntaje mínimo y la fecha; el formulario es la tarjeta
                  del coarrendatario, debajo. */}
              {estudio.condicion_coarrendatario && !estudio.condicion_coarrendatario.vencida && (
                <a
                  href="#coarrendatario"
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <IconUsers size={14} />
                  Invitar a mi coarrendatario
                </a>
              )}
              {estudio.condicion_coarrendatario?.vencida && (
                <p className={`mt-3 text-sm ${tono.texto}`}>
                  {textoCondicionCoarrendatario(estudio.condicion_coarrendatario)}
                </p>
              )}
              {botonCertificado}
            </div>
          </div>
        </div>
      )
    }

    if (estudio.resultado === 'aprobado') {
      return (
        <div className="border border-green-200 bg-green-50 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <IconCheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900 mb-0.5">¡Estudio aprobado!</p>
              <p className="text-sm text-green-800">
                Pronto el propietario le liberará el contrato para firmar. Le avisaremos en cuanto esté listo.
              </p>
              {botonCertificado}
            </div>
          </div>
        </div>
      )
    }
    if (estudio.resultado === 'condicionado') {
      return (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <IconAlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 mb-0.5">Estudio condicionado</p>
              {/* Sin `ruta` no sabemos si es perfil medio o coarrendatario
                  obligatorio: copy neutro (§13 prohíbe "marginal"/"rechazado"). */}
              <p className="text-sm text-amber-800">
                {estudio.condicion_coarrendatario
                  ? textoCondicionCoarrendatario(estudio.condicion_coarrendatario)
                  : 'Su evaluación necesita una revisión adicional. Le avisaremos en cuanto haya una decisión.'}
              </p>
              {botonCertificado}
            </div>
          </div>
        </div>
      )
    }
    if (estudio.resultado === 'rechazado') {
      // NO se afirma la causa. Este card convive en la misma pantalla con
      // ExpedienteRechazadoBanner y con el correo del orquestador, y el texto
      // fijo de antes ("tu historial crediticio actual no cumple los
      // requisitos, mejora tu perfil") los contradice cuando el rechazo fue por
      // una regla dura V4.1: ahi el historial puede estar impecable (el caso de
      // produccion tenia score 773) y lo que no da es la carga mensual frente
      // al canon. Mandarlo a "mejorar su perfil" es mandarlo a arreglar algo
      // que no esta roto.
      //
      // `motivo_rechazo` que llega en esta respuesta NO es el del gestor: la
      // API lo sustituye por el motivo general del flujo §10 para el rol
      // 'solicitante' (redactarEstudioParaProspecto en estudios.service.ts), y
      // lo deja null cuando no hay un motivo apto para el prospecto — por eso
      // el fallback no nombra ninguna causa.
      // Paleta slate, la misma de ExpedienteRechazadoBanner en su variante de
      // prospecto: los dos bloques hablan del mismo hecho en la misma pantalla.
      // El ambar queda reservado para 'condicionado', que si tiene salida.
      return (
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <IconInfo size={20} className="text-slate-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-0.5">No aprobable por ahora</p>
              {textoVisible(estudio.motivo_rechazo, { externo: true }) ? (
                <p className="text-sm text-slate-700">{textoVisible(estudio.motivo_rechazo, { externo: true })}</p>
              ) : (
                <>
                  <p className="text-sm text-slate-700">
                    Con la información disponible hoy no podemos respaldar este estudio. No es una decisión definitiva sobre usted.
                  </p>
                  <SinMotivo className="mt-1 text-sm text-slate-700" />
                </>
              )}
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
