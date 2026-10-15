/**
 * Banner que se muestra a un MIEMBRO del equipo (no titular) de una
 * inmobiliaria cuando su perfil personal está incompleto. Mientras tanto no
 * puede crear ni modificar nada: usePuedeEditar devuelve false (y el backend
 * además bloquea las mutaciones). Se monta una sola vez, en OficinaVirtualShell.
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
  // En Mi cuenta (donde se completa) el aviso sobra.
  if (!miembroDebeCompletarPerfil(user) || pathname === '/configuracion/cuenta') return null

  // Al terminar de completar el perfil, volver a donde estaba.
  const returnTo = pathname ? `?returnTo=${encodeURIComponent(pathname)}` : ''

  return (
    <div role="status" className="mb-4 flex items-start gap-3 p-5 bg-amber-50 border border-amber-200 rounded-lg">
      <IconAlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">
          Complete sus datos personales para poder trabajar en la plataforma
        </p>
        <p className="text-xs text-amber-800 mt-1">
          Como miembro del equipo necesita tener su nombre, apellido, teléfono y
          documento en su perfil antes de crear o modificar propiedades, estudios
          y visitas. Mientras tanto solo puede consultar.
        </p>
        <Link
          href={`/configuracion/cuenta${returnTo}`}
          className="inline-flex items-center gap-1.5 mt-3 px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
        >
          Completar mi perfil
          <IconArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
