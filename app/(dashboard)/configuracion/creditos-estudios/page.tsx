/**
 * Creditos de estudios — pantalla de inmobiliaria/propietario.
 *
 * Muestra saldo, paquetes disponibles para comprar (Stripe Checkout)
 * y el historial de movimientos.
 */

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import {
  creditosEstudiosService,
  type IPaqueteCreditos,
  type ISaldoCreditos,
  type IMovimientoCredito,
} from '@/services/creditosEstudiosService'
import {
  IconLoader,
  IconCheckCircle,
  IconAlertTriangle,
  IconReceipt,
  IconClock,
  IconDollarSign,
} from '@/components/icons'

const TIPO_LABELS: Record<string, string> = {
  compra: 'Compra',
  consumo: 'Consumo',
  expiracion: 'Vencimiento',
  ajuste: 'Ajuste',
}

const formatCOP = (n: number) => `$${n.toLocaleString('es-CO')}`

export default function CreditosEstudiosPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const compraStatus = searchParams?.get('status')

  const [saldo, setSaldo] = useState<ISaldoCreditos | null>(null)
  const [paquetes, setPaquetes] = useState<IPaqueteCreditos[]>([])
  const [movimientos, setMovimientos] = useState<IMovimientoCredito[]>([])
  const [loading, setLoading] = useState(true)
  const [comprando, setComprando] = useState<string | null>(null)

  const fetchAll = async () => {
    try {
      const [s, p, m] = await Promise.all([
        creditosEstudiosService.getMiSaldo(),
        creditosEstudiosService.listPaquetes(),
        creditosEstudiosService.getMisMovimientos({ limit: 20 }),
      ])
      setSaldo(s)
      setPaquetes(p)
      setMovimientos(m.movimientos)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando créditos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (compraStatus === 'success') {
      toast.success('Pago confirmado — los créditos se acreditarán en unos segundos.')
    } else if (compraStatus === 'cancelled') {
      toast.info('Pago cancelado.')
    }
  }, [compraStatus])

  const handleComprar = async (paqueteId: string) => {
    setComprando(paqueteId)
    try {
      const { checkout_url } = await creditosEstudiosService.comprarPaquete(paqueteId)
      window.location.href = checkout_url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error iniciando pago')
      setComprando(null)
    }
  }

  const isInmobiliaria = user?.rol === 'inmobiliaria'
  const isAdmin = user?.rol === 'administrador'

  if (!isInmobiliaria && !isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Créditos de estudios" />
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 flex gap-3">
          <IconAlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
          <div className="text-sm text-amber-800">
            Esta sección está disponible únicamente para usuarios con rol Inmobiliaria.
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <IconLoader className="animate-spin text-primary-600" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Créditos de estudios"
        subtitle="Compre paquetes de estudios y libérelos manualmente cuando lo necesite"
      />

      {/* Saldo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Saldo total</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{saldo?.saldo_total ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">estudios disponibles</p>
            </div>
            <div className="p-3 rounded-full bg-primary-100 text-primary-600">
              <IconCheckCircle size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sin vencimiento</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{saldo?.saldo_perpetuo ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">no expiran</p>
            </div>
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <IconReceipt size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Con vencimiento</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {saldo?.saldo_con_vencimiento ?? 0}
              </p>
              {saldo?.proximo_vencimiento && (
                <p className="text-xs text-amber-600 mt-1">
                  próximo: {new Date(saldo.proximo_vencimiento).toLocaleDateString('es-CO')}
                </p>
              )}
            </div>
            <div className="p-3 rounded-full bg-amber-100 text-amber-600">
              <IconClock size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Paquetes */}
      {isInmobiliaria && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Comprar paquete</h2>
          <p className="text-sm text-gray-500 mb-4">
            Pague con tarjeta de crédito vía Stripe. Los créditos se acreditan automáticamente
            tras la confirmación del pago.
          </p>

          {paquetes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No hay paquetes disponibles. Contacte al administrador.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {paquetes.map((p) => {
                const precioPorEstudio = Math.round(p.precio_cop / p.cantidad_estudios)
                return (
                  <div
                    key={p.id}
                    className="border border-gray-200 rounded-lg p-5 hover:border-primary-400 hover:shadow-md transition"
                  >
                    <h3 className="text-base font-semibold text-gray-900">{p.nombre}</h3>
                    <p className="text-3xl font-bold text-primary-600 mt-2">
                      {p.cantidad_estudios}
                      <span className="text-sm font-normal text-gray-500"> estudios</span>
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 mt-3">
                      {formatCOP(p.precio_cop)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCOP(precioPorEstudio)} c/u
                    </p>
                    {p.vence_en_dias && (
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <IconClock size={14} />
                        Vence en {p.vence_en_dias} días
                      </p>
                    )}
                    {!p.vence_en_dias && (
                      <p className="text-xs text-green-600 mt-2">Sin vencimiento</p>
                    )}
                    {p.descripcion && (
                      <p className="text-xs text-gray-500 mt-2">{p.descripcion}</p>
                    )}
                    <button
                      onClick={() => handleComprar(p.id)}
                      disabled={comprando !== null}
                      className="w-full mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      {comprando === p.id ? (
                        <>
                          <IconLoader className="animate-spin" size={16} />
                          Redirigiendo…
                        </>
                      ) : (
                        <>
                          <IconDollarSign size={16} />
                          Comprar
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de movimientos</h2>

        {movimientos.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">Aún no hay movimientos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Cantidad
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Saldo
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Notas
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movimientos.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          m.tipo === 'compra'
                            ? 'bg-green-100 text-green-700'
                            : m.tipo === 'consumo'
                            ? 'bg-blue-100 text-blue-700'
                            : m.tipo === 'expiracion'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {TIPO_LABELS[m.tipo] || m.tipo}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-sm text-right font-medium whitespace-nowrap ${
                        m.cantidad > 0 ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {m.cantidad > 0 ? '+' : ''}
                      {m.cantidad}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700 whitespace-nowrap">
                      {m.saldo_resultante}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {m.notas || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
