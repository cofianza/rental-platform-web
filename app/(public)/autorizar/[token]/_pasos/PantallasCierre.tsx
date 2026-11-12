/** Pantallas sin formulario: enlace no disponible, reportado, estudio inactivo y documento que no coincide. */

import { cn } from '@/lib/utils'
import { IconAlertTriangle, IconRefresh, IconShield, IconUserX } from '@/components/icons'
import type { MotivoReporte } from './constantes'
import { enMedioDeFrase } from './textos'

export function PantallaError({
  reintentable,
  errorMessage,
  onReintentar,
}: {
  reintentable: boolean
  errorMessage: string
  onReintentar: () => void
}) {
  return (
    <div className="px-6 py-10 text-center">
      <div
        className={cn(
          'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full',
          reintentable ? 'bg-amber-100' : 'bg-red-100',
        )}
      >
        <IconAlertTriangle size={24} className={reintentable ? 'text-amber-600' : 'text-red-600'} />
      </div>
      <h2 className="text-lg font-bold text-gray-900">
        {reintentable ? 'No pudimos cargar la página' : 'Este enlace no está disponible'}
      </h2>
      <p className="mt-1 text-sm text-gray-500">{errorMessage}</p>
      {reintentable && (
        <button
          type="button"
          onClick={onReintentar}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-800"
        >
          <IconRefresh size={16} /> Reintentar
        </button>
      )}
    </div>
  )
}

// §12: cierre neutro. Ni "rechazado" ni culpa — el §13 prohíbe esa palabra
// en pantallas del prospecto.
export function PantallaReportado({ quien, motivoReportado }: { quien: string; motivoReportado: MotivoReporte | null }) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
        <IconUserX size={28} className="text-amber-600" />
      </div>
      <h2 className="text-xl font-extrabold text-gray-900">Detuvimos el proceso</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
        Gracias por avisarnos. Este enlace ya no sirve y <strong>nadie va a consultar sus datos</strong> con
        él.
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
        {motivoReportado === 'datos_incorrectos'
          ? `${quien} corregirá sus datos y le enviará un enlace nuevo. No tiene que hacer nada más.`
          : 'El equipo de Cofianza ya fue notificado y revisará el caso. Si este enlace no era para usted, no tiene que hacer nada más.'}
      </p>
      <p className="mt-4 text-sm text-gray-500">Puede cerrar esta página.</p>
    </div>
  )
}

// Estudio cancelado o cerrado mientras el enlace seguía en el chat: nada que
// firmar. Neutro a propósito (§13: ni "rechazado" ni culpa).
export function PantallaInactivo({ quien }: { quien: string }) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <IconShield size={28} className="text-gray-500" />
      </div>
      <h2 className="text-xl font-extrabold text-gray-900">Este estudio ya no está activo</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
        No hay nada que autorizar con este enlace y no vamos a consultar sus datos con él. Si tiene dudas,{' '}
        {enMedioDeFrase(quien)} le puede ayudar, o escríbanos: abajo están nuestros datos.
      </p>
      <p className="mt-4 text-sm text-gray-500">Puede cerrar esta página.</p>
    </div>
  )
}

// §8.1: el documento escrito no es el registrado. Puede ser un error en la
// ficha o en lo que se escribió; en los dos casos se detiene, sin revelar
// cuál es el número registrado.
export function PantallaNoCoincide({ quien }: { quien: string }) {
  return (
    <div className="px-6 py-10 text-center" role="status">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
        <IconUserX size={28} className="text-amber-600" />
      </div>
      <h2 className="text-xl font-extrabold text-gray-900">El documento no coincide</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
        El número que escribió no es el que tenemos registrado. Para no consultar los datos de otra
        persona, <strong>detuvimos el proceso</strong>. {quien} ya recibió el aviso: revisará los datos y le
        enviará un enlace nuevo.
      </p>
      <p className="mt-4 text-sm text-gray-500">Puede cerrar esta página.</p>
    </div>
  )
}
