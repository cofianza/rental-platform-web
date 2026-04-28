/**
 * Hook que carga el estado de completitud del perfil de arrendador.
 *
 * Lo usa la lista de inmuebles y el formulario de "Nuevo Inmueble" para
 * bloquear la creacion mientras el propietario/inmobiliaria no haya
 * completado sus Datos para contrato (domicilio, cuenta de recaudo,
 * matricula si aplica).
 *
 * Solo carga si el rol es propietario/inmobiliaria — admin/operador no
 * tienen perfil de arrendador propio.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  perfilArrendadorService,
  type IPerfilCompletitud,
} from '@/services/perfilArrendadorService'

interface UsePerfilCompletitudResult {
  completitud: IPerfilCompletitud | null
  loading: boolean
  /** Si es true, el usuario actual NO necesita completar perfil (admin/operador). */
  noAplica: boolean
  refetch: () => Promise<void>
}

export function usePerfilCompletitud(): UsePerfilCompletitudResult {
  const { user } = useAuth()
  const noAplica = !user || (user.rol !== 'propietario' && user.rol !== 'inmobiliaria')

  const [completitud, setCompletitud] = useState<IPerfilCompletitud | null>(null)
  const [loading, setLoading] = useState(!noAplica)

  const fetchData = async () => {
    if (noAplica) {
      setCompletitud(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await perfilArrendadorService.getCompletitud()
      setCompletitud(data)
    } catch {
      // En caso de error asumimos completo para no bloquear; el backend
      // hara la validacion final al crear inmueble.
      setCompletitud({ completo: true, faltantes: [], rol: user?.rol || '' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.rol])

  return { completitud, loading, noAplica, refetch: fetchData }
}
