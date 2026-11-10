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

import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { IconLoader, IconFileText, IconAlertTriangle, IconRefresh } from '@/components/icons'
import { ApiClientError } from '@/lib/api'
import { useReevaluarCanon } from '@/hooks/useReevaluarCanon'
import { contratoService } from '@/services/contratoService'
import { hoyBogota } from '@/hooks/useContratoV3'
import { bloqueoDeEvaluacion } from '@/components/contratos/v3/BloqueosContrato'
import type { Bloqueo } from '@/types/contratoV3'
import { SERVICIOS_CONTRATO } from './serviciosContrato'
import type { ModalidadFianza, CargoServicio } from '@/types/contrato'
import { fechaCompleta } from '@/lib/constants'

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
  /** Inmueble de una inmobiliaria: pide su comisión de intermediación (P12). El propietario directo no la cobra. */
  conComision?: boolean
  onClose: () => void
  onGenerated: () => void
  /** La evaluación ya no sirve (vencida o sin margen de CRC para firmar, según el API): la salida es un estudio nuevo. */
  onEvaluacionVencida?: (bloqueo: Bloqueo) => void
}

export function GenerarContratoModal({
  isOpen,
  expedienteId,
  conComision = false,
  onClose,
  onGenerated,
  onEvaluacionVencida,
}: GenerarContratoModalProps) {
  const [fechaInicio, setFechaInicio] = useState('')
  const [duracionMeses, setDuracionMeses] = useState('12')
  const [modalidad, setModalidad] = useState<ModalidadFianza>('plena')
  const [comision, setComision] = useState('')
  const [servicios, setServicios] = useState<Record<string, CargoServicio>>(SERVICIOS_DEFAULT)
  const [generating, setGenerating] = useState(false)
  // El canon del contrato supera lo que el estudio habilita: el mensaje y la salida los da la API.
  const [canonBloqueo, setCanonBloqueo] = useState<{ mensaje: string; estudioId?: string; inmuebleId?: string; puedeReevaluar: boolean } | null>(null)
  const { reevaluar, evaluando } = useReevaluarCanon()

  async function handleReevaluar() {
    if (!canonBloqueo?.estudioId || !canonBloqueo.inmuebleId) return
    const error = await reevaluar(canonBloqueo.estudioId, canonBloqueo.inmuebleId)
    // Evaluado: se quita el aviso y ya puede generar el contrato. Si no, queda lo que respondió la API.
    setCanonBloqueo(error ? { ...canonBloqueo, mensaje: error.mensaje, puedeReevaluar: error.reintentar } : null)
  }

  useEffect(() => {
    if (isOpen) {
      setCanonBloqueo(null)
      setFechaInicio(hoyBogota())
      setDuracionMeses('12')
      setModalidad('plena')
      setComision('')
      setServicios(SERVICIOS_DEFAULT)
      setGenerating(false)
    }
  }, [isOpen])

  const comisionInvalida = comision.trim() !== '' && !(Number(comision) >= 0 && Number(comision) <= 100)

  async function handleGenerar() {
    setGenerating(true)
    setCanonBloqueo(null)
    try {
      await contratoService.generarContrato(expedienteId, {
        fecha_inicio: fechaInicio || undefined,
        duracion_meses: duracionMeses ? Number(duracionMeses) : undefined,
        modalidad_fianza: modalidad,
        servicios_reparto: servicios,
        ...(conComision && comision.trim() ? { comision_pct: Number(comision) } : {}),
      })
      toast.success('Contrato generado correctamente')
      onGenerated()
    } catch (err) {
      const bloqueo = bloqueoDeEvaluacion(err)
      if (onEvaluacionVencida && bloqueo) {
        onEvaluacionVencida(bloqueo)
        return
      }
      if (err instanceof ApiClientError && err.code === 'CANON_REQUIERE_REEVALUACION') {
        const d = (err.details ?? {}) as unknown as { puede_reevaluar?: boolean; estudio_id?: string | null; inmueble_id?: string | null }
        setCanonBloqueo({
          mensaje: err.message,
          estudioId: d.estudio_id ?? undefined,
          inmuebleId: d.inmueble_id ?? undefined,
          puedeReevaluar: d.puede_reevaluar === true && !!d.estudio_id && !!d.inmueble_id,
        })
        return
      }
      toast.error(err instanceof Error ? err.message : 'Error al generar el contrato')
    } finally {
      setGenerating(false)
    }
  }

  const handleClose = () => {
    if (generating || evaluando) return
    onClose()
  }

  const puedeGenerar = !generating && !evaluando && fechaCompleta(fechaInicio) && !!duracionMeses && !comisionInvalida

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generar contrato"
      description="El contrato sale de la plantilla vigente con los datos del estudio. Elija la fecha, la duración y quién paga los servicios."
      size="md"
      footer={
        <ModalAcciones>
          <button type="button" onClick={handleClose} disabled={generating || evaluando} className={botonModal('secondary')}>
            Cancelar
          </button>
          <button
            type="submit"
            form="generar-contrato-form"
            disabled={!puedeGenerar}
            aria-busy={generating || undefined}
            className={botonModal('primary')}
          >
            {generating ? <IconLoader size={16} className="animate-spin" /> : <IconFileText size={16} />}
            {generating ? 'Generando…' : 'Generar contrato PDF'}
          </button>
        </ModalAcciones>
      }
    >
      <form
        id="generar-contrato-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (puedeGenerar) void handleGenerar()
        }}
        className="space-y-5"
      >
        {canonBloqueo && (
          <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="flex gap-2">
              <IconAlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{canonBloqueo.mensaje}</span>
            </p>
            {canonBloqueo.puedeReevaluar && (
              <button
                type="button"
                onClick={() => void handleReevaluar()}
                disabled={evaluando || generating}
                aria-busy={evaluando || undefined}
                className={`${botonModal('secondary')} mt-3 w-full sm:w-auto`}
              >
                {evaluando ? <IconLoader size={16} className="animate-spin" aria-hidden="true" /> : <IconRefresh size={16} aria-hidden="true" />}
                {evaluando ? 'Evaluando…' : 'Evaluar de nuevo con este canon'}
              </button>
            )}
          </div>
        )}
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
            Por defecto 12 meses. Al vencer se prorroga automáticamente por el mismo término (cláusula CUARTA).
          </p>
        </div>

        {conComision && (
          <div>
            <label htmlFor="generar-contrato-modal-comision" className="block text-sm font-medium text-gray-700 mb-1">
              Comisión de intermediación (%)
            </label>
            <input id="generar-contrato-modal-comision"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.01"
              placeholder="0"
              value={comision}
              onChange={(e) => setComision(e.target.value)}
              disabled={generating}
              aria-invalid={comisionInvalida}
              aria-describedby="generar-contrato-comision-ayuda"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50"
            />
            <p id="generar-contrato-comision-ayuda" className={`text-xs mt-1 ${comisionInvalida ? 'text-red-600' : 'text-gray-500'}`}>
              {comisionInvalida
                ? 'Escriba un porcentaje entre 0 y 100.'
                : 'La que cobra la inmobiliaria al arrendatario, más IVA, una sola vez al inicio. En 0 o vacía, el contrato no lleva esa cláusula.'}
            </p>
          </div>
        )}

        <div className="space-y-4 pt-3 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Condiciones de la fianza</h3>

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
                  <label htmlFor={`generar-contrato-servicio-${s.key}`} className="text-sm text-gray-700">{s.label}</label>
                  <select
                    id={`generar-contrato-servicio-${s.key}`}
                    value={servicios[s.key]}
                    onChange={(e) => setServicios({ ...servicios, [s.key]: e.target.value as CargoServicio })}
                    disabled={generating}
                    className="min-h-10 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50"
                  >
                    <option value="arrendatario">Arrendatario</option>
                    <option value="arrendador">Arrendador</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  )
}
