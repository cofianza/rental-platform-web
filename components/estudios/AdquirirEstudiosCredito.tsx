/**
 * Sección "Adquirir estudios de crédito" para el tab Estudios de la
 * inmobiliaria (mockup 13_v2). Reutiliza la funcionalidad real ya existente:
 * creditosEstudiosService (listPaquetes / getMiSaldo / comprarPaquete → Mercado Pago
 * Checkout). Los paquetes y precios vienen del API (no del mock).
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  creditosEstudiosService,
  type IPaqueteCreditos,
  type ISaldoCreditos,
} from '@/services/creditosEstudiosService'
import { IconCheckCircle, IconDollarSign, IconLoader, IconArrowRight, IconClock, IconRefresh } from '@/components/icons'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'

const formatCOP = (n: number) => `$${n.toLocaleString('es-CO')}`

/** Comprar cupos es escribir: Gerencia y el miembro «Sólo lectura» no lo ven. */
export function AdquirirEstudiosCredito() {
  const puedeEditar = usePuedeEditar()
  return puedeEditar ? <AdquirirEstudiosCreditoContenido /> : null
}

function AdquirirEstudiosCreditoContenido() {
  const searchParams = useSearchParams()
  const status = searchParams?.get('status')

  const [paquetes, setPaquetes] = useState<IPaqueteCreditos[]>([])
  const [saldo, setSaldo] = useState<ISaldoCreditos | null>(null)
  const [loading, setLoading] = useState(true)
  // Sin esto un fallo decía «0 cupos» y «No hay paquetes disponibles».
  const [errorCarga, setErrorCarga] = useState(false)
  const [comprando, setComprando] = useState<string | null>(null)

  const cargar = useCallback(() => {
    let cancel = false
    setLoading(true)
    setErrorCarga(false)
    Promise.all([creditosEstudiosService.listPaquetes(), creditosEstudiosService.getMiSaldo()])
      .then(([p, s]) => {
        if (!cancel) {
          setPaquetes(p)
          setSaldo(s)
        }
      })
      .catch(() => {
        if (!cancel) setErrorCarga(true)
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => cargar(), [cargar])

  // Toast al volver de Mercado Pago (?status=success|cancelled).
  useEffect(() => {
    if (status === 'success') {
      toast.success('Pago confirmado: los cupos se sumarán a su saldo en unos segundos.')
    } else if (status === 'cancelled') {
      toast.info('Pago cancelado.')
    }
  }, [status])

  const handleComprar = async (id: string) => {
    setComprando(id)
    try {
      const { checkout_url } = await creditosEstudiosService.comprarPaquete(id)
      window.location.href = checkout_url
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo iniciar el pago.')
      setComprando(null)
    }
  }

  // "Más popular": el paquete de gama media con mejor descuento por estudio
  // respecto al más pequeño (misma lógica que /configuracion/creditos-estudios).
  const sorted = [...paquetes].sort((a, b) => a.cantidad_estudios - b.cantidad_estudios)
  const baseUnit = sorted.length ? sorted[0].precio_cop / sorted[0].cantidad_estudios : 0
  let popularId: string | null = null
  if (sorted.length >= 2) {
    let best = 0
    for (const pkg of sorted.slice(1)) {
      const unit = pkg.precio_cop / pkg.cantidad_estudios
      const ah = baseUnit ? (baseUnit - unit) / baseUnit : 0
      if (ah > best && pkg.id !== sorted[sorted.length - 1].id) {
        best = ah
        popularId = pkg.id
      }
    }
    if (!popularId) popularId = sorted[1].id
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconDollarSign size={18} className="text-coral-700" />
          <h2 className="text-lg font-bold text-gray-900">Comprar paquetes de cupos</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700">
          <IconCheckCircle size={15} />
          {loading ? '…' : saldo ? (saldo.saldo_efectivo ?? saldo.saldo_total) : '—'} cupos disponibles
        </span>
      </div>
      <p className="mb-5 text-sm text-gray-500">
        Cada estudio reserva un cupo; se descuenta solo cuando la central entrega el resultado. Los cupos se suman
        a su saldo al confirmarse el pago (tarjeta o PSE).
      </p>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
          ))}
        </div>
      ) : errorCarga ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">No pudimos cargar los paquetes ni su saldo de cupos.</p>
          <button
            type="button"
            onClick={cargar}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <IconRefresh size={16} /> Reintentar
          </button>
        </div>
      ) : paquetes.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">
          No hay paquetes disponibles por ahora. Comuníquese con el administrador.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {paquetes.map((p) => {
            const unit = Math.round(p.precio_cop / p.cantidad_estudios)
            const ahorro = baseUnit ? Math.round(((baseUnit - unit) / baseUnit) * 100) : 0
            const popular = p.id === popularId
            return (
              <div
                key={p.id}
                className={`relative rounded-xl border p-5 transition ${
                  popular
                    ? 'border-2 border-coral-500 shadow-md'
                    : 'border-gray-200 hover:border-primary-400 hover:shadow-sm'
                }`}
              >
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-coral-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-900 shadow-sm">
                    Más popular
                  </span>
                )}
                <div className="text-[11px] font-bold uppercase tracking-wide text-coral-700">{p.nombre}</div>
                {p.descripcion && <div className="mt-0.5 text-xs text-gray-500">{p.descripcion}</div>}
                <div className="mt-3 text-3xl font-extrabold text-primary-600">
                  {p.cantidad_estudios}
                  <span className="text-sm font-normal text-gray-500"> estudios</span>
                </div>
                <div className="mt-2 text-xl font-bold text-gray-900">
                  {formatCOP(p.precio_cop)}
                  <span className="text-sm font-normal text-gray-500"> + IVA</span>
                </div>
                {/* Adenda de precios §1.1: se cobra base + TARIFA_IVA (la calcula el API). */}
                {p.total_cop != null && (
                  <div className="text-xs text-gray-600">
                    {formatCOP(p.precio_cop)} + IVA = <span className="font-semibold text-gray-900">{formatCOP(p.total_cop)}</span>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {formatCOP(unit)} + IVA c/u
                  {ahorro > 0 && <span className="ml-1 font-semibold text-primary-700">· Ahorro {ahorro}%</span>}
                </div>
                {p.vigencia_meses != null && (
                  <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-600">
                    <IconClock size={12} /> Vigencia: {p.vigencia_meses} meses desde el pago
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleComprar(p.id)}
                  disabled={comprando !== null}
                  className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                    popular ? 'bg-coral-500 text-ink-900 hover:bg-coral-400' : 'bg-primary-700 text-white hover:bg-primary-800'
                  }`}
                >
                  {comprando === p.id ? (
                    <>
                      <IconLoader size={16} className="animate-spin" /> Redirigiendo…
                    </>
                  ) : (
                    'Comprar ahora'
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 text-right">
        <Link
          href="/configuracion/creditos-estudios"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline"
        >
          Ver historial y facturas <IconArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
