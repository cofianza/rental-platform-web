/**
 * ReembolsosSection — P1: la plata de Mercado Pago por devolver. Evaluaciones
 * de estudios que terminaron sin consultar el buró (se devuelven a quien pagó)
 * y pagos que entraron sin un cobro que les corresponda. Solo administradores:
 * «Reembolsar en Mercado Pago» devuelve el pago completo por la pasarela.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { pagoService, type IReembolsoPendiente } from '@/services/pagoService'
import { formatCurrency, formatDate } from '@/lib/constants'
import { IconAlertTriangle, IconCheck, IconLoader, IconRefresh } from '@/components/icons'

export function ReembolsosSection() {
  const [items, setItems] = useState<IReembolsoPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<IReembolsoPendiente | null>(null)
  const [reembolsando, setReembolsando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await pagoService.listReembolsos())
      setErrorCarga(null)
    } catch (err) {
      setErrorCarga(err instanceof Error ? err.message : 'No pudimos cargar los reembolsos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const reembolsar = async (r: IReembolsoPendiente) => {
    setReembolsando(r.id)
    try {
      const res = await pagoService.reembolsar(r.id)
      if (res.estado === 'ya_reembolsado') toast.info('Mercado Pago ya lo tenía reembolsado.')
      else if (res.estado === 'en_proceso') toast.success('Reembolso solicitado: Mercado Pago lo está procesando.')
      else toast.success('Reembolso hecho en Mercado Pago.')
      if (res.factura_numero) toast.warning(`Falta la nota crédito de la factura ${res.factura_numero} en Factus.`)
      setItems((prev) => prev.filter((x) => x.id !== r.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo reembolsar en Mercado Pago')
    } finally {
      setReembolsando(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center">
        <IconLoader size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (errorCarga) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6 text-center">
        <p className="text-sm text-red-700">{errorCarga}</p>
        <button
          onClick={cargar}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800"
        >
          <IconRefresh size={14} />
          Reintentar
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <IconCheck size={32} className="mx-auto text-green-500 mb-3" />
        <h3 className="text-base font-semibold text-gray-900 mb-1">No hay pagos por devolver</h3>
        <p className="text-sm text-gray-500">
          Aquí aparecen las evaluaciones pagadas de estudios que terminaron sin consultar el buró y los pagos que
          entraron a Mercado Pago sin un cobro que les corresponda.
        </p>
        <button
          onClick={cargar}
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
      <ConfirmDialog
        isOpen={confirmar !== null}
        onClose={() => setConfirmar(null)}
        onConfirm={() => (confirmar ? reembolsar(confirmar) : undefined)}
        isLoading={reembolsando !== null}
        title="Reembolsar en Mercado Pago"
        message={
          confirmar
            ? `Mercado Pago le devuelve a quien pagó ${confirmar.monto === null ? 'el pago completo' : formatCurrency(confirmar.monto)} (pago ${confirmar.provider_payment_id}). No se puede deshacer.`
            : ''
        }
        confirmLabel="Reembolsar"
        variant="danger"
      />

      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Pagos por devolver</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} {items.length === 1 ? 'pago' : 'pagos'} en Mercado Pago. El reembolso va al mismo medio con
            que se pagó.
          </p>
        </div>
        <button
          onClick={cargar}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 shrink-0"
        >
          <IconRefresh size={14} />
          Refrescar
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {items.map((r) => (
          <div key={r.id} className="px-6 py-4 flex items-start sm:items-center gap-4 flex-col sm:flex-row">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">
                  {r.monto === null ? 'Monto desconocido' : formatCurrency(r.monto)}
                </span>
                {r.expediente ? (
                  <Link href={`/expedientes/${r.expediente.id}`} className="font-mono text-xs text-primary-700 hover:underline">
                    {r.expediente.numero}
                  </Link>
                ) : null}
                <span className="text-xs text-gray-500">{formatDate(r.created_at)}</span>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                {r.motivo_texto.charAt(0).toUpperCase() + r.motivo_texto.slice(1)}.
              </p>
              <p className="mt-0.5 text-xs text-gray-400">Pago de Mercado Pago {r.provider_payment_id}</p>
              {r.notas && (
                <p className="mt-1 inline-flex items-start gap-1 text-xs text-amber-700">
                  <IconAlertTriangle size={12} className="mt-0.5 shrink-0" />
                  {r.notas}
                </p>
              )}
            </div>
            <button
              onClick={() => setConfirmar(r)}
              disabled={reembolsando !== null}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 w-full sm:w-auto"
            >
              {reembolsando === r.id ? (
                <>
                  <IconLoader size={14} className="animate-spin" />
                  Reembolsando…
                </>
              ) : (
                'Reembolsar en Mercado Pago'
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
