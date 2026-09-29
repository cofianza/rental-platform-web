import type { Metadata } from 'next'

// Título de la pestaña: la página es client component y no puede exportar metadata.
// B3: enlace personal con token → nunca en buscadores; y una vista previa propia
// cuando se comparte por WhatsApp (la imagen es opengraph-image.tsx).
const descripcion = 'Revise y autorice la consulta de su información para su estudio de arriendo con Cofianza S.A.S.'

export const metadata: Metadata = {
  title: 'Autorizar consulta — Cofianza',
  description: descripcion,
  robots: { index: false, follow: false },
  openGraph: { title: 'Autorización de su estudio de arriendo', description: descripcion, siteName: 'Cofianza' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
