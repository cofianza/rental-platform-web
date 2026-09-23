/**
 * La prima de vinculación (concepto 'garantia' por dentro) lleva IVA (Adenda 1
 * de contratos §1.1). Los modales de cobro la sugieren con IVA y muestran cómo
 * se factura lo cobrado: el monto es el total con IVA incluido (base = monto / 1,19).
 */

'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/constants'
import { pagoService, type IPrimaSugerida } from '@/services/pagoService'

/** Carga la sugerencia mientras `activo` y otra vez si cambia el estudio; si falla, null y el monto va a mano. */
export function usePrimaSugerida(expedienteId: string, activo: boolean): IPrimaSugerida | null {
  const [cargada, setCargada] = useState<{ expedienteId: string; prima: IPrimaSugerida | null } | null>(null)

  useEffect(() => {
    if (!activo || cargada?.expedienteId === expedienteId) return
    let cancelado = false
    pagoService
      .getPrimaSugerida(expedienteId)
      .then((prima) => { if (!cancelado) setCargada({ expedienteId, prima }) })
      .catch(() => { if (!cancelado) setCargada({ expedienteId, prima: null }) })
    return () => { cancelado = true }
  }, [activo, expedienteId, cargada])

  return cargada?.expedienteId === expedienteId ? cargada.prima : null
}

/** `onUsar`: donde el monto no se precarga (pago ya recibido), un botón para tomar la sugerencia. */
export function GarantiaIvaAyuda({
  monto,
  prima,
  onUsar,
}: {
  monto: number
  prima: IPrimaSugerida | null
  onUsar?: (total: number) => void
}) {
  const aMano = 'La prima de vinculación lleva IVA: escribe el valor con el IVA incluido.'
  if (!prima) return <p className="mt-1 text-xs text-gray-500">{aMano}</p>
  const { prima_vinculacion_pct: pct, prima_vinculacion_cop: base, iva_pct: iva, prima_vinculacion_con_iva_cop: total } = prima
  const baseCobrada = Math.round(monto / (1 + iva / 100))
  return (
    <div className="mt-1 space-y-0.5 text-xs text-gray-500">
      {base != null && total != null ? (
        <p>
          Prima de vinculación: {pct} % del canon {prima.canon === 'contrato' ? 'del contrato' : 'evaluado'} ({formatCurrency(base)})
          + IVA {iva} % = <span className="font-semibold text-gray-700">{formatCurrency(total)}</span>.
          {onUsar && monto !== total && (
            <button
              type="button"
              onClick={() => onUsar(total)}
              className="ml-1 font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              Usar este valor
            </button>
          )}
        </p>
      ) : (
        <p>{prima.sin_sugerencia || aMano}</p>
      )}
      {monto > 0 && (
        <p>
          Se factura con el IVA incluido: base {formatCurrency(baseCobrada)} + IVA {formatCurrency(monto - baseCobrada)}.
        </p>
      )}
    </div>
  )
}
