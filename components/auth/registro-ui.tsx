'use client'

/**
 * Piezas de UI compartidas por las pantallas de registro (inmobiliaria,
 * propietario). Centraliza las pestañas + selector «Soy:», el encabezado de
 * sección, la ayuda de contraseña, las clases de input/select y el scroll+foco al primer
 * campo con error, para que las pantallas tengan el mismo trato.
 */

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { AUTH_ROUTES } from '@/lib/constants'
import { IconHome, IconBuilding2 } from '@/components/icons'

// Campo del diseño v2 (COFIANZA_Login_Registro_v2): sin icono a la izquierda,
// borde 1,5 px, 15 px de letra; el mismo del login.
const CAMPO =
  'w-full rounded-[10px] border-[1.5px] bg-white py-3 text-[15px] leading-[1.25] text-slate-900 placeholder:text-slate-400 transition-all focus:outline-hidden focus:border-primary-600 focus:ring-[3px] focus:ring-primary-600/10'

/** Clase de input; `error` pinta borde rojo y `rightIcon` reserva espacio para el ojo. */
export function regInputCls(opts: { error?: boolean; rightIcon?: boolean } = {}): string {
  return cn(CAMPO, 'pl-3.5', opts.rightIcon ? 'pr-11' : 'pr-3.5', opts.error ? 'border-red-500' : 'border-slate-200')
}

/**
 * Atributos del campo para lectores de pantalla: lo marca inválido y lo enlaza
 * con su mensaje (el `<p id="error-campo">`), que así se lee al llegar al campo.
 */
export function ariaError(errors: Record<string, string>, campo: string) {
  return {
    'aria-invalid': !!errors[campo],
    'aria-describedby': errors[campo] ? `error-${campo}` : undefined,
  }
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
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary-700 text-[11px] font-bold text-white">
          {num}
        </span>
        <span className="text-[13px] font-bold uppercase tracking-[2px] text-primary-700">{title}</span>
      </div>
      {children}
    </div>
  )
}

/** Requisitos de la contraseña, como texto de ayuda bajo el campo (diseño v2). */
export function PasswordHelp() {
  return (
    <p className="mt-1 text-xs leading-[1.4] text-slate-500">
      Mínimo 8 caracteres, con una mayúscula, una minúscula y un número.
    </p>
  )
}

/** Clase de select con estado de error. */
export function regSelectCls(opts: { error?: boolean } = {}): string {
  return cn(CAMPO, 'px-3.5', opts.error ? 'border-red-500' : 'border-slate-200')
}
