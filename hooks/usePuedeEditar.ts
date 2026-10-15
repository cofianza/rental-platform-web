import { useAuthStore } from '@/stores/auth.store'
import { miembroDebeCompletarPerfil } from '@/components/expedientes/PerfilPersonalIncompletoBanner'

/**
 * ¿El usuario puede crear o modificar? Falso para los dos roles de solo
 * lectura: Gerencia y el miembro 'solo_lectura' de una inmobiliaria. El API ya
 * les niega toda mutación; esto evita mostrarles botones que terminan en 403.
 * También falso para el miembro del equipo con el perfil personal incompleto
 * (el API le responde 403 PERFIL_PERSONAL_INCOMPLETO); el aviso con el enlace
 * para completarlo sale en OficinaVirtualShell.
 */
export function usePuedeEditar(): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user || user.rol === 'gerencia_consulta') return false
  if (miembroDebeCompletarPerfil(user)) return false
  return !(user.rol === 'inmobiliaria' && user.rol_miembro === 'solo_lectura')
}
