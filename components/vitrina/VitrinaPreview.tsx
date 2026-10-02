/**
 * Sección "Vitrina Preview" para la landing — muestra los 3 inmuebles más
 * recientes. Badges sobre la imagen, specs con estrato, canon mensual, botón
 * "Me interesa" por tarjeta (sin sesión abre el formulario corto de interés;
 * con sesión lleva al detalle, donde están las demás ramas) y "Ver todos".
 */

'use client'

import { IconBuilding2, IconHome, IconMapPin, IconCar, IconArrowRight } from '@/components/icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getPublicProperties, type PublicProperty } from '@/services/publicPropertiesService'
import { formatCurrency } from '@/lib/constants'
import Image from 'next/image'
import { esStorageSupabase } from '@/lib/imagenes'
import { useAuthStore } from '@/stores/auth.store'
import { LeadInteresModal, resumenInmueble } from './LeadInteresModal'
import { VitrinaVacia } from './VitrinaVacia'

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

// Iconos de la libreria (regla de la casa: nada de emojis, que cada telefono
// pinta distinto y el lector de pantalla lee como "edificio de oficinas").
const TIPO_ICONO: Record<string, typeof IconHome> = {
  apartamento: IconBuilding2,
  casa: IconHome,
  oficina: IconBuilding2,
  local: IconBuilding2,
  bodega: IconBuilding2,
  apartaestudio: IconBuilding2,
  casa_finca: IconHome,
  finca: IconMapPin,
  lote: IconMapPin,
  parqueadero: IconCar,
}

// "Nuevo" = publicado en los últimos 21 días.
const NUEVO_DIAS = 21
function esNuevo(createdAt: string): boolean {
  const t = new Date(createdAt).getTime()
  if (Number.isNaN(t)) return false
  return (Date.now() - t) / 86_400_000 <= NUEVO_DIAS
}

// Ancho fijo por tarjeta para que con 1 o 2 inmuebles queden centradas en vez
// de estiradas o a la izquierda: dos por fila en tableta, tres desde 1024 px
// (con tres en 768 px el botón «Me interesa» no cabía y quedaba cortado).
const CARD_WIDTH = 'w-full sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]'

export function VitrinaPreview() {
  const [items, setItems] = useState<PublicProperty[]>([])
  const [loading, setLoading] = useState(true)
  // Inmueble sobre el que el visitante sin cuenta dijo «Me interesa».
  const [lead, setLead] = useState<{ id: string; resumen: string } | null>(null)

  useEffect(() => {
    getPublicProperties({ limit: 3, sortBy: 'created_at', sortOrder: 'desc' })
      .then((res) => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section id="vitrina" className="bg-white py-16 md:py-24 px-5 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-xs font-bold tracking-[3px] uppercase text-primary-600 mb-3">
          Inmuebles disponibles
        </div>
        <h2 className="font-black text-[32px] sm:text-5xl tracking-[-0.04em] leading-tight mb-4">
          Encuentre su próximo hogar.
          <br />
          Sin codeudor.
        </h2>
        <p className="text-base md:text-lg text-gray-500 max-w-xl leading-relaxed mb-12">
          Inmuebles publicados por propietarios e inmobiliarias aliadas. Si le interesa uno, solicite
          visita, y si le gusta, Cofianza firma como su fiador.
        </p>

        {loading ? (
          <div className="flex flex-wrap justify-center gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`${CARD_WIDTH} rounded-3xl border border-gray-200 overflow-hidden animate-pulse`}>
                <div className="h-[180px] bg-gray-100" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-2/3 bg-gray-100 rounded" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded" />
                  <div className="h-6 w-1/3 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <VitrinaVacia>
            <Link
              href="/vitrina"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
            >
              Ver la vitrina <IconArrowRight size={14} />
            </Link>
          </VitrinaVacia>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-4">
              {items.map((p) => (
                <PropertyCard key={p.id} property={p} onLead={(resumen) => setLead({ id: p.id, resumen })} />
              ))}
            </div>
            <div className="flex justify-center mt-10">
              <Link
                href="/vitrina"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-primary-700 hover:bg-primary-800 rounded-2xl shadow-lg shadow-primary-600/25 transition-all hover:-translate-y-px"
              >
                Ver todos los inmuebles <IconArrowRight size={18} />
              </Link>
            </div>
          </>
        )}
      </div>

      {lead && (
        <LeadInteresModal
          inmuebleId={lead.id}
          resumen={lead.resumen}
          isOpen
          onClose={() => setLead(null)}
        />
      )}
    </section>
  )
}

function PropertyCard({ property, onLead }: { property: PublicProperty; onLead: (resumen: string) => void }) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const foto = property.fotos?.[0]?.url || property.foto_fachada_url
  const tipoLabel = TIPO_LABEL[property.tipo] || property.tipo
  const Icono = TIPO_ICONO[property.tipo] || IconHome
  const titulo = `${tipoLabel} ${property.barrio || property.ciudad}`
  const ubicacion = property.barrio ? `${property.ciudad}, ${property.barrio}` : property.ciudad
  const nuevo = esNuevo(property.created_at)
  const href = `/inmueble/${property.id}`
  const canon = formatCurrency(property.valor_arriendo)

  return (
    <div
      className={`${CARD_WIDTH} group rounded-3xl border border-gray-200 overflow-hidden bg-white hover:border-primary-600 hover:shadow-xl hover:shadow-primary-600/10 hover:-translate-y-1 transition-all`}
    >
      {/* Imagen / placeholder con badges sobrepuestos */}
      <Link
        href={href}
        aria-label={`Ver ${titulo}`}
        className="relative block h-[180px] overflow-hidden bg-gradient-to-br from-primary-50 to-blue-100"
      >
        {foto ? (
          <Image
            src={foto}
            alt={titulo}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized={!esStorageSupabase(foto)}
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icono size={48} className="text-primary-300" />
          </div>
        )}

        {/* Badge tipo (arriba-izquierda) */}
        <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-white text-ink-900 uppercase tracking-wide shadow-sm">
          {tipoLabel}
        </span>

        {/* Badge NUEVO (arriba-derecha) */}
        {nuevo && (
          <span className="absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-coral-500 text-ink-900 uppercase tracking-wide shadow-sm">
            Nuevo
          </span>
        )}
      </Link>

      {/* Contenido */}
      <div className="p-5">
        {/* Título + ubicación a la izquierda; logo de la inmobiliaria a la
            derecha (solo el logo, en su columna). */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-extrabold text-ink-900 text-base leading-tight mb-1 truncate">
              <Link href={href} className="hover:text-primary-700 transition-colors">{titulo}</Link>
            </h3>
            <p className="flex items-center gap-1 text-[13px] text-gray-500 truncate">
              <IconMapPin size={13} aria-hidden className="shrink-0" /> {ubicacion}
            </p>
          </div>
          {property.inmobiliaria?.logo_url && (
            <Image
              src={property.inmobiliaria.logo_url}
              alt={property.inmobiliaria.nombre || 'Inmobiliaria'}
              width={0}
              height={0}
              sizes="160px"
              unoptimized={!esStorageSupabase(property.inmobiliaria.logo_url)}
              className="h-14 w-auto max-w-[40%] object-contain shrink-0"
            />
          )}
        </div>

        {/* Specs */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 mb-4">
          <span><strong className="text-ink-900">{property.habitaciones}</strong> hab</span>
          <span><strong className="text-ink-900">{property.banos}</strong> baño{property.banos === 1 ? '' : 's'}</span>
          {property.area_m2 ? (
            <span><strong className="text-ink-900">{property.area_m2}</strong> m²</span>
          ) : null}
          <span>Estrato <strong className="text-ink-900">{property.estrato}</strong></span>
        </div>

        {/* Canon + CTA */}
        <div className="flex items-center justify-between gap-3 pt-3.5 border-t border-gray-200">
          <div>
            <div className="text-xl font-black text-primary-700 leading-none tracking-tight">{canon}</div>
            <div className="text-[10px] text-gray-500 font-medium mt-1">Canon mensual</div>
          </div>
          <button
            type="button"
            onClick={() =>
              isAuthenticated ? router.push(href) : onLead(resumenInmueble(tipoLabel, property))
            }
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 text-xs font-bold hover:bg-primary-700 hover:text-white transition-colors shrink-0"
          >
            Me interesa <IconArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
