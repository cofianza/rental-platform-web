/**
 * Modal de edicion rapida + regeneracion de contrato.
 *
 * Permite cambiar fecha de inicio, duracion y opcionalmente el valor del
 * canon antes de regenerar el PDF. Solo aplica a contratos en estado
 * "borrador" — los firmados/vigentes no se pueden regenerar.
 *
 * Disponible para admin/operador/inmobiliaria/propietario.
 */

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { IconX, IconLoader, IconRefresh } from '@/components/icons'
import { contratoService } from '@/services/contratoService'

interface Props {
  isOpen: boolean
  onClose: () => void
  contrato: {
    id: string
    fecha_inicio: string | null
    duracion_meses: number | null
    valor_arriendo: number | null
  } | null
  onRegenerated: () => void
}

export function RegenerarContratoModal({ isOpen, onClose, contrato, onRegenerated }: Props) {
  const [fechaInicio, setFechaInicio] = useState('')
  const [duracionMeses, setDuracionMeses] = useState('12')
  const [valorArriendo, setValorArriendo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && contrato) {
      setFechaInicio(contrato.fecha_inicio || new Date().toISOString().split('T')[0])
      setDuracionMeses(String(contrato.duracion_meses || 12))
      setValorArriendo(contrato.valor_arriendo ? String(contrato.valor_arriendo) : '')
      setSubmitting(false)
    }
  }, [isOpen, contrato])

  if (!isOpen || !contrato) return null

  async function handleSubmit() {
    if (!contrato) return
    setSubmitting(true)
    try {
      const valor = valorArriendo.trim() ? Number(valorArriendo) : undefined
      if (valor !== undefined && (Number.isNaN(valor) || valor <= 0)) {
        toast.error('El valor del canon debe ser un numero positivo')
        setSubmitting(false)
        return
      }
      await contratoService.regenerarContrato(contrato.id, {
        fecha_inicio: fechaInicio,
        duracion_meses: Number(duracionMeses),
        valor_arriendo: valor,
      })
      toast.success('Contrato regenerado correctamente')
      onRegenerated()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al regenerar el contrato')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={submitting ? undefined : onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Regenerar contrato</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-600">
            Edita los parametros del contrato. Al guardar se genera una nueva version del PDF con la plantilla activa.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duracion (meses)</label>
            <input
              type="number"
              value={duracionMeses}
              onChange={(e) => setDuracionMeses(e.target.value)}
              min={1}
              max={120}
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor del canon (opcional)
            </label>
            <input
              type="number"
              value={valorArriendo}
              onChange={(e) => setValorArriendo(e.target.value)}
              placeholder="Si lo dejas vacio se usa el del inmueble"
              min={0}
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Solo completá si el canon negociado con el arrendatario difiere del valor publicado del inmueble.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !fechaInicio || !duracionMeses}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? (
              <IconLoader size={16} className="animate-spin" />
            ) : (
              <IconRefresh size={16} />
            )}
            {submitting ? 'Regenerando…' : 'Regenerar'}
          </button>
        </div>
      </div>
    </div>
  )
}
