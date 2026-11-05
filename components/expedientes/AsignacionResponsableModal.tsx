/**
 * AsignacionResponsableModal - HP-285
 * Modal para asignar o reasignar el responsable del expediente
 * Incluye ConfirmDialog para reasignaciones
 */

'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Avatar } from '@/components/ui/Avatar'
import { IconLoader, IconUser, IconCheck, IconRefresh } from '@/components/icons'
import { expedienteService } from '@/services/expedienteService'
import type { IAnalistaOption, IExpedienteAnalista } from '@/types/expediente'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'

export interface AsignacionResponsableModalProps {
  isOpen: boolean
  onClose: () => void
  expedienteId: string
  analistaActual: IExpedienteAnalista | null
  onAsignar: (analistaId: string) => Promise<void>
  isLoading?: boolean
}

export function AsignacionResponsableModal({
  isOpen,
  onClose,
  analistaActual,
  onAsignar,
  isLoading = false,
}: AsignacionResponsableModalProps) {
  const [analistas, setAnalistas] = useState<IAnalistaOption[]>([])
  const [analistaSeleccionado, setAnalistaSeleccionado] = useState<string | null>(null)
  const [isLoadingAnalistas, setIsLoadingAnalistas] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadAnalistas()
      setAnalistaSeleccionado(analistaActual?.id || null)
      setShowConfirm(false)
    }
  }, [isOpen, analistaActual])

  const loadAnalistas = async () => {
    setIsLoadingAnalistas(true)
    setError(null)
    try {
      const data = await expedienteService.getAnalistas()
      setAnalistas(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los analistas.'
      setError(message)
    } finally {
      setIsLoadingAnalistas(false)
    }
  }

  const handleClose = () => {
    if (isLoading) return
    setAnalistaSeleccionado(analistaActual?.id || null)
    setError(null)
    setShowConfirm(false)
    onClose()
  }

  const handleConfirmar = async () => {
    if (!analistaSeleccionado) {
      setError('Seleccione un responsable')
      return
    }

    // No hacer nada si es el mismo
    if (analistaSeleccionado === analistaActual?.id) {
      handleClose()
      return
    }

    // Si es reasignación (ya tiene responsable), mostrar confirmación
    if (analistaActual) {
      setShowConfirm(true)
      return
    }

    // Primera asignación: proceder directo
    setError(null)
    await onAsignar(analistaSeleccionado)
    handleClose()
  }

  const handleConfirmReassign = async () => {
    setShowConfirm(false)
    setError(null)
    await onAsignar(analistaSeleccionado!)
    handleClose()
  }

  const nombreActual = analistaActual
    ? `${analistaActual.nombre} ${analistaActual.apellido}`.trim()
    : null

  const nombreNuevo = analistas.find((a) => a.id === analistaSeleccionado)?.nombre || ''

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={analistaActual ? 'Cambiar responsable' : 'Asignar responsable'}
        description={
          analistaActual ? (
            <>
              Hoy lo lleva <span className="font-medium text-gray-900">{nombreActual}</span>. El nuevo responsable queda a cargo del estudio.
            </>
          ) : (
            'Quien quede a cargo del estudio.'
          )
        }
        size="md"
        footer={
          <div className="space-y-2">
            {error && !isLoadingAnalistas && analistas.length > 0 && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}
            <ModalAcciones>
              <button type="button" onClick={handleClose} disabled={isLoading} className={botonModal('secondary')}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmar}
                disabled={isLoading || !analistaSeleccionado || isLoadingAnalistas || analistaSeleccionado === analistaActual?.id}
                aria-busy={isLoading || undefined}
                className={botonModal('primary')}
              >
                {isLoading && <IconLoader size={16} className="animate-spin" />}
                {analistaActual ? 'Cambiar responsable' : 'Asignar'}
              </button>
            </ModalAcciones>
          </div>
        }
      >
        <div>
          <p id="asignacion-lista" className="mb-2 text-sm font-medium text-gray-700">
            {analistaActual ? 'Nuevo responsable' : 'Responsable'}
          </p>

          {isLoadingAnalistas ? (
            <div role="status" className="space-y-2">
              <span className="sr-only">Cargando analistas…</span>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : error && analistas.length === 0 ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void loadAnalistas()}
                className={botonModal('secondary', 'mt-3')}
              >
                <IconRefresh size={16} />
                Reintentar
              </button>
            </div>
          ) : analistas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-gray-600">
              <IconUser size={28} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No hay analistas disponibles para asignar.</p>
            </div>
          ) : (
            <ul role="group" aria-labelledby="asignacion-lista" className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
              {analistas.map((analista) => {
                const isSelected = analistaSeleccionado === analista.id
                const isActual = analistaActual?.id === analista.id

                return (
                  <li key={analista.id}>
                    <button
                      type="button"
                      
                      aria-pressed={isSelected}
                      onClick={() => setAnalistaSeleccionado(analista.id)}
                      disabled={isLoading}
                      className={cn(
                        'flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 disabled:opacity-50',
                        isSelected ? 'bg-primary-50' : 'bg-white hover:bg-gray-50'
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Avatar name={analista.nombre} size="sm" />
                        <span className="min-w-0">
                          <span className={cn('block truncate text-sm font-medium', isSelected ? 'text-primary-800' : 'text-gray-900')}>
                            {analista.nombre}
                          </span>
                          {isActual && <span className="block text-xs text-gray-600">Responsable actual</span>}
                        </span>
                      </span>
                      {isSelected && <IconCheck size={18} className="shrink-0 text-primary-700" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Modal>

      {/* Confirmación de reasignación */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmReassign}
        title="¿Cambiar el responsable?"
        message={`El estudio pasa de ${nombreActual} a ${nombreNuevo}.`}
        confirmLabel="Cambiar responsable"
        isLoading={isLoading}
      />
    </>
  )
}
