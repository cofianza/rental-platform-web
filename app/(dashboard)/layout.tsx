/**
 * Layout para páginas del dashboard
 * Con Sidebar colapsable y Header con breadcrumbs
 */

import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DashboardLayoutWrapper } from '@/components/layout/DashboardLayoutWrapper'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <DashboardLayoutWrapper>
        <Header />
        <main className="p-4 lg:p-6 overflow-x-hidden">
          {children}
        </main>
      </DashboardLayoutWrapper>
    </div>
  )
}
