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
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { IconX, IconLoader, IconFileText, IconUpload } from '@/components/icons'
import { contratoService } from '@/services/contratoService'
import type { ModalidadFianza, CargoServicio, ICotitularFianza } from '@/types/contrato'

type TipoGeneracion = 'cofianza' | 'otrosi'

// Descripciones espejo de la tabla `modalidades_fianza` del backend (fuente de
// verdad para el contrato: comision_texto/prima_texto/cubre_danos). Si esos
// valores cambian en BD, actualizarlos también aquí.
const MODALIDADES: {
  value: ModalidadFianza
  label: string
  comision: string
  prima: string
  cubreDanos: boolean
  nota?: string
}[] = [
  { value: 'plena', label: 'Cofianza Plena', comision: '5%', prima: '50%', cubreDanos: false },
  {
    value: 'compartida',
    label: 'Cofianza Compartida',
    comision: '4%',
    prima: '60%',
    cubreDanos: false,
    nota: 'Requiere registrar un co-titular de la fianza.',
  },
  { value: 'plus', label: 'Cofianza Plus', comision: '6%', prima: '50%', cubreDanos: true },
]

const SERVICIOS: { key: string; label: string }[] = [
  { key: 'agua', label: 'Agua y alcantarillado' },
  { key: 'energia', label: 'Energía eléctrica' },
  { key: 'gas', label: 'Gas natural' },
  { key: 'basuras', label: 'Recolección de basuras' },
  { key: 'alumbrado', label: 'Alumbrado público' },
  { key: 'internet', label: 'Internet / TV / Telefonía' },
  { key: 'admin_ph', label: 'Administración PH' },
]

const SERVICIOS_DEFAULT: Record<string, CargoServicio> = Object.fromEntries(
  SERVICIOS.map((s) => [s.key, 'arrendatario' as CargoServicio]),
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
  const router = useRouter()
  const [tipo, setTipo] = useState<TipoGeneracion>('cofianza')
  const [fechaInicio, setFechaInicio] = useState('')
  const [duracionMeses, setDuracionMeses] = useState('12')
  const [modalidad, setModalidad] = useState<ModalidadFianza>('plena')
  const [cotitular, setCotitular] = useState<ICotitularFianza>({})
  const [servicios, setServicios] = useState<Record<string, CargoServicio>>(SERVICIOS_DEFAULT)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTipo('cofianza')
      setFechaInicio(new Date().toISOString().split('T')[0])
      setDuracionMeses('12')
      setModalidad('plena')
      setCotitular({})
      setServicios(SERVICIOS_DEFAULT)
      setGenerating(false)
    }
  }, [isOpen])

  async function handleGenerar() {
    setGenerating(true)
    try {
      const contrato = await contratoService.generarContrato(expedienteId, {
        fecha_inicio: fechaInicio || undefined,
        duracion_meses: duracionMeses ? Number(duracionMeses) : undefined,
        // Las condiciones de fianza solo aplican a la plantilla Cofianza.
        ...(tipo === 'cofianza'
          ? {
              modalidad_fianza: modalidad,
              servicios_reparto: servicios,
              ...(modalidad === 'compartida' ? { cotitular } : {}),
            }
          : {}),
      })
      if (tipo === 'otrosi') {
        // Para el flujo Otrosí + PDF propio reusamos el contrato base como
        // contenedor y redirigimos al detalle, donde está el botón "Subir
        // Contrato Firmado" (Mario 12-may-2026 — reusa upload existente).
        toast.success('Contrato base creado. Sube ahora tu PDF firmado.')
        onGenerated()
        router.push(`/contratos/${contrato.id}#firmado`)
      } else {
        toast.success('Contrato generado correctamente')
        onGenerated()
      }
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

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Tipo de generación — radio Cofianza vs Otrosí (Mario 12-may-2026) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
              ¿Cómo generamos el contrato?
            </label>
            <button
              type="button"
              onClick={() => setTipo('cofianza')}
              disabled={generating}
              className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                tipo === 'cofianza'
                  ? 'bg-primary-50 border-primary-400 ring-1 ring-primary-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                checked={tipo === 'cofianza'}
                onChange={() => setTipo('cofianza')}
                className="mt-1 accent-primary-600 shrink-0"
                tabIndex={-1}
              />
              <IconFileText size={20} className="text-primary-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Contrato con plantilla Cofianza{' '}
                  <span className="text-[11px] font-normal text-primary-700">Recomendado</span>
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Se usa la plantilla activa con los datos del expediente. Cofianza queda como
                  fiador. Listo para firma electrónica vía Auco.
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setTipo('otrosi')}
              disabled={generating}
              className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                tipo === 'otrosi'
                  ? 'bg-coral-50 border-coral-400 ring-1 ring-coral-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                checked={tipo === 'otrosi'}
                onChange={() => setTipo('otrosi')}
                className="mt-1 accent-coral-500 shrink-0"
                tabIndex={-1}
              />
              <IconUpload size={20} className="text-coral-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Otrosí + PDF propio</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Tienes tu propio modelo de contrato. Creamos el registro y te llevamos directo a
                  subir tu PDF firmado — Cofianza queda vinculada como fiador vía Otrosí.
                </p>
              </div>
            </button>
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

          {tipo === 'cofianza' && (
            <div className="space-y-4 pt-3 border-t border-gray-200">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Condiciones de la fianza
              </p>

              {/* Modalidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad de fianza</label>
                <select
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
                        <span className="font-medium text-gray-800">Comisión {m.comision}</span> ·{' '}
                        <span className="font-medium text-gray-800">Prima {m.prima}</span>
                      </p>
                      <p className="mt-0.5">
                        Cubre cánones, servicios públicos, administración PH y cláusula penal
                        {m.cubreDanos ? ', más daños al inmueble.' : '. No cubre daños al inmueble.'}
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
                    <input placeholder="Nombre completo" value={cotitular.nombre || ''}
                      onChange={(e) => setCotitular({ ...cotitular, nombre: e.target.value })} disabled={generating}
                      className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" />
                    <select value={cotitular.tipo_documento || 'CC'}
                      onChange={(e) => setCotitular({ ...cotitular, tipo_documento: e.target.value })} disabled={generating}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50">
                      <option value="CC">C.C.</option>
                      <option value="CE">C.E.</option>
                      <option value="NIT">NIT</option>
                      <option value="PA">Pasaporte</option>
                    </select>
                    <input placeholder="N° de documento" value={cotitular.documento || ''}
                      onChange={(e) => setCotitular({ ...cotitular, documento: e.target.value })} disabled={generating}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" />
                    <input placeholder="Celular" value={cotitular.celular || ''}
                      onChange={(e) => setCotitular({ ...cotitular, celular: e.target.value })} disabled={generating}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" />
                    <input placeholder="Correo" value={cotitular.correo || ''}
                      onChange={(e) => setCotitular({ ...cotitular, correo: e.target.value })} disabled={generating}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" />
                    <input placeholder="Dirección de notificación" value={cotitular.direccion || ''}
                      onChange={(e) => setCotitular({ ...cotitular, direccion: e.target.value })} disabled={generating}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" />
                    <input placeholder="Municipio" value={cotitular.municipio || ''}
                      onChange={(e) => setCotitular({ ...cotitular, municipio: e.target.value })} disabled={generating}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" />
                  </div>
                </div>
              )}

              {/* Reparto de servicios públicos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Servicios públicos — ¿quién paga?
                </label>
                <div className="space-y-1.5">
                  {SERVICIOS.map((s) => (
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
          )}
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
            ) : tipo === 'otrosi' ? (
              <IconUpload size={16} />
            ) : (
              <IconFileText size={16} />
            )}
            {generating
              ? tipo === 'otrosi'
                ? 'Creando…'
                : 'Generando…'
              : tipo === 'otrosi'
                ? 'Crear y subir mi PDF →'
                : 'Generar contrato PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
