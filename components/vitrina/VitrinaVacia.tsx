/**
 * Estado vacío de la vitrina: todavía no hay inmuebles publicados. Lo comparten
 * la portada (VitrinaPreview) y /vitrina (PropertyGrid, cuando no hay filtros
 * puestos) para que el visitante lea lo mismo en las dos y siempre tenga una
 * salida: publicar el suyo.
 */

import Link from 'next/link'
import { IconArrowRight } from '@/components/icons'

/** `children`: enlaces que van junto al botón (la portada agrega «Ver la vitrina»). */
export function VitrinaVacia({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-gray-200 p-10 sm:p-12 text-center">
      <p className="text-gray-600 mb-5">
        Pronto verá aquí los primeros inmuebles. ¿Tiene uno? Publíquelo gratis.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <Link
          href="/registro"
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-primary-700 rounded-xl hover:bg-primary-800 transition-colors"
        >
          Registre su inmueble <IconArrowRight size={16} />
        </Link>
        {children}
      </div>
    </div>
  )
}
