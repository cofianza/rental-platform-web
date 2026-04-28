/**
 * Banner que se muestra al propietario/inmobiliaria cuando su perfil
 * de arrendador está incompleto. Bloquea la creacion de inmuebles
 * porque el contrato saldria con campos vacios.
 *
 * Recibe el resultado de usePerfilCompletitud(). Renderiza null si
 * ya esta completo o si no aplica (admin/operador).
 */

'use client'

import Link from 'next/link'
import { IconAlertTriangle, IconArrowRight } from '@/components/icons'
import type { IPerfilCompletitud } from '@/services/perfilArrendadorService'

interface Props {
  completitud: IPerfilCompletitud | null
  /** Si true, se muestra mas compacto (en card en vez de banner full). */
  compact?: boolean
}

export function PerfilIncompletoBanner({ completitud, compact = false }: Props) {
  if (!completitud || completitud.completo) return null

  return (
    <div
      className={`flex items-start gap-3 ${
        compact ? 'p-4' : 'p-5'
      } bg-amber-50 border border-amber-200 rounded-lg`}
    >
      <IconAlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">
          Completá tus Datos para contrato antes de publicar inmuebles
        </p>
        <p className="text-xs text-amber-800 mt-1">
          Sin estos datos los contratos de arrendamiento que se generen para tus inmuebles van a salir con campos en blanco.
        </p>
        {completitud.faltantes.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-amber-900">Te faltan:</p>
            <ul className="text-xs text-amber-800 mt-1 list-disc list-inside">
              {completitud.faltantes.slice(0, 6).map((f) => (
                <li key={f.campo}>{f.etiqueta}</li>
              ))}
              {completitud.faltantes.length > 6 && (
                <li className="italic">y {completitud.faltantes.length - 6} más…</li>
              )}
            </ul>
          </div>
        )}
        <Link
          href="/configuracion/datos-contrato"
          className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-700 transition-colors"
        >
          Completar ahora
          <IconArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
