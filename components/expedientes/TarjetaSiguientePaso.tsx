/**
 * Marco común de las tarjetas del Resumen que dicen en qué está el estudio y
 * qué sigue: un encabezado con el color del estado (qué pasa) y un cuerpo
 * blanco (qué se puede hacer). Reemplaza las cajas de fondo de color con
 * recuadros anidados: el color queda en el encabezado y el contenido respira.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type TonoPaso = 'revision' | 'accion' | 'alerta' | 'neutro'

const TONOS: Record<TonoPaso, { marco: string; banda: string; icono: string; titulo: string; texto: string }> = {
  revision: {
    marco: 'border-amber-200',
    banda: 'bg-amber-50 border-amber-200',
    icono: 'text-amber-700 ring-amber-200',
    titulo: 'text-gray-900',
    texto: 'text-amber-950/80',
  },
  accion: {
    marco: 'border-primary-200',
    banda: 'bg-primary-50 border-primary-200',
    icono: 'text-primary-700 ring-primary-200',
    titulo: 'text-gray-900',
    texto: 'text-primary-950/80',
  },
  alerta: {
    marco: 'border-red-200',
    banda: 'bg-red-50 border-red-200',
    icono: 'text-red-700 ring-red-200',
    titulo: 'text-red-900',
    texto: 'text-red-900/85',
  },
  neutro: {
    marco: 'border-gray-200',
    banda: 'bg-gray-50 border-gray-200',
    icono: 'text-gray-600 ring-gray-200',
    titulo: 'text-gray-900',
    texto: 'text-gray-700',
  },
}

export function TarjetaSiguientePaso({
  tono,
  icono,
  titulo,
  descripcion,
  children,
  pie,
  className,
  id,
}: {
  tono: TonoPaso
  icono: ReactNode
  /** El título ya trae su ayuda (InfoTip) si la tiene. */
  titulo: ReactNode
  /** Una o dos frases: en qué está el estudio. */
  descripcion?: ReactNode
  /** Lo que se puede hacer. Sin cuerpo, la tarjeta es solo el encabezado. */
  children?: ReactNode
  /** Nota final (qué pasa después), en segundo plano. */
  pie?: ReactNode
  className?: string
  id?: string
}) {
  const t = TONOS[tono]
  return (
    <section id={id} tabIndex={id ? -1 : undefined} className={cn('overflow-hidden rounded-xl border bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500', t.marco, className)}>
      <header className={cn('flex items-start gap-3 px-4 py-4 sm:px-5', t.banda, (children || pie) && 'border-b')}>
        <span
          aria-hidden="true"
          className={cn('hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white ring-1 sm:flex', t.icono)}
        >
          {icono}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={cn('text-base font-semibold leading-snug', t.titulo)}>{titulo}</h3>
          {descripcion && <div className={cn('mt-1 text-sm leading-relaxed', t.texto)}>{descripcion}</div>}
        </div>
      </header>
      {children && <div className="divide-y divide-gray-100">{children}</div>}
      {pie && <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600 sm:px-5">{pie}</div>}
    </section>
  )
}

/**
 * Una parte del cuerpo: quién actúa (el título lo nombra) y qué puede hacer.
 * `propio`: le toca a quien mira; se marca como en la lista («Su turno»): coral con flecha.
 */
export function SeccionPaso({
  titulo,
  propio,
  icono,
  children,
}: {
  titulo: ReactNode
  propio?: boolean
  icono?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <h4
        className={cn(
          'flex items-start gap-1.5 text-sm font-semibold leading-snug',
          propio ? 'text-coral-800' : 'text-gray-900',
        )}
      >
        {icono && <span className="mt-0.5 shrink-0">{icono}</span>}
        <span>{titulo}</span>
      </h4>
      <div className="mt-1.5 space-y-3 text-sm leading-relaxed text-gray-700">{children}</div>
    </div>
  )
}
