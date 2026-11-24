/**
 * Integración nuby: estados que reemplazan al panel entero (cargando, función
 * apagada, miembro que no es titular, fallo de carga) y las reglas en corto.
 */

import { IconCheck, IconLock, IconPlug, IconRefresh } from '@/components/icons'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

const TARJETA = 'rounded-xl border border-gray-200 bg-white shadow-sm'

export function NubyCargando() {
  return (
    <div role="status" aria-live="polite" className={`${TARJETA} space-y-4 p-4 sm:p-6`}>
      <span className="sr-only">Cargando la conexión con nuby…</span>
      <Skeleton className="h-5 w-1/2" />
      <SkeletonText lineas={3} />
      <Skeleton className="h-10 w-40" />
    </div>
  )
}

/** La función está apagada en la plataforma: sin formulario. */
export function NubyNoDisponible() {
  return (
    <div className={`${TARJETA} px-4 py-10 text-center sm:px-6`}>
      <IconPlug size={32} className="mx-auto mb-3 text-gray-500" />
      <h2 className="text-base font-semibold text-gray-900">La conexión con nuby todavía no está disponible</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">
        Cuando se habilite, podrá conectarla desde esta pantalla.
      </p>
    </div>
  )
}

/** Solo el titular conecta y gestiona nuby; al resto del equipo la API le responde 403. */
export function NubySoloTitular() {
  return (
    <div className={`${TARJETA} px-4 py-10 text-center sm:px-6`}>
      <IconLock size={32} className="mx-auto mb-3 text-gray-500" />
      <h2 className="text-base font-semibold text-gray-900">La conexión con nuby la gestiona el titular</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">
        Solo el titular de la inmobiliaria puede conectarla, cambiarla o desconectarla.
      </p>
    </div>
  )
}

export function NubyErrorCarga({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <p className="mb-3 text-sm text-red-700">{mensaje}</p>
      <button
        type="button"
        onClick={onReintentar}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        <IconRefresh size={16} /> Reintentar
      </button>
    </div>
  )
}

const REGLAS = [
  'Los inmuebles nuevos entran sin publicar en la vitrina.',
  'Un inmueble con estudio en curso o con contrato en Cofianza no se toca.',
  'Si un inmueble ya no aparece en nuby, sale de la vitrina, pero no se borra.',
  'Cofianza solo lee: no escribe nada en nuby.',
]

/** Las reglas de la copia, en corto. */
export function ReglasNuby({ sincronizacionAutomatica }: { sincronizacionAutomatica: boolean }) {
  return (
    <section className={`${TARJETA} p-4 sm:p-6`}>
      <h2 className="text-sm font-semibold text-gray-900">Cómo funciona la copia</h2>
      <p className="mt-1 text-sm text-gray-600">
        Cofianza trae los inmuebles que están en arriendo en nuby
        {sincronizacionAutomatica
          ? ': copia sola lo modificado cada 3 horas y revisa el inventario completo una vez al día.'
          : '.'}
      </p>
      <ul className="mt-3 space-y-2">
        {REGLAS.map((regla) => (
          <li key={regla} className="flex items-start gap-2 text-sm text-gray-700">
            <IconCheck size={16} className="mt-0.5 shrink-0 text-primary-700" />
            <span>{regla}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
