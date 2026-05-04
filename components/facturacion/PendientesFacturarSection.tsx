/**
 * PendientesFacturarSection — lista de pagos completados que aun no tienen
 * factura electronica emitida. Cada fila tiene un boton "Facturar" que
 * dispara la emision via Factus.
 *
 * Para el solicitante: solo ve sus propios pagos (filtrado backend).
 * Para inmobiliaria/propietario: pagos de expedientes asociados.
 * Para admin/operador: todo el universo.
 *
 * Si los datos fiscales del solicitante estan incompletos, la emision
 * fallara con CLIENTE_DATOS_INCOMPLETOS — mostramos un toast con el
 * detalle y sugerimos ir al tab "Datos Fiscales".
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { facturacionService, type IPagoPendienteFacturar } from '@/services/facturacionService'
import { formatCurrency, formatDate } from '@/lib/constants'
import { IconLoader, IconCheck, IconAlertTriangle, IconRefresh } from '@/components/icons'

interface PendientesFacturarSectionProps {
  /** Callback cuando una factura se emite — el page la usa para refrescar
   *  el tab de Mis facturas si el usuario cambia de tab despues. */
  onFacturaEmitida?: () => void
  /** Callback cuando el backend reporta datos fiscales incompletos. El page
   *  lo usa para llevar al usuario al tab "Datos Fiscales". */
  onDatosFiscalesIncompletos?: () => void
}

export function PendientesFacturarSection({
  onFacturaEmitida,
  onDatosFiscalesIncompletos,
}: PendientesFacturarSectionProps) {
  const [items, setItems] = useState<IPagoPendienteFacturar[]>([])
  const [loading, setLoading] = useState(true)
  const [emitiendo, setEmitiendo] = useState<string | null>(null)

  const fetchPendientes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await facturacionService.listPendientesFacturar()
      setItems(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pudimos cargar los pagos pendientes de facturar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPendientes() }, [fetchPendientes])

  const handleFacturar = async (pago: IPagoPendienteFacturar) => {
    setEmitiendo(pago.pago_id)
    try {
      await facturacionService.facturarPago(pago.pago_id)
      toast.success('Factura emitida correctamente')
      onFacturaEmitida?.()
      // Quitar el pago de la lista; el item ya esta facturado.
      setItems((prev) => prev.filter((p) => p.pago_id !== pago.pago_id))
    } catch (err) {
      // El backend devuelve CLIENTE_DATOS_INCOMPLETOS con details.faltantes
      // cuando faltan campos del solicitante. Detectamos ese caso para
      // ofrecer la accion correcta al usuario.
      const errObj = err as { code?: string; message?: string; details?: { faltantes?: string[] } }
      if (errObj.code === 'CLIENTE_DATOS_INCOMPLETOS') {
        const faltantes = errObj.details?.faltantes?.join(', ') ?? 'algunos campos'
        toast.error(`Faltan datos fiscales: ${faltantes}. Completa tus datos para continuar.`)
        onDatosFiscalesIncompletos?.()
      } else {
        toast.error(errObj.message || 'No pudimos emitir la factura')
      }
    } finally {
      setEmitiendo(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center">
        <IconLoader size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <IconCheck size={32} className="mx-auto text-green-500 mb-3" />
        <h3 className="text-base font-semibold text-gray-900 mb-1">No tienes pagos pendientes de facturar</h3>
        <p className="text-sm text-gray-500">
          Cada vez que completes un pago, aparecerá aquí con su botón para emitir la factura electrónica.
        </p>
        <button
          onClick={fetchPendientes}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800"
        >
          <IconRefresh size={14} />
          Refrescar
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Pagos pendientes de facturación</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} {items.length === 1 ? 'pago completado' : 'pagos completados'} sin factura electrónica.
          </p>
        </div>
        <button
          onClick={fetchPendientes}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
          disabled={loading}
        >
          <IconRefresh size={14} />
          Refrescar
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {items.map((pago) => {
          const isEmitiendo = emitiendo === pago.pago_id
          return (
            <div key={pago.pago_id} className="px-6 py-4 flex items-start sm:items-center gap-4 flex-col sm:flex-row">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">
                    {inferConceptoLabel(pago.concepto)}
                  </span>
                  <span className="font-mono text-xs text-primary-700">
                    {pago.expediente_numero || '—'}
                  </span>
                  {pago.factura_estado === 'fallida' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                      <IconAlertTriangle size={11} />
                      Intento previo fallido
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-600">
                  <span>{formatCurrency(pago.monto)}</span>
                  {pago.fecha_pago && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span>Pagado: {formatDate(pago.fecha_pago)}</span>
                    </>
                  )}
                </div>
                {pago.factura_error && (
                  <p className="mt-1 text-xs text-red-600 line-clamp-2" title={pago.factura_error}>
                    {pago.factura_error}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleFacturar(pago)}
                disabled={isEmitiendo || emitiendo !== null}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 w-full sm:w-auto"
              >
                {isEmitiendo ? (
                  <>
                    <IconLoader size={14} className="animate-spin" />
                    Emitiendo…
                  </>
                ) : (
                  <>
                    <IconCheck size={14} />
                    Facturar
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Labels mas legibles que el slug del concepto. Si aparece un concepto nuevo
// que no este en el mapa, devolvemos el slug capitalizado.
function inferConceptoLabel(concepto: string): string {
  const map: Record<string, string> = {
    estudio: 'Estudio crediticio',
    estudio_credito: 'Estudio crediticio',
    afianzamiento: 'Afianzamiento',
    creditos_estudios: 'Paquete de créditos de estudios',
    canon: 'Canon de arrendamiento',
    administracion: 'Cuota de administración',
  }
  return map[concepto] || concepto.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}
