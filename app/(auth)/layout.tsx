/**
 * Layout para páginas de autenticación (HP-95)
 * Dos columnas en desktop: branding (izquierda) + formulario (derecha)
 * Una columna en mobile
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Columna izquierda - Branding (oculta en mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-700 flex-col justify-between p-12">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary-700 font-bold text-xl">
            HP
          </div>
          <span className="text-white font-semibold text-xl">
            Cofianza
          </span>
        </div>

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
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
