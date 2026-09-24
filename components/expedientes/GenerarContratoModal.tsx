/**
 * Modal para generar el contrato del expediente.
 *
 * Con la plantilla unica V2, el flujo se reduce a: el usuario elige
 * fecha de inicio y duracion, y el backend genera el PDF con la
 * plantilla activa por defecto. Sin «Otrosí + PDF propio» (P7): es la
 * Ruta B del contrato nuevo. Datos del arrendador, inmueble,
 * arrendatario y coarrendatario salen del expediente; la comisión mensual y la
 * prima, del estudio (las mismas del CRC).
 */

'use client'

import { Modal } from '@/components/ui/Modal'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { IconX, IconLoader, IconFileText } from '@/components/icons'
import { contratoService } from '@/services/contratoService'
import { hoyBogota } from '@/hooks/useContratoV3'
import { SERVICIOS_CONTRATO } from './serviciosContrato'
import type { ModalidadFianza, CargoServicio } from '@/types/contrato'

// La modalidad ya no fija el precio ni la cobertura: la comisión mensual y la
// prima son las del certificado CRC (Adendas 1 §5 y 2 §6) y la fianza cubre
// solo el canon. Sin «Compartida»: su co-titular no firma este contrato (P6).
const MODALIDADES: { value: ModalidadFianza; label: string }[] = [
  { value: 'plena', label: 'Cofianza Plena' },
  { value: 'plus', label: 'Cofianza Plus' },
]

const SERVICIOS_DEFAULT: Record<string, CargoServicio> = Object.fromEntries(
  SERVICIOS_CONTRATO.map((s) => [s.key, 'arrendatario' as CargoServicio]),
)

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
  const [modalidad, setModalidad] = useState<ModalidadFianza>('plena')
  const [servicios, setServicios] = useState<Record<string, CargoServicio>>(SERVICIOS_DEFAULT)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFechaInicio(hoyBogota())
      setDuracionMeses('12')
      setModalidad('plena')
      setServicios(SERVICIOS_DEFAULT)
      setGenerating(false)
    }
  }, [isOpen])

  async function handleGenerar() {
    setGenerating(true)
    try {
      await contratoService.generarContrato(expedienteId, {
        fecha_inicio: fechaInicio || undefined,
        duracion_meses: duracionMeses ? Number(duracionMeses) : undefined,
        modalidad_fianza: modalidad,
        servicios_reparto: servicios,
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
    <Modal isOpen={isOpen} onClose={generating ? () => {} : onClose} bare ariaLabel="Generar contrato" closeOnBackdrop={false} className="rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Generar contrato</h2>
        <button type="button" data-modal-close aria-label="Cerrar"
          onClick={onClose}
          disabled={generating}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
        >
          <IconX size={20} />
        </button>
      </div>

      <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
        <div>
          <label htmlFor="generar-contrato-modal-fecha-de-inicio-del-contrato" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de inicio del contrato
          </label>
          <input id="generar-contrato-modal-fecha-de-inicio-del-contrato"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            disabled={generating}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50"
          />
        </div>

        <div>
          <label htmlFor="generar-contrato-modal-duracion-meses" className="block text-sm font-medium text-gray-700 mb-1">
            Duración (meses)
          </label>
          <input id="generar-contrato-modal-duracion-meses"
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

        <div className="space-y-4 pt-3 border-t border-gray-200">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Condiciones de la fianza
          </p>

          {/* Modalidad */}
          <div>
            <label htmlFor="generar-contrato-modal-modalidad-de-fianza" className="block text-sm font-medium text-gray-700 mb-1">Modalidad de fianza</label>
            <select id="generar-contrato-modal-modalidad-de-fianza"
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value as ModalidadFianza)}
              disabled={generating}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50"
            >
              {MODALIDADES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-600">
              <p>
                La fianza cubre solo el canon de arrendamiento, hasta 18 cánones. No cubre administración,
                servicios públicos, daños al inmueble ni cláusula penal.
              </p>
              <p className="mt-0.5">
                La comisión mensual y la prima de vinculación son las del certificado del estudio (CRC),
                según cómo se aprobó.
              </p>
            </div>
          </div>

          {/* Reparto de servicios públicos */}
          <div>
            <p id="generar-contrato-modal-servicios-publicos-quien-paga" className="block text-sm font-medium text-gray-700 mb-1">
              Servicios públicos — ¿quién paga?
            </p>
            <div role="group" aria-labelledby="generar-contrato-modal-servicios-publicos-quien-paga" className="space-y-1.5">
              {SERVICIOS_CONTRATO.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-600">{s.label}</span>
                  <select
                    value={servicios[s.key]}
                    onChange={(e) => setServicios({ ...servicios, [s.key]: e.target.value as CargoServicio })}
                    disabled={generating}
                    className="px-2 py-1 border border-gray-300 rounded-md text-xs disabled:bg-gray-50"
                  >
                    <option value="arrendatario">Arrendatario</option>
                    <option value="arrendador">Arrendador</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
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
          {generating ? <IconLoader size={16} className="animate-spin" /> : <IconFileText size={16} />}
          {generating ? 'Generando…' : 'Generar contrato PDF'}
        </button>
      </div>
    </Modal>
  )
}
