/**
 * Banner que se muestra a un MIEMBRO del equipo (no titular) de una
 * inmobiliaria cuando su perfil personal está incompleto. Mientras tanto no
 * puede administrar el expediente que le asignaron: las acciones quedan
 * deshabilitadas (y el backend además bloquea las mutaciones).
 *
 * El gate aplica sólo a rol_miembro='miembro' (staff). El titular (owner) y
 * los demás roles no se bloquean. Renderiza null si no aplica.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconAlertTriangle, IconArrowRight } from '@/components/icons'
import type { IUser } from '@/types/auth'

/**
 * ¿Este usuario es un miembro del equipo que debe completar su perfil personal
 * antes de poder administrar? Sesgo seguro: sólo bloquea cuando SABEMOS que el
 * perfil está incompleto (perfil_completo === false); si el dato aún no llegó
 * (undefined), no bloquea.
 */
export function miembroDebeCompletarPerfil(user: IUser | null | undefined): boolean {
  return (
    user?.rol === 'inmobiliaria' &&
    user.rol_miembro === 'miembro' &&
    user.perfil_completo === false
  )
}

interface Props {
  user: IUser | null | undefined
}

export function PerfilPersonalIncompletoBanner({ user }: Props) {
  const pathname = usePathname()
  if (!miembroDebeCompletarPerfil(user)) return null

  // Al terminar de completar el perfil, volver a donde estaba.
  const returnTo =
    pathname && pathname !== '/configuracion/cuenta'
      ? `?returnTo=${encodeURIComponent(pathname)}`
      : ''

  return (
    <div className="flex items-start gap-3 p-5 bg-amber-50 border border-amber-200 rounded-lg">
      <IconAlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">
          Completá tus datos personales para administrar este expediente
        </p>
        <p className="text-xs text-amber-800 mt-1">
          Como miembro del equipo necesitas tener tu nombre, apellido, teléfono y
          documento en tu perfil antes de poder gestionar los expedientes que te
          asignen. Mientras tanto las acciones están deshabilitadas.
        </p>
        <Link
          href={`/configuracion/cuenta${returnTo}`}
          className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-700 transition-colors"
        >
          Completar mi perfil
          <IconArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
