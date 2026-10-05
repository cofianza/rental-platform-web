/**
 * PublicFooter — Footer reutilizable para paginas publicas.
 * Alineado al mockup htmls/01_*: copyright + NIT + ciudad + email a la
 * izquierda, links legales a la derecha, sobre fondo oscuro.
 */

import Link from 'next/link'
import { CONTACTO_COFIANZA } from '@/lib/constants'

export function PublicFooter() {
  const year = new Date().getFullYear()
  return (
    // font-display: mismo motivo que en PublicNavbar (el pie no cambia de letra entre páginas).
    <footer className="bg-ink-900 text-white/40 border-t border-white/[0.06] font-display">
      <div className="px-5 sm:px-8 lg:px-12 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-center md:text-left">
          &copy; {year} Cofianza S.A.S. · NIT 902.038.122-7 · Itagüí, Antioquia ·{' '}
          <a href={`mailto:${CONTACTO_COFIANZA.emailProspectos}`} className="hover:text-white/80 transition-colors">
            {CONTACTO_COFIANZA.emailProspectos}
          </a>
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
          <Link href="/terminos" className="hover:text-white/80 transition-colors">Términos</Link>
          <Link href="/privacidad" className="hover:text-white/80 transition-colors">Privacidad</Link>
          <Link href="/privacidad" className="hover:text-white/80 transition-colors">Política de datos</Link>
          <a href={`mailto:${CONTACTO_COFIANZA.emailProspectos}`} className="hover:text-white/80 transition-colors">Contacto</a>
        </nav>
      </div>
    </footer>
  )
}
