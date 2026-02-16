/**
 * Layout para páginas del dashboard
 * Layout con espacio para sidebar y header
 * Se completará con componentes reales en historias posteriores
 */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Espacio para header */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6">
        <div className="text-xl font-semibold text-primary-600">
          Habitar Propiedades
        </div>
      </header>

      <div className="flex">
        {/* Espacio para sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] p-4">
          <nav className="space-y-2">
            <div className="text-sm text-gray-500 px-3 py-2">
              Navegación
            </div>
            <div className="text-xs text-gray-400 px-3">
              (Placeholder - se completará en historia posterior)
            </div>
          </nav>
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
