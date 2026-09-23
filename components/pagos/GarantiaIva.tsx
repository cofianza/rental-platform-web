/**
 * La garantía es la prima de vinculación, y lleva IVA (Adenda 1 de contratos
 * §1.1). Los modales de cobro la sugieren con IVA y muestran cómo se factura
 * lo cobrado: el monto es el total con IVA incluido (base = monto / 1,19).
 */

'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/constants'
import { pagoService, type IPrimaSugerida } from '@/services/pagoService'

/** Carga la sugerencia mientras `activo`; si falla, null y el monto va a mano. */
export function usePrimaSugerida(expedienteId: string, activo: boolean): IPrimaSugerida | null {
  const [prima, setPrima] = useState<IPrimaSugerida | null>(null)

  useEffect(() => {
    if (!activo || prima) return
    let cancelado = false
    pagoService
      .getPrimaSugerida(expedienteId)
      .then((p) => { if (!cancelado) setPrima(p) })
      .catch(() => { /* sin sugerencia: el gestor escribe el monto */ })
    return () => { cancelado = true }
  }, [activo, expedienteId, prima])

  return prima
}

export function GarantiaIvaAyuda({ monto, prima }: { monto: number; prima: IPrimaSugerida | null }) {
  if (!prima) {
    return <p className="mt-1 text-xs text-gray-500">La garantía lleva IVA: escribe el valor con el IVA incluido.</p>
  }
  const { prima_vinculacion_pct: pct, prima_vinculacion_cop: base, iva_pct: iva, prima_vinculacion_con_iva_cop: total } = prima
  const baseCobrada = Math.round(monto / (1 + iva / 100))
  return (
    <div className="mt-1 space-y-0.5 text-xs text-gray-500">
      {base != null && total != null && (
        <p>
          Prima de vinculación: {pct} % del canon {prima.canon === 'contrato' ? 'del contrato' : 'evaluado'} ({formatCurrency(base)})
          + IVA {iva} % = <span className="font-semibold text-gray-700">{formatCurrency(total)}</span>.
        </p>
      )}
      {monto > 0 && (
        <p>
          Se factura con el IVA incluido: base {formatCurrency(baseCobrada)} + IVA {formatCurrency(monto - baseCobrada)}.
        </p>
      )}
    </div>
  )
}
