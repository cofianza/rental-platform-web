/**
 * PropertyDetailClient — HP-367
 * Client component: gallery, lightbox, CTA, map, similar properties
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lightbox } from '@/components/ui/Lightbox'
import {
  IconHome, IconBed, IconBath, IconCar, IconRuler, IconMapPin,
  IconChevronLeft, IconChevronRight, IconCalendar,
} from '@/components/icons'
import { formatCurrency, formatDate } from '@/lib/constants'
import { MeInteresaCTA } from '@/components/vitrina/MeInteresaCTA'
import type { PublicProperty } from '@/services/publicPropertiesService'

const TIPO_LABELS: Record<string, string> = {
  apartamento: 'Apartamento', casa: 'Casa', oficina: 'Oficina', local: 'Local', bodega: 'Bodega',
}

interface Props {
  property: PublicProperty
  similares: PublicProperty[]
}

export function PropertyDetailClient({ property, similares }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [selectedPhoto, setSelectedPhoto] = useState(0)

  // El backend ya ordena: es_fachada DESC, orden ASC (ver
  // public-properties.service.ts). Antes intentabamos reordenar aqui
  // comparando URLs con foto_fachada_url, pero las signed URLs tienen
  // timestamps distintos y nunca matcheaban → la fachada caia al final.
  const fotos = property.fotos ?? []
  const hasPhotos = fotos.length > 0
  const mainImage = hasPhotos ? fotos[selectedPhoto]?.url : property.foto_fachada_url
  const lightboxImages = hasPhotos
    ? fotos.map((f) => ({ url: f.url, descripcion: f.descripcion }))
    : property.foto_fachada_url
      ? [{ url: property.foto_fachada_url, descripcion: null }]
      : []

  const tipoLabel = TIPO_LABELS[property.tipo] || property.tipo

  const handleImageClick = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  // Map embed URL (approximate location — barrio + ciudad only)
  const mapQuery = encodeURIComponent(`${property.barrio || ''}, ${property.ciudad}, Colombia`)

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: gallery + details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Main image */}
            <div
              className="aspect-[16/9] bg-gray-100 relative cursor-pointer overflow-hidden"
              onClick={() => lightboxImages.length > 0 && handleImageClick(selectedPhoto)}
            >
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={`${tipoLabel} en ${property.ciudad}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <IconHome size={64} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Sin fotos disponibles</p>
                </div>
              )}
              {hasPhotos && (
                <span className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 text-white text-xs rounded-full">
                  {selectedPhoto + 1} / {fotos.length}
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {fotos.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {fotos.map((foto, idx) => (
                  <button
                    key={foto.id}
                    onClick={() => setSelectedPhoto(idx)}
                    className={`shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      idx === selectedPhoto ? 'border-primary-600' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={foto.url}
                      alt={foto.descripcion || `Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          {property.descripcion && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Descripcion</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                {property.descripcion}
              </p>
            </div>
          )}

          {/* Map (approximate location) */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Ubicacion aproximada</h2>
            <p className="text-xs text-gray-400 mb-3">
              Se muestra la zona general del inmueble. La direccion exacta se comparte al avanzar en el proceso.
            </p>
            <div className="aspect-[16/9] rounded-lg overflow-hidden bg-gray-100">
              <iframe
                title="Ubicacion aproximada del inmueble"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              />
            </div>
          </div>

          {/* Similar properties */}
          {similares.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Inmuebles similares</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {similares.map((sim) => (
                  <SimilarCard key={sim.id} property={sim} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: info + CTA (sticky) */}
        <div className="space-y-6">
          <div className="lg:sticky lg:top-20 space-y-6">
            {/* Price card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <span className="inline-block px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full mb-3">
                {tipoLabel}
              </span>
              <p className="text-2xl font-bold text-primary-700 mb-0.5">
                {formatCurrency(property.valor_arriendo)}
                <span className="text-sm font-normal text-gray-500"> /mes</span>
              </p>
              {property.administracion > 0 && (
                <p className="text-sm text-gray-500 mb-4">
                  Administracion: {formatCurrency(property.administracion)}
                </p>
              )}

              {/* Location */}
              <div className="flex items-start gap-2 mb-4">
                <IconMapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {property.barrio ? `${property.barrio}, ` : ''}{property.ciudad}
                  </p>
                  <p className="text-xs text-gray-500">Estrato {property.estrato}</p>
                </div>
              </div>

              {/* Specs grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {property.area_m2 && (
                  <SpecItem icon={IconRuler} label="Area" value={`${property.area_m2} m²`} />
                )}
                <SpecItem icon={IconBed} label="Habitaciones" value={String(property.habitaciones)} />
                <SpecItem icon={IconBath} label="Banos" value={String(property.banos)} />
                <SpecItem icon={IconCar} label="Parqueadero" value={property.parqueadero ? 'Si' : 'No'} />
              </div>

              {/* Published date */}
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
                <IconCalendar size={14} />
                Publicado: {formatDate(property.created_at)}
              </div>

              {/* CTA Button — 4 ramas según rol/sesión, ver MeInteresaCTA */}
              <MeInteresaCTA inmuebleId={property.id} variant="primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 lg:hidden z-40">
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <div>
            <p className="text-lg font-bold text-primary-700">{formatCurrency(property.valor_arriendo)}<span className="text-xs font-normal text-gray-500">/mes</span></p>
            <p className="text-xs text-gray-500">{property.barrio ? `${property.barrio}, ` : ''}{property.ciudad}</p>
          </div>
          <MeInteresaCTA inmuebleId={property.id} variant="sticky" />
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImages.length > 0 && (
        <Lightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onPrevious={() => setLightboxIndex((i) => Math.max(0, i - 1))}
          onNext={() => setLightboxIndex((i) => Math.min(lightboxImages.length - 1, i + 1))}
        />
      )}

      {/* Bottom spacer for mobile sticky CTA */}
      <div className="h-20 lg:hidden" />
    </>
  )
}

// ── Spec Item ───────────────────────────────

function SpecItem({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ size: number; className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
      <Icon size={16} className="text-gray-400 shrink-0" />
      <div>
        <p className="text-[10px] text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

// ── Similar Property Card ───────────────────

function SimilarCard({ property }: { property: PublicProperty }) {
  const tipoLabel = TIPO_LABELS[property.tipo] || property.tipo
  return (
    <Link
      href={`/inmueble/${property.id}`}
      className="flex gap-3 bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="w-24 h-20 rounded-lg bg-gray-100 overflow-hidden shrink-0">
        {property.foto_fachada_url ? (
          <img src={property.foto_fachada_url} alt={tipoLabel} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <IconHome size={24} className="text-gray-300" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-primary-700">{formatCurrency(property.valor_arriendo)}<span className="text-[10px] font-normal text-gray-500">/mes</span></p>
        <p className="text-xs text-gray-700 truncate">{property.barrio ? `${property.barrio}, ` : ''}{property.ciudad}</p>
        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
          <span>{tipoLabel}</span>
          {property.area_m2 && <span>{property.area_m2}m²</span>}
          <span>{property.habitaciones} hab</span>
        </div>
      </div>
    </Link>
  )
}
