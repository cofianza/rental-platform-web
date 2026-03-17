/**
 * Layout publico minimalista (sin sidebar ni auth)
 */

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header minimalista */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-700 flex items-center justify-center">
            <span className="text-white font-bold text-sm">HP</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">
            Cofianza
          </span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
