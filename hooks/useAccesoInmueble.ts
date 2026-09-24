'use client'

import { useEffect, useState } from 'react'
import { ApiClientError } from '@/lib/api'
import { inmuebleService } from '@/services/inmuebleService'
import { useAuthStore } from '@/stores/auth.store'

/**
 * ¿El usuario puede abrir la ficha del inmueble? Con «cada miembro ve solo lo
 * suyo», el asesor solo abre los inmuebles que registró o le asignaron, aunque
 * trabaje un estudio asignado sobre el de un compañero. Lo decide el API: solo
 * su 404 lo niega (un error de red no esconde nada). Titulares, propietarios e
 * internos lo abren siempre, sin consultar.
 * null mientras se consulta: así el enlace no aparece y desaparece.
 */
export function useAccesoInmueble(inmuebleId: string | undefined): boolean | null {
  const user = useAuthStore((s) => s.user)
  const consultar = user?.rol === 'inmobiliaria' && user.rol_miembro !== 'owner'
  const [respuesta, setRespuesta] = useState<{ id: string; acceso: boolean } | null>(null)

  useEffect(() => {
    if (!consultar || !inmuebleId) return
    let vigente = true
    inmuebleService.getInmuebleById(inmuebleId).then(
      () => vigente && setRespuesta({ id: inmuebleId, acceso: true }),
      (e: unknown) =>
        vigente && setRespuesta({ id: inmuebleId, acceso: !(e instanceof ApiClientError && e.statusCode === 404) }),
    )
    return () => {
      vigente = false
    }
  }, [consultar, inmuebleId])

  if (!consultar) return true
  return respuesta && respuesta.id === inmuebleId ? respuesta.acceso : null
}
