import { cn } from '@/lib/utils'
import { IconLock, IconShieldCheck } from '@/components/icons'

/** Header de marca de la tarjeta, igual en todos los pasos. */
export function EncabezadoMarca() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-700 text-white">
          <IconShieldCheck size={18} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-gray-900">Autorización de datos</p>
          <p className="text-[11px] text-gray-500">Cofianza S.A.S. · NIT 902.038.122-7</p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700">
        <IconLock size={12} /> Conexión protegida
      </span>
    </div>
  )
}

/*
  Progreso. El paso de identidad solo existe si el backend lo pide, así
  que la barra tiene 4 o 5 tramos según el interruptor — pintar cinco
  siempre le prometería al prospecto un paso que no va a ver.
*/
export function BarraProgreso({ pasosBarra, pasoIndice }: { pasosBarra: string[]; pasoIndice: number }) {
  return (
    <>
      {/* B11: el lector de pantalla oye «Paso 2 de 4: Sobre ti»; las barras son decorado. */}
      <p className="sr-only" aria-live="polite">
        Paso {pasoIndice} de {pasosBarra.length}: {pasosBarra[pasoIndice - 1]}
      </p>
      <div
        aria-hidden
        className={cn('grid gap-1.5 px-5 pt-4', pasosBarra.length === 5 ? 'grid-cols-5' : 'grid-cols-4')}
      >
        {pasosBarra.map((label, i) => {
          const on = pasoIndice >= i + 1
          return (
            <div key={label}>
              <div className={cn('h-1.5 rounded-full', on ? 'bg-primary-600' : 'bg-gray-200')} />
              <p className={cn('mt-1 break-words text-[10px] font-bold leading-tight', on ? 'text-primary-700' : 'text-gray-500')}>
                {i + 1} · {label}
              </p>
            </div>
          )
        })}
      </div>
    </>
  )
}
