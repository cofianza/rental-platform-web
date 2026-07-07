'use client'

/**
 * Piezas de UI compartidas por las pantallas de registro (inmobiliaria,
 * propietario). Centraliza el stepper de progreso, el helper de clases de
 * input (con estado válido/error) y el scroll+foco al primer campo con error,
 * para que las tres pantallas tengan el mismo trato.
 */

import { cn } from '@/lib/utils'
import { IconCheck } from '@/components/icons'

export interface StepDef {
  label: string
  done: boolean
}

/** Indicador de progreso 1·2·3: marca completadas (check) y la actual. */
export function RegistroStepper({ steps }: { steps: StepDef[] }) {
  const firstPending = steps.findIndex((s) => !s.done)
  return (
    <ol className="mb-7 flex items-center gap-1.5" aria-label="Progreso del registro">
      {steps.map((s, i) => {
        const current = i === firstPending
        return (
          <li key={s.label} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              aria-current={current ? 'step' : undefined}
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors',
                s.done
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : current
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 bg-white text-gray-400',
              )}
            >
              {s.done ? <IconCheck size={14} /> : i + 1}
            </span>
            <span
              className={cn(
                'hidden truncate text-[11px] font-semibold uppercase tracking-wide sm:block',
                s.done || current ? 'text-primary-700' : 'text-gray-400',
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span
                className={cn('mx-1 hidden h-0.5 flex-1 rounded sm:block', s.done ? 'bg-primary-500' : 'bg-gray-200')}
                aria-hidden="true"
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Clase de input con estado. `valid` pinta borde verde (campo correcto),
 * `error` pinta borde rojo (tiene prioridad). `rightIcon` reserva espacio a la
 * derecha para el check/ojo.
 */
export function regInputCls(opts: { error?: boolean; valid?: boolean; rightIcon?: boolean } = {}): string {
  return cn(
    'w-full rounded-lg border py-2.5 pl-10 text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary-500',
    opts.rightIcon ? 'pr-10' : 'pr-4',
    opts.error ? 'border-red-500' : opts.valid ? 'border-green-400' : 'border-gray-300',
  )
}

/** Check verde a la derecha del input cuando el valor es válido. */
export function ValidCheck({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <IconCheck
      size={18}
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
      aria-hidden="true"
    />
  )
}

/**
 * Hace scroll + foco al primer campo con `aria-invalid="true"` dentro del form.
 * Llamar tras marcar errores en el submit fallido.
 */
export function scrollToFirstError(form: HTMLFormElement | null): void {
  if (!form) return
  const el = form.querySelector<HTMLElement>('[aria-invalid="true"]')
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  window.setTimeout(() => {
    try {
      el.focus({ preventScroll: true })
    } catch {
      /* no-op */
    }
  }, 350)
}
