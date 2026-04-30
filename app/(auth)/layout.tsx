/**
 * Layout para páginas de autenticación (HP-95)
 * Dos columnas en desktop: branding (izquierda) + formulario (derecha)
 * Una columna en mobile
 */

import Link from 'next/link'
import { CofianzaLogo } from '@/components/ui/CofianzaLogo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Columna izquierda - Branding (oculta en mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-700 flex-col justify-between p-12">
        {/* Logo — click vuelve a la landing */}
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <CofianzaLogo size={36} withText invert textClassName="text-2xl" />
        </Link>

        {/* Contenido hero */}
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Gestión de arrendamientos
            <br />
            simplificada
          </h1>
          <p className="text-primary-200 text-lg max-w-md">
            Administra expedientes, documentos, estudios de riesgo y contratos
            en una sola plataforma diseñada para el mercado colombiano.
          </p>

          {/* Características destacadas */}
          <ul className="space-y-3 text-primary-100">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-300" />
              Expedientes digitales con workflow automatizado
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-300" />
              Firma electrónica con validez legal
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-300" />
              Integración con centrales de riesgo
            </li>
          </ul>
        </div>

        {/* Footer */}
        <p className="text-primary-300 text-sm">
          © 2026 Cofianza. Todos los derechos reservados.
        </p>
      </div>

      {/* Columna derecha - Formulario */}
      <div className="flex-1 flex flex-col bg-gray-50 px-6 py-12">
        {/* Mobile: link to landing */}
        <div className="lg:hidden mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span className="text-sm font-medium">Volver a la vitrina</span>
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  )
}
