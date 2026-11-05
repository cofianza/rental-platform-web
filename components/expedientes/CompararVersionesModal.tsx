'use client'

import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/constants'
import { contratoService } from '@/services/contratoService'
import type { IVersionComparison, IVersionDiferencia } from '@/types/contrato'
import { SkeletonText } from '@/components/ui/Skeleton'

const CAMBIO_STYLES: Record<IVersionDiferencia['cambio'], { label: string; bg: string; text: string }> = {
  agregada: { label: 'Agregada', bg: 'bg-green-100', text: 'text-green-700' },
  eliminada: { label: 'Eliminada', bg: 'bg-red-100', text: 'text-red-700' },
  modificada: { label: 'Modificada', bg: 'bg-amber-100', text: 'text-amber-700' },
  sin_cambio: { label: 'Sin cambio', bg: 'bg-gray-100', text: 'text-gray-700' },
}

interface CompararVersionesModalProps {
  contratoId: string
  v1: number
  v2: number
  isOpen: boolean
  onClose: () => void
}

export function CompararVersionesModal({
  contratoId,
  v1,
  v2,
  isOpen,
  onClose,
}: CompararVersionesModalProps) {
  const [comparison, setComparison] = useState<IVersionComparison | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUnchanged, setShowUnchanged] = useState(false)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!isOpen) return

    setIsLoading(true)
    setError(null)
    setComparison(null)

    contratoService
      .compararVersiones(contratoId, v1, v2)
      .then(setComparison)
      .catch(() => setError('No se pudo cargar la comparación de las versiones.'))
      .finally(() => setIsLoading(false))
  }, [isOpen, contratoId, v1, v2, intento])

  if (!isOpen) return null

  const filteredDiffs = comparison?.diferencias.filter(
    (d) => showUnchanged || d.cambio !== 'sin_cambio'
  ) ?? []

  const fecha = (f: string | null | undefined) => (f ? formatDate(f) : null)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Comparar versiones v${v1} y v${v2}`}
      description={
        comparison
          ? `${comparison.total_cambios} ${comparison.total_cambios === 1 ? 'cambio' : 'cambios'} entre la v${comparison.v1.version}${
              fecha(comparison.v1.fecha_generacion) ? ` (${fecha(comparison.v1.fecha_generacion)})` : ''
            } y la v${comparison.v2.version}${fecha(comparison.v2.fecha_generacion) ? ` (${fecha(comparison.v2.fecha_generacion)})` : ''}.`
          : undefined
      }
      size="lg"
      encima
      closeOnBackdrop
      footer={
        <ModalAcciones>
          <button type="button" onClick={onClose} className={botonModal('secondary')}>
            Cerrar
          </button>
        </ModalAcciones>
      }
    >
      {isLoading && (
        <div role="status">
          <span className="sr-only">Cargando versiones…</span>
          <SkeletonText lineas={8} />
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p>
          <button type="button" onClick={() => setIntento((n) => n + 1)} className={botonModal('secondary', 'mt-3')}>
            Reintentar
          </button>
        </div>
      )}

      {comparison && (
        <div className="space-y-4">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showUnchanged}
              onChange={(e) => setShowUnchanged(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Mostrar también los campos sin cambios
          </label>

          {filteredDiffs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-600">
              No hay diferencias entre las versiones.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {filteredDiffs.map((d) => {
                const style = CAMBIO_STYLES[d.cambio]
                return (
                  <li key={d.variable} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {/* El API ya manda la etiqueta legible («Canon mensual»). */}
                      <p className="text-sm font-medium text-gray-900">{d.variable}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </div>
                    <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 sm:gap-4">
                      <div className="min-w-0">
                        <dt className="text-xs text-gray-500">v{v1}</dt>
                        <dd className="mt-0.5 break-words text-gray-700">{d.valor_v1 || <span className="text-gray-500">(vacío)</span>}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-gray-500">v{v2}</dt>
                        <dd className="mt-0.5 break-words font-medium text-gray-900">{d.valor_v2 || <span className="font-normal text-gray-500">(vacío)</span>}</dd>
                      </div>
                    </dl>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </Modal>
  )
}
