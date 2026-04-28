/**
 * Modal para generar el contrato del expediente.
 *
 * Con la plantilla unica V2, el flujo se reduce a: el usuario elige
 * fecha de inicio y duracion, y el backend genera el PDF con la
 * plantilla activa por defecto. Datos del arrendador, inmueble,
 * arrendatario y coarrendatario salen del expediente; el resto
 * (afianzamiento, comision) sale de configuracion_sistema.
 */

'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { IconX, IconLoader, IconFileText } from '@/components/icons'
import { contratoService } from '@/services/contratoService'

interface GenerarContratoModalProps {
  isOpen: boolean
  expedienteId: string
  onClose: () => void
  onGenerated: () => void
}

export function GenerarContratoModal({
  isOpen,
  expedienteId,
  onClose,
  onGenerated,
}: GenerarContratoModalProps) {
  const [fechaInicio, setFechaInicio] = useState('')
  const [duracionMeses, setDuracionMeses] = useState('12')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFechaInicio(new Date().toISOString().split('T')[0])
      setDuracionMeses('12')
      setGenerating(false)
    }
  }, [isOpen])

  async function handleGenerar() {
    setGenerating(true)
    try {
      await contratoService.generarContrato(expedienteId, {
        fecha_inicio: fechaInicio || undefined,
        duracion_meses: duracionMeses ? Number(duracionMeses) : undefined,
      })
      toast.success('Contrato generado correctamente')
      onGenerated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar el contrato')
    } finally {
      setGenerating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={generating ? undefined : onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Generar contrato</h2>
          <button
            onClick={onClose}
            disabled={generating}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3 bg-primary-50 border border-primary-100 rounded-lg p-3">
            <IconFileText size={20} className="text-primary-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Plantilla de Cofianza</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Se usa la plantilla activa, con los datos del arrendador, inmueble y arrendatario
                del expediente. El logo y datos de cuenta se toman de tu perfil.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de inicio del contrato
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              disabled={generating}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duración (meses)
            </label>
            <input
              type="number"
              value={duracionMeses}
              onChange={(e) => setDuracionMeses(e.target.value)}
              min={1}
              max={120}
              disabled={generating}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Por defecto 12 meses, prorrogables tácitamente segun la cláusula QUINTA.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerar}
            disabled={generating || !fechaInicio || !duracionMeses}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {generating ? (
              <IconLoader size={16} className="animate-spin" />
            ) : (
              <IconFileText size={16} />
            )}
            {generating ? 'Generando…' : 'Generar contrato PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
