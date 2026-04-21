/**
 * CitaCard — tarjeta individual en el kanban de /citas.
 * Incluye acciones contextuales por estado + flujo de habilitar estudio.
 *
 * TODO: extraer handlers a useCitaActions() y reutilizar también en
 * CitasSection (detalle del expediente). Por ahora duplicamos la lógica
 * porque CitasSection tiene su propio shape de modales y refactorizarla
 * es fuera de scope.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Modal, ConfirmDialog } from '@/components/ui'
import { IconLoader, IconCalendar, IconPhone, IconShieldCheck } from '@/components/icons'
import { citaService } from '@/services/citaService'
import { expedienteService } from '@/services/expedienteService'
import { formatDateTime } from '@/lib/constants'
import type { ICita } from '@/types/cita'
import { ESTADO_CITA_CONFIG } from '@/types/cita'

interface CitaCardProps {
  cita: ICita
  onAction: () => void | Promise<void>
}

type ActionState = 'idle' | 'confirmar' | 'cancelar' | 'realizar' | 'no_asistio' | 'habilitar'

export function CitaCard({ cita, onAction }: CitaCardProps) {
  const [action, setAction] = useState<ActionState>('idle')
  const [isLoading, setIsLoading] = useState(false)

  // Estado del form para modal de confirmar
  const [fechaConfirmada, setFechaConfirmada] = useState<string>(
    () => toLocalDatetime(cita.fecha_propuesta) || '',
  )
  const [notasPropietario, setNotasPropietario] = useState('')
  const [motivoCancelacion, setMotivoCancelacion] = useState('')

  const closeModals = () => {
    setAction('idle')
    setNotasPropietario('')
    setMotivoCancelacion('')
  }

  const runAction = async (fn: () => Promise<unknown>, successMsg: string) => {
    setIsLoading(true)
    try {
      await fn()
      toast.success(successMsg)
      closeModals()
      await onAction()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al ejecutar la accion'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmar = () =>
    runAction(
      () =>
        citaService.confirmarCita(cita.id, {
          fecha_confirmada: fechaConfirmada
            ? new Date(fechaConfirmada).toISOString()
            : undefined,
          notas_propietario: notasPropietario || undefined,
        }),
      'Cita confirmada',
    )

  const handleRealizar = () =>
    runAction(() => citaService.realizarCita(cita.id), 'Cita marcada como realizada')

  const handleNoAsistio = () =>
    runAction(() => citaService.marcarNoAsistio(cita.id), 'Cita marcada como no asistio')

  const handleCancelar = () =>
    runAction(
      () => citaService.cancelarCita(cita.id, { motivo_cancelacion: motivoCancelacion }),
      'Cita cancelada',
    )

  const handleHabilitarEstudio = async () => {
    if (!cita.expediente) return
    setIsLoading(true)
    try {
      await expedienteService.habilitarEstudio(cita.expediente.id)
      toast.success('Estudio habilitado, se notifico al solicitante')
      closeModals()
      await onAction()
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string }
      if (errObj.code === 'ESTUDIO_YA_HABILITADO') {
        toast.message('El estudio ya estaba habilitado. Refrescando...')
        closeModals()
        await onAction()
      } else {
        toast.error(errObj.message || 'Error al habilitar el estudio')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const expediente = cita.expediente
  const inmueble = expediente?.inmueble
  const solicitante = expediente?.solicitante
  const estadoConfig = ESTADO_CITA_CONFIG[cita.estado]
  const fechaRelevante = cita.fecha_confirmada || cita.fecha_propuesta

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header: número de expediente + estado */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          {expediente ? (
            <Link
              href={`/expedientes/${expediente.id}`}
              className="text-xs font-mono text-primary-700 hover:underline"
            >
              {expediente.numero}
            </Link>
          ) : (
            <span className="text-xs text-gray-400">Sin expediente</span>
          )}
          {inmueble && (
            <p className="text-sm font-medium text-gray-900 mt-0.5 truncate" title={inmueble.direccion}>
              {inmueble.direccion}
            </p>
          )}
          {inmueble && (
            <p className="text-xs text-gray-500 truncate">{inmueble.ciudad}</p>
          )}
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${estadoConfig.color} ${estadoConfig.bgColor}`}
        >
          {estadoConfig.label}
        </span>
      </div>

      {/* Solicitante */}
      {solicitante && (
        <div className="mb-3 text-sm">
          <p className="text-gray-700 truncate">
            {solicitante.nombre} {solicitante.apellido}
          </p>
          {solicitante.telefono && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <IconPhone size={12} />
              {solicitante.telefono}
            </p>
          )}
        </div>
      )}

      {/* Fecha */}
      {fechaRelevante && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-3">
          <IconCalendar size={12} />
          {formatDateTime(fechaRelevante)}
        </div>
      )}

      {/* Notas del solicitante */}
      {cita.notas_solicitante && (
        <p className="text-xs text-gray-500 italic line-clamp-2 mb-3" title={cita.notas_solicitante}>
          &quot;{cita.notas_solicitante}&quot;
        </p>
      )}

      {/* Motivo de cancelación */}
      {cita.motivo_cancelacion && (
        <p className="text-xs text-red-600 mt-2 line-clamp-2" title={cita.motivo_cancelacion}>
          Cancelada: {cita.motivo_cancelacion}
        </p>
      )}

      {/* Acciones por estado */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
        {cita.estado === 'solicitada' && (
          <>
            <button
              onClick={() => setAction('confirmar')}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700"
            >
              Confirmar
            </button>
            <button
              onClick={() => setAction('cancelar')}
              className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded hover:bg-red-50"
            >
              Cancelar
            </button>
          </>
        )}

        {cita.estado === 'confirmada' && (
          <>
            <button
              onClick={() => setAction('realizar')}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700"
            >
              Marcar realizada
            </button>
            <button
              onClick={() => setAction('no_asistio')}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              No asistio
            </button>
            <button
              onClick={() => setAction('cancelar')}
              className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded hover:bg-red-50"
            >
              Cancelar
            </button>
          </>
        )}

        {cita.estado === 'realizada' && expediente && (
          <>
            {expediente.estudio_habilitado ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-green-700 bg-green-50 border border-green-200">
                <IconShieldCheck size={12} />
                Estudio habilitado
              </span>
            ) : (
              <button
                onClick={() => setAction('habilitar')}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 flex items-center justify-center gap-1"
              >
                <IconShieldCheck size={12} />
                Habilitar estudio
              </button>
            )}
          </>
        )}

        {(cita.estado === 'cancelada' || cita.estado === 'no_asistio') && (
          <span className="text-xs text-gray-400 italic">Sin acciones disponibles</span>
        )}
      </div>

      {/* Modal: Confirmar cita */}
      <Modal
        isOpen={action === 'confirmar'}
        onClose={closeModals}
        title="Confirmar cita"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha y hora confirmada
            </label>
            <input
              type="datetime-local"
              value={fechaConfirmada}
              onChange={(e) => setFechaConfirmada(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Pre-poblada con la fecha propuesta por el solicitante. Ajusta si es necesario.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={notasPropietario}
              onChange={(e) => setNotasPropietario(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Instrucciones para el solicitante, punto de encuentro, etc."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={closeModals}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <IconLoader size={14} className="animate-spin" />}
              Confirmar cita
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Cancelar cita */}
      <Modal
        isOpen={action === 'cancelar'}
        onClose={closeModals}
        title="Cancelar cita"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Por favor indica el motivo de la cancelacion. El solicitante recibira esta informacion.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ejemplo: imprevisto del propietario, reprogramaremos..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={closeModals}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Volver
            </button>
            <button
              onClick={handleCancelar}
              disabled={isLoading || !motivoCancelacion.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <IconLoader size={14} className="animate-spin" />}
              Cancelar cita
            </button>
          </div>
        </div>
      </Modal>

      {/* ConfirmDialog: Realizar */}
      <ConfirmDialog
        isOpen={action === 'realizar'}
        onClose={closeModals}
        onConfirm={handleRealizar}
        title="Marcar cita como realizada"
        message="Confirma que la visita al inmueble se realizo. Tras esto, podras habilitar el estudio crediticio desde la columna de realizadas."
        confirmLabel="Marcar realizada"
        isLoading={isLoading}
      />

      {/* ConfirmDialog: No asistio */}
      <ConfirmDialog
        isOpen={action === 'no_asistio'}
        onClose={closeModals}
        onConfirm={handleNoAsistio}
        title="Marcar no asistio"
        message="El solicitante no se presento a la visita. El expediente quedara registrado y podra agendar una nueva cita si lo desea."
        confirmLabel="Marcar no asistio"
        variant="danger"
        isLoading={isLoading}
      />

      {/* ConfirmDialog: Habilitar estudio */}
      <ConfirmDialog
        isOpen={action === 'habilitar'}
        onClose={closeModals}
        onConfirm={handleHabilitarEstudio}
        title="Habilitar estudio crediticio"
        message="Al habilitar, se le notificara al solicitante por correo con el enlace para proceder al pago del estudio. Esta accion es irreversible."
        confirmLabel="Habilitar estudio"
        isLoading={isLoading}
      />
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

/**
 * Convierte un ISO 8601 (UTC) a string "YYYY-MM-DDTHH:mm" en hora local
 * para pre-popular un input datetime-local.
 */
function toLocalDatetime(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
