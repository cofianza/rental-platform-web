'use client'

import { cn } from '@/lib/utils'
import { IconCheck, IconArrowLeft, IconArrowRight } from '@/components/icons'
import { buttonClasses } from '@/components/ui/Button'
import { BENEFICIOS, type ConsentKey } from './constantes'

/** Paso 3 · Opcional: los tres consentimientos opcionales (texto legal §5.2), todos apagados de entrada. */
export function PasoBeneficios({
  consents,
  onAlternar,
  onContinuar,
  onSaltar,
  onVolver,
}: {
  consents: Record<ConsentKey, boolean>
  onAlternar: (key: ConsentKey) => void
  onContinuar: () => void
  onSaltar: () => void
  onVolver: () => void
}) {
  return (
    <div className="space-y-4">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-coral-700">
        Paso 3 · Opcional
      </span>
      <div>
        {/* "Tu cuenta" hacía dudar al prospecto: llegó por un enlace de
            WhatsApp y no tiene ninguna cuenta creada. */}
        {/* M12: «Beneficios», el mismo nombre que usa el texto legal para este paso. */}
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Beneficios opcionales</h2>
        <p className="mt-1 text-sm text-gray-500">
          {BENEFICIOS.length === 3 ? 'Tres' : BENEFICIOS.length} autorizaciones opcionales. Usted elige cuáles
          encender y las cambia cuando quiera. Su fianza funciona igual, las active o no.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 p-3 text-xs font-medium text-primary-800">
        <IconCheck size={14} className="shrink-0 text-primary-600" />
        Nada se activa sin su permiso.
      </div>

      <div className="space-y-3">
        {BENEFICIOS.map((b) => {
          const on = consents[b.key]
          return (
            <div key={b.key} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <b.Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p id={`ben-${b.key}-t`} className="text-sm font-bold text-gray-900">{b.titulo}</p>
                </div>
                <Toggle
                  on={on}
                  onClick={() => onAlternar(b.key)}
                  labelledBy={`ben-${b.key}-t`}
                  describedBy={`ben-${b.key}-d`}
                />
              </div>
              <p id={`ben-${b.key}-d`} className="mt-2 text-xs leading-relaxed text-gray-500">{b.desc}</p>
              <span className="mt-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                Opcional
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-gray-600">
        No marcar estas opciones no condiciona, limita ni restringe el acceso a los servicios de Cofianza.
      </p>

      <button
        type="button"
        onClick={onContinuar}
        className={buttonClasses('primary', 'lg', 'w-full')}
      >
        Continuar <IconArrowRight size={16} />
      </button>
      {/* M13: saltar = seguir sin encender ningún permiso opcional. */}
      <button
        type="button"
        onClick={onSaltar}
        className={buttonClasses('secondary', 'lg', 'w-full')}
      >
        Saltar este paso
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

// Con nombre accesible: sin él, el lector de pantalla anunciaba tres veces
// "interruptor, desactivado" sin decir qué se autorizaba (Ley 1581).
function Toggle({
  on,
  onClick,
  labelledBy,
  describedBy,
}: {
  on: boolean
  onClick: () => void
  labelledBy?: string
  describedBy?: string
}) {
  return (
    // B5: el botón mide 44×56 px (área táctil); la pista visible sigue de 24×44.
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={onClick}
      className="group -my-2.5 -mr-1.5 inline-flex h-11 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-hidden"
    >
      <span
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-primary-500 group-focus-visible:ring-offset-2',
          on ? 'bg-primary-600' : 'bg-gray-300',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
            on ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </span>
    </button>
  )
}
