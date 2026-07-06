/**
 * Detalle publico del inmueble — HP-367
 * Galeria, especificaciones, mapa aproximado, CTA, inmuebles similares
 * SSR con metadata dinamica para SEO
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PublicNavbar } from '@/components/vitrina/PublicNavbar'
import { PublicFooter } from '@/components/vitrina/PublicFooter'
import { PropertyDetailClient } from './PropertyDetailClient'
import { getPublicPropertyById, getPublicProperties } from '@/services/publicPropertiesService'
import type { PublicProperty } from '@/services/publicPropertiesService'

// Mantener en sync con TIPO_LABELS de components/inmuebles/constants.ts (este
// es un server component; el map canónico vive en un módulo de cliente).
const TIPO_LABELS: Record<string, string> = {
  apartamento: 'Apartamento', casa: 'Casa', oficina: 'Oficina', local: 'Local', bodega: 'Bodega',
  apartaestudio: 'Apartaestudio', casa_finca: 'Casa Finca', finca: 'Finca', lote: 'Lote', parqueadero: 'Parqueadero',
}

// ── Dynamic metadata for SEO ────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  try {
    const property = await getPublicPropertyById(id)
    const tipoLabel = TIPO_LABELS[property.tipo] || property.tipo
    const title = `${tipoLabel} en ${property.barrio || property.ciudad} - Cofianza`
    const description = property.descripcion
      ? property.descripcion.slice(0, 160)
      : `${tipoLabel} disponible en ${property.ciudad}. ${property.habitaciones} hab, ${property.banos} banos.`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: property.foto_fachada_url ? [property.foto_fachada_url] : [],
      },
    }
  } catch {
    return { title: 'Inmueble no encontrado - Cofianza' }
  }
}

// ── Page (Server Component) ─────────────────

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params

  let property: PublicProperty
  try {
    property = await getPublicPropertyById(id)
  } catch {
    notFound()
  }

  // Fetch similar properties (same tipo or ciudad, exclude current)
  let similares: PublicProperty[] = []
  try {
    const result = await getPublicProperties({
      ciudad: property.ciudad,
      tipo: property.tipo,
      limit: 5,
    })
    similares = result.data.filter((p) => p.id !== property.id).slice(0, 4)
  } catch {
    // silent — similares is optional
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary-600">Inicio</Link>
          <span>/</span>
          <Link href="/" className="hover:text-primary-600">Propiedades</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            {TIPO_LABELS[property.tipo] || property.tipo} en {property.ciudad}
          </span>
        </nav>

        <PropertyDetailClient property={property} similares={similares} />
      </main>

      <PublicFooter />
    </div>
  )
}
