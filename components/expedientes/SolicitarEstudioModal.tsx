/**
 * SolicitarEstudioModal
 * Modal para solicitar un nuevo estudio de riesgo crediticio
 */

'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { IconLoader } from '@/components/icons'
import { creditosEstudiosService } from '@/services/creditosEstudiosService'
import type { ICreateEstudioInput, TipoEstudio, ProveedorEstudio, PagoPor } from '@/types/estudio'

interface SolicitarEstudioModalProps {
  isOpen: boolean
  onClose: () => void
  /** Devuelve true si el estudio se creó — solo entonces el modal se cierra
   *  y resetea. En fallo permanece abierto con lo escrito para corregir. */
  onConfirmar: (data: ICreateEstudioInput, opciones: { usarCredito: boolean }) => Promise<boolean>
  isLoading?: boolean
  /** H99: con él se consulta el saldo de la inmobiliaria dueña y, si tiene
   *  créditos usables, se ofrece pagar la evaluación con uno. */
  expedienteId?: string
}

// H99: 'credito' = la paga la inmobiliaria con un crédito de su paquete.
type OpcionPago = PagoPor | 'credito'

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
  expedienteId,
}: SolicitarEstudioModalProps) {
  const [tipo, setTipo] = useState<TipoEstudio>('individual')
  const [proveedor, setProveedor] = useState<ProveedorEstudio>('manual')
  const [duracion, setDuracion] = useState(12)
  const [pagoPor, setPagoPor] = useState<OpcionPago>('inmobiliaria')
  // Créditos usables de la inmobiliaria dueña (0 = no se ofrece: sin
  // inmobiliaria, sin saldo, saldo en contra o cobro ya en curso).
  const [creditos, setCreditos] = useState(0)

  useEffect(() => {
    if (!isOpen || !expedienteId) return
    let cancel = false
    creditosEstudiosService
      .getSaldoInmobiliariaDeExpediente(expedienteId)
      .then((s) => {
        if (cancel) return
        const usables = s.con_inmobiliaria && !s.pago_estudio_existente ? s.saldo_efectivo : 0
        setCreditos(usables)
        if (usables === 0) setPagoPor((p) => (p === 'credito' ? 'inmobiliaria' : p))
      })
      .catch(() => {
        // Sin saldo legible no se ofrece el crédito; las otras opciones siguen.
        if (!cancel) setCreditos(0)
      })
    return () => {
      cancel = true
    }
  }, [isOpen, expedienteId])
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
    const usarCredito = pagoPor === 'credito'
    const ok = await onConfirmar(
      {
        tipo,
        proveedor,
        duracion_contrato_meses: duracion,
        pago_por: usarCredito ? 'inmobiliaria' : pagoPor,
        observaciones: observaciones.trim() || undefined,
      },
      { usarCredito },
    )
    // Solo cerrar (y resetear los campos) si el POST fue exitoso — antes un
    // fallo cerraba el modal igual y se perdía todo lo escrito.
    if (ok) handleClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Solicitar evaluación crediticia" size="md">
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tipo */}
        <div>
          <label htmlFor="solicitar-estudio-modal-tipo-de-estudio" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de evaluación
          </label>
          <select id="solicitar-estudio-modal-tipo-de-estudio"
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
          <label htmlFor="solicitar-estudio-modal-proveedor" className="block text-sm font-medium text-gray-700 mb-1">
            Proveedor
          </label>
          <select id="solicitar-estudio-modal-proveedor"
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
          <label htmlFor="solicitar-estudio-modal-duracion-del-contrato-meses" className="block text-sm font-medium text-gray-700 mb-1">
            Duracion del contrato (meses)
          </label>
          <input id="solicitar-estudio-modal-duracion-del-contrato-meses"
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
          <label htmlFor="solicitar-estudio-modal-quien-paga-el-estudio" className="block text-sm font-medium text-gray-700 mb-1">
            ¿Quién paga la evaluación?
          </label>
          <select id="solicitar-estudio-modal-quien-paga-el-estudio"
            value={pagoPor}
            onChange={(e) => setPagoPor(e.target.value as OpcionPago)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {PAGO_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
            {creditos > 0 && (
              <option value="credito">
                Inmobiliaria, con un crédito de su paquete ({creditos} disponibles)
              </option>
            )}
          </select>
          {pagoPor === 'credito' && (
            <p className="mt-1 text-xs text-gray-500">
              Al solicitar se descuenta 1 crédito del saldo de la inmobiliaria y la evaluación queda pagada. No se puede deshacer.
            </p>
          )}
        </div>

        {/* Observaciones */}
        <div>
          <label htmlFor="solicitar-estudio-modal-observaciones-opcional" className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones <span className="text-gray-500">(opcional)</span>
          </label>
          <textarea id="solicitar-estudio-modal-observaciones-opcional"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Notas sobre la evaluación…"
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
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <IconLoader size={16} className="animate-spin" />
                Solicitando...
              </>
            ) : (
              'Solicitar evaluación'
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
