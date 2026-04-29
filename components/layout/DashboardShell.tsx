/**
 * DashboardShell - Wrapper que muestra un loader hasta que auth esté inicializado.
 * Evita el flash de sidebar/header con datos vacíos en cada refresh.
 */

'use client'

import { useAuthStore } from '@/stores/auth.store'
import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { DashboardLayoutWrapper } from './DashboardLayoutWrapper'

interface Props {
  children: React.ReactNode
}

export function DashboardShell({ children }: Props) {
  const isInitialized = useAuthStore((state) => state.isInitialized)

  // Suscripcion Realtime + fetch inicial de notificaciones. Se monta una sola
  // vez al entrar al dashboard y limpia al hacer logout (cuando isAuthenticated
  // cambia a false) o al desmontar.
  useNotificationsRealtime()

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            HP
          </div>
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <>
      <Sidebar />
      <DashboardLayoutWrapper>
        <Header />
        <main className="p-4 lg:p-6 overflow-x-hidden">
          {children}
        </main>
      </DashboardLayoutWrapper>
    </>
  )
}
