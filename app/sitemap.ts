/**
 * sitemap.xml: páginas públicas fijas + los inmuebles publicados en la vitrina.
 * Los inmuebles salen del endpoint público (sin autenticación), cacheado una
 * hora: a lo sumo unas pocas peticiones por hora. Si la API no responde (p. ej.
 * en la build de CI), el sitemap sale solo con las páginas fijas.
 */
import type { MetadataRoute } from 'next'
import { API_BASE_URL } from '@/lib/constants'
import { SITIO_URL } from '@/lib/sitio'

// Tope del endpoint público (limit ≤ 50) y de páginas a recorrer.
const POR_PAGINA = 50
const MAX_PAGINAS = 10

async function inmueblesPublicados(): Promise<{ id: string; created_at: string }[]> {
  const todos: { id: string; created_at: string }[] = []
  for (let page = 1; page <= MAX_PAGINAS; page++) {
    const res = await fetch(`${API_BASE_URL}/public/properties?page=${page}&limit=${POR_PAGINA}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) break
    const json = (await res.json()) as {
      data?: { id: string; created_at: string }[]
      meta?: { totalPages?: number }
    }
    todos.push(...(json.data ?? []))
    if (page >= (json.meta?.totalPages ?? 1)) break
  }
  return todos
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fijas: MetadataRoute.Sitemap = [
    { url: SITIO_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITIO_URL}/vitrina`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITIO_URL}/privacidad`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITIO_URL}/terminos`, changeFrequency: 'yearly', priority: 0.3 },
  ]
  try {
    const inmuebles = await inmueblesPublicados()
    return [
      ...fijas,
      ...inmuebles.map((i) => ({
        url: `${SITIO_URL}/inmueble/${i.id}`,
        lastModified: i.created_at,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ]
  } catch {
    return fijas
  }
}
