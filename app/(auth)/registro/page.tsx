/**
 * Selector de tipo de cuenta — Registro.
 * Sigue el rebrand de cofianza_login v1: eyebrow + titulo Outfit + tabs
 * Iniciar sesion / Crear cuenta. Tres opciones (Arrendatario, Propietario,
 * Inmobiliaria) que llevan a paginas dedicadas con su flujo especifico.
 */

'use client'

import Link from 'next/link'
import { AUTH_ROUTES } from '@/lib/constants'
import { IconUser, IconHome, IconBuilding2, IconArrowRight } from '@/components/icons'

const OPCIONES = [
  {
    href: AUTH_ROUTES.REGISTER_SOLICITANTE,
    Icon: IconUser,
    titulo: 'Soy Arrendatario',
    desc: 'Busco un inmueble para arrendar y necesito fianza.',
  },
  {
    href: AUTH_ROUTES.REGISTER_PROPIETARIO,
    Icon: IconHome,
    titulo: 'Soy Propietario',
    desc: 'Tengo inmuebles y quiero gestionar mis arriendos.',
  },
  {
    href: AUTH_ROUTES.REGISTER_INMOBILIARIA,
    Icon: IconBuilding2,
    titulo: 'Soy Inmobiliaria',
    desc: 'Empresa o agencia que administra propiedades.',
  },
]

export default function RegisterTypeSelectorPage() {
  return (
    <div className="w-full">
      <p className="text-xs font-bold tracking-[3px] uppercase text-primary-600 mb-2">
        Bienvenido
      </p>
      <h2 className="text-[32px] font-black tracking-[-1.5px] leading-[1.1] text-slate-900 mb-2">
        Crea tu cuenta
      </h2>
      <p className="text-[15px] text-slate-500 leading-[1.6] mb-8">
        En menos de un minuto. Sin papeles, sin filas.
      </p>

      {/* Tabs Iniciar sesion / Crear cuenta. El primero es Link a /login. */}
      <div className="grid grid-cols-2 bg-slate-50 rounded-xl p-1 mb-7">
        <Link
          href={AUTH_ROUTES.LOGIN}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-center text-slate-500 hover:text-slate-700 transition-colors"
        >
          Iniciar sesión
        </Link>
        <button
          type="button"
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-900 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          aria-current="page"
        >
          Crear cuenta
        </button>
      </div>

      <p className="text-[13px] font-semibold text-slate-900 mb-3">Soy:</p>

      <div className="flex flex-col gap-2.5 mb-6">
        {OPCIONES.map((op) => (
          <Link
            key={op.href}
            href={op.href}
            className="group flex items-center gap-4 p-4 border-[1.5px] border-slate-200 rounded-xl bg-white hover:border-primary-600 hover:bg-primary-50/40 transition-all"
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100"
              aria-hidden
            >
              <op.Icon size={20} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-slate-900 group-hover:text-primary-700 transition-colors">
                {op.titulo}
              </p>
              <p className="text-[13px] text-slate-500 mt-0.5 leading-[1.5]">{op.desc}</p>
            </div>
            <IconArrowRight
              size={18}
              className="text-slate-400 group-hover:text-primary-600 transition-colors shrink-0"
            />
          </Link>
        ))}
      </div>

      <p className="text-[13px] text-slate-500 text-center leading-[1.6]">
        ¿Ya tienes cuenta?{' '}
        <Link href={AUTH_ROUTES.LOGIN} className="text-primary-600 font-semibold hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
