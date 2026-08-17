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
 * Nota (Mario, 5-may-2026): este card YA NO pide duracion + fecha del
 * contrato. Esos datos se piden cuando se va a generar el contrato
 * (post-aprobacion del cliente) en AprobarCondicionadoCard o
 * AccionContratoPendienteCard.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { IconShieldCheck, IconLoader, IconAlertTriangle, IconCalendar } from '@/components/icons'
import { Modal } from '@/components/ui'
import { citaService } from '@/services/citaService'
import { expedienteService } from '@/services/expedienteService'

// Estados del expediente donde la RPC fn_habilitar_estudio_expediente permite
// habilitar. Fuera de ellos (aprobado, cerrado, cancelado…) la card sería un
// callejón sin salida: dejaría omitir la cita y luego la RPC rechazaría.
const ESTADOS_HABILITABLES = ['borrador', 'en_revision', 'informacion_incompleta']

// Burós ejecutables. 'manual' y 'sifin' quedan fuera: el primero no se
// consulta automáticamente y el segundo es un stub sin implementar, así que
// ofrecerlos aquí dejaría al solicitante pagando por un estudio que no corre.
type BuroEjecutable = 'transunion' | 'datacredito'

const BUROS: { value: BuroEjecutable; label: string }[] = [
  { value: 'transunion', label: 'TransUnion' },
  { value: 'datacredito', label: 'DataCrédito' },
]

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
  const [showRechazar, setShowRechazar] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [showOmitir, setShowOmitir] = useState(false)
  const [motivoOmitir, setMotivoOmitir] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [proveedor, setProveedor] = useState<BuroEjecutable>('transunion')

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
    } catch {
      // Si falla, no mostramos la card — es informativa, no critica.
      setTieneCitaRealizada(false)
    } finally {
      setLoading(false)
    }
  }, [expedienteId, puedeDecidir, estadoPermitido, estudioHabilitado, estudioRechazado])

  useEffect(() => { fetchCitas() }, [fetchCitas])

  const handleHabilitar = async () => {
    setSubmitting(true)
    try {
      await expedienteService.habilitarEstudio(expedienteId, proveedor)
      const buroLabel = BUROS.find((b) => b.value === proveedor)?.label ?? proveedor
      toast.success(`Estudio habilitado con ${buroLabel}, se notificó al solicitante`)
      await onAction()
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string }
      if (errObj.code === 'ESTUDIO_YA_HABILITADO') {
        toast.message('El estudio ya estaba habilitado. Refrescando...')
        await onAction()
      } else {
        toast.error(errObj.message || 'Error al habilitar el estudio')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleOmitirCita = async () => {
    setSubmitting(true)
    try {
      await expedienteService.omitirCita(expedienteId, motivoOmitir.trim() || undefined)
      toast.success('Cita omitida. Ya puedes habilitar el estudio.')
      setShowOmitir(false)
      setMotivoOmitir('')
      await onAction()
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      toast.error(errObj.message || 'No se pudo omitir la cita')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRechazar = async () => {
    setSubmitting(true)
    try {
      await expedienteService.rechazarEstudio(expedienteId, motivoRechazo.trim() || undefined)
      toast.success('Estudio no habilitado, se notifico al solicitante')
      setShowRechazar(false)
      setMotivoRechazo('')
      await onAction()
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      toast.error(errObj.message || 'Error al rechazar el estudio')
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

  // Sin cita realizada y sin omitir: ofrecemos omitir la cita (3.2) en vez de
  // dejar el flujo atascado en "Agenda una visita".
  if (!puedeContinuar) {
    return (
      <>
        <div className="border border-gray-200 bg-white rounded-lg p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <IconCalendar size={20} className="text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 mb-0.5">
                ¿Ya coordinaron la visita por fuera?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Para habilitar el estudio normalmente se agenda una visita. Si ya la
                coordinaron por WhatsApp (u otro medio) y decidieron continuar, puedes
                omitir la cita y seguir directo con el estudio crediticio.
              </p>
              <button
                onClick={() => setShowOmitir(true)}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 disabled:opacity-50 transition-colors"
              >
                <IconCalendar size={14} />
                La visita ya se hizo — omitir cita
              </button>
            </div>
          </div>
        </div>

        <Modal
          isOpen={showOmitir}
          onClose={() => !submitting && setShowOmitir(false)}
          title="Omitir la cita de visita"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Confirmas que la visita ya se coordinó por fuera y quieres continuar sin
              agendar una cita en el sistema. Podrás habilitar el estudio enseguida.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo / nota (opcional)
              </label>
              <textarea
                value={motivoOmitir}
                onChange={(e) => setMotivoOmitir(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Ej: visita coordinada y realizada por WhatsApp el 2 de julio."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Queda registrado en la bitácora del expediente.</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowOmitir(false)}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleOmitirCita}
                disabled={submitting}
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <IconLoader size={14} className="animate-spin" />}
                Omitir cita y continuar
              </button>
            </div>
          </div>
        </Modal>
      </>
    )
  }

  return (
    <>
      <div className="border-2 border-primary-300 bg-primary-50/50 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <IconShieldCheck size={22} className="text-primary-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 mb-0.5">
              Acción requerida: ¿habilitamos el estudio crediticio?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {citaOmitida
                ? 'Marcaste la visita como ya realizada. Decide si proceder con el estudio crediticio del solicitante (le llegará el link para pagar y completar) o cerrar el proceso aquí.'
                : 'La cita de visita se realizó. Decide si proceder con el estudio crediticio del solicitante (le llegará el link para pagar y completar) o cerrar el proceso aquí.'}
            </p>
            {/* Selección de buró. Va ANTES del botón porque la decisión se
                toma al habilitar: el estudio se crea con ese proveedor y
                cambiarlo después obliga a reintentar (y a pagar otra consulta). */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Buró de crédito a consultar
              </label>
              <div className="flex flex-wrap gap-2">
                {BUROS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setProveedor(b.value)}
                    disabled={submitting}
                    aria-pressed={proveedor === b.value}
                    className={[
                      'px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50',
                      proveedor === b.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleHabilitar}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {submitting ? <IconLoader size={14} className="animate-spin" /> : <IconShieldCheck size={14} />}
                Habilitar estudio
              </button>
              <button
                onClick={() => setShowRechazar(true)}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
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
        title="No habilitar estudio"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <IconAlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Al confirmar, el solicitante recibirá un aviso por correo de que decidiste no continuar con el proceso. Esta acción es irreversible.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo (opcional)
            </label>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Ej: prefiero esperar otro candidato, no me convencio el perfil, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Este texto aparecerá en el correo al solicitante.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowRechazar(false)}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleRechazar}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <IconLoader size={14} className="animate-spin" />}
              Confirmar — no habilitar
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
