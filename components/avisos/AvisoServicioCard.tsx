/**
 * Un aviso de servicio como banner. Lo usan el panel, las páginas públicas por
 * enlace y la vista previa del administrador, para que se vea igual en todas.
 *
 * Reporte de la Oficina Virtual (25-nov), punto 12: en el panel (`compacto`)
 * ocupa una línea —ícono, título y «Ver más»— y el mensaje se abre con «Ver
 * más», también en escritorio (antes eran cinco líneas arriba de cada sección).
 */

'use client'

import { useId, useState, type ComponentType, type ReactNode } from 'react'
import {
  IconActivity,
  IconBarChart3,
  IconCreditCard,
  IconInfo,
  IconMail,
  IconPencil,
  IconSettings,
  IconUserCheck,
  IconWhatsapp,
  IconX,
  type IconProps,
} from '@/components/icons'
import { etiquetaNivel } from '@/lib/avisosServicio'
import { formatDateTime } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { NivelAviso, ServicioAviso } from '@/types/avisosServicio'

export const ICONO_SERVICIO: Record<ServicioAviso, ComponentType<IconProps>> = {
  whatsapp: IconWhatsapp,
  correo: IconMail,
  pagos: IconCreditCard,
  firma: IconPencil,
  evaluacion: IconBarChart3,
  identidad: IconUserCheck,
  plataforma: IconActivity,
  mantenimiento: IconSettings,
  otro: IconInfo,
}

const ESTILO: Record<NivelAviso, { caja: string; icono: string; etiqueta: string }> = {
  caido: {
    caja: 'border-red-300 bg-red-50 text-red-900',
    icono: 'bg-red-100 text-red-700',
    etiqueta: 'bg-red-100 text-red-800',
  },
  parcial: {
    caja: 'border-amber-300 bg-amber-50 text-amber-900',
    icono: 'bg-amber-100 text-amber-700',
    etiqueta: 'bg-amber-100 text-amber-800',
  },
  informativo: {
    caja: 'border-sky-300 bg-sky-50 text-sky-900',
    icono: 'bg-sky-100 text-sky-700',
    etiqueta: 'bg-sky-100 text-sky-800',
  },
}

interface Props {
  servicio: ServicioAviso
  nivel: NivelAviso
  titulo: string
  mensaje: string
  actualizadoEn?: string
  /** Línea extra bajo el mensaje (p. ej. a quién se le muestra, para el equipo de Cofianza). */
  pie?: ReactNode
  onOcultar?: () => void
  /** Vista previa del formulario: sin role, para no anunciar cada tecla. */
  vistaPrevia?: boolean
  /** Una línea con «Ver más» para el mensaje (el banner del panel). */
  compacto?: boolean
  className?: string
}

export function AvisoServicioCard({ servicio, nivel, titulo, mensaje, actualizadoEn, pie, onOcultar, vistaPrevia, compacto, className }: Props) {
  const Icono = ICONO_SERVICIO[servicio] ?? IconInfo
  const estilo = ESTILO[nivel] ?? ESTILO.parcial
  // En el celular un mensaje largo ocupaba un tercio de la pantalla en cada
  // página: se recorta a 3 líneas con «Ver más». Desde sm se ve completo.
  const [expandido, setExpandido] = useState(false)
  const idDetalle = useId()
  const largo = mensaje.length > 140
  const cerrar = onOcultar && (
    <button
      type="button"
      onClick={onOcultar}
      aria-label={`Cerrar el aviso «${titulo}»`}
      title="Cerrar este aviso"
      className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg opacity-70 hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
    >
      <IconX size={18} />
    </button>
  )

  if (compacto) {
    return (
      <div
        // «Fuera de servicio» se anuncia de una vez; lo demás, sin interrumpir. La vista previa, sin role.
        role={vistaPrevia ? undefined : nivel === 'caido' ? 'alert' : 'status'}
        className={cn('rounded-xl border text-sm', estilo.caja, className)}
      >
        <div className="flex items-center gap-2 py-0.5 pr-1 pl-2 sm:gap-3 sm:pl-3">
          <span className={cn('shrink-0 rounded-lg p-1.5', estilo.icono)} aria-hidden="true">
            <Icono size={16} />
          </span>
          <p className="min-w-0 flex-1 truncate" title={titulo}>
            <strong className="font-semibold">{titulo || 'Título del aviso'}</strong>
            <span className="sr-only"> ({etiquetaNivel(nivel)})</span>
          </p>
          <span className={cn('hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline-flex', estilo.etiqueta)} aria-hidden="true">
            {etiquetaNivel(nivel)}
          </span>
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            aria-expanded={expandido}
            aria-controls={idDetalle}
            className="inline-flex min-h-10 shrink-0 items-center rounded-lg px-1.5 text-xs font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            {expandido ? 'Ver menos' : 'Ver más'}
            <span className="sr-only"> del aviso «{titulo}»</span>
          </button>
          {cerrar}
        </div>
        <div id={idDetalle} hidden={!expandido} className="border-t border-current/10 px-3 pt-2 pb-3 sm:pl-12">
          {/* El título completo, por si en la línea quedó cortado. */}
          <p className="font-semibold break-words">{titulo || 'Título del aviso'}</p>
          <p className="mt-1 whitespace-pre-line break-words">{mensaje || 'Mensaje del aviso.'}</p>
          {(actualizadoEn || pie) && (
            <p className="mt-1.5 text-xs opacity-80">
              {actualizadoEn && <>Actualizado: {formatDateTime(actualizadoEn)}</>}
              {actualizadoEn && pie && ' · '}
              {pie}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      // «Fuera de servicio» se anuncia de una vez; lo demás, sin interrumpir.
      role={vistaPrevia ? undefined : nivel === 'caido' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-xl border p-3 text-sm sm:p-4', estilo.caja, className)}
    >
      <span className={cn('shrink-0 rounded-lg p-2', estilo.icono)} aria-hidden="true">
        <Icono size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <strong className="min-w-0 break-words font-semibold">{titulo || 'Título del aviso'}</strong>
          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', estilo.etiqueta)}>
            {etiquetaNivel(nivel)}
          </span>
        </p>
        <p className={cn('mt-1 whitespace-pre-line break-words', largo && !expandido && 'line-clamp-3 sm:line-clamp-none')}>
          {mensaje || 'Mensaje del aviso.'}
        </p>
        {largo && (
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            aria-expanded={expandido}
            className="inline-flex min-h-10 items-center text-xs font-semibold underline underline-offset-2 sm:hidden"
          >
            {expandido ? 'Ver menos' : 'Ver más'}
          </button>
        )}
        {(actualizadoEn || pie) && (
          <p className="mt-1.5 text-xs opacity-80">
            {actualizadoEn && <>Actualizado: {formatDateTime(actualizadoEn)}</>}
            {actualizadoEn && pie && ' · '}
            {pie}
          </p>
        )}
      </div>
      {onOcultar && (
        <button
          type="button"
          onClick={onOcultar}
          aria-label={`Cerrar el aviso «${titulo}»`}
          title="Cerrar este aviso"
          className="-m-1 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg opacity-70 hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <IconX size={18} />
        </button>
      )}
    </div>
  )
}
