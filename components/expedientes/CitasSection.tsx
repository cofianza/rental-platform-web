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

interface CitasSectionProps {
  expedienteId: string
  onCitaRealizada?: () => void
}

export function CitasSection({ expedienteId, onCitaRealizada }: CitasSectionProps) {
  const user = useAuthStore((s) => s.user)
  const [citas, setCitas] = useState<ICita[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCrearModal, setShowCrearModal] = useState(false)
  const [showConfirmarModal, setShowConfirmarModal] = useState<ICita | null>(null)
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
        {!hasNoActiveCita && !completedCita && (
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
                isLoading={actionLoading === cita.id}
                onConfirmar={() => setShowConfirmarModal(cita)}
                onRealizar={() => handleRealizar(cita)}
                onCancelar={() => setShowCancelarModal(cita)}
                onNoAsistio={() => handleNoAsistio(cita)}
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
        isOwnerOrAgency={canManageCitas}
        onCreated={() => { setShowCrearModal(false); fetchCitas() }}
      />

      {/* Modal Confirmar Cita */}
      {showConfirmarModal && (
        <ConfirmarCitaModal
          isOpen={!!showConfirmarModal}
          onClose={() => setShowConfirmarModal(null)}
          cita={showConfirmarModal}
          onConfirmed={() => { setShowConfirmarModal(null); fetchCitas() }}
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
  isLoading,
  onConfirmar,
  onRealizar,
  onCancelar,
  onNoAsistio,
}: {
  cita: ICita
  canManage: boolean
  isLoading: boolean
  onConfirmar?: () => void
  onRealizar?: () => void
  onCancelar?: () => void
  onNoAsistio?: () => void
}) {
  const config = ESTADO_CITA_CONFIG[cita.estado]

  return (
    <div className={`border rounded-lg p-4 ${config.bgColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.color} ${config.bgColor}`}>
              {config.label}
            </span>
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
  isOwnerOrAgency,
  onCreated,
}: {
  isOpen: boolean
  onClose: () => void
  expedienteId: string
  isOwnerOrAgency: boolean
  onCreated: () => void
}) {
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('10:00')
  const [notas, setNotas] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!fecha) { toast.error('Selecciona una fecha'); return }

    setIsSubmitting(true)
    try {
      const fechaPropuesta = new Date(`${fecha}T${hora}:00`).toISOString()
      await citaService.crearCita({
        expediente_id: expedienteId,
        fecha_propuesta: fechaPropuesta,
        notas_solicitante: notas || undefined,
        confirmar_inmediatamente: isOwnerOrAgency,
      })
      toast.success(isOwnerOrAgency ? 'Visita agendada y confirmada' : 'Cita solicitada exitosamente')
      setFecha('')
      setHora('10:00')
      setNotas('')
      onCreated()
    } catch {
      toast.error('Error al agendar la cita')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Min date = tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isOwnerOrAgency ? 'Agendar Visita Confirmada' : 'Solicitar Cita de Visita'}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          {isOwnerOrAgency
            ? 'Programa una visita ya confirmada con el solicitante. Se le enviara una notificacion por correo.'
            : 'Solicita una cita para visitar el inmueble. El propietario o inmobiliaria debera confirmar la fecha.'}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              min={minDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Preferencias de horario, indicaciones de acceso, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !fecha}
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
  const propuestaDate = cita.fecha_propuesta ? new Date(cita.fecha_propuesta) : new Date()
  const [fecha, setFecha] = useState(propuestaDate.toISOString().split('T')[0])
  const [hora, setHora] = useState(propuestaDate.toTimeString().slice(0, 5))
  const [notas, setNotas] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const fechaConfirmada = new Date(`${fecha}T${hora}:00`).toISOString()
      await citaService.confirmarCita(cita.id, {
        fecha_confirmada: fechaConfirmada,
        notas_propietario: notas || undefined,
      })
      toast.success('Cita confirmada')
      onConfirmed()
    } catch {
      toast.error('Error al confirmar la cita')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Cita">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Confirma o ajusta la fecha propuesta por el solicitante.
        </p>

        {cita.fecha_propuesta && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            Fecha propuesta: <strong>{formatDateTime(cita.fecha_propuesta)}</strong>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha confirmada</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Indicaciones para la visita..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">
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
