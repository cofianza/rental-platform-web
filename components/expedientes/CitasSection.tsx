/**
 * CitasSection — Gestión de citas (visitas) dentro del expediente
 * Paso previo a la evaluación crediticia
 */

'use client'

import { AYUDA } from '@/lib/ayudaEstudio'
import { InfoTip } from '@/components/ui/InfoTip'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { IconLoader, IconPlus, IconCheck, IconCalendar, IconClock, IconShieldCheck } from '@/components/icons'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { citaService } from '@/services/citaService'
import { solicitanteService } from '@/services/solicitanteService'
import { pagoEstudioService } from '@/services/pagoEstudioService'
import { useUsuarioVista } from '@/components/expedientes/VerComo'
import { formatDateTime } from '@/lib/constants'
import type { ICita } from '@/types/cita'
import { ESTADO_CITA_CONFIG } from '@/types/cita'
import SlotSelector, {
  EditarHorariosHint,
  formatSlotHora,
  formatFechaCompleta,
} from '@/components/citas/SlotSelector'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

interface CitasSectionProps {
  expedienteId: string
  /** Estado del expediente — para ocultar el pill de pago cuando el estudio ya
   *  corrió (en expedientes finalizados no tiene sentido "Aún sin pago"). */
  expedienteEstado?: string
  /** 3.2: la visita se marcó como ya realizada por fuera (cita_omitida). Cuando
   *  es true NO ofrecemos "Agendar visita" — se muestra el estado de visita
   *  omitida en su lugar. */
  citaOmitida?: boolean
  /** Id del inmueble — habilita SlotSelector con disponibilidad real del
   *  propietario. Si falta, el modal cae a un input date+time crudo. */
  inmuebleId?: string
  /** Solicitante del expediente — para capturar su teléfono (WhatsApp) al
   *  agendar la visita si aún no lo tiene. */
  solicitanteId?: string
  solicitanteTelefono?: string | null
  /** Refresca el expediente en el padre tras guardar el teléfono del solicitante. */
  onSolicitanteUpdated?: () => void
  onCitaRealizada?: () => void
}

export function CitasSection({ expedienteId, expedienteEstado, citaOmitida, inmuebleId, solicitanteId, solicitanteTelefono, onSolicitanteUpdated, onCitaRealizada }: CitasSectionProps) {
  // Refresco en sitio cuando el detalle del estudio recarga.
  const version = useRefrescoExpediente()
  // El estudio ya corrió (o el expediente cerró): el pago del estudio ya no es
  // accionable, así que no mostramos el pill "Aún sin pago"/"Pago pendiente".
  const estudioYaCorrio = ['en_revision', 'aprobado', 'condicionado', 'rechazado', 'cerrado'].includes(expedienteEstado ?? '')
  const user = useUsuarioVista()
  const [citas, setCitas] = useState<ICita[]>([])
  const [confirmRealizar, setConfirmRealizar] = useState<ICita | null>(null)
  const [confirmNoAsistio, setConfirmNoAsistio] = useState<ICita | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCrearModal, setShowCrearModal] = useState(false)
  const [showConfirmarModal, setShowConfirmarModal] = useState<ICita | null>(null)
  const [showReprogramarModal, setShowReprogramarModal] = useState<ICita | null>(null)
  const [showCancelarModal, setShowCancelarModal] = useState<ICita | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Sin botones que el API rechaza: el miembro «Sólo lectura» no gestiona citas.
  const puedeEditar = usePuedeEditar()
  const canManageCitas =
    (user?.rol === 'propietario' || user?.rol === 'inmobiliaria' || user?.rol === 'administrador') && puedeEditar
  const esSolicitante = user?.rol === 'solicitante'

  // Estado del pago del estudio. Se consulta solo cuando hay una cita
  // realizada con estudio_habilitado=true. null = cargando, undefined =
  // no aplica (sin estudio o sin permiso de lectura).
  const [pagoEstudioEstado, setPagoEstudioEstado] = useState<string | null | undefined>(undefined)

  const fetchCitas = useCallback(async () => {
    try {
      const data = await citaService.getCitasByExpediente(expedienteId)
      setCitas(data)
    } catch {
      // Silently fail - section is optional
    } finally {
      setIsLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchCitas() }, [fetchCitas, version])

  // Disparar fetch del pago de estudio cuando la cita realizada tenga el
  // estudio habilitado. Si el endpoint falla (ej. solicitante sin permisos
  // sobre /pago-estudio/estado), degrada a 'sin_definir' silenciosamente.
  useEffect(() => {
    const realizada = citas.find(
      (c) => c.estado === 'realizada' && c.expediente?.estudio_habilitado === true,
    )
    if (!realizada?.expediente?.id) {
      setPagoEstudioEstado(undefined)
      return
    }
    setPagoEstudioEstado(null)
    pagoEstudioService
      .getEstado(realizada.expediente.id)
      .then((res) => setPagoEstudioEstado(res.estado))
      .catch(() => setPagoEstudioEstado('sin_definir'))
  }, [citas])

  const handleRealizar = async (cita: ICita) => {
    setActionLoading(cita.id)
    try {
      await citaService.realizarCita(cita.id)
      toast.success('Cita marcada como realizada')
      fetchCitas()
      onCitaRealizada?.()
    } catch {
      toast.error('Error al marcar la cita')
    } finally {
      setActionLoading(null)
    }
  }

  const handleNoAsistio = async (cita: ICita) => {
    setActionLoading(cita.id)
    try {
      await citaService.marcarNoAsistio(cita.id)
      toast.success('Cita marcada como no asistio')
      fetchCitas()
    } catch {
      toast.error('Error al marcar la cita')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAcusarReprogramacion = async (cita: ICita) => {
    setActionLoading(cita.id)
    try {
      await citaService.acusarReprogramacion(cita.id)
      toast.success('Aceptó el nuevo horario. El propietario sera notificado.')
      fetchCitas()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al aceptar el horario'
      toast.error(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRechazarReprogramacion = async (cita: ICita) => {
    setActionLoading(cita.id)
    try {
      await citaService.cancelarCita(cita.id, {
        motivo_cancelacion: 'El prospecto rechazó la fecha reprogramada.',
      })
      toast.success('Cita cancelada. Puede solicitar otra fecha.')
      fetchCitas()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al rechazar el horario'
      toast.error(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const activeCita = citas.find((c) => c.estado === 'solicitada' || c.estado === 'confirmada')
  const completedCita = citas.find((c) => c.estado === 'realizada')

  if (isLoading) {
    return (
      <div role="status" className="space-y-3 rounded-lg border border-gray-200 p-4">
        <span className="sr-only">Cargando visitas…</span>
        <Skeleton className="h-5 w-40" />
        <SkeletonText lineas={2} />
      </div>
    )
  }

  const hasNoActiveCita = !activeCita && !completedCita && citas.filter((c) => c.estado !== 'cancelada' && c.estado !== 'no_asistio').length === 0

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <IconCalendar size={16} />
          Visita al inmueble
          <InfoTip texto={AYUDA.visita} lado="derecha" />
        </h3>
        {/* Mostrar boton compacto solo cuando hay historial (canceladas/no_asistio)
            pero NO hay cita activa ni realizada — caso "rebote" tras cancelacion. */}
        {!hasNoActiveCita && !completedCita && !activeCita && !citaOmitida && (
          <button
            onClick={() => setShowCrearModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <IconPlus size={14} />
            {canManageCitas ? 'Agendar visita' : 'Solicitar visita'}
          </button>
        )}
      </div>

      {completedCita && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <IconCheck size={16} className="text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">Cita realizada</p>
              <p className="text-xs text-green-600">
                {completedCita.fecha_confirmada ? formatDateTime(completedCita.fecha_confirmada) : formatDateTime(completedCita.fecha_propuesta || completedCita.created_at)}
              </p>
            </div>
          </div>

          {/* Badges del estudio + pago — refleja el mismo estado que la kanban
              de /citas: si el propietario habilitó el estudio, mostramos el
              estado del pago para que ambos roles vean en qué punto está. */}
          {(completedCita.expediente?.estudio_habilitado || completedCita.expediente?.estudio_rechazado) && (
            <div className="mt-3 pt-3 border-t border-green-200 flex flex-wrap gap-2">
              {completedCita.expediente?.estudio_habilitado ? (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-green-700 bg-white border border-green-200">
                    <IconShieldCheck size={12} />
                    Evaluación habilitada
                  </span>
                  {!estudioYaCorrio && <PagoEstudioPill estado={pagoEstudioEstado} />}
                </>
              ) : completedCita.expediente?.estudio_rechazado ? (
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300"
                  title={completedCita.expediente?.motivo_estudio_rechazado || 'Se decidió no habilitar la evaluación.'}
                >
                  Evaluación no habilitada
                </span>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* 3.2: la visita se marcó como ya realizada por fuera (cita_omitida) — no
          ofrecemos agendar; mostramos el estado en su lugar. */}
      {citaOmitida && !completedCita && !activeCita && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <IconCheck size={16} className="text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">Visita ya realizada</p>
              <p className="text-xs text-green-600">
                Marcada como realizada por fuera (visita coordinada directamente). No hace falta agendar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quien no gestiona citas ni es el arrendatario (analista, Gerencia, sólo
          lectura) solo ve el estado: el texto y el botón de abajo son del prospecto. */}
      {hasNoActiveCita && !citaOmitida && !canManageCitas && !esSolicitante && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          Aún no hay una visita agendada para este estudio.
        </div>
      )}

      {hasNoActiveCita && !citaOmitida && (canManageCitas || esSolicitante) && (
        // Mismo lenguaje que las demás tarjetas del Resumen (sin degradado ni manchas decorativas).
        <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-primary-200 sm:flex" aria-hidden="true">
              <IconCalendar size={20} className="text-primary-700" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-gray-900 mb-1">
                {canManageCitas ? 'Agende una visita al inmueble' : 'Agende su visita al inmueble'}
              </h4>
              <p className="text-sm text-gray-600">
                {canManageCitas
                  ? 'Programe la visita con el prospecto: le llega la confirmación por correo y WhatsApp.'
                  : 'Antes de continuar con la evaluación crediticia, necesita conocer el inmueble. Solicite una cita y el propietario la confirmará.'}
              </p>
            </div>

            <button
              onClick={() => setShowCrearModal(true)}
              type="button"
              className="w-full sm:w-auto flex min-h-11 items-center justify-center gap-2 px-5 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 shadow-sm transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
            >
              <IconCalendar size={16} aria-hidden="true" />
              {canManageCitas ? 'Agendar visita' : 'Solicitar visita'}
            </button>
          </div>
        </div>
      )}

      {/* Citas activas */}
      {!completedCita && citas.filter((c) => c.estado !== 'cancelada' && c.estado !== 'no_asistio').length > 0 && (
        <>
        <div className="space-y-3">
          {citas
            .filter((c) => c.estado !== 'cancelada' && c.estado !== 'no_asistio')
            .map((cita) => (
              <CitaCard
                key={cita.id}
                cita={cita}
                canManage={canManageCitas}
                isSolicitante={user?.rol === 'solicitante'}
                isLoading={actionLoading === cita.id}
                onConfirmar={() => setShowConfirmarModal(cita)}
                onReprogramar={() => setShowReprogramarModal(cita)}
                onRealizar={() => setConfirmRealizar(cita)}
                onCancelar={() => setShowCancelarModal(cita)}
                onNoAsistio={() => setConfirmNoAsistio(cita)}
                onAcusarReprogramacion={() => handleAcusarReprogramacion(cita)}
                onRechazarReprogramacion={() => handleRechazarReprogramacion(cita)}
              />
            ))}
        </div>
        <ConfirmDialog
          isOpen={confirmRealizar !== null}
          onClose={() => setConfirmRealizar(null)}
          onConfirm={async () => {
            const c = confirmRealizar
            setConfirmRealizar(null)
            if (c) await handleRealizar(c)
          }}
          title="Marcar la visita como realizada"
          message="Confirme que la visita al inmueble se realizó. Con esto se habilita la evaluación crediticia del prospecto."
          confirmLabel="Sí, se realizó"
        />
        <ConfirmDialog
          isOpen={confirmNoAsistio !== null}
          onClose={() => setConfirmNoAsistio(null)}
          onConfirm={async () => {
            const c = confirmNoAsistio
            setConfirmNoAsistio(null)
            if (c) await handleNoAsistio(c)
          }}
          variant="danger"
          title="Registrar que no asistió"
          message="La visita queda como no realizada y el prospecto deberá agendar otra."
          confirmLabel="No asistió"
        />
        </>
      )}

      {/* Historial de citas canceladas/no asistio */}
      {citas.filter((c) => c.estado === 'cancelada' || c.estado === 'no_asistio').length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-600">
            Ver historial ({citas.filter((c) => c.estado === 'cancelada' || c.estado === 'no_asistio').length})
          </summary>
          <div className="mt-2 space-y-2">
            {citas
              .filter((c) => c.estado === 'cancelada' || c.estado === 'no_asistio')
              .map((cita) => (
                <CitaCard key={cita.id} cita={cita} canManage={false} isLoading={false} />
              ))}
          </div>
        </details>
      )}

      {/* Modal Crear Cita */}
      <CrearCitaModal
        isOpen={showCrearModal}
        onClose={() => setShowCrearModal(false)}
        expedienteId={expedienteId}
        inmuebleId={inmuebleId}
        isOwnerOrAgency={canManageCitas}
        solicitanteId={solicitanteId}
        solicitanteTelefono={solicitanteTelefono}
        onSolicitanteUpdated={onSolicitanteUpdated}
        onCreated={() => { setShowCrearModal(false); fetchCitas() }}
      />

      {/* Modal Confirmar Cita — solo notas, sin cambio de fecha. Para
          reagendar el propietario usa el boton 'Reprogramar' aparte. */}
      {showConfirmarModal && (
        <ConfirmarCitaModal
          isOpen={!!showConfirmarModal}
          onClose={() => setShowConfirmarModal(null)}
          cita={showConfirmarModal}
          onConfirmed={() => { setShowConfirmarModal(null); fetchCitas() }}
        />
      )}

      {/* Modal Reprogramar Cita — SlotSelector con la disponibilidad real. */}
      {showReprogramarModal && (
        <ReprogramarCitaModal
          isOpen={!!showReprogramarModal}
          onClose={() => setShowReprogramarModal(null)}
          cita={showReprogramarModal}
          inmuebleId={inmuebleId}
          isSolicitante={user?.rol === 'solicitante'}
          onReprogramado={() => { setShowReprogramarModal(null); fetchCitas() }}
        />
      )}

      {/* Modal Cancelar Cita */}
      {showCancelarModal && (
        <CancelarCitaModal
          isOpen={!!showCancelarModal}
          onClose={() => setShowCancelarModal(null)}
          cita={showCancelarModal}
          onCancelled={() => { setShowCancelarModal(null); fetchCitas() }}
        />
      )}
    </div>
  )
}

// ── Cita Card ──────────────────────────────

function CitaCard({
  cita,
  canManage,
  isSolicitante,
  isLoading,
  onConfirmar,
  onReprogramar,
  onRealizar,
  onCancelar,
  onNoAsistio,
  onAcusarReprogramacion,
  onRechazarReprogramacion,
}: {
  cita: ICita
  canManage: boolean
  isSolicitante?: boolean
  isLoading: boolean
  onConfirmar?: () => void
  onReprogramar?: () => void
  onRealizar?: () => void
  onCancelar?: () => void
  onNoAsistio?: () => void
  onAcusarReprogramacion?: () => void
  onRechazarReprogramacion?: () => void
}) {
  const config = ESTADO_CITA_CONFIG[cita.estado]

  // Reprogramacion pendiente de acuse: el propietario movio la fecha y el
  // solicitante aun no acepto/rechazo. Se compara por timestamp para no
  // saltarse cambios solo de zona horaria. Solo aplica si la cita esta
  // confirmada y la fecha confirmada difiere de la propuesta original.
  const reprogramacionPendiente =
    cita.estado === 'confirmada'
    && cita.fecha_confirmada
    && cita.fecha_propuesta
    && new Date(cita.fecha_confirmada).getTime() !== new Date(cita.fecha_propuesta).getTime()
    && !cita.acuse_solicitante_at

  const showAcuseBanner = isSolicitante && reprogramacionPendiente

  return (
    <div className={`border rounded-lg p-4 ${config.bgColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.color} ${config.bgColor}`}>
              {config.label}
            </span>
            {reprogramacionPendiente && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-800 border-amber-200">
                Reprogramada — pendiente acuse
              </span>
            )}
          </div>

          <div className="space-y-1 text-sm">
            {cita.fecha_propuesta && (
              <p className="text-gray-700 flex items-center gap-1.5">
                <IconClock size={14} className="text-gray-500" />
                <span className="font-medium">Propuesta:</span> {formatDateTime(cita.fecha_propuesta)}
              </p>
            )}
            {cita.fecha_confirmada && (
              <p className="text-gray-700 flex items-center gap-1.5">
                <IconCheck size={14} className="text-green-500" />
                <span className="font-medium">Confirmada:</span> {formatDateTime(cita.fecha_confirmada)}
              </p>
            )}
            {cita.notas_solicitante && (
              <p className="text-gray-500 text-xs mt-1">Notas del prospecto: {cita.notas_solicitante}</p>
            )}
            {cita.notas_propietario && (
              <p className="text-gray-500 text-xs">Notas propietario: {cita.notas_propietario}</p>
            )}
            {cita.motivo_cancelacion && (
              <p className="text-red-600 text-xs">Motivo: {cita.motivo_cancelacion}</p>
            )}
          </div>

          {/* Banner: solicitante debe aceptar/rechazar la nueva fecha */}
          {showAcuseBanner && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-2">
              <p className="text-sm text-amber-900">
                <strong>El propietario propuso un horario diferente.</strong> Confirme si le
                sirve la nueva fecha o rechácela para coordinar otra.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onAcusarReprogramacion}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-primary-700 rounded-md hover:bg-primary-800 disabled:opacity-50 transition-colors"
                >
                  Aceptar nuevo horario
                </button>
                <button
                  onClick={onRechazarReprogramacion}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  Rechazar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions — propietario/inmobiliaria/admin */}
        {canManage && !isLoading && (
          <div className="flex items-center gap-1.5 shrink-0">
            {cita.estado === 'solicitada' && onConfirmar && (
              <button
                onClick={onConfirmar}
                className="px-2.5 py-1.5 text-xs font-medium text-white bg-primary-700 rounded-md hover:bg-primary-800 transition-colors"
              >
                Confirmar
              </button>
            )}
            {(cita.estado === 'solicitada' || cita.estado === 'confirmada') && onReprogramar && (
              <button
                onClick={onReprogramar}
                className="px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors"
              >
                Reprogramar
              </button>
            )}
            {cita.estado === 'confirmada' && onRealizar && (
              <button
                onClick={onRealizar}
                className="px-2.5 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
              >
                Realizada
              </button>
            )}
            {cita.estado === 'confirmada' && onNoAsistio && (
              <button
                onClick={onNoAsistio}
                className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                No asistió
              </button>
            )}
            {(cita.estado === 'solicitada' || cita.estado === 'confirmada') && onCancelar && (
              <button
                onClick={onCancelar}
                className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        )}

        {/* Actions — solicitante: solo cuando la cita esta confirmada y no hay
            reprogramacion pendiente del propietario (en ese caso se ofrece el
            banner de aceptar/rechazar). Reprogramar manda la cita a 'solicitada'
            esperando que el propietario re-confirme. */}
        {isSolicitante && !canManage && !isLoading && cita.estado === 'confirmada' && !reprogramacionPendiente && (
          <div className="flex items-center gap-2 shrink-0">
            {/* 44 px de alto: el arrendatario lo toca desde el celular. */}
            {onReprogramar && (
              <button
                onClick={onReprogramar}
                className="inline-flex min-h-11 items-center px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors"
              >
                Reprogramar
              </button>
            )}
            {onCancelar && (
              <button
                onClick={onCancelar}
                className="inline-flex min-h-11 items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        )}

        {isLoading && (
          <IconLoader size={16} className="animate-spin text-gray-500 shrink-0" />
        )}
      </div>
    </div>
  )
}

// ── Piezas comunes de los diálogos de cita ──────────────────────────

const CAMPO_TEXTO =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100'

/** Error del envío, en el pie junto a las acciones. */
function ErrorDialogo({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null
  return (
    <p role="alert" className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {mensaje}
    </p>
  )
}

/** Sin inmueble no hay agenda que mostrar. */
function SinDisponibilidad() {
  return (
    <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      No pudimos cargar la disponibilidad del propietario. Recargue la página e intente de nuevo.
    </p>
  )
}

// ── Modal Crear Cita ──────────────────────────

function CrearCitaModal({
  isOpen,
  onClose,
  expedienteId,
  inmuebleId,
  isOwnerOrAgency,
  solicitanteId,
  solicitanteTelefono,
  onSolicitanteUpdated,
  onCreated,
}: {
  isOpen: boolean
  onClose: () => void
  expedienteId: string
  inmuebleId?: string
  isOwnerOrAgency: boolean
  solicitanteId?: string
  solicitanteTelefono?: string | null
  onSolicitanteUpdated?: () => void
  onCreated: () => void
}) {
  // SlotSelector emite ISO 8601 con offset (-05:00) ya alineado al horario
  // configurado por el propietario. No hay que componer fecha+hora a mano.
  const [slot, setSlot] = useState<string | null>(null)
  const [notas, setNotas] = useState('')
  const [telefono, setTelefono] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Incrementa al volver de editar horarios en otra pestaña → recarga slots.
  const [slotRefresh, setSlotRefresh] = useState(0)

  // El WhatsApp de confirmación de la cita (rama owner/inmobiliaria) solo sale al
  // solicitante si tiene teléfono. Si no lo tiene, lo capturamos aquí y lo
  // guardamos antes de agendar. (Para la rama solicitante no aplica.)
  const faltaTelefono = isOwnerOrAgency && !(solicitanteTelefono ?? '').trim()
  const telefonoValido = telefono.replace(/[^\d]/g, '').length >= 9

  const reset = () => {
    setSlot(null)
    setNotas('')
    setTelefono('')
    setError(null)
  }

  const handleClose = () => {
    if (isSubmitting) return
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    if (!slot) {
      setError('Seleccione un horario disponible.')
      return
    }
    if (faltaTelefono && !telefonoValido) {
      setError('Escriba el WhatsApp del prospecto para enviarle la confirmación.')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      // Si el solicitante no tenía teléfono y se capturó uno, guardarlo ANTES de
      // agendar: el backend lee solicitantes.telefono al notificar por WhatsApp.
      let telefonoGuardado = false
      if (faltaTelefono && telefonoValido && solicitanteId) {
        try {
          await solicitanteService.updateSolicitante(solicitanteId, { telefono })
          telefonoGuardado = true
        } catch {
          // Ej. 404 si el solicitante lo registró otro actor. No bloqueamos la
          // visita; solo avisamos que el WhatsApp podría no salir.
          toast.error('No pudimos guardar el teléfono; la visita se agenda igual, pero el WhatsApp podría no enviarse.')
        }
      }

      await citaService.crearCita({
        expediente_id: expedienteId,
        // El slot ya es ISO con offset; el backend lo guarda tal cual.
        // NO re-convertir con new Date().toISOString() — duplicaria el shift.
        fecha_propuesta: slot,
        notas_solicitante: notas || undefined,
        confirmar_inmediatamente: isOwnerOrAgency,
      })
      toast.success(isOwnerOrAgency ? 'Visita agendada y confirmada' : 'Cita solicitada')
      reset()
      onCreated()
      if (telefonoGuardado) onSolicitanteUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agendar la cita. Intente de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deshabilitado = isSubmitting || !slot || (faltaTelefono && !telefonoValido)

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isOwnerOrAgency ? 'Agendar visita confirmada' : 'Solicitar cita de visita'}
      description={
        isOwnerOrAgency
          ? 'La visita queda confirmada y el prospecto recibe el aviso por correo y WhatsApp.'
          : 'Elija un horario disponible. El propietario o la inmobiliaria confirmará o ajustará la fecha.'
      }
      size="lg"
      footer={
        <>
          <ErrorDialogo mensaje={error} />
          <ModalAcciones>
            <button type="button" onClick={handleClose} disabled={isSubmitting} className={botonModal('secondary')}>
              Cancelar
            </button>
            <button
              type="submit"
              form="crear-cita-form"
              disabled={deshabilitado}
              aria-busy={isSubmitting || undefined}
              className={botonModal('primary')}
            >
              {isSubmitting && <IconLoader size={16} className="animate-spin" />}
              {isSubmitting ? 'Agendando…' : isOwnerOrAgency ? 'Confirmar visita' : 'Solicitar cita'}
            </button>
          </ModalAcciones>
        </>
      }
    >
      <form
        id="crear-cita-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
        className="space-y-4"
      >
        {/* Captura del teléfono del solicitante si no lo tiene — necesario para
            enviarle la confirmación de la visita por WhatsApp. */}
        {faltaTelefono && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <PhoneInput
              label="Teléfono del prospecto (WhatsApp)"
              required
              value={telefono}
              onChange={setTelefono}
              placeholder="300 123 4567"
            />
            <p className="mt-1.5 text-xs text-amber-800">
              Este prospecto aún no tiene teléfono. Agréguelo para enviarle la confirmación de la visita por WhatsApp.
            </p>
          </div>
        )}

        {inmuebleId ? (
          <>
            <SlotSelector
              inmuebleId={inmuebleId}
              value={slot}
              onChange={(v) => {
                setSlot(v)
                setError(null)
              }}
              refreshSignal={slotRefresh}
            />
            {/* Solo el gestor puede editar su propia disponibilidad. */}
            {isOwnerOrAgency && (
              <EditarHorariosHint onRefresh={() => setSlotRefresh((n) => n + 1)} />
            )}
          </>
        ) : (
          <SinDisponibilidad />
        )}

        {slot && (
          <p role="status" className="flex items-start gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900">
            <IconCheck size={16} className="mt-0.5 shrink-0 text-primary-700" />
            <span>
              Visitará el <strong>{formatFechaCompleta(slot)}</strong> a las{' '}
              <strong>{formatSlotHora(slot)}</strong>
            </span>
          </p>
        )}

        <div>
          <label htmlFor="citas-section-campo" className="mb-1 block text-sm font-medium text-gray-700">
            {isOwnerOrAgency ? 'Nota para el prospecto' : 'Notas'} <span className="font-normal text-gray-500">(opcional)</span>
          </label>
          <textarea id="citas-section-campo"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            maxLength={500}
            disabled={isSubmitting}
            aria-describedby={isOwnerOrAgency ? 'citas-section-campo-ayuda' : undefined}
            placeholder={
              isOwnerOrAgency
                ? 'Indicaciones de acceso, qué traer, punto de encuentro…'
                : 'Indicaciones de acceso, preguntas para el propietario…'
            }
            className={CAMPO_TEXTO}
          />
          {isOwnerOrAgency && (
            <p id="citas-section-campo-ayuda" className="mt-1 text-xs text-gray-500">
              Se la enviaremos al prospecto por WhatsApp y correo junto con la confirmación.
            </p>
          )}
        </div>
      </form>
    </Modal>
  )
}

// ── Modal Confirmar Cita ──────────────────────────

function ConfirmarCitaModal({
  isOpen,
  onClose,
  cita,
  onConfirmed,
}: {
  isOpen: boolean
  onClose: () => void
  cita: ICita
  onConfirmed: () => void
}) {
  const [notas, setNotas] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => {
    if (isSubmitting) return
    setError(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    setError(null)
    setIsSubmitting(true)
    try {
      // Sin fecha_confirmada — el backend usa la fecha_propuesta. Si el
      // propietario quiere mover el horario, debe usar 'Reprogramar'.
      await citaService.confirmarCita(cita.id, {
        notas_propietario: notas || undefined,
      })
      toast.success('Cita confirmada')
      onConfirmed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar la cita. Intente de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Confirmar cita"
      description="Se confirma en la fecha que propuso el prospecto. Para cambiar el horario, use «Reprogramar»."
      footer={
        <>
          <ErrorDialogo mensaje={error} />
          <ModalAcciones>
            <button type="button" onClick={handleClose} disabled={isSubmitting} className={botonModal('secondary')}>
              Cancelar
            </button>
            <button
              type="submit"
              form="confirmar-cita-form"
              disabled={isSubmitting}
              aria-busy={isSubmitting || undefined}
              className={botonModal('primary')}
            >
              {isSubmitting && <IconLoader size={16} className="animate-spin" />}
              {isSubmitting ? 'Confirmando…' : 'Confirmar cita'}
            </button>
          </ModalAcciones>
        </>
      }
    >
      <form
        id="confirmar-cita-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
        className="space-y-4"
      >
        {cita.fecha_propuesta && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
            <p className="text-xs text-gray-600">Fecha y hora a confirmar</p>
            <p className="mt-0.5 font-semibold text-gray-900">{formatDateTime(cita.fecha_propuesta)}</p>
          </div>
        )}

        <div>
          <label htmlFor="citas-section-notas-opcional" className="mb-1 block text-sm font-medium text-gray-700">
            Notas <span className="font-normal text-gray-500">(opcional)</span>
          </label>
          <textarea id="citas-section-notas-opcional"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            maxLength={2000}
            disabled={isSubmitting}
            placeholder="Indicaciones para el prospecto (punto de encuentro…)"
            className={CAMPO_TEXTO}
          />
        </div>
      </form>
    </Modal>
  )
}

// ── Modal Reprogramar Cita ──────────────────────────

function ReprogramarCitaModal({
  isOpen,
  onClose,
  cita,
  inmuebleId,
  isSolicitante,
  onReprogramado,
}: {
  isOpen: boolean
  onClose: () => void
  cita: ICita
  inmuebleId?: string
  isSolicitante?: boolean
  onReprogramado: () => void
}) {
  const [slot, setSlot] = useState<string | null>(null)
  const [notas, setNotas] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Incrementa al volver de editar horarios en otra pestaña → recarga slots.
  const [slotRefresh, setSlotRefresh] = useState(0)

  const reset = () => {
    setSlot(null)
    setNotas('')
    setError(null)
  }

  const handleClose = () => {
    if (isSubmitting) return
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    if (!slot) {
      setError('Seleccione un horario disponible.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      // Endpoint unico — el backend decide la transicion segun el rol:
      //   propietario: confirmada -> confirmada (cambio de fecha unilateral)
      //   solicitante: confirmada -> solicitada (propuesta para re-confirmar)
      // El campo notas_propietario se usa como contenedor neutro; el backend
      // lo persiste en notas_propietario o notas_solicitante segun el rol.
      await citaService.reprogramarCita(cita.id, {
        fecha_confirmada: slot,
        notas_propietario: notas || undefined,
      })
      toast.success(
        isSolicitante
          ? 'Propuesta enviada. El propietario debe confirmar la nueva fecha.'
          : 'Cita reprogramada. Se le avisó al prospecto.',
      )
      reset()
      onReprogramado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reprogramar la cita. Intente de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Texto y placeholders adaptados al actor.
  const descripcion = isSolicitante
    ? 'Al enviar, la cita queda pendiente de que el propietario confirme el nuevo horario.'
    : 'Al guardar, el prospecto recibe la nueva fecha por correo, WhatsApp y en la plataforma.'

  const notasPlaceholder = isSolicitante
    ? 'Cuéntele al propietario por qué necesita cambiar el horario.'
    : 'Cuéntele al prospecto por qué cambia el horario.'

  const ctaLabel = isSolicitante ? 'Enviar propuesta' : 'Guardar nuevo horario'
  const horarioActual = cita.fecha_confirmada || cita.fecha_propuesta

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reprogramar visita"
      description={descripcion}
      size="lg"
      footer={
        <>
          <ErrorDialogo mensaje={error} />
          <ModalAcciones>
            <button type="button" onClick={handleClose} disabled={isSubmitting} className={botonModal('secondary')}>
              Cancelar
            </button>
            <button
              type="submit"
              form="reprogramar-cita-form"
              disabled={isSubmitting || !slot}
              aria-busy={isSubmitting || undefined}
              className={botonModal('primary')}
            >
              {isSubmitting && <IconLoader size={16} className="animate-spin" />}
              {isSubmitting ? 'Enviando…' : ctaLabel}
            </button>
          </ModalAcciones>
        </>
      }
    >
      <form
        id="reprogramar-cita-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
        className="space-y-4"
      >
        {horarioActual && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
            <p className="text-xs text-gray-600">Horario actual</p>
            <p className="font-medium text-gray-900">{formatDateTime(horarioActual)}</p>
          </div>
        )}

        {inmuebleId ? (
          <>
            <SlotSelector
              inmuebleId={inmuebleId}
              value={slot}
              onChange={(v) => {
                setSlot(v)
                setError(null)
              }}
              refreshSignal={slotRefresh}
            />
            {/* El gestor (no solicitante) puede ajustar su disponibilidad. */}
            {!isSolicitante && (
              <EditarHorariosHint onRefresh={() => setSlotRefresh((n) => n + 1)} />
            )}
          </>
        ) : (
          <SinDisponibilidad />
        )}

        {slot && (
          <p role="status" className="flex items-start gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900">
            <IconCheck size={16} className="mt-0.5 shrink-0 text-primary-700" />
            <span>
              Nuevo horario: <strong>{formatFechaCompleta(slot)}</strong> a las{' '}
              <strong>{formatSlotHora(slot)}</strong>
            </span>
          </p>
        )}

        <div>
          <label htmlFor="citas-section-notas-opcional-2" className="mb-1 block text-sm font-medium text-gray-700">
            Notas <span className="font-normal text-gray-500">(opcional)</span>
          </label>
          <textarea id="citas-section-notas-opcional-2"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            maxLength={2000}
            disabled={isSubmitting}
            placeholder={notasPlaceholder}
            className={CAMPO_TEXTO}
          />
        </div>
      </form>
    </Modal>
  )
}

// ── Modal Cancelar Cita ──────────────────────────

function CancelarCitaModal({
  isOpen,
  onClose,
  cita,
  onCancelled,
}: {
  isOpen: boolean
  onClose: () => void
  cita: ICita
  onCancelled: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => {
    if (isSubmitting) return
    setError(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    if (!motivo.trim()) {
      setError('Escriba el motivo de la cancelación.')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await citaService.cancelarCita(cita.id, { motivo_cancelacion: motivo })
      toast.success('Cita cancelada')
      onCancelled()
    } catch {
      setError('No se pudo cancelar la cita. Intente de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cancelar cita"
      description="El motivo se le envía a la otra parte y queda en el historial del estudio."
      footer={
        <>
          <ErrorDialogo mensaje={error} />
          <ModalAcciones>
            <button type="button" onClick={handleClose} disabled={isSubmitting} className={botonModal('secondary')}>
              Volver
            </button>
            <button
              type="submit"
              form="cancelar-cita-form"
              disabled={isSubmitting || !motivo.trim()}
              aria-busy={isSubmitting || undefined}
              className={botonModal('danger')}
            >
              {isSubmitting && <IconLoader size={16} className="animate-spin" />}
              {isSubmitting ? 'Cancelando…' : 'Cancelar cita'}
            </button>
          </ModalAcciones>
        </>
      }
    >
      <form
        id="cancelar-cita-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
      >
        <label htmlFor="citas-section-motivo" className="mb-1 block text-sm font-medium text-gray-700">
          Motivo <span className="text-red-600" aria-hidden="true">*</span>
        </label>
        <textarea id="citas-section-motivo"
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value)
            setError(null)
          }}
          rows={3}
          required
          disabled={isSubmitting}
          placeholder="Por qué se cancela la visita…"
          className={CAMPO_TEXTO}
        />
      </form>
    </Modal>
  )
}

// ── Pill del estado del pago del estudio ──────────────────────
// Mismo contrato visual que el componente equivalente en
// components/citas/CitaCard.tsx (kanban de /citas). Duplicado a proposito
// hasta que extraigamos un componente compartido.

function PagoEstudioPill({ estado }: { estado?: string | null }) {
  // undefined → no aplica (sin estudio habilitado o sin permiso). null → cargando.
  if (estado === undefined) return null
  if (estado === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200">
        Pago: …
      </span>
    )
  }

  const config: Record<string, { label: string; className: string }> = {
    completado: {
      label: 'Pago recibido',
      className: 'text-green-700 bg-white border-green-200',
    },
    asumido_inmobiliaria: {
      label: 'Pago: inmobiliaria',
      className: 'text-green-700 bg-white border-green-200',
    },
    pendiente: {
      label: 'Pago pendiente',
      className: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    procesando: {
      label: 'Procesando pago',
      className: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    fallido: {
      label: 'Pago fallido',
      className: 'text-red-700 bg-red-50 border-red-200',
    },
    cancelado: {
      label: 'Pago cancelado',
      className: 'text-gray-600 bg-gray-50 border-gray-200',
    },
    // §6.3: el gestor ya eligió "enviar link al arrendatario", pero el cobro
    // se crea recién cuando el prospecto firma. Sin esta entrada caía en
    // 'Aún sin pago' — idéntico a "nadie ha decidido nada".
    esperando_autorizacion: {
      label: 'Esperando autorización',
      className: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    sin_definir: {
      label: 'Aún sin pago',
      className: 'text-gray-600 bg-gray-50 border-gray-200',
    },
  }

  const pill = config[estado] || config.sin_definir
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${pill.className}`}>
      {pill.label}
    </span>
  )
}
