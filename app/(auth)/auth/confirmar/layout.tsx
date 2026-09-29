import type { Metadata } from 'next'

// El enlace del correo trae una credencial de un solo uso: la página no se indexa.
export const metadata: Metadata = {
  title: 'Entrar — Cofianza',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
