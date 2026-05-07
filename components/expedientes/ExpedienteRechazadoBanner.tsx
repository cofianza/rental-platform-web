/**
 * ExpedienteRechazadoBanner — banner de cierre cuando expediente.estado='rechazado'.
 *
 * Sustituye visualmente al "stepper en curso" para comunicar que el flujo
 * terminó sin éxito y por qué. Lee `motivo_rechazo` del expediente, que el
 * orchestrator (titular) o el ponderador (coarrendatario) escriben al cerrar.
 *
 * Aplica a todos los roles. Lo monta el detalle del expediente cuando
 * `expediente.estado === 'rechazado'`.
 */

'use client'

interface ExpedienteRechazadoBannerProps {
  motivo?: string | null
}

const MOTIVO_FALLBACK =
  'La solicitud no procede tras el estudio crediticio. El expediente queda cerrado sin contrato.'

export function ExpedienteRechazadoBanner({ motivo }: ExpedienteRechazadoBannerProps) {
  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-white border border-red-200 flex items-center justify-center shrink-0">
          <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-red-900 mb-0.5">Expediente rechazado</h3>
          <p className="text-sm text-red-800">{motivo || MOTIVO_FALLBACK}</p>
          <p className="text-xs text-red-700 mt-2">
            El flujo termina aquí. Si tienes dudas sobre esta decisión, escríbenos.
          </p>
        </div>
      </div>
    </div>
  )
}
