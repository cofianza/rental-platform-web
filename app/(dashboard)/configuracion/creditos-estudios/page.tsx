/**
 * Creditos de estudios — pantalla de inmobiliaria/propietario.
 *
 * Muestra saldo, paquetes disponibles para comprar (Stripe Checkout)
 * y el historial de movimientos.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import {
  creditosEstudiosService,
  type IPaqueteCreditos,
  type ISaldoCreditos,
  type IMovimientoCredito,
  type IDatosFiscalesFactura,
} from '@/services/creditosEstudiosService'
import {
  IconLoader,
  IconCheckCircle,
  IconAlertTriangle,
  IconReceipt,
  IconClock,
  IconDollarSign,
  IconFileText,
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
  // MP agrega el id del pago a la URL de retorno — lo usamos para confirmar la
  // compra directo con la pasarela (el webhook puede no llegar, p. ej. sandbox).
  const paymentId = searchParams?.get('payment_id') || searchParams?.get('collection_id')

  const [saldo, setSaldo] = useState<ISaldoCreditos | null>(null)
  const [paquetes, setPaquetes] = useState<IPaqueteCreditos[]>([])
  const [movimientos, setMovimientos] = useState<IMovimientoCredito[]>([])
  const [loading, setLoading] = useState(true)
  const [comprando, setComprando] = useState<string | null>(null)

  // Facturacion de compras
  const [facturaModal, setFacturaModal] = useState<{
    compraId: string
    faltantes: string[]
    datos: IDatosFiscalesFactura
  } | null>(null)
  const [facturando, setFacturando] = useState<string | null>(null)

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
      // Reconciliación: confirma la compra consultando la pasarela con el
      // payment_id (red de seguridad si el webhook no llega) y refresca el saldo.
      if (paymentId) {
        apiClient
          .post('/publico/pago-resultado/reconciliar', { payment_id: paymentId })
          .catch(() => { /* el webhook es el camino primario */ })
          .finally(() => { fetchAll() })
      }
    } else if (compraStatus === 'cancelled') {
      toast.info('Pago cancelado.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compraStatus, paymentId])

  const tryFacturarCompra = async (compraId: string, datos?: IDatosFiscalesFactura) => {
    try {
      const res = await creditosEstudiosService.facturarCompra(compraId, datos)
      toast.success(`Factura emitida: ${res.factus_number || res.id}`)
      setFacturaModal(null)
      await fetchAll()
      return true
    } catch (err: unknown) {
      const e = err as { code?: string; details?: { faltantes?: string[] }; message?: string }
      if (e.code === 'CLIENTE_DATOS_INCOMPLETOS' && Array.isArray(e.details?.faltantes)) {
        // Abrir modal con los campos faltantes para que el usuario los complete.
        setFacturaModal({
          compraId,
          faltantes: e.details!.faltantes!,
          datos: datos || {},
        })
        return false
      }
      toast.error(e.message || 'Error al emitir la factura')
      return false
    }
  }

  const handleFacturarClick = async (compraId: string) => {
    setFacturando(compraId)
    try {
      await tryFacturarCompra(compraId)
    } finally {
      setFacturando(null)
    }
  }

  const handleSubmitFacturaModal = async () => {
    if (!facturaModal) return
    setFacturando(facturaModal.compraId)
    try {
      await tryFacturarCompra(facturaModal.compraId, facturaModal.datos)
    } finally {
      setFacturando(null)
    }
  }

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
            Pague con tarjeta de crédito por la pasarela de pago segura. Los créditos se acreditan
            automáticamente tras la confirmación del pago.
          </p>

          {paquetes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No hay paquetes disponibles. Contacte al administrador.
            </div>
          ) : (() => {
            // Calcular el paquete "Más popular": el que ofrece el mejor descuento
            // por estudio respecto al paquete más pequeño (Mario 12-may-2026).
            const sortedByQty = [...paquetes].sort((a, b) => a.cantidad_estudios - b.cantidad_estudios)
            const baseUnit = sortedByQty[0].precio_cop / sortedByQty[0].cantidad_estudios
            let popularId: string | null = null
            if (paquetes.length >= 2) {
              let mejorAhorro = 0
              for (const pkg of paquetes.slice(1)) {
                const unitario = pkg.precio_cop / pkg.cantidad_estudios
                const ahorro = (baseUnit - unitario) / baseUnit
                // Preferimos un descuento intermedio (no el más caro), por eso
                // damos un pequeño boost al middle-tier vs el más grande.
                if (ahorro > mejorAhorro && pkg.id !== sortedByQty[sortedByQty.length - 1].id) {
                  mejorAhorro = ahorro
                  popularId = pkg.id
                }
              }
              // Fallback: si no hay un middle-tier claro, marcar el segundo.
              if (!popularId && sortedByQty.length >= 2) {
                popularId = sortedByQty[Math.min(1, sortedByQty.length - 1)].id
              }
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {paquetes.map((p) => {
                  const precioPorEstudio = Math.round(p.precio_cop / p.cantidad_estudios)
                  const ahorroPct = Math.round(((baseUnit - precioPorEstudio) / baseUnit) * 100)
                  const esPopular = p.id === popularId
                  return (
                    <div
                      key={p.id}
                      className={`relative border rounded-lg p-5 transition ${
                        esPopular
                          ? 'border-2 border-coral-500 shadow-md md:scale-[1.02]'
                          : 'border-gray-200 hover:border-primary-400 hover:shadow-md'
                      }`}
                    >
                      {esPopular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-coral-500 text-white shadow-sm whitespace-nowrap">
                          ⭐ Más popular
                        </span>
                      )}
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
                        {ahorroPct > 0 && (
                          <span className="ml-1 font-semibold text-primary-700">
                            · Ahorro {ahorroPct}%
                          </span>
                        )}
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
                        className={`w-full mt-4 px-4 py-2 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition flex items-center justify-center gap-2 ${
                          esPopular
                            ? 'bg-coral-500 hover:bg-coral-600'
                            : 'bg-primary-600 hover:bg-primary-700'
                        }`}
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
            )
          })()}
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
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Factura
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
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                      {m.tipo === 'compra' && m.compra_id ? (
                        m.factura ? (
                          <Link
                            href={`/facturacion/${m.factura.id}`}
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 text-xs font-medium"
                          >
                            <IconFileText size={14} />
                            {m.factura.factus_number || 'Ver factura'}
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleFacturarClick(m.compra_id!)}
                            disabled={facturando === m.compra_id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded hover:bg-primary-100 disabled:opacity-50 transition"
                          >
                            {facturando === m.compra_id ? (
                              <IconLoader className="animate-spin" size={12} />
                            ) : (
                              <IconReceipt size={12} />
                            )}
                            Facturar
                          </button>
                        )
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal datos fiscales para facturar compra */}
      <Modal
        isOpen={!!facturaModal}
        onClose={() => !facturando && setFacturaModal(null)}
        title="Datos fiscales para la factura"
        size="md"
      >
        {facturaModal && (
          <FacturaDatosForm
            faltantes={facturaModal.faltantes}
            datos={facturaModal.datos}
            onChange={(datos) => setFacturaModal({ ...facturaModal, datos })}
            onSubmit={handleSubmitFacturaModal}
            onCancel={() => setFacturaModal(null)}
            loading={facturando === facturaModal.compraId}
          />
        )}
      </Modal>
    </div>
  )
}

// ===========================================
// Sub-componente: form de datos fiscales
// ===========================================

const CAMPO_LABEL: Record<string, string> = {
  razon_social: 'Razón social',
  nit: 'NIT / Documento',
  direccion: 'Dirección',
  email: 'Email',
  telefono: 'Teléfono',
  municipio_codigo: 'Código DANE del municipio',
  municipio_nombre: 'Municipio',
}

interface FacturaDatosFormProps {
  faltantes: string[]
  datos: IDatosFiscalesFactura
  onChange: (d: IDatosFiscalesFactura) => void
  onSubmit: () => void
  onCancel: () => void
  loading: boolean
}

function FacturaDatosForm({ faltantes, datos, onChange, onSubmit, onCancel, loading }: FacturaDatosFormProps) {
  const set = (key: keyof IDatosFiscalesFactura, value: string) => {
    onChange({ ...datos, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
        Necesitamos completar tus datos fiscales para emitir la factura electrónica ante la DIAN.
        Estos datos se aplican solo a esta factura — para que queden guardados en tu perfil ve a{' '}
        <Link href="/configuracion/datos-contrato" className="underline font-medium">
          Datos para contrato
        </Link>
        .
      </div>

      {faltantes.includes('razon_social') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {CAMPO_LABEL.razon_social} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={datos.razon_social || ''}
            onChange={(e) => set('razon_social', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Razón social o nombre completo"
          />
        </div>
      )}

      {faltantes.includes('nit') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {CAMPO_LABEL.nit} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={datos.nit || ''}
            onChange={(e) => set('nit', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="900123456-7 o cédula"
          />
        </div>
      )}

      {faltantes.includes('direccion') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {CAMPO_LABEL.direccion} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={datos.direccion || ''}
            onChange={(e) => set('direccion', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Calle 100 # 20-30"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {faltantes.includes('email') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {CAMPO_LABEL.email} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={datos.email || ''}
              onChange={(e) => set('email', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="facturacion@empresa.com"
            />
          </div>
        )}

        {faltantes.includes('telefono') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {CAMPO_LABEL.telefono} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={datos.telefono || ''}
              onChange={(e) => set('telefono', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="3001234567"
            />
          </div>
        )}
      </div>

      {faltantes.includes('municipio_codigo') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Municipio <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={datos.municipio_codigo || ''}
            onChange={(e) => set('municipio_codigo', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="11001 (Bogotá)"
            maxLength={5}
          />
          <p className="text-xs text-gray-500 mt-1">
            Código DANE de 5 dígitos. Bogotá = 11001, Medellín = 05001, Cali = 76001.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={onSubmit}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <IconLoader className="animate-spin" size={14} />}
          Emitir factura
        </button>
      </div>
    </div>
  )
}
