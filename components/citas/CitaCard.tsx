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
import SlotSelector, {
  formatSlotHora,
  formatFechaCompleta,
} from '@/components/citas/SlotSelector'

interface CitaCardProps {
  cita: ICita
  onAction: () => void | Promise<void>
  /** Estado del pago del estudio para este expediente. Solo relevante cuando
   *  cita.estado === 'realizada' y expediente.estudio_habilitado === true.
   *  Pasa null si aún no se ha consultado; undefined si no aplica. */
  pagoEstudioEstado?: string | null
}

type ActionState = 'idle' | 'confirmar' | 'cancelar' | 'realizar' | 'no_asistio' | 'habilitar' | 'no_habilitar'

export function CitaCard({ cita, onAction, pagoEstudioEstado }: CitaCardProps) {
  const [action, setAction] = useState<ActionState>('idle')
  const [isLoading, setIsLoading] = useState(false)

  // Modo del modal de confirmar: 'aceptar' usa la fecha propuesta tal cual,
  // 'reprogramar' deja al propietario elegir otro slot disponible.
  const [confirmMode, setConfirmMode] = useState<'aceptar' | 'reprogramar'>('aceptar')

  // Slot elegido cuando reprograma. ISO 8601 con offset (lo emite SlotSelector).
  const [slotElegido, setSlotElegido] = useState<string | null>(null)
  const [notasPropietario, setNotasPropietario] = useState('')
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [motivoNoHabilitar, setMotivoNoHabilitar] = useState('')

  const closeModals = () => {
    setAction('idle')
    setConfirmMode('aceptar')
    setSlotElegido(null)
    setNotasPropietario('')
    setMotivoCancelacion('')
    setMotivoNoHabilitar('')
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

  const handleConfirmar = () => {
    // Aceptar: confirma con la fecha propuesta (sin fecha_confirmada — el
    // backend usa la propuesta). Reprogramar: usa endpoint dedicado que
    // valida disponibilidad y dispara aviso 'reprogramada' al solicitante.
    if (confirmMode === 'reprogramar' && !slotElegido) {
      toast.error('Selecciona un horario alternativo')
      return
    }
    return runAction(
      () =>
        confirmMode === 'reprogramar'
          ? citaService.reprogramarCita(cita.id, {
              fecha_confirmada: slotElegido as string,
              notas_propietario: notasPropietario || undefined,
            })
          : citaService.confirmarCita(cita.id, {
              notas_propietario: notasPropietario || undefined,
            }),
      confirmMode === 'reprogramar' ? 'Cita reprogramada' : 'Cita confirmada',
    )
  }

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

  const handleNoHabilitarEstudio = () => {
    if (!cita.expediente) return
    return runAction(
      () => expedienteService.rechazarEstudio(cita.expediente!.id, motivoNoHabilitar.trim() || undefined),
      'Estudio no habilitado, se notifico al solicitante',
    )
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
              onClick={() => {
                setConfirmMode('aceptar')
                setAction('confirmar')
              }}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700"
            >
              Confirmar
            </button>
            <button
              onClick={() => {
                setConfirmMode('reprogramar')
                setAction('confirmar')
              }}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-300 rounded hover:bg-amber-50"
            >
              Reprogramar
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
              <>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-green-700 bg-green-50 border border-green-200">
                  <IconShieldCheck size={12} />
                  Estudio habilitado
                </span>
                <PagoEstudioPill estado={pagoEstudioEstado} />
              </>
            ) : expediente.estudio_rechazado ? (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300"
                title={expediente.motivo_estudio_rechazado || 'El propietario decidio no habilitar el estudio.'}
              >
                Estudio no habilitado
              </span>
            ) : (
              <>
                <button
                  onClick={() => setAction('habilitar')}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 flex items-center justify-center gap-1"
                >
                  <IconShieldCheck size={12} />
                  Habilitar estudio
                </button>
                <button
                  onClick={() => setAction('no_habilitar')}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  No habilitar
                </button>
              </>
            )}
          </>
        )}

        {(cita.estado === 'cancelada' || cita.estado === 'no_asistio') && (
          <span className="text-xs text-gray-400 italic">Sin acciones disponibles</span>
        )}
      </div>

      {/* Modal: Confirmar / Reprogramar cita */}
      <Modal
        isOpen={action === 'confirmar'}
        onClose={closeModals}
        title={confirmMode === 'reprogramar' ? 'Proponer otro horario' : 'Confirmar cita'}
        size={confirmMode === 'reprogramar' ? 'lg' : 'sm'}
      >
        <div className="space-y-4">
          {/* Resumen del horario propuesto por el solicitante */}
          {cita.fecha_propuesta && (
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm">
              <p className="text-xs text-gray-500">El solicitante propuso:</p>
              <p className="font-medium text-gray-900">
                {formatFechaCompleta(cita.fecha_propuesta)} a las {formatSlotHora(cita.fecha_propuesta)}
              </p>
            </div>
          )}

          {/* Toggle aceptar / reprogramar */}
          <div className="flex gap-2 border border-gray-200 rounded-lg p-1 bg-gray-50">
            <button
              type="button"
              onClick={() => setConfirmMode('aceptar')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded ${
                confirmMode === 'aceptar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Aceptar este horario
            </button>
            <button
              type="button"
              onClick={() => setConfirmMode('reprogramar')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded ${
                confirmMode === 'reprogramar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Proponer otro horario
            </button>
          </div>

          {/* Selector de slots — solo en modo reprogramar */}
          {confirmMode === 'reprogramar' && inmueble?.id && (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Elige un horario disponible. Al guardar, el solicitante recibira un aviso con la nueva fecha.
              </p>
              <SlotSelector
                inmuebleId={inmueble.id}
                value={slotElegido}
                onChange={setSlotElegido}
              />
              {slotElegido && (
                <p className="text-xs text-gray-700 mt-2">
                  Nuevo horario:{' '}
                  <strong>
                    {formatFechaCompleta(slotElegido)} a las {formatSlotHora(slotElegido)}
                  </strong>
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas para el solicitante (opcional)
            </label>
            <textarea
              value={notasPropietario}
              onChange={(e) => setNotasPropietario(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={
                confirmMode === 'reprogramar'
                  ? 'Cuentale por que cambias el horario.'
                  : 'Instrucciones, punto de encuentro, etc.'
              }
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
              disabled={isLoading || (confirmMode === 'reprogramar' && !slotElegido)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <IconLoader size={14} className="animate-spin" />}
              {confirmMode === 'reprogramar' ? 'Enviar nueva propuesta' : 'Confirmar cita'}
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

      {/* Modal: No habilitar estudio */}
      <Modal
        isOpen={action === 'no_habilitar'}
        onClose={closeModals}
        title="No habilitar estudio"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Al confirmar, el solicitante recibira un aviso por correo de que decidiste
            no continuar con el proceso. Esta accion es irreversible.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo (opcional)
            </label>
            <textarea
              value={motivoNoHabilitar}
              onChange={(e) => setMotivoNoHabilitar(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Ej: prefiero esperar otro candidato, no me convencio el perfil, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Este texto aparecera en el correo al solicitante.
            </p>
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
              onClick={handleNoHabilitarEstudio}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <IconLoader size={14} className="animate-spin" />}
              Confirmar — no habilitar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================
// Pill del estado del pago del estudio (mini-badge en la card)
// ============================================================

function PagoEstudioPill({ estado }: { estado?: string | null }) {
  // null → aún cargando. undefined → no aplica. Skip render.
  if (estado === undefined) return null
  if (estado === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200">
        Pago: …
      </span>
    )
  }

  const config: Record<string, { label: string; className: string }> = {
    completado: {
      label: 'Pago recibido',
      className: 'text-green-700 bg-green-50 border-green-200',
    },
    asumido_inmobiliaria: {
      label: 'Pago: inmobiliaria',
      className: 'text-green-700 bg-green-50 border-green-200',
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
