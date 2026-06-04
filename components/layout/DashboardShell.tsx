/**
 * DashboardShell - Wrapper que muestra un loader hasta que auth esté inicializado.
 * Evita el flash de sidebar/header con datos vacíos en cada refresh.
 */

'use client'

import { useAuthStore } from '@/stores/auth.store'
import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime'
import { CofianzaLogo } from '@/components/ui/CofianzaLogo'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { DashboardLayoutWrapper } from './DashboardLayoutWrapper'
import { OficinaVirtualShell } from './OficinaVirtualShell'
import { PropietarioShell } from './PropietarioShell'

interface Props {
  children: React.ReactNode
}

export function DashboardShell({ children }: Props) {
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const rol = useAuthStore((state) => state.user?.rol)

  // Suscripcion Realtime + fetch inicial de notificaciones. Se monta una sola
  // vez al entrar al dashboard y limpia al hacer logout (cuando isAuthenticated
  // cambia a false) o al desmontar.
  useNotificationsRealtime()

  // Loader hasta inicializar; y también mientras se cierra sesión (el store ya
  // se limpió pero el redirect a /login todavía no completa). Así evitamos el
  // flash del layout admin (rol queda undefined → caería al Sidebar) y los
  // errores de "Token de acceso requerido" de los fetch de los hijos.
  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <CofianzaLogo size={48} />
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Propietario — layout con sidebar (Gestión · Financiero), mockup 14.
  if (rol === 'propietario') {
    return <PropietarioShell>{children}</PropietarioShell>
  }

  // Inmobiliaria — conserva el shell "Oficina Virtual" con tab bar superior.
  if (rol === 'inmobiliaria') {
    return <OficinaVirtualShell rol={rol}>{children}</OficinaVirtualShell>
  }

  // Layout clásico para admin/operador/gerencia/solicitante.
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
