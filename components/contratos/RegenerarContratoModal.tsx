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

import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { IconLoader, IconRefresh } from '@/components/icons'
import { contratoService } from '@/services/contratoService'
import { hoyBogota } from '@/hooks/useContratoV3'
import { SERVICIOS_CONTRATO } from '@/components/expedientes/serviciosContrato'
import type { CargoServicio } from '@/types/contrato'
import { fechaCompleta } from '@/lib/constants'

// '' = "sin cambio": no tocamos ese servicio. Así una edición parcial no
// resetea el resto de la distribución vigente (el backend hace merge).
type CargoOpt = CargoServicio | ''
const SERVICIOS_DEFAULT: Record<string, CargoOpt> = Object.fromEntries(
  SERVICIOS_CONTRATO.map((s) => [s.key, '' as CargoOpt]),
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
  const [errorCanon, setErrorCanon] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && contrato) {
      setFechaInicio(contrato.fecha_inicio || hoyBogota())
      setDuracionMeses(String(contrato.duracion_meses || 12))
      setValorArriendo(contrato.valor_arriendo ? String(contrato.valor_arriendo) : '')
      setReasignarServicios(false)
      setServicios(SERVICIOS_DEFAULT)
      setSubmitting(false)
      setErrorCanon(null)
    }
  }, [isOpen, contrato])

  if (!isOpen || !contrato) return null

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  const puedeGuardar = !submitting && fechaCompleta(fechaInicio) && !!duracionMeses

  async function handleSubmit() {
    if (!contrato || submitting) return
    setErrorCanon(null)
    setSubmitting(true)
    try {
      const valor = valorArriendo.trim() ? Number(valorArriendo) : undefined
      if (valor !== undefined && (Number.isNaN(valor) || valor <= 0)) {
        setErrorCanon('El valor del canon debe ser un número mayor que cero.')
        setSubmitting(false)
        return
      }
      // Solo enviamos el canon si el usuario LO CAMBIÓ. El campo viene
      // pre-cargado con el canon vigente; reenviarlo tal cual haría que la API
      // re-valide el tope del 10% sobre un valor que el usuario no tocó (y
      // bloquearía la regeneración si el valor publicado del inmueble bajó).
      // Si va undefined, la API conserva el canon actual del contrato.
      const valorCambiado = valor !== undefined && valor !== (contrato.valor_arriendo ?? undefined)
      // Solo mandamos los servicios que el usuario cambió (distintos de "sin
      // cambio"); el backend hace merge sobre la distribución vigente.
      const serviciosCambiados = Object.fromEntries(
        Object.entries(servicios).filter(([, v]) => v === 'arrendatario' || v === 'arrendador'),
      ) as Record<string, CargoServicio>
      await contratoService.regenerarContrato(contrato.id, {
        fecha_inicio: fechaInicio,
        duracion_meses: Number(duracionMeses),
        valor_arriendo: valorCambiado ? valor : undefined,
        servicios_reparto:
          reasignarServicios && Object.keys(serviciosCambiados).length > 0
            ? serviciosCambiados
            : undefined,
      })
      toast.success('Contrato regenerado correctamente')
      onRegenerated()
      onClose()
    } catch (err) {
      // El backend devuelve un mensaje claro con las cifras exactas si el canon supera
      // el 10 % o el tope de canon (CANON_EXCEDE_TOPE: el caso se escala a la Gerencia).
      toast.error(err instanceof Error ? err.message : 'Error al regenerar el contrato')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar y regenerar contrato"
      description="Ajuste los datos que se cambian de común acuerdo. Al guardar se genera una nueva versión del PDF; la identidad del arrendatario no se puede editar."
      size="md"
      footer={
        <ModalAcciones>
          <button type="button" onClick={handleClose} disabled={submitting} className={botonModal('secondary')}>
            Cancelar
          </button>
          <button
            type="submit"
            form="regenerar-contrato-form"
            disabled={!puedeGuardar}
            aria-busy={submitting || undefined}
            className={botonModal('primary')}
          >
            {submitting ? <IconLoader size={16} className="animate-spin" /> : <IconRefresh size={16} />}
            {submitting ? 'Regenerando…' : 'Guardar y regenerar'}
          </button>
        </ModalAcciones>
      }
    >
      <form
        id="regenerar-contrato-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (puedeGuardar) void handleSubmit()
        }}
        className="space-y-5"
      >
        <div>
          <label htmlFor="regenerar-contrato-modal-fecha-de-inicio" className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
          <input id="regenerar-contrato-modal-fecha-de-inicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            disabled={submitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50"
          />
        </div>

        <div>
          <label htmlFor="regenerar-contrato-modal-duracion-meses" className="block text-sm font-medium text-gray-700 mb-1">Duración (meses)</label>
          <input id="regenerar-contrato-modal-duracion-meses"
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
          <label htmlFor="regenerar-contrato-modal-valor-del-canon-opcional" className="block text-sm font-medium text-gray-700 mb-1">
            Valor del canon (opcional)
          </label>
          {/* Texto con separador de miles, no type="number": ahí "150.000" quedaba en $150 y "2.600.000" en blanco. */}
          <input id="regenerar-contrato-modal-valor-del-canon-opcional"
            type="text"
            inputMode="numeric"
            value={valorArriendo ? Number(valorArriendo).toLocaleString('es-CO') : ''}
            onChange={(e) => {
              setValorArriendo(e.target.value.replace(/\D/g, '').slice(0, 12))
              setErrorCanon(null)
            }}
            aria-invalid={errorCanon ? true : undefined}
            aria-describedby="regenerar-contrato-canon-ayuda"
            placeholder="Sin cambios se conserva el canon actual"
            disabled={submitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50"
          />
          {errorCanon && (
            <p role="alert" className="mt-1 text-xs text-red-600">{errorCanon}</p>
          )}
          <p id="regenerar-contrato-canon-ayuda" className="text-xs text-gray-500 mt-1">
            Si no lo cambia, se conserva el canon actual del contrato. Un canon nuevo no puede
            superar el <strong>10%</strong> sobre el valor del inmueble.
          </p>
        </div>

        {/* 4.1e — distribución de obligaciones (opt-in para no resetear la actual) */}
        <div className="border-t border-gray-100 pt-4">
          <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-gray-700">
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
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Solo se actualizan los servicios que cambie; el resto conserva su asignación actual.
              </p>
              {SERVICIOS_CONTRATO.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-3">
                  <label htmlFor={`regenerar-contrato-servicio-${s.key}`} className="text-sm text-gray-700">{s.label}</label>
                  <select
                    id={`regenerar-contrato-servicio-${s.key}`}
                    value={servicios[s.key]}
                    onChange={(e) =>
                      setServicios({ ...servicios, [s.key]: e.target.value as CargoOpt })
                    }
                    disabled={submitting}
                    className="min-h-10 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
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
      </form>
    </Modal>
  )
}
