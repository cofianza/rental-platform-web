/**
 * ExpedienteRechazadoBanner — banner de cierre cuando expediente.estado='rechazado'.
 *
 * Sustituye visualmente al "stepper en curso" para comunicar que el flujo
 * terminó sin éxito y por qué. Lee `motivo_rechazo` del expediente, que el
 * orchestrator (titular) o el ponderador (coarrendatario) escriben al cerrar.
 *
 * DOS lecturas del mismo hecho, según quién mira (`esProspecto`):
 *
 *  - Gestor (admin, operador, inmobiliaria, propietario): el texto operativo de
 *    siempre, con el motivo literal que escribió el motor.
 *  - Prospecto (rol 'solicitante', que tiene panel propio: vitrina crea la
 *    cuenta auto-confirmada y puede abrir su expediente): flujo del módulo de
 *    estudios §13 — "Nunca usar la palabra 'rechazado' en ninguna pantalla
 *    dirigida al prospecto" — y §10 — "No aprobable por ahora. […] Nunca es un
 *    portazo". Esa regla es por AUDIENCIA, no por route group: esta pantalla la
 *    ve muchísima más gente que la página pública /verificar.
 *
 * El estado en la base sigue siendo 'rechazado'; aquí solo cambia lo que lee la
 * persona. `motivo_rechazo` no se muestra al prospecto porque lo escribe el
 * motor con el mismo vocabulario ("el estudio crediticio del titular fue
 * rechazado. La solicitud no procede.").
 */

'use client'

interface ExpedienteRechazadoBannerProps {
  motivo?: string | null
  /** true cuando quien mira es el propio solicitante (rol 'solicitante'). */
  esProspecto?: boolean
}

const MOTIVO_FALLBACK =
  'La solicitud no procede tras el estudio crediticio. El expediente queda cerrado sin contrato.'

export function ExpedienteRechazadoBanner({ motivo, esProspecto }: ExpedienteRechazadoBannerProps) {
  if (esProspecto) {
    return (
      <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
            <svg className="h-7 w-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 mb-0.5">No aprobable por ahora</h3>
            <p className="text-sm text-slate-700">
              Con la información disponible hoy no podemos respaldar esta solicitud. No es una
              decisión definitiva sobre ti: tu perfil puede cambiar.
            </p>
            <p className="text-xs text-slate-600 mt-2">
              Puedes volver a intentarlo más adelante, presentar un co-arrendatario o escribirnos si
              quieres entender qué pesó en la evaluación.
            </p>
          </div>
        </div>
      </div>
    )
  }

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
