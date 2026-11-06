'use client'

/**
 * Modo «ver como la inmobiliaria / el propietario» (solo administrador).
 *
 * La página de detalle del estudio lo activa con `?verComo=inmobiliaria|propietario`.
 * Mientras dura, los componentes del detalle leen el usuario con
 * `useUsuarioVista()` (el titular de la inmobiliaria o el propietario
 * simulado) en vez del usuario real, y la API recibe `X-Ver-Como` (lib/api.ts)
 * para responder con la misma redacción que le da a ese actor. Es solo
 * lectura: la web corta las escrituras antes de salir y la API las rechaza.
 * Fuera de la página de detalle no hay proveedor, así que todo sigue igual.
 */

import { createContext, useContext } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { IconEye, IconLogOut } from '@/components/icons'
import type { IUser } from '@/types/auth'

export type RolVista = 'inmobiliaria' | 'propietario'

export interface IVerComo {
  rol: RolVista
  /** Nombre de la inmobiliaria o del propietario dueño del estudio. */
  nombre: string
  /** El usuario simulado: titular (owner) de la inmobiliaria, o el propietario. */
  usuario: IUser
  salir: () => void
}

export const VerComoContext = createContext<IVerComo | null>(null)

/** El modo activo, o null (fuera del detalle o sin activar). */
export function useVerComo(): IVerComo | null {
  return useContext(VerComoContext)
}

/** El usuario con el que se decide qué mostrar: el simulado en modo «ver como»; si no, el real. */
export function useUsuarioVista(): IUser | null {
  const real = useAuthStore((s) => s.user)
  const vista = useContext(VerComoContext)
  return vista ? vista.usuario : real
}

/** Rol de vista válido desde la URL, o null. */
export function parsearVerComo(valor: string | null): RolVista | null {
  return valor === 'inmobiliaria' || valor === 'propietario' ? valor : null
}

/**
 * Usuario simulado: conserva el id real (las comparaciones «es mío» dan falso,
 * como para cualquier otro titular) y toma el rol de la agencia como titular
 * con edición, o el de propietario.
 */
export function usuarioSimulado(real: IUser, rol: RolVista): IUser {
  return {
    id: real.id,
    email: real.email,
    nombre_completo: real.nombre_completo,
    rol,
    rol_miembro: rol === 'inmobiliaria' ? 'owner' : null,
    es_gerencia_general: false,
    perfil_completo: true,
    activo: true,
  }
}

export function VerComoBanner({ vista }: { vista: IVerComo }) {
  const quien = vista.rol === 'inmobiliaria' ? `la inmobiliaria «${vista.nombre}»` : `el propietario «${vista.nombre}»`
  return (
    <div
      role="status"
      className="sticky top-0 z-30 -mx-4 sm:mx-0 mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b sm:border sm:rounded-xl border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm"
    >
      <IconEye className="h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        Está viendo este estudio como {quien}. <strong className="font-semibold">Solo lectura.</strong>
      </p>
      <button
        type="button"
        onClick={vista.salir}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <IconLogOut className="h-4 w-4" aria-hidden="true" />
        Salir
      </button>
    </div>
  )
}
