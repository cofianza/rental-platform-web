/**
 * Banner del panel con los avisos de servicio vigentes (fallas de WhatsApp,
 * pagos, firma…). Va arriba del contenido en los tres shells. La persona puede
 * cerrar los que no son «fuera de servicio»; el cierre se guarda en su cuenta
 * y, si el administrador los edita, vuelven a salir. El equipo de Cofianza ve
 * todos y a quién le salen.
 *
 * Reporte de la Oficina Virtual (25-nov), punto 12: cada aviso ocupa una línea
 * con «Ver más» para el detalle (AvisoServicioCard `compacto`).
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAvisosServicio } from '@/hooks/useAvisosServicio'
import { textoAudiencia } from '@/lib/avisosServicio'
import { AvisoServicioCard } from './AvisoServicioCard'

export const RUTA_AVISOS_SERVICIO = '/configuracion/avisos-servicio'

export function AvisosServicioBanner() {
  const { avisos, ocultar, esEquipo, esAdmin } = useAvisosServicio()
  const pathname = usePathname()
  // En la pantalla donde se gestionan ya están en la lista.
  if (avisos.length === 0 || pathname === RUTA_AVISOS_SERVICIO) return null

  return (
    <section aria-label="Avisos de servicio" className="mb-4 space-y-2">
      {avisos.map((a) => (
        <AvisoServicioCard
          key={a.id}
          compacto
          servicio={a.servicio}
          nivel={a.nivel}
          titulo={a.titulo}
          mensaje={a.mensaje}
          actualizadoEn={a.actualizado_en}
          pie={
            esEquipo && a.audiencia ? (
              <>
                Lo ven: {textoAudiencia(a.audiencia)}
                {esAdmin && (
                  <>
                    {' · '}
                    <Link href={RUTA_AVISOS_SERVICIO} className="font-semibold underline underline-offset-2">
                      Gestionar
                    </Link>
                  </>
                )}
              </>
            ) : undefined
          }
          onOcultar={
            a.nivel === 'caido'
              ? undefined
              : () => {
                  ocultar(a)
                  // El botón desaparece: el foco no se queda en el vacío.
                  document.getElementById('contenido')?.focus()
                }
          }
        />
      ))}
    </section>
  )
}
