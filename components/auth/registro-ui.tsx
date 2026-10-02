'use client'

/**
 * Piezas de UI compartidas por las pantallas de registro (inmobiliaria,
 * propietario). Centraliza las pestañas + selector «Soy:», el stepper de
 * progreso, el encabezado de sección, los requisitos de contraseña, el helper
 * de clases de input (con estado válido/error) y el scroll+foco al primer
 * campo con error, para que las pantallas tengan el mismo trato.
 */

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { AUTH_ROUTES } from '@/lib/constants'
import { IconCheck, IconHome, IconBuilding2 } from '@/components/icons'

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
                  ? 'border-primary-700 bg-primary-700 text-white'
                  : current
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 bg-white text-gray-500',
              )}
            >
              {s.done ? <IconCheck size={14} /> : i + 1}
            </span>
            <span
              className={cn(
                'hidden truncate text-[11px] font-semibold uppercase tracking-wide sm:block',
                s.done || current ? 'text-primary-700' : 'text-gray-500',
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
 *
 * Busca el campo dos cuadros después: quien llama acaba de hacer setErrors y
 * React aún no ha pintado el aria-invalid. Buscando en el acto (o con un
 * setTimeout de 0) no se encontraba nada: el primer clic no llevaba a ningún
 * lado y, con los errores del servidor, ningún clic lo hacía.
 */
export function scrollToFirstError(form: HTMLFormElement | null): void {
  if (!form) return
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
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
    }),
  )
}

const TIPOS_CUENTA = [
  { tipo: 'propietario', href: AUTH_ROUTES.REGISTER_PROPIETARIO, Icon: IconHome, label: 'Propietario' },
  { tipo: 'inmobiliaria', href: AUTH_ROUTES.REGISTER_INMOBILIARIA, Icon: IconBuilding2, label: 'Inmobiliaria' },
] as const

/**
 * Pestañas Iniciar sesión / Crear cuenta + selector «Soy:» con dos tarjetas
 * compactas. Las tarjetas son enlaces entre las dos páginas de registro (cada
 * tipo conserva su ruta: la usan la landing, los correos y proxy.ts).
 */
export function RegistroTipoTabs({ activo }: { activo: 'propietario' | 'inmobiliaria' }) {
  return (
    <>
      <div className="grid grid-cols-2 bg-slate-50 rounded-xl p-1 mb-7">
        <Link
          href={AUTH_ROUTES.LOGIN}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-center text-slate-500 hover:text-slate-700 transition-colors"
        >
          Iniciar sesión
        </Link>
        <span
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-center text-slate-900 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          aria-current="page"
        >
          Crear cuenta
        </span>
      </div>

      <p className="text-[13px] font-semibold text-slate-900 mb-2.5">Soy:</p>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {TIPOS_CUENTA.map(({ tipo, href, Icon, label }) => {
          const esActivo = tipo === activo
          return (
            <Link
              key={tipo}
              href={href}
              aria-current={esActivo ? 'true' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border-[1.5px] px-2.5 py-3.5 text-center transition-all',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                esActivo
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-primary-600',
              )}
            >
              <Icon size={22} className={esActivo ? 'text-primary-600' : 'text-slate-500'} />
              <span className="text-xs font-semibold">{label}</span>
            </Link>
          )
        })}
      </div>
    </>
  )
}

/** Encabezado de sección numerado. */
export function FormSection({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-[11px] font-bold text-white">
          {num}
        </span>
        <span className="text-[13px] font-bold uppercase tracking-[2px] text-primary-700">{title}</span>
      </div>
      {children}
    </div>
  )
}

export function PasswordRequirements({ password }: { password: string }) {
  const checks = [
    { label: 'Al menos 8 caracteres', met: password.length >= 8 },
    { label: 'Una letra mayúscula', met: /[A-Z]/.test(password) },
    { label: 'Una letra minúscula', met: /[a-z]/.test(password) },
    { label: 'Un número', met: /\d/.test(password) },
  ]

  return (
    <div className="mt-2 space-y-1">
      {checks.map((check) => (
        <div key={check.label} className="flex items-center gap-2">
          <IconCheck size={14} className={check.met ? 'text-green-500' : 'text-gray-300'} />
          <span className={cn('text-xs', check.met ? 'text-green-600' : 'text-gray-500')}>
            {check.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Clase de select con estado de error; `icon` reserva espacio a la izquierda. */
export function regSelectCls(opts: { error?: boolean; icon?: boolean } = {}): string {
  return cn(
    'w-full rounded-lg border bg-white py-2.5 pr-4 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500',
    opts.icon ? 'pl-10' : 'pl-3',
    opts.error ? 'border-red-500' : 'border-gray-300',
  )
}
