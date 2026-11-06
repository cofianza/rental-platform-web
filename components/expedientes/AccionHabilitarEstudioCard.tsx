/**
 * AccionHabilitarEstudioCard — Resumen del expediente.
 *
 * Aparece cuando:
 *   - el expediente esta en un estado pre-estudio (borrador / en_revision /
 *     informacion_incompleta — mismo gate que la RPC de habilitacion)
 *   - el estudio aun NO se habilito ni se rechazo
 *   - el usuario tiene permiso para decidir (propietario/inmobiliaria/admin/operador)
 *
 * Con cita realizada (o cita omitida, 3.2) muestra la decision de habilitar /
 * no habilitar; sin ninguna de las dos, ofrece "omitir la cita" (visita
 * coordinada por fuera). Da al propietario el control sin tener que ir al
 * kanban /citas — mantiene el flujo dentro del expediente. Tras la accion,
 * el padre refresca via onAction.
 *
 * Nota (Gerencia, 5-may-2026): este card YA NO pide duracion + fecha del
 * contrato. Esos datos se piden cuando se va a generar el contrato
 * (post-aprobacion del cliente) en AprobarCondicionadoCard o
 * AccionContratoPendienteCard.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { IconShieldCheck, IconLoader, IconAlertTriangle, IconCalendar, IconRefresh } from '@/components/icons'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { citaService } from '@/services/citaService'
import { expedienteService } from '@/services/expedienteService'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'

// Estados del expediente donde la RPC fn_habilitar_estudio_expediente permite
// habilitar. Fuera de ellos (aprobado, cerrado, cancelado…) la card sería un
// callejón sin salida: dejaría omitir la cita y luego la RPC rechazaría.
const ESTADOS_HABILITABLES = ['borrador', 'en_revision', 'informacion_incompleta']

interface AccionHabilitarEstudioCardProps {
  expedienteId: string
  estudioHabilitado: boolean
  estudioRechazado: boolean | null | undefined
  /** 3.2: la cita se omitió (visita coordinada por fuera) → habilita sin cita. */
  citaOmitida?: boolean
  /** Estado del expediente — la card solo aplica en estados pre-estudio
   *  (mismo gate que la RPC). Si no se pasa, no se filtra por estado. */
  expedienteEstado?: string
  userRol?: string
  onAction: () => void | Promise<void>
}

export function AccionHabilitarEstudioCard({
  expedienteId,
  estudioHabilitado,
  estudioRechazado,
  citaOmitida,
  expedienteEstado,
  userRol,
  onAction,
}: AccionHabilitarEstudioCardProps) {
  // Refresco en sitio cuando el detalle del estudio recarga.
  const version = useRefrescoExpediente()
  const puedeDecidir =
    userRol === 'propietario' ||
    userRol === 'inmobiliaria' ||
    userRol === 'administrador' ||
    userRol === 'operador_analista'

  // Fuera de los estados habilitables (expediente cancelado/cerrado/avanzado)
  // la card no aplica — sin esto ofrecería "omitir cita" en un expediente
  // donde la habilitación luego sería rechazada por la RPC.
  const estadoPermitido = !expedienteEstado || ESTADOS_HABILITABLES.includes(expedienteEstado)

  const [tieneCitaRealizada, setTieneCitaRealizada] = useState(false)
  const [loading, setLoading] = useState(true)
  // Sin leer las citas no se sabe si la visita se hizo: no se afirma que falte.
  const [errorCitas, setErrorCitas] = useState(false)
  const [showRechazar, setShowRechazar] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [showOmitir, setShowOmitir] = useState(false)
  const [motivoOmitir, setMotivoOmitir] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Punto 3 (2026-09-25): comercial/mixto o arrendatario persona jurídica/NIT.
  // La API lo frena antes del cobro (409 ESTUDIO_NO_AFIANZABLE); el motivo se
  // queda en la tarjeta en vez de dejar reintentar.
  const [noAfianzable, setNoAfianzable] = useState<string | null>(null)

  // Solo fetcha citas si hay chance de mostrar la card. Para los otros
  // casos (estudio ya decidido o usuario sin permiso) salimos sin gasto.
  const fetchCitas = useCallback(async () => {
    if (!puedeDecidir || !estadoPermitido || estudioHabilitado || estudioRechazado) {
      setLoading(false)
      return
    }
    try {
      const citas = await citaService.getCitasByExpediente(expedienteId)
      setTieneCitaRealizada(citas.some((c) => c.estado === 'realizada'))
      setErrorCitas(false)
    } catch {
      setErrorCitas(true)
    } finally {
      setLoading(false)
    }
  }, [expedienteId, puedeDecidir, estadoPermitido, estudioHabilitado, estudioRechazado])

  useEffect(() => { fetchCitas() }, [fetchCitas, version])

  const handleHabilitar = async () => {
    setSubmitting(true)
    try {
      await expedienteService.habilitarEstudio(expedienteId)
      // El propietario no elige el pago: la API le envía la autorización al solicitante.
      toast.success(
        userRol === 'propietario'
          ? 'Evaluación habilitada. Le enviamos al prospecto la solicitud de autorización.'
          : 'Evaluación habilitada. Defina el pago desde el estudio; al prospecto le llega primero la autorización.',
      )
      await onAction()
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string }
      if (errObj.code === 'ESTUDIO_YA_HABILITADO') {
        toast.message('El estudio ya estaba habilitado. Refrescando...')
        await onAction()
      } else if (errObj.code === 'ESTUDIO_NO_AFIANZABLE') {
        setNoAfianzable(errObj.message || 'Este estudio está en desarrollo y todavía no se puede solicitar por la plataforma. No se generó ningún cobro.')
      } else {
        toast.error(errObj.message || 'Error al habilitar la evaluación')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleOmitirCita = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await expedienteService.omitirCita(expedienteId, motivoOmitir.trim() || undefined)
      toast.success('Visita marcada como hecha. Ya puede habilitar la evaluación.')
      setShowOmitir(false)
      setMotivoOmitir('')
      await onAction()
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      toast.error(errObj.message || 'No se pudo marcar la visita como hecha.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRechazar = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await expedienteService.rechazarEstudio(expedienteId, motivoRechazo.trim() || undefined)
      toast.success('Evaluación no habilitada. Se notificó al prospecto.')
      setShowRechazar(false)
      setMotivoRechazo('')
      await onAction()
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      toast.error(errObj.message || 'No se pudo cerrar el proceso. Intente de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  // Reglas de visibilidad combinadas — early-return para no renderizar nada
  // cuando no aplica.
  if (loading) return null
  if (!estadoPermitido) return null
  if (estudioHabilitado || estudioRechazado) return null
  if (!puedeDecidir) return null

  // Se puede habilitar el estudio si hubo cita realizada O si el gestor omitió
  // la cita (visita coordinada por fuera, 3.2).
  const puedeContinuar = tieneCitaRealizada || !!citaOmitida

  if (errorCitas && !citaOmitida) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">
          No pudimos consultar las visitas de este estudio, así que no sabemos si ya puede habilitar la evaluación.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            void fetchCitas()
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          <IconRefresh size={16} /> Reintentar
        </button>
      </div>
    )
  }

  // Sin cita realizada y sin omitir: ofrecemos omitir la cita (3.2) en vez de
  // dejar el flujo atascado en "Agenda una visita".
  if (!puedeContinuar) {
    return (
      <>
        {/* Va debajo de la visita (ResumenPorEtapa): agendarla es lo principal; esto es la
            salida secundaria cuando ya se hizo por fuera. */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">¿La visita ya se hizo por fuera?</h3>
            <p className="mt-0.5 text-sm text-gray-600">
              {userRol === 'operador_analista'
                ? 'La inmobiliaria o el propietario agendan la visita. Si se coordinó por WhatsApp u otro medio, márquela como hecha y la evaluación crediticia se podrá habilitar enseguida.'
                : 'Si la coordinó por WhatsApp u otro medio, márquela como hecha y podrá habilitar la evaluación crediticia enseguida.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowOmitir(true)}
            disabled={submitting}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 sm:self-auto"
          >
            <IconCalendar size={16} aria-hidden="true" />
            Marcar la visita como hecha
          </button>
        </div>

        <Modal
          isOpen={showOmitir}
          onClose={() => !submitting && setShowOmitir(false)}
          title="Marcar la visita como hecha"
          description="Confirme que la visita ya se coordinó por fuera. Podrá habilitar la evaluación enseguida."
          size="sm"
          footer={
            <ModalAcciones>
              <button type="button" onClick={() => setShowOmitir(false)} disabled={submitting} className={botonModal('secondary')}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleOmitirCita}
                disabled={submitting}
                aria-busy={submitting || undefined}
                className={botonModal('primary')}
              >
                {submitting && <IconLoader size={16} className="animate-spin" />}
                Marcar como hecha
              </button>
            </ModalAcciones>
          }
        >
          <div>
            <label htmlFor="accion-habilitar-estudio-card-motivo-nota-opcional" className="block text-sm font-medium text-gray-700 mb-1">
              Motivo o nota <span className="font-normal text-gray-500">(opcional)</span>
            </label>
            <textarea id="accion-habilitar-estudio-card-motivo-nota-opcional"
              value={motivoOmitir}
              onChange={(e) => setMotivoOmitir(e.target.value)}
              rows={3}
              maxLength={2000}
              disabled={submitting}
              aria-describedby="accion-habilitar-omitir-ayuda"
              placeholder="Por ejemplo: visita coordinada y realizada por WhatsApp el 2 de julio."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p id="accion-habilitar-omitir-ayuda" className="text-xs text-gray-600 mt-1">Queda registrado en la bitácora del estudio.</p>
          </div>
        </Modal>
      </>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-primary-200 sm:flex" aria-hidden="true">
            <IconShieldCheck size={18} className="text-primary-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 mb-0.5">
              {/* Para Cofianza, «¿habilitamos?» (habla por Cofianza); a quien tramita, en usted. */}
              {userRol === 'administrador' || userRol === 'operador_analista'
                ? 'Acción requerida: ¿habilitamos la evaluación crediticia?'
                : 'Siguiente paso: ¿habilita la evaluación crediticia?'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {citaOmitida ? 'Marcó la visita como ya realizada.' : 'La cita de visita se realizó.'}{' '}
              {/* Igual que la API (habilitarEstudio): solo al habilitar el propietario le
                  llega algo al prospecto; los demás eligen antes quién paga. */}
              {userRol === 'propietario'
                ? 'Decida si proceder con la evaluación crediticia del prospecto (le llegará el enlace para autorizar la consulta en centrales; el cobro va después) o cerrar el proceso aquí.'
                : 'Decida si proceder con la evaluación crediticia del prospecto o cerrar el proceso aquí. Al habilitarla, al prospecto no le llega nada todavía: después elija en el estudio quién paga.'}
            </p>
            {noAfianzable && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{noAfianzable}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleHabilitar}
                disabled={submitting || !!noAfianzable}
                className="inline-flex min-h-10 items-center gap-2 px-4 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
              >
                {submitting ? <IconLoader size={14} className="animate-spin" /> : <IconShieldCheck size={14} />}
                Habilitar evaluación
              </button>
              <button
                onClick={() => setShowRechazar(true)}
                disabled={submitting}
                className="inline-flex min-h-10 items-center gap-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                No habilitar
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showRechazar}
        onClose={() => !submitting && setShowRechazar(false)}
        title="No habilitar la evaluación"
        description="El proceso de este prospecto se cierra aquí."
        size="sm"
        footer={
          <div className="space-y-2">
            <p className="flex items-start gap-2 text-sm text-gray-700">
              <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
              <span>
                Al confirmar, el prospecto recibirá un aviso por correo de que decidió no continuar con el proceso. Esta acción es
                irreversible.
              </span>
            </p>
            <ModalAcciones>
              <button type="button" onClick={() => setShowRechazar(false)} disabled={submitting} className={botonModal('secondary')}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRechazar}
                disabled={submitting}
                aria-busy={submitting || undefined}
                className={botonModal('danger')}
              >
                {submitting && <IconLoader size={16} className="animate-spin" />}
                No habilitar
              </button>
            </ModalAcciones>
          </div>
        }
      >
        <div>
          <label htmlFor="accion-habilitar-estudio-card-motivo-opcional" className="block text-sm font-medium text-gray-700 mb-1">
            Motivo <span className="font-normal text-gray-500">(opcional)</span>
          </label>
          <textarea id="accion-habilitar-estudio-card-motivo-opcional"
            value={motivoRechazo}
            onChange={(e) => setMotivoRechazo(e.target.value)}
            rows={3}
            maxLength={2000}
            disabled={submitting}
            aria-describedby="accion-habilitar-rechazo-ayuda"
            placeholder="Por ejemplo: el inmueble ya se comprometió con otro candidato."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p id="accion-habilitar-rechazo-ayuda" className="text-xs text-gray-600 mt-1">
            Este texto aparecerá en el correo al prospecto: escríbalo en tono formal.
          </p>
        </div>
      </Modal>
    </>
  )
}
