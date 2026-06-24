/**
 * NotificationBell — Campanario con badge y dropdown de notificaciones.
 *
 * Estado y stream se manejan en useNotificationStore + useNotificationsRealtime
 * (ese ultimo se inicializa una vez en el layout del dashboard). Aqui solo
 * leemos del store y disparamos acciones de marcar-leida.
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useNotificationStore } from '@/stores/notification.store'
import { notificacionService, type INotificacion } from '@/services/notificacionService'
import {
  IconBell,
  IconCalendar,
  IconCheckCircle,
  IconRefresh,
  IconX,
  IconUserCheck,
  IconUserX,
  IconShield,
  IconShieldCheck,
  IconAlertTriangle,
  IconCreditCard,
  IconReceipt,
  IconPencil,
  IconFileCheck,
  IconPaperclip,
  IconFolderOpen,
  IconHome,
  IconMail,
  IconUsers,
  type IconProps,
} from '@/components/icons'
import { cn } from '@/lib/utils'

type NotifIconEntry = { icon: React.ComponentType<IconProps>; badge: string }

/**
 * Mapa tipo de notificacion -> { componente de icono, clases de color del badge }.
 * Debe mantenerse identico al de app/(dashboard)/notificaciones/page.tsx.
 */
const TIPO_ICON: Record<string, NotifIconEntry> = {
  'cita.solicitada': { icon: IconCalendar, badge: 'bg-sky-50 text-sky-600' },
  'cita.confirmada': { icon: IconCheckCircle, badge: 'bg-emerald-50 text-emerald-600' },
  'cita.reprogramada': { icon: IconRefresh, badge: 'bg-sky-50 text-sky-600' },
  'cita.cancelada': { icon: IconX, badge: 'bg-red-50 text-red-600' },
  'cita.acuse_solicitante': { icon: IconUserCheck, badge: 'bg-emerald-50 text-emerald-600' },
  'cita.confirmacion_asistencia': { icon: IconUserCheck, badge: 'bg-emerald-50 text-emerald-600' },
  'estudio.habilitado': { icon: IconShield, badge: 'bg-primary-50 text-primary-600' },
  'estudio.aprobado': { icon: IconShieldCheck, badge: 'bg-emerald-50 text-emerald-600' },
  'estudio.aprobado.propietario': { icon: IconShieldCheck, badge: 'bg-emerald-50 text-emerald-600' },
  'estudio.rechazado': { icon: IconAlertTriangle, badge: 'bg-amber-50 text-amber-600' },
  'estudio.rechazado.propietario': { icon: IconAlertTriangle, badge: 'bg-amber-50 text-amber-600' },
  'estudio.condicionado.propietario': { icon: IconAlertTriangle, badge: 'bg-amber-50 text-amber-600' },
  'pago.disponible': { icon: IconCreditCard, badge: 'bg-indigo-50 text-indigo-600' },
  'pago.confirmado': { icon: IconReceipt, badge: 'bg-indigo-50 text-indigo-600' },
  'contrato.pendiente_firma': { icon: IconPencil, badge: 'bg-violet-50 text-violet-600' },
  'contrato.vigente': { icon: IconFileCheck, badge: 'bg-emerald-50 text-emerald-600' },
  'soporte.subido': { icon: IconPaperclip, badge: 'bg-slate-50 text-slate-600' },
  'expediente_asignado': { icon: IconFolderOpen, badge: 'bg-slate-50 text-slate-600' },
  'inmueble_asignado': { icon: IconHome, badge: 'bg-slate-50 text-slate-600' },
  'coarrendatario.invitado': { icon: IconMail, badge: 'bg-slate-50 text-slate-600' },
  'coarrendatario.acepto': { icon: IconUserCheck, badge: 'bg-emerald-50 text-emerald-600' },
  'coarrendatario.rechazo': { icon: IconUserX, badge: 'bg-amber-50 text-amber-600' },
  'inmobiliaria.rol_cambiado': { icon: IconUsers, badge: 'bg-slate-50 text-slate-600' },
  'inmobiliaria.miembro_salio': { icon: IconUserX, badge: 'bg-amber-50 text-amber-600' },
  'inmobiliaria.miembro_acepto': { icon: IconUsers, badge: 'bg-emerald-50 text-emerald-600' },
  'solicitud.vitrina': { icon: IconHome, badge: 'bg-sky-50 text-sky-600' },
}

const FALLBACK_ICON: NotifIconEntry = { icon: IconBell, badge: 'bg-slate-50 text-slate-500' }

/** Badge redondeado con el icono semantico de la notificacion. */
function NotificationIcon({ tipo, titulo }: { tipo: string; titulo: string }) {
  const { icon: Icon, badge } = TIPO_ICON[tipo] ?? FALLBACK_ICON
  return (
    <span
      className={cn('h-9 w-9 shrink-0 grid place-items-center rounded-lg', badge)}
      role="img"
      aria-label={titulo}
    >
      <Icon size={18} aria-hidden />
    </span>
  )
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `hace ${d} d`
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export function NotificationBell() {
  const router = useRouter()
  const items = useNotificationStore((s) => s.items)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const isLoading = useNotificationStore((s) => s.isLoading)
  const markRead = useNotificationStore((s) => s.markRead)
  const clearAll = useNotificationStore((s) => s.clearAll)

  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer click fuera del dropdown.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const handleItemClick = async (n: INotificacion) => {
    setOpen(false)

    // Optimistic: marcar leida en el store antes de la peticion.
    if (!n.leida_at) {
      markRead(n.id, new Date().toISOString())
      notificacionService.markAsRead(n.id).catch(() => {
        // Rollback silencioso: el backend re-empujara via realtime si hace falta.
      })
    }

    if (n.link) {
      router.push(n.link)
    }
  }

  // "Limpiar" hace dos cosas en un solo click:
  //   1. Backend: marca todas las no-leidas como leidas (markAllAsRead).
  //   2. Local: vacia el dropdown — las notificaciones siguen accesibles
  //      en /notificaciones (historial completo), pero el campanario se
  //      libera. Sin el step 2, las notificaciones leidas seguian visibles
  //      atenuadas y el usuario no entendia como "cerrarlas".
  const handleLimpiar = async () => {
    const tieneNoLeidas = unreadCount > 0
    clearAll() // optimistic — cierra el dropdown del campanario.
    if (!tieneNoLeidas) return
    try {
      await notificacionService.markAllAsRead()
    } catch {
      toast.error('No se pudieron marcar todas como leidas')
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
      >
        <IconBell size={20} className="text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50',
            'max-h-[28rem] flex flex-col',
          )}
        >
          {/* Header del dropdown — boton "Limpiar" siempre visible cuando
              hay items, sin importar si tienen no-leidas. Marca + oculta de
              un solo click. */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Notificaciones</span>
            {items.length > 0 && (
              <button
                onClick={handleLimpiar}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                {unreadCount > 0 ? 'Marcar todas como leidas' : 'Limpiar'}
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="overflow-y-auto flex-1">
            {isLoading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">Cargando…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-gray-700 font-medium">Sin notificaciones</p>
                <p className="text-xs text-gray-500 mt-1">
                  Te avisaremos aqui cuando haya novedades.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((n) => {
                  const unread = !n.leida_at
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleItemClick(n)}
                        className={cn(
                          'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3',
                          unread && 'bg-primary-50/50',
                        )}
                      >
                        <NotificationIcon tipo={n.tipo} titulo={n.titulo} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <p className={cn('text-sm text-gray-900 truncate', unread && 'font-semibold')}>
                              {n.titulo}
                            </p>
                            {unread && (
                              <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.mensaje}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(n.created_at)}</p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 text-center">
              <Link
                href="/notificaciones"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                Ver todas
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
