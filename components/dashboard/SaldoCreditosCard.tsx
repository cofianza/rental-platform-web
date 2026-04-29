/**
 * Card de saldo de creditos de estudios para el dashboard de
 * inmobiliaria/propietario. Muestra el saldo total con CTA para
 * comprar mas o ver el detalle.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { creditosEstudiosService, type ISaldoCreditos } from '@/services/creditosEstudiosService'
import { IconReceipt, IconLoader, IconChevronRight, IconPlus } from '@/components/icons'

export function SaldoCreditosCard() {
  const [saldo, setSaldo] = useState<ISaldoCreditos | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    creditosEstudiosService
      .getMiSaldo()
      .then(setSaldo)
      .catch(() => setSaldo(null))
      .finally(() => setLoading(false))
  }, [])

  const saldoTotal = saldo?.saldo_total ?? 0
  const sinSaldo = saldoTotal === 0

  return (
    <div
      className={`relative overflow-hidden rounded-xl p-5 shadow-sm border ${
        sinSaldo
          ? 'bg-amber-50 border-amber-200'
          : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-full shrink-0 ${
            sinSaldo ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          <IconReceipt size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-700">Créditos de estudios</h3>
          {loading ? (
            <div className="flex items-center gap-2 mt-1">
              <IconLoader className="animate-spin text-gray-400" size={16} />
              <span className="text-xs text-gray-400">cargando…</span>
            </div>
          ) : (
            <>
              <p
                className={`text-3xl font-bold mt-0.5 ${
                  sinSaldo ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {saldoTotal}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  {saldoTotal === 1 ? 'estudio' : 'estudios'}
                </span>
              </p>
              {saldo?.proximo_vencimiento && (
                <p className="text-xs text-amber-600 mt-1">
                  Próximo vencimiento:{' '}
                  {new Date(saldo.proximo_vencimiento).toLocaleDateString('es-CO')}
                </p>
              )}
              {sinSaldo && (
                <p className="text-xs text-amber-700 mt-1">
                  Compra un paquete para liberar estudios a tus solicitantes.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Link
          href="/configuracion/creditos-estudios"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
            sinSaldo
              ? 'bg-amber-600 text-white hover:bg-amber-700'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          <IconPlus size={14} />
          {sinSaldo ? 'Comprar primer paquete' : 'Comprar más'}
        </Link>
        {!sinSaldo && (
          <Link
            href="/configuracion/creditos-estudios"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-200 rounded-md hover:bg-emerald-50 transition"
          >
            Ver detalle
            <IconChevronRight size={14} />
          </Link>
        )}
      </div>
    </div>
  )
}
