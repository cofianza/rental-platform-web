/**
 * Pagina de notificaciones — historial completo paginado.
 *
 * El campanario del header muestra solo las 30 mas recientes; aqui el
 * usuario puede revisar todo lo que paso. Usa el mismo store que el
 * dropdown para que las acciones (marcar leida) se propaguen en tiempo real.
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { useNotificationStore } from '@/stores/notification.store'
import { notificacionService, type INotificacion } from '@/services/notificacionService'
import { IconLoader, IconBell } from '@/components/icons'
import { cn } from '@/lib/utils'

const TIPO_ICON: Record<string, string> = {
  'cita.solicitada': '📅',
  'cita.confirmada': '✅',
  'cita.reprogramada': '🔁',
  'estudio.aprobado': '🎉',
  'estudio.rechazado': '⚠️',
  'contrato.vigente': '📄',
  'pago.confirmado': '💳',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificacionesPage() {
  const router = useRouter()
  const items = useNotificationStore((s) => s.items)
  const setItems = useNotificationStore((s) => s.setItems)
  const markRead = useNotificationStore((s) => s.markRead)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    notificacionService
      .list({ limit: 50 })
      .then((res) => setItems(res.data))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Error al cargar notificaciones'))
      .finally(() => setLoading(false))
  }, [setItems])

  const handleClick = async (n: INotificacion) => {
    if (!n.leida_at) {
      markRead(n.id, new Date().toISOString())
      notificacionService.markAsRead(n.id).catch(() => {})
    }
    if (n.link) router.push(n.link)
  }

  const handleMarkAll = async () => {
    if (unreadCount === 0) return
    markAllRead(new Date().toISOString())
    try {
      await notificacionService.markAllAsRead()
    } catch {
      toast.error('No se pudieron marcar todas como leidas')
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Notificaciones"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} sin leer`
            : items.length === 0
            ? 'Sin actividad reciente'
            : 'Todo al dia'
        }
        actions={
          unreadCount > 0 ? (
            <button
              onClick={handleMarkAll}
              className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Marcar todas como leidas
            </button>
          ) : undefined
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <IconLoader size={24} className="animate-spin text-gray-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <IconBell size={36} className="text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700">Sin notificaciones</p>
            <p className="text-xs text-gray-500 mt-1">Aqui veras los avisos de tus solicitudes.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((n) => {
              const unread = !n.leida_at
              return (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={cn(
                      'w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors flex gap-3',
                      unread && 'bg-primary-50/40',
                    )}
                  >
                    <span className="text-2xl shrink-0" aria-hidden>
                      {TIPO_ICON[n.tipo] ?? '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm text-gray-900', unread && 'font-semibold')}>
                          {n.titulo}
                        </p>
                        <span className="text-xs text-gray-400 shrink-0">{formatDateTime(n.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{n.mensaje}</p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
