/**
 * PublicFooter — Footer reutilizable para paginas publicas
 */

import { CofianzaLogo } from '@/components/ui/CofianzaLogo'

export function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <CofianzaLogo size={24} />
          <span className="text-sm text-gray-300">Cofianza S.A.S.</span>
        </div>
        <p className="text-xs">&copy; {new Date().getFullYear()} Cofianza. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
