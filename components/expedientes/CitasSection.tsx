/**
 * CitasSection — Gestión de citas (visitas) dentro del expediente
 * Paso previo al estudio crediticio
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { IconLoader, IconPlus, IconCheck, IconCalendar, IconClock } from '@/components/icons'
import { Modal } from '@/components/ui'
import { citaService } from '@/services/citaService'
import { useAuthStore } from '@/stores/auth.store'
import { formatDateTime } from '@/lib/constants'
import type { ICita, EstadoCita } from '@/types/cita'
import { ESTADO_CITA_CONFIG } from '@/types/cita'
import SlotSelector, {
  formatSlotHora,
  formatFechaCompleta,
} from '@/components/citas/SlotSelector'

interface CitasSectionProps {
  expedienteId: string
  /** Id del inmueble — habilita SlotSelector con disponibilidad real del
   *  propietario. Si falta, el modal cae a un input date+time crudo. */
  inmuebleId?: string
  onCitaRealizada?: () => void
}

export function CitasSection({ expedienteId, inmuebleId, onCitaRealizada }: CitasSectionProps) {
  const user = useAuthStore((s) => s.user)
  const [citas, setCitas] = useState<ICita[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCrearModal, setShowCrearModal] = useState(false)
  const [showConfirmarModal, setShowConfirmarModal] = useState<ICita | null>(null)
  const [showReprogramarModal, setShowReprogramarModal] = useState<ICita | null>(null)
  const [showCancelarModal, setShowCancelarModal] = useState<ICita | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const canManageCitas = user?.rol === 'propietario' || user?.rol === 'inmobiliaria' || user?.rol === 'administrador'

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

  useEffect(() => { fetchCitas() }, [fetchCitas])

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
      toast.success('Aceptaste el nuevo horario. El propietario sera notificado.')
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
        motivo_cancelacion: 'El solicitante rechazo la fecha reprogramada por el propietario.',
      })
      toast.success('Cita cancelada. Puedes solicitar otra fecha.')
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
      <div className="flex items-center justify-center py-8">
        <IconLoader size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  const hasNoActiveCita = !activeCita && !completedCita && citas.filter((c) => c.estado !== 'cancelada' && c.estado !== 'no_asistio').length === 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <IconCalendar size={16} />
          Cita Previa
        </h3>
        {/* Mostrar boton compacto solo cuando hay historial (canceladas/no_asistio)
            pero NO hay cita activa ni realizada — caso "rebote" tras cancelacion. */}
        {!hasNoActiveCita && !completedCita && !activeCita && (
          <button
            onClick={() => setShowCrearModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <IconPlus size={14} />
            {canManageCitas ? 'Agendar visita' : 'Solicitar cita'}
          </button>
        )}
      </div>

      {completedCita && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <IconCheck size={16} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-800">Cita realizada</p>
            <p className="text-xs text-green-600">
              {completedCita.fecha_confirmada ? formatDateTime(completedCita.fecha_confirmada) : formatDateTime(completedCita.fecha_propuesta || completedCita.created_at)}
            </p>
          </div>
        </div>
      )}

      {hasNoActiveCita && (
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-primary-100/50 to-cyan-50 border-2 border-primary-200 rounded-xl p-6">
          {/* Decoración de fondo */}
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary-200/40 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-cyan-200/30 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white shadow-md border border-primary-200 flex items-center justify-center shrink-0">
              <IconCalendar size={28} className="text-primary-600" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-gray-900 mb-1">
                {canManageCitas ? 'Agenda una visita al inmueble' : 'Agenda tu visita al inmueble'}
              </h4>
              <p className="text-sm text-gray-600">
                {canManageCitas
                  ? 'Programa una visita confirmada con el solicitante. Recibira una notificacion por correo.'
                  : 'Antes de continuar con el estudio crediticio, necesitas conocer el inmueble. Solicita una cita y el propietario la confirmara.'}
              </p>
            </div>

            <button
              onClick={() => setShowCrearModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-md hover:shadow-lg transition-all shrink-0"
            >
              <IconCalendar size={16} />
              {canManageCitas ? 'Agendar visita' : 'Solicitar cita'}
            </button>
          </div>
        </div>
      )}

      {/* Citas activas */}
      {!completedCita && citas.filter((c) => c.estado !== 'cancelada' && c.estado !== 'no_asistio').length > 0 && (
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
                onRealizar={() => handleRealizar(cita)}
                onCancelar={() => setShowCancelarModal(cita)}
                onNoAsistio={() => handleNoAsistio(cita)}
                onAcusarReprogramacion={() => handleAcusarReprogramacion(cita)}
                onRechazarReprogramacion={() => handleRechazarReprogramacion(cita)}
              />
            ))}
        </div>
      )}

      {/* Historial de citas canceladas/no asistio */}
      {citas.filter((c) => c.estado === 'cancelada' || c.estado === 'no_asistio').length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
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
                <IconClock size={14} className="text-gray-400" />
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
              <p className="text-gray-500 text-xs mt-1">Notas solicitante: {cita.notas_solicitante}</p>
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
                <strong>El propietario propuso un horario diferente.</strong> Confirma si te
                sirve la nueva fecha o rechazala para coordinar otra.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onAcusarReprogramacion}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
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

        {/* Actions */}
        {canManage && !isLoading && (
          <div className="flex items-center gap-1.5 shrink-0">
            {cita.estado === 'solicitada' && onConfirmar && (
              <button
                onClick={onConfirmar}
                className="px-2.5 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors"
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
                No asistio
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

        {isLoading && (
          <IconLoader size={16} className="animate-spin text-gray-400 shrink-0" />
        )}
      </div>
    </div>
  )
}

// ── Modal Crear Cita ──────────────────────────

function CrearCitaModal({
  isOpen,
  onClose,
  expedienteId,
  inmuebleId,
  isOwnerOrAgency,
  onCreated,
}: {
  isOpen: boolean
  onClose: () => void
  expedienteId: string
  inmuebleId?: string
  isOwnerOrAgency: boolean
  onCreated: () => void
}) {
  // SlotSelector emite ISO 8601 con offset (-05:00) ya alineado al horario
  // configurado por el propietario. No hay que componer fecha+hora a mano.
  const [slot, setSlot] = useState<string | null>(null)
  const [notas, setNotas] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reset = () => {
    setSlot(null)
    setNotas('')
  }

  const handleClose = () => {
    if (isSubmitting) return
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!slot) {
      toast.error('Selecciona un horario disponible')
      return
    }

    setIsSubmitting(true)
    try {
      await citaService.crearCita({
        expediente_id: expedienteId,
        // El slot ya es ISO con offset; el backend lo guarda tal cual.
        // NO re-convertir con new Date().toISOString() — duplicaria el shift.
        fecha_propuesta: slot,
        notas_solicitante: notas || undefined,
        confirmar_inmediatamente: isOwnerOrAgency,
      })
      toast.success(isOwnerOrAgency ? 'Visita agendada y confirmada' : 'Cita solicitada exitosamente')
      reset()
      onCreated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al agendar la cita'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isOwnerOrAgency ? 'Agendar Visita Confirmada' : 'Solicitar Cita de Visita'}
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          {isOwnerOrAgency
            ? 'Programa una visita ya confirmada con el solicitante. Se le enviara una notificacion por correo.'
            : 'Elige un horario disponible. El propietario o inmobiliaria confirmara o ajustara la fecha.'}
        </p>

        {inmuebleId ? (
          <SlotSelector inmuebleId={inmuebleId} value={slot} onChange={setSlot} />
        ) : (
          <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
            No pudimos cargar la disponibilidad del propietario. Recarga la pagina e intenta de nuevo.
          </div>
        )}

        {slot && (
          <div className="flex items-start gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded">
            <IconCheck size={16} className="text-primary-600 mt-0.5 shrink-0" />
            <p className="text-sm text-primary-900">
              Visitaras el <strong>{formatFechaCompleta(slot)}</strong> a las{' '}
              <strong>{formatSlotHora(slot)}</strong>
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Indicaciones de acceso, preguntas para el propietario, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={handleClose} disabled={isSubmitting} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !slot}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <IconLoader size={14} className="animate-spin" />}
            {isOwnerOrAgency ? 'Confirmar visita' : 'Solicitar cita'}
          </button>
        </div>
      </div>
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

  const handleSubmit = async () => {
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
      const msg = err instanceof Error ? err.message : 'Error al confirmar la cita'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Cita">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Confirma la cita en la fecha y hora propuesta por el solicitante. Si necesitas
          cambiar el horario, usa el boton <strong>Reprogramar</strong>.
        </p>

        {cita.fecha_propuesta && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="text-xs text-blue-600">Fecha y hora a confirmar:</p>
            <p className="font-semibold mt-0.5">{formatDateTime(cita.fecha_propuesta)}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Indicaciones para el solicitante (punto de encuentro, etc.)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <IconLoader size={14} className="animate-spin" />}
            Confirmar cita
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Modal Reprogramar Cita ──────────────────────────

function ReprogramarCitaModal({
  isOpen,
  onClose,
  cita,
  inmuebleId,
  onReprogramado,
}: {
  isOpen: boolean
  onClose: () => void
  cita: ICita
  inmuebleId?: string
  onReprogramado: () => void
}) {
  const [slot, setSlot] = useState<string | null>(null)
  const [notas, setNotas] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reset = () => {
    setSlot(null)
    setNotas('')
  }

  const handleClose = () => {
    if (isSubmitting) return
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!slot) {
      toast.error('Selecciona un horario disponible')
      return
    }
    setIsSubmitting(true)
    try {
      // Endpoint dedicado: tolera self-loop confirmada -> confirmada (no posible
      // via /confirmar). Backend valida que el slot este en disponibilidad y
      // dispara aviso 'reprogramada' al solicitante.
      await citaService.reprogramarCita(cita.id, {
        fecha_confirmada: slot,
        notas_propietario: notas || undefined,
      })
      toast.success('Cita reprogramada — se notifico al solicitante')
      reset()
      onReprogramado()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al reprogramar la cita'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reprogramar visita" size="lg">
      <div className="space-y-4">
        {cita.fecha_propuesta && (
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm">
            <p className="text-xs text-gray-500">Horario actual:</p>
            <p className="font-medium text-gray-900">{formatDateTime(cita.fecha_propuesta)}</p>
          </div>
        )}

        <p className="text-sm text-gray-600">
          Elige un nuevo horario disponible. Al guardar, el solicitante recibira un aviso
          con la nueva fecha por correo y notificacion in-app.
        </p>

        {inmuebleId ? (
          <SlotSelector inmuebleId={inmuebleId} value={slot} onChange={setSlot} />
        ) : (
          <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
            No pudimos cargar la disponibilidad del propietario. Recarga la pagina e intenta de nuevo.
          </div>
        )}

        {slot && (
          <div className="flex items-start gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded">
            <IconCheck size={16} className="text-primary-600 mt-0.5 shrink-0" />
            <p className="text-sm text-primary-900">
              Nuevo horario: <strong>{formatFechaCompleta(slot)}</strong> a las{' '}
              <strong>{formatSlotHora(slot)}</strong>
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Cuentale al solicitante por que cambias el horario."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !slot}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <IconLoader size={14} className="animate-spin" />}
            Enviar nueva propuesta
          </button>
        </div>
      </div>
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

  const handleSubmit = async () => {
    if (!motivo.trim()) { toast.error('Ingresa un motivo'); return }

    setIsSubmitting(true)
    try {
      await citaService.cancelarCita(cita.id, { motivo_cancelacion: motivo })
      toast.success('Cita cancelada')
      onCancelled()
    } catch {
      toast.error('Error al cancelar la cita')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancelar Cita">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Indica el motivo de la cancelacion.</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Motivo de la cancelacion..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">
            Volver
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !motivo.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <IconLoader size={14} className="animate-spin" />}
            Cancelar cita
          </button>
        </div>
      </div>
    </Modal>
  )
}
