/**
 * Layout publico minimalista (sin sidebar ni auth)
 */

import { CofianzaLogo } from '@/components/ui/CofianzaLogo'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header minimalista */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center">
          <CofianzaLogo size={32} withText textClassName="text-lg" />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
