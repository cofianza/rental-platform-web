/**
 * Sección "Vitrina Preview" para la landing — muestra 3 inmuebles
 * destacados con CTA "Me interesa" -> /registro/solicitante.
 * (Mario 12-may-2026, mockup 01_COFIANZA_Landing.html)
 */

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getPublicProperties, type PublicProperty } from '@/services/publicPropertiesService'
import { formatCurrency } from '@/lib/constants'

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
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <div className="text-xs font-bold tracking-[3px] uppercase text-primary-600 mb-3">
              Inmuebles disponibles
            </div>
            <h2 className="font-black text-3xl sm:text-4xl md:text-5xl tracking-tight leading-tight mb-3">
              Encuentra tu próximo hogar
            </h2>
            <p className="text-base md:text-lg text-gray-500 max-w-xl leading-relaxed">
              Inmuebles publicados por propietarios e inmobiliarias afiliadas a Cofianza.
              Marca "Me interesa" y avanzamos en segundos.
            </p>
          </div>
          <Link
            href="/vitrina"
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors shrink-0"
          >
            Ver todos los inmuebles →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-100" />
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
              Solicita tu fiador →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {items.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function PropertyCard({ property }: { property: PublicProperty }) {
  const foto = property.fotos?.[0]?.url || property.foto_fachada_url
  return (
    <Link
      href={`/inmueble/${property.id}`}
      className="group rounded-2xl border border-gray-100 overflow-hidden bg-white hover:shadow-xl hover:-translate-y-1 transition-all"
    >
      <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto}
            alt={property.descripcion ?? property.tipo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl">🏠</div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary-50 text-primary-700 uppercase tracking-wide">
            {property.tipo}
          </span>
          <span className="text-xs text-gray-400">Estrato {property.estrato}</span>
        </div>
        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1 truncate">
          {property.barrio || property.ciudad}
        </h3>
        <p className="text-xs text-gray-500 mb-3 truncate">
          {property.habitaciones} hab · {property.banos} baño{property.banos === 1 ? '' : 's'}
          {property.area_m2 ? ` · ${property.area_m2} m²` : ''}
        </p>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Canon</div>
            <div className="text-xl font-extrabold text-gray-900 leading-none">
              {formatCurrency(property.valor_arriendo)}
            </div>
          </div>
          <span className="text-sm font-semibold text-coral-600 group-hover:underline">
            Me interesa →
          </span>
        </div>
      </div>
    </Link>
  )
}
