/**
 * Layout para páginas del dashboard
 * DashboardShell muestra loader hasta que auth esté inicializado,
 * evitando el flash de sidebar/header con datos vacíos.
 */

import { DashboardShell } from '@/components/layout/DashboardShell'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardShell>{children}</DashboardShell>
    </div>
  )
}
