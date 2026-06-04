/**
 * PublicFooter — Footer reutilizable para paginas publicas.
 * Alineado al mockup htmls/01_*: copyright + NIT + ciudad + email a la
 * izquierda, links legales a la derecha, sobre fondo oscuro.
 */

import Link from 'next/link'

export function PublicFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-ink-900 text-white/40 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-center md:text-left">
          &copy; {year} Cofianza S.A.S. · NIT 902.038.122 · Itagüí, Antioquia ·{' '}
          <a href="mailto:hola@cofianza.co" className="hover:text-white/80 transition-colors">
            hola@cofianza.co
          </a>
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
          <Link href="/terminos" className="hover:text-white/80 transition-colors">Términos</Link>
          <Link href="/privacidad" className="hover:text-white/80 transition-colors">Privacidad</Link>
          <Link href="/privacidad" className="hover:text-white/80 transition-colors">Política de datos</Link>
          <a href="mailto:hola@cofianza.co" className="hover:text-white/80 transition-colors">Contacto</a>
        </nav>
      </div>
    </footer>
  )
}
