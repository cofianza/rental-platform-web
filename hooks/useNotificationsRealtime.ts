/**
 * useNotificationsRealtime — Suscribe el frontend al stream de notificaciones.
 *
 * Flujo:
 *   1. Al montar (con user autenticado): fetch inicial del backend para
 *      poblar el store y obtener el unread count exacto.
 *   2. Establece la sesion en supabase-js usando el JWT del store de auth
 *      para que la suscripcion Realtime respete RLS (filtra por user_id).
 *   3. Suscribe a INSERT y UPDATE de la tabla notificaciones filtrado por
 *      user_id. Cada evento empuja al store via `pushIncoming`.
 *   4. Al desmontar / cambiar de usuario: cleanup del canal.
 */

'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notification.store'
import { notificacionService, type INotificacion } from '@/services/notificacionService'

export function useNotificationsRealtime() {
  const userId = useAuthStore((s) => s.user?.id)
  const accessToken = useAuthStore((s) => s.accessToken)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const setItems = useNotificationStore((s) => s.setItems)
  const setLoading = useNotificationStore((s) => s.setLoading)
  const pushIncoming = useNotificationStore((s) => s.pushIncoming)
  const reset = useNotificationStore((s) => s.reset)

  // Para evitar montar dos canales si el componente re-renderiza sin
  // que cambie el userId (StrictMode, fast refresh, etc.).
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      reset()
      return
    }

    let cancelled = false

    // 1. Fetch inicial.
    setLoading(true)
    notificacionService
      .list({ limit: 30 })
      .then((res) => {
        if (cancelled) return
        setItems(res.data)
      })
      .catch((err) => {
        // No bloqueante: aunque falle el fetch, el realtime puede empezar
        // a empujar nuevas. Logueamos para debugging.
        // eslint-disable-next-line no-console
        console.error('[useNotificationsRealtime] fetch inicial fallo:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    // 2. JWT en el cliente realtime para que RLS (auth.uid()) resuelva.
    if (accessToken) {
      supabase.realtime.setAuth(accessToken)
    }

    // 3. Canal por usuario. El nombre es arbitrario pero util para debugging.
    const channel = supabase
      .channel(`notif:${userId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: INotificacion }) => {
          pushIncoming(payload.new)
        },
      )
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notificaciones',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: INotificacion }) => {
          pushIncoming(payload.new)
        },
      )
      .subscribe()

    channelRef.current = channel

    // 4. Cleanup al desmontar o al cambiar el usuario.
    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [isAuthenticated, userId, accessToken, setItems, setLoading, pushIncoming, reset])
}
