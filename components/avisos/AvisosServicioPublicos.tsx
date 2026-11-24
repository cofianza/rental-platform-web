/**
 * Avisos de servicio en las páginas públicas por enlace (autorizar, pagar,
 * verificar identidad, cargar documentos…): solo los que el administrador
 * marcó para prospectos. Se pueden ocultar igual que en el panel (salvo
 * «fuera de servicio»). Si la consulta falla no se muestra nada: el flujo
 * sigue igual.
 */

'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getAvisosPublicos } from '@/services/avisosServicioService'
import { avisosAMostrar } from '@/lib/avisosServicio'
import { useAvisosServicioStore } from '@/stores/avisosServicio.store'
import type { IAvisoVisible } from '@/types/avisosServicio'
import { AvisoServicioCard } from './AvisoServicioCard'

/** Páginas por enlace que no abre un prospecto: la invitación a un miembro y la verificación de un certificado. */
function esPaginaDeProspecto(pathname: string): boolean {
  return !pathname.startsWith('/invitacion-miembro') && !/^\/verificar(\/|$)/.test(pathname)
}

export function AvisosServicioPublicos() {
  const pathname = usePathname()
  const aplica = esPaginaDeProspecto(pathname)
  const [avisos, setAvisos] = useState<IAvisoVisible[]>([])
  const ocultos = useAvisosServicioStore((s) => s.ocultos)
  const ocultar = useAvisosServicioStore((s) => s.ocultar)

  useEffect(() => {
    if (!aplica) return
    let vivo = true
    useAvisosServicioStore.getState().leerOcultos()
    getAvisosPublicos()
      .then((a) => {
        if (vivo) setAvisos(a)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [aplica])

  const visibles = aplica ? avisosAMostrar(avisos, ocultos) : []
  if (visibles.length === 0) return null

  return (
    <section aria-label="Avisos de servicio" className="mb-6 space-y-2">
      {visibles.map((a) => (
        <AvisoServicioCard
          key={a.id}
          servicio={a.servicio}
          nivel={a.nivel}
          titulo={a.titulo}
          mensaje={a.mensaje}
          onOcultar={a.nivel === 'caido' ? undefined : () => ocultar(a)}
        />
      ))}
    </section>
  )
}
