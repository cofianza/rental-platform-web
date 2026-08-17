/**
 * SolicitarEstudioModal
 * Modal para solicitar un nuevo estudio de riesgo crediticio
 */

'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { IconLoader } from '@/components/icons'
import type { ICreateEstudioInput, TipoEstudio, ProveedorEstudio, PagoPor } from '@/types/estudio'

interface SolicitarEstudioModalProps {
  isOpen: boolean
  onClose: () => void
  /** Devuelve true si el estudio se creó — solo entonces el modal se cierra
   *  y resetea. En fallo permanece abierto con lo escrito para corregir. */
  onConfirmar: (data: ICreateEstudioInput) => Promise<boolean>
  isLoading?: boolean
}

const TIPOS_ESTUDIO: { value: TipoEstudio; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'con_coarrendatario', label: 'Con coarrendatario' },
]

// SIFIN se excluye a propósito: su provider en la API es un stub que lanza
// PROVIDER_NOT_IMPLEMENTED — ofrecerlo sería un callejón sin salida.
const PROVEEDORES: { value: ProveedorEstudio; label: string }[] = [
  { value: 'manual', label: 'Manual (sin proveedor)' },
  { value: 'transunion', label: 'TransUnion' },
  { value: 'datacredito', label: 'DataCrédito' },
]

const PAGO_OPTIONS: { value: PagoPor; label: string }[] = [
  { value: 'inmobiliaria', label: 'Inmobiliaria' },
  { value: 'arrendatario', label: 'Arrendatario' },
]

export function SolicitarEstudioModal({
  isOpen,
  onClose,
  onConfirmar,
  isLoading = false,
}: SolicitarEstudioModalProps) {
  const [tipo, setTipo] = useState<TipoEstudio>('individual')
  const [proveedor, setProveedor] = useState<ProveedorEstudio>('manual')
  const [duracion, setDuracion] = useState(12)
  const [pagoPor, setPagoPor] = useState<PagoPor>('inmobiliaria')
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => {
    if (isLoading) return
    setTipo('individual')
    // Mismo default que el estado inicial ('manual') — antes reseteaba a
    // 'transunion' y la 2ª apertura arrancaba distinta a la 1ª.
    setProveedor('manual')
    setDuracion(12)
    setPagoPor('inmobiliaria')
    setObservaciones('')
    setError(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (duracion < 1 || duracion > 60) {
      setError('La duracion debe ser entre 1 y 60 meses')
      return
    }
    setError(null)
    const ok = await onConfirmar({
      tipo,
      proveedor,
      duracion_contrato_meses: duracion,
      pago_por: pagoPor,
      observaciones: observaciones.trim() || undefined,
    })
    // Solo cerrar (y resetear los campos) si el POST fue exitoso — antes un
    // fallo cerraba el modal igual y se perdía todo lo escrito.
    if (ok) handleClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Solicitar Estudio de Riesgo" size="md">
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de estudio
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoEstudio)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {TIPOS_ESTUDIO.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Proveedor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Proveedor
          </label>
          <select
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value as ProveedorEstudio)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {PROVEEDORES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Duracion */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duracion del contrato (meses)
          </label>
          <input
            type="number"
            min={1}
            max={60}
            value={duracion}
            onChange={(e) => setDuracion(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Quien paga */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quien paga el estudio
          </label>
          <select
            value={pagoPor}
            onChange={(e) => setPagoPor(e.target.value as PagoPor)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {PAGO_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones <span className="text-gray-400">(opcional)</span>
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Notas adicionales sobre el estudio..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <IconLoader size={16} className="animate-spin" />
                Solicitando...
              </>
            ) : (
              'Solicitar estudio'
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
