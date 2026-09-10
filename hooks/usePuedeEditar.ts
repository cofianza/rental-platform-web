import { useAuthStore } from '@/stores/auth.store'

/**
 * ¿El usuario puede crear o modificar? Falso para los dos roles de solo
 * lectura: Gerencia y el miembro 'solo_lectura' de una inmobiliaria. El API ya
 * les niega toda mutación; esto evita mostrarles botones que terminan en 403.
 */
export function usePuedeEditar(): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user || user.rol === 'gerencia_consulta') return false
  return !(user.rol === 'inmobiliaria' && user.rol_miembro === 'solo_lectura')
}
