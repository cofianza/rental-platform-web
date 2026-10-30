/**
 * robots.txt: se indexan la landing, la vitrina, los inmuebles publicados y las
 * páginas legales. El panel, los flujos por enlace con token y /api no.
 */
import type { MetadataRoute } from 'next'
import { DASHBOARD_SEGMENTOS, PUBLICO_SEGMENTOS } from '@/lib/rutasProtegidas'
import { SITIO_URL } from '@/lib/sitio'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        ...DASHBOARD_SEGMENTOS.map((s) => `/${s}`),
        ...PUBLICO_SEGMENTOS.map((s) => `/${s}/`),
      ],
    },
    sitemap: `${SITIO_URL}/sitemap.xml`,
  }
}
