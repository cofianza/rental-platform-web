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
 */
export function useAccesoInmueble(inmuebleId: string | undefined): boolean {
  const user = useAuthStore((s) => s.user)
  const consultar = user?.rol === 'inmobiliaria' && user.rol_miembro !== 'owner'
  const [sinAcceso, setSinAcceso] = useState<string | null>(null)

  useEffect(() => {
    if (!consultar || !inmuebleId) return
    let vigente = true
    inmuebleService.getInmuebleById(inmuebleId).catch((e: unknown) => {
      if (vigente && e instanceof ApiClientError && e.statusCode === 404) setSinAcceso(inmuebleId)
    })
    return () => {
      vigente = false
    }
  }, [consultar, inmuebleId])

  return !inmuebleId || sinAcceso !== inmuebleId
}
