/**
 * Modal de edicion controlada + regeneracion de contrato (tarea 4.1e).
 *
 * Permite editar, mientras el contrato esta en "borrador" (antes de enviar a
 * firma), los datos modificables de comun acuerdo: fecha de inicio, duracion
 * (plazo), canon y la distribucion de obligaciones (quien paga cada servicio).
 *
 * Restricciones (se cumplen en el backend):
 *  - El canon NO puede subir mas del 10% sobre el valor del inmueble.
 *  - La identidad del arrendatario (nombre/documento/correo) NO es editable.
 *
 * Solo aplica a contratos en estado "borrador"; los firmados/vigentes no se
 * regeneran. Disponible para admin/operador/inmobiliaria/propietario.
 */

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { IconX, IconLoader, IconRefresh } from '@/components/icons'
import { contratoService } from '@/services/contratoService'
import type { CargoServicio } from '@/types/contrato'

// Espejo de la lista del backend / GenerarContratoModal.
const SERVICIOS: { key: string; label: string }[] = [
  { key: 'agua', label: 'Agua y alcantarillado' },
  { key: 'energia', label: 'Energía eléctrica' },
  { key: 'gas', label: 'Gas natural' },
  { key: 'basuras', label: 'Recolección de basuras' },
  { key: 'alumbrado', label: 'Alumbrado público' },
  { key: 'internet', label: 'Internet / TV / Telefonía' },
  { key: 'admin_ph', label: 'Administración PH' },
]

// '' = "sin cambio": no tocamos ese servicio. Así una edición parcial no
// resetea el resto de la distribución vigente (el backend hace merge).
type CargoOpt = CargoServicio | ''
const SERVICIOS_DEFAULT: Record<string, CargoOpt> = Object.fromEntries(
  SERVICIOS.map((s) => [s.key, '' as CargoOpt]),
)

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
  const [reasignarServicios, setReasignarServicios] = useState(false)
  const [servicios, setServicios] = useState<Record<string, CargoOpt>>(SERVICIOS_DEFAULT)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && contrato) {
      setFechaInicio(contrato.fecha_inicio || new Date().toISOString().split('T')[0])
      setDuracionMeses(String(contrato.duracion_meses || 12))
      setValorArriendo(contrato.valor_arriendo ? String(contrato.valor_arriendo) : '')
      setReasignarServicios(false)
      setServicios(SERVICIOS_DEFAULT)
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
      // Solo mandamos los servicios que el usuario cambió (distintos de "sin
      // cambio"); el backend hace merge sobre la distribución vigente.
      const serviciosCambiados = Object.fromEntries(
        Object.entries(servicios).filter(([, v]) => v === 'arrendatario' || v === 'arrendador'),
      ) as Record<string, CargoServicio>
      await contratoService.regenerarContrato(contrato.id, {
        fecha_inicio: fechaInicio,
        duracion_meses: Number(duracionMeses),
        valor_arriendo: valor,
        servicios_reparto:
          reasignarServicios && Object.keys(serviciosCambiados).length > 0
            ? serviciosCambiados
            : undefined,
      })
      toast.success('Contrato regenerado correctamente')
      onRegenerated()
      onClose()
    } catch (err) {
      // El backend devuelve un mensaje claro si el canon supera el tope del 10%
      // (CANON_EXCEDE_TOPE) con las cifras exactas.
      toast.error(err instanceof Error ? err.message : 'Error al regenerar el contrato')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={submitting ? undefined : onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Editar y regenerar contrato</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          <p className="text-sm text-gray-600">
            Ajusta los datos modificables de común acuerdo. Al guardar se genera una nueva versión del PDF.
            La identidad del arrendatario no es editable.
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Duración (meses)</label>
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
              placeholder="Si lo dejas vacío se usa el del inmueble"
              min={0}
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Solo completá si el canon negociado difiere del valor publicado. No puede superar el
              <strong> 10%</strong> sobre el valor del inmueble.
            </p>
          </div>

          {/* 4.1e — distribución de obligaciones (opt-in para no resetear la actual) */}
          <div className="border-t border-gray-100 pt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={reasignarServicios}
                onChange={(e) => setReasignarServicios(e.target.checked)}
                disabled={submitting}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Reasignar quién paga los servicios
            </label>
            {reasignarServicios && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Solo se actualizan los servicios que cambies; el resto conserva su asignación actual.
                </p>
                {SERVICIOS.map((s) => (
                  <div key={s.key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-700">{s.label}</span>
                    <select
                      value={servicios[s.key]}
                      onChange={(e) =>
                        setServicios({ ...servicios, [s.key]: e.target.value as CargoOpt })
                      }
                      disabled={submitting}
                      className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                    >
                      <option value="">(sin cambio)</option>
                      <option value="arrendatario">Arrendatario</option>
                      <option value="arrendador">Arrendador</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
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
            {submitting ? 'Regenerando…' : 'Guardar y regenerar'}
          </button>
        </div>
      </div>
    </div>
  )
}
