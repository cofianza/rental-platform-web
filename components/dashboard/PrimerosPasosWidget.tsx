/**
 * PrimerosPasosWidget — guía de primer uso para propietario e inmobiliaria.
 *
 * Un usuario recién registrado aterrizaba en "Todo al día. No tienes acciones
 * pendientes" con saldo 0 y sin estudios: nada le decía que primero hay que
 * completar los datos para contrato (ese bloqueo solo aparecía al intentar
 * crear un inmueble) ni cuál es el orden del flujo.
 *
 * Se auto-oculta cuando el perfil está completo y ya hay al menos una
 * propiedad: a partir de ahí el widget de acciones pendientes es el que manda.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { IconCheck, IconChevronRight } from '@/components/icons'
import { usePerfilCompletitud } from '@/hooks/usePerfilCompletitud'
import { dashboardService } from '@/services/dashboardService'

export function PrimerosPasosWidget() {
  const { completitud, loading, noAplica } = usePerfilCompletitud()
  const [propiedades, setPropiedades] = useState<number | null>(null)

  useEffect(() => {
    let vivo = true
    dashboardService
      .getPortfolioStats()
      .then((s) => {
        if (vivo) setPropiedades(s.propiedades_activas)
      })
      .catch(() => {
        if (vivo) setPropiedades(null)
      })
    return () => {
      vivo = false
    }
  }, [])

  if (loading || noAplica || propiedades === null) return null
  const perfilCompleto = completitud?.completo ?? false
  const tienePropiedad = propiedades > 0
  if (perfilCompleto && tienePropiedad) return null

  const faltantes = (completitud?.faltantes ?? []).map((f) => f.etiqueta).join(', ')

  const pasos = [
    {
      titulo: 'Completa tus datos para contrato',
      detalle: perfilCompleto
        ? 'Listo'
        : faltantes
          ? `Faltan: ${faltantes}`
          : 'Los usamos al generar el contrato de arrendamiento',
      href: '/configuracion/datos-contrato',
      hecho: perfilCompleto,
      bloqueado: false,
    },
    {
      titulo: 'Agrega tu primera propiedad',
      detalle: tienePropiedad ? 'Listo' : perfilCompleto ? 'Dirección, canon y fotos' : 'Primero el paso 1',
      href: '/inmuebles/nuevo',
      hecho: tienePropiedad,
      bloqueado: !perfilCompleto,
    },
    {
      titulo: 'Crea tu primer estudio',
      detalle: tienePropiedad ? 'Evalúa a un candidato en minutos' : 'Primero el paso 2',
      href: '/expedientes/nuevo',
      hecho: false,
      bloqueado: !tienePropiedad,
    },
  ]

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-primary-800">Primeros pasos</h2>
      <p className="mt-0.5 text-sm text-gray-600">Tres pasos para dejar tu cuenta lista.</p>
      <ol className="mt-3 space-y-2">
        {pasos.map((p, i) => {
          const contenido = (
            <>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  p.hecho ? 'bg-primary-600 text-white' : 'border border-gray-300 bg-white text-gray-600'
                }`}
              >
                {p.hecho ? <IconCheck size={16} aria-hidden /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${p.hecho ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                  {p.titulo}
                </span>
                <span className="block text-xs text-gray-500">{p.detalle}</span>
              </span>
              {!p.hecho && !p.bloqueado && <IconChevronRight size={18} className="shrink-0 text-gray-400" />}
            </>
          )
          return (
            <li key={p.titulo}>
              {p.hecho || p.bloqueado ? (
                <div className="flex items-center gap-3 rounded-lg bg-white/70 px-3 py-2.5 opacity-70">{contenido}</div>
              ) : (
                <Link
                  href={p.href}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 hover:border-primary-400"
                >
                  {contenido}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
