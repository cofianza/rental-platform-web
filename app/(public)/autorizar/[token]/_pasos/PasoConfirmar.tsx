'use client'

import { IconShieldCheck, IconCheck, IconLoader, IconArrowLeft } from '@/components/icons'
import { buttonClasses } from '@/components/ui/Button'
import type { IAutorizacionPublicData } from '@/types/autorizacion'
import { BENEFICIOS, type ConsentKey } from './constantes'

/**
 * Paso 4: resumen y confirmación. Adenda 1 §7: sin OTP; la aceptación por
 * casilla del paso 1 es la firma (Decreto 1377/2013, art. 7).
 */
export function PasoConfirmar({
  pago,
  quien,
  consents,
  errorMessage,
  submitting,
  onConfirmar,
  onVolver,
}: {
  pago: IAutorizacionPublicData['pago'] | undefined
  quien: string
  consents: Record<ConsentKey, boolean>
  errorMessage: string
  submitting: boolean
  onConfirmar: () => void
  onVolver: () => void
}) {
  const resumen = [
    { txt: 'Tratamiento de datos personales', lock: 'Obligatorio', on: true },
    { txt: 'Consulta y reporte a centrales de riesgo', lock: 'Obligatorio', on: true },
    { txt: 'Historial de comportamiento de pago', lock: 'Obligatorio', on: true },
    // B6: los opcionales con los mismos títulos del paso 3 (texto legal §5.2).
    ...BENEFICIOS.map((b) => ({ txt: b.titulo, lock: 'Opcional', on: consents[b.key] })),
  ]

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <IconShieldCheck size={28} />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Confirme su autorización</h2>
        <p className="mt-1 text-sm text-gray-500">
          {pago?.requerido
            ? `Revise el resumen y confirme. Después le mostramos el enlace para pagar el estudio${
                pago.monto_formateado ? ` por ${pago.monto_formateado}` : ''
              } en Mercado Pago; su evaluación empieza cuando se confirme el pago.`
            : pago == null
              ? `Revise el resumen y confirme. Con eso queda autorizada la consulta de su información. ${quien} le indicará si tiene costo.`
              : 'Revise el resumen y confirme. Con eso queda autorizada la consulta de su información; usted no tiene que pagar nada por este estudio.'}
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-primary-200 bg-primary-50 p-3 text-xs text-primary-800">
        <IconShieldCheck size={14} className="mt-0.5 shrink-0 text-primary-600" />
        Al confirmar acepta el texto que leyó en el paso 1. Su aceptación queda registrada con fecha, hora,
        dispositivo y documento (Decreto 1377 de 2013, art. 7).
      </div>

      {/* Resumen */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
          Resumen de su autorización
        </p>
        <ul className="space-y-2">
          {resumen.map((r) => (
            <li key={r.txt} className="flex items-center gap-2 text-sm">
              {/* B7: marca de solo lectura (no una casilla que invite a tocarla). */}
              {r.on ? (
                <IconCheck size={16} className="shrink-0 text-primary-700" aria-hidden />
              ) : (
                <span className="w-4 shrink-0 text-center text-gray-400" aria-hidden>
                  —
                </span>
              )}
              <span className="min-w-0 flex-1 text-gray-700">
                {r.txt}
                <span className="sr-only">{r.on ? ': sí' : ': no'}</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{r.lock}</span>
            </li>
          ))}
        </ul>
      </div>

      {errorMessage && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
      )}

      <button
        type="button"
        onClick={onConfirmar}
        disabled={submitting}
        className={buttonClasses('primary', 'lg', 'w-full')}
      >
        {submitting && <IconLoader size={20} className="animate-spin" />}
        {submitting ? 'Registrando…' : 'Confirmar y autorizar'}
      </button>

      <button
        type="button"
        onClick={onVolver}
        className="mx-auto inline-flex min-h-11 items-center gap-1 px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-600"
      >
        <IconArrowLeft size={14} /> Volver
      </button>
    </div>
  )
}
