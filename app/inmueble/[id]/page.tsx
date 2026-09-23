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
  } catch (err) {
    // Retirado, arrendado o id inválido → «ya no está disponible» (not-found.tsx).
    // Cualquier otra falla va a error.tsx, con reintento.
    const status = (err as { status?: number }).status
    if (status === 404 || status === 400) notFound()
    throw err
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
    // pb-24 en celular: la barra fija "Me interesa" tapaba el final del pie.
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      <PublicNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary-600">Inicio</Link>
          <span>/</span>
          <Link href="/vitrina" className="hover:text-primary-600">Propiedades</Link>
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
