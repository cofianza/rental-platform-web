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
import type { ModalidadFianza, CargoServicio, ICotitularFianza } from '@/types/contrato'

// Espejo de la cobertura de `modalidades_fianza` (cubre_danos). La modalidad ya
// no fija el precio: la comisión mensual y la prima salen de cómo se aprobó el
// estudio, las mismas del certificado CRC (Adendas 1 §5 y 2 §6).
const MODALIDADES: {
  value: ModalidadFianza
  label: string
  cubreDanos: boolean
  nota?: string
}[] = [
  { value: 'plena', label: 'Cofianza Plena', cubreDanos: false },
  {
    value: 'compartida',
    label: 'Cofianza Compartida',
    cubreDanos: false,
    nota: 'Requiere registrar un co-titular de la fianza.',
  },
  { value: 'plus', label: 'Cofianza Plus', cubreDanos: true },
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
  const [cotitular, setCotitular] = useState<ICotitularFianza>({})
  const [servicios, setServicios] = useState<Record<string, CargoServicio>>(SERVICIOS_DEFAULT)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFechaInicio(hoyBogota())
      setDuracionMeses('12')
      setModalidad('plena')
      setCotitular({})
      setServicios(SERVICIOS_DEFAULT)
      setGenerating(false)
    }
  }, [isOpen])

  // Cofianza Compartida sin los datos minimos del co-titular generaba un PDF
  // con la clausula en blanco.
  const cotitularIncompleto =
    modalidad === 'compartida' &&
    !(cotitular.nombre?.trim() && cotitular.documento?.trim() && cotitular.celular?.trim())

  async function handleGenerar() {
    setGenerating(true)
    try {
      await contratoService.generarContrato(expedienteId, {
        fecha_inicio: fechaInicio || undefined,
        duracion_meses: duracionMeses ? Number(duracionMeses) : undefined,
        modalidad_fianza: modalidad,
        servicios_reparto: servicios,
        ...(modalidad === 'compartida' ? { cotitular } : {}),
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
            {/* Descripción de la modalidad seleccionada. */}
            {(() => {
              const m = MODALIDADES.find((x) => x.value === modalidad)
              if (!m) return null
              return (
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-600">
                  <p>
                    Cubre cánones, servicios públicos, administración PH y cláusula penal
                    {m.cubreDanos ? ', más daños al inmueble.' : '. No cubre daños al inmueble.'}
                  </p>
                  <p className="mt-0.5">
                    La comisión mensual y la prima de vinculación son las del certificado del estudio (CRC),
                    según cómo se aprobó.
                  </p>
                  {m.nota && <p className="mt-0.5 text-primary-700">{m.nota}</p>}
                </div>
              )
            })()}
          </div>

          {/* Co-titular — solo en Cofianza Compartida */}
          {modalidad === 'compartida' && (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-700">Co-titular de la fianza</p>
              <div className="grid grid-cols-2 gap-2">
                <label htmlFor="cot-nombre" className="col-span-2 block text-xs font-medium text-gray-700">Nombre completo *
                <input id="cot-nombre" placeholder="Nombre completo" value={cotitular.nombre || ''}
                  onChange={(e) => setCotitular({ ...cotitular, nombre: e.target.value })} disabled={generating}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 w-full" />
                </label>
                <label htmlFor="cot-tipo-doc" className="block text-xs font-medium text-gray-700">Tipo de documento
                <select id="cot-tipo-doc" value={cotitular.tipo_documento || 'CC'}
                  onChange={(e) => setCotitular({ ...cotitular, tipo_documento: e.target.value })} disabled={generating}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50">
                  <option value="CC">C.C.</option>
                  <option value="CE">C.E.</option>
                  <option value="NIT">NIT</option>
                  <option value="PA">Pasaporte</option>
                </select>
                </label>
                <label htmlFor="cot-documento" className=" block text-xs font-medium text-gray-700">N° de documento *
                <input id="cot-documento" inputMode="numeric" placeholder="N° de documento" value={cotitular.documento || ''}
                  onChange={(e) => setCotitular({ ...cotitular, documento: e.target.value })} disabled={generating}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 w-full" />
                </label>
                <label htmlFor="cot-celular" className=" block text-xs font-medium text-gray-700">Celular *
                <input id="cot-celular" type="tel" inputMode="tel" autoComplete="tel" placeholder="Celular" value={cotitular.celular || ''}
                  onChange={(e) => setCotitular({ ...cotitular, celular: e.target.value })} disabled={generating}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 w-full" />
                </label>
                <label htmlFor="cot-correo" className=" block text-xs font-medium text-gray-700">Correo
                <input id="cot-correo" type="email" inputMode="email" autoComplete="email" placeholder="Correo" value={cotitular.correo || ''}
                  onChange={(e) => setCotitular({ ...cotitular, correo: e.target.value })} disabled={generating}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 w-full" />
                </label>
                <label htmlFor="cot-direccion" className="col-span-2 block text-xs font-medium text-gray-700">Dirección de notificación
                <input id="cot-direccion" placeholder="Dirección de notificación" value={cotitular.direccion || ''}
                  onChange={(e) => setCotitular({ ...cotitular, direccion: e.target.value })} disabled={generating}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 w-full" />
                </label>
                <label htmlFor="cot-municipio" className="col-span-2 block text-xs font-medium text-gray-700">Municipio
                <input id="cot-municipio" placeholder="Municipio" value={cotitular.municipio || ''}
                  onChange={(e) => setCotitular({ ...cotitular, municipio: e.target.value })} disabled={generating}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 w-full" />
                </label>
              </div>
            </div>
          )}

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
          disabled={generating || !fechaInicio || !duracionMeses || cotitularIncompleto}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {generating ? <IconLoader size={16} className="animate-spin" /> : <IconFileText size={16} />}
          {generating ? 'Generando…' : 'Generar contrato PDF'}
        </button>
      </div>
    </Modal>
  )
}
