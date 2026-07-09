/**
 * Sección "Vitrina Preview" para la landing — muestra 3 inmuebles
 * destacados. Diseño alineado al mockup htmls/01_*: badges sobre la imagen,
 * specs con estrato, canon mensual y botón verde centrado "Ver todos".
 */

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getPublicProperties, type PublicProperty } from '@/services/publicPropertiesService'
import { formatCurrency } from '@/lib/constants'

const TIPO_LABEL: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  oficina: 'Oficina',
  local: 'Local',
  bodega: 'Bodega',
  apartaestudio: 'Apartaestudio',
  casa_finca: 'Casa Finca',
  finca: 'Finca',
  lote: 'Lote',
  parqueadero: 'Parqueadero',
}

const TIPO_EMOJI: Record<string, string> = {
  apartamento: '🏢',
  casa: '🏠',
  oficina: '🏢',
  local: '🏬',
  bodega: '🏭',
  apartaestudio: '🏢',
  casa_finca: '🏡',
  finca: '🌾',
  lote: '🏞️',
  parqueadero: '🅿️',
}

// "Nuevo" = publicado en los últimos 21 días.
const NUEVO_DIAS = 21
function esNuevo(createdAt: string): boolean {
  const t = new Date(createdAt).getTime()
  if (Number.isNaN(t)) return false
  return (Date.now() - t) / 86_400_000 <= NUEVO_DIAS
}

export function VitrinaPreview() {
  const [items, setItems] = useState<PublicProperty[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicProperties({ limit: 3, sortBy: 'created_at', sortOrder: 'desc' })
      .then((res) => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section id="vitrina" className="bg-white py-24 md:py-32 px-5 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-xs font-bold tracking-[3px] uppercase text-primary-600 mb-3">
          Inmuebles disponibles
        </div>
        <h2 className="font-black text-3xl sm:text-4xl md:text-5xl tracking-tight leading-tight mb-4">
          Encuentra tu próximo hogar.
          <br />
          Sin codeudor.
        </h2>
        <p className="text-base md:text-lg text-gray-500 max-w-xl leading-relaxed mb-12">
          Inmuebles publicados por propietarios e inmobiliarias aliadas. Te interesa uno, solicitas
          visita, y si te gusta, Cofianza firma como tu fiador.
        </p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
                <div className="aspect-[16/10] bg-gray-100" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-2/3 bg-gray-100 rounded" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded" />
                  <div className="h-6 w-1/3 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">Aún no hay inmuebles publicados en la vitrina.</p>
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors"
            >
              Registrarme →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {items.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
            <div className="flex justify-center mt-12">
              <Link
                href="/vitrina"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-2xl shadow-lg shadow-primary-600/25 transition-all hover:-translate-y-px"
              >
                Ver todos los inmuebles →
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function PropertyCard({ property }: { property: PublicProperty }) {
  const foto = property.fotos?.[0]?.url || property.foto_fachada_url
  const tipoLabel = TIPO_LABEL[property.tipo] || property.tipo
  const emoji = TIPO_EMOJI[property.tipo] || '🏠'
  const titulo = `${tipoLabel} ${property.barrio || property.ciudad}`
  const ubicacion = property.barrio ? `${property.ciudad}, ${property.barrio}` : property.ciudad
  const nuevo = esNuevo(property.created_at)

  return (
    <Link
      href={`/inmueble/${property.id}`}
      className="group rounded-2xl border border-gray-200 overflow-hidden bg-white hover:border-primary-300 hover:shadow-xl hover:-translate-y-1 transition-all"
    >
      {/* Imagen / placeholder con badges sobrepuestos */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary-50 to-coral-50">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto}
            alt={titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">{emoji}</div>
        )}

        {/* Badge tipo (arriba-izquierda) */}
        <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/95 text-ink-900 uppercase tracking-wide shadow-sm">
          {tipoLabel}
        </span>

        {/* Badge NUEVO (arriba-derecha) */}
        {nuevo && (
          <span className="absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-coral-500 text-white uppercase tracking-wide shadow-sm">
            Nuevo
          </span>
        )}
      </div>

      {/* Contenido */}
      <div className="p-5">
        {/* Título + ubicación a la izquierda; logo de la inmobiliaria a la
            derecha (solo el logo, en su columna). */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-bold text-ink-900 text-base leading-tight mb-1.5 truncate">{titulo}</h3>
            <p className="flex items-center gap-1 text-xs text-gray-500 truncate">
              <span aria-hidden>📍</span> {ubicacion}
            </p>
          </div>
          {property.inmobiliaria?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={property.inmobiliaria.logo_url}
              alt={property.inmobiliaria.nombre || 'Inmobiliaria'}
              className="h-14 w-auto max-w-[40%] object-contain shrink-0"
            />
          )}
        </div>

        {/* Specs */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500 border-b border-gray-100 pb-3.5 mb-3.5">
          <span><strong className="text-gray-700">{property.habitaciones}</strong> hab</span>
          <span className="text-gray-300">·</span>
          <span><strong className="text-gray-700">{property.banos}</strong> baño{property.banos === 1 ? '' : 's'}</span>
          {property.area_m2 ? (
            <>
              <span className="text-gray-300">·</span>
              <span><strong className="text-gray-700">{property.area_m2}</strong> m²</span>
            </>
          ) : null}
          <span className="text-gray-300">·</span>
          <span>Estrato <strong className="text-gray-700">{property.estrato}</strong></span>
        </div>

        {/* Canon + CTA */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xl font-extrabold text-ink-900 leading-none">
              {formatCurrency(property.valor_arriendo)}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">Canon mensual</div>
          </div>
          <span className="text-sm font-semibold text-primary-600 group-hover:gap-2 inline-flex items-center gap-1 transition-all">
            Me interesa →
          </span>
        </div>
      </div>
    </Link>
  )
}
