/**
 * PrimasPorRemitirSection — Adenda de precios §5.1. En la modalidad Trasladada
 * la inmobiliaria recauda la prima de vinculación del arrendatario por cuenta
 * de Cofianza y la remite a más tardar el día 10. Cada contrato activado deja
 * una fila; aquí Cofianza ve lo pendiente y lo marca como remitido. Si no se
 * remite no hay bloqueo: la fila sigue pendiente y visible.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MotivoDialog } from '@/components/ui/MotivoDialog'
import { facturacionService, type IPrimaPorRemitir } from '@/services/facturacionService'
import { formatCurrency, formatDate } from '@/lib/constants'
import { IconAlertTriangle, IconCheck, IconLoader, IconRefresh } from '@/components/icons'

const hoyBogota = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10)

export function PrimasPorRemitirSection() {
  const [items, setItems] = useState<IPrimaPorRemitir[]>([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [marcando, setMarcando] = useState<IPrimaPorRemitir | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await facturacionService.listPrimasPorRemitir())
      setErrorCarga(null)
    } catch (err) {
      setErrorCarga(err instanceof Error ? err.message : 'No pudimos cargar las primas por remitir')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const marcar = async (p: IPrimaPorRemitir, notas: string) => {
    setGuardando(true)
    try {
      await facturacionService.marcarPrimaRemitida(p.id, notas)
      toast.success('Prima marcada como remitida.')
      setMarcando(null)
      await cargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo marcar como remitida')
      return false
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center">
        <IconLoader size={20} className="animate-spin text-gray-500" />
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

  const hoy = hoyBogota()
  const pendientes = items.filter((p) => p.estado === 'pendiente')

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <MotivoDialog
        isOpen={marcando !== null}
        onClose={() => setMarcando(null)}
        onConfirm={(nota) => (marcando ? marcar(marcando, nota) : undefined)}
        isLoading={guardando}
        title="Marcar prima como remitida"
        descripcion={
          marcando
            ? `La inmobiliaria ${marcando.inmobiliarias?.nombre ?? ''} remitió ${formatCurrency(marcando.monto_cop)} del contrato ${marcando.contratos?.numero ?? ''}. Queda registrado quién lo marcó y cuándo.`
            : ''
        }
        label="Soporte de la remisión"
        placeholder="Ej.: transferencia recibida el 09/11, comprobante 123…"
        confirmLabel="Marcar remitida"
        minLength={3}
      />

      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Primas de vinculación por remitir</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Modalidad Trasladada: la inmobiliaria la recauda del arrendatario y la remite a Cofianza a más tardar el
            día 10. {pendientes.length} {pendientes.length === 1 ? 'pendiente' : 'pendientes'}.
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

      {items.length === 0 ? (
        <div className="p-8 text-center">
          <IconCheck size={32} className="mx-auto text-green-500 mb-3" />
          <p className="text-sm text-gray-500">
            Aún no hay primas de la modalidad Trasladada. Aparecen aquí cuando se activa la fianza de un contrato.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map((p) => {
            const vencida = p.estado === 'pendiente' && p.vence_en < hoy
            return (
              <div key={p.id} className="px-6 py-4 flex items-start sm:items-center gap-4 flex-col sm:flex-row">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.monto_cop)}</span>
                    <span className="text-xs text-gray-500">IVA incluido</span>
                    <span className="text-sm text-gray-700">{p.inmobiliarias?.nombre ?? 'Inmobiliaria'}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    {p.contratos ? (
                      <Link
                        href={`/expedientes/${p.contratos.expediente_id}/contrato`}
                        className="font-mono text-primary-700 hover:underline"
                      >
                        {p.contratos.numero}
                      </Link>
                    ) : null}
                    {p.contratos?.direccion ? ` · ${p.contratos.direccion}` : ''}
                  </p>
                  <p className={`mt-0.5 text-xs ${vencida ? 'text-amber-700' : 'text-gray-500'}`}>
                    {vencida && <IconAlertTriangle size={12} className="inline mr-1 -mt-0.5" />}
                    Remitir a más tardar el {formatDate(p.vence_en)}
                    {p.reporte_enviado_en ? ' · reporte enviado' : ''}
                  </p>
                  {p.estado !== 'pendiente' && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {p.estado === 'remitida' ? 'Remitida' : 'Anulada'}
                      {p.remitida_en ? ` el ${formatDate(p.remitida_en)}` : ''}
                      {p.notas ? ` · ${p.notas}` : ''}
                    </p>
                  )}
                </div>
                {p.estado === 'pendiente' ? (
                  <button
                    onClick={() => setMarcando(p)}
                    disabled={guardando}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 w-full sm:w-auto"
                  >
                    Marcar remitida
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full shrink-0">
                    <IconCheck size={14} />
                    {p.estado === 'remitida' ? 'Remitida' : 'Anulada'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
