/**
 * useNotificationsRealtime — Suscribe el frontend al stream de notificaciones.
 *
 * Estructura en DOS efectos para evitar re-suscripciones cuando solo se
 * refresca el token:
 *
 *   Effect 1 (canal): depende de [isAuthenticated, userId]. Mientras el
 *   usuario sea el mismo, el canal vive — no se cierra y vuelve a abrir
 *   cada vez que Supabase rota el access token (cada hora). Antes lo
 *   teníamos en un solo effect con accessToken en deps; eso provocaba
 *   churn de WebSockets y a veces el push en vivo se perdía hasta el
 *   siguiente refresh manual de la página.
 *
 *   Effect 2 (auth del realtime): depende de [accessToken]. Solo llama
 *   `realtime.setAuth(token)` para que el cliente Realtime tenga el JWT
 *   fresco. RLS auth.uid() resuelve correctamente y los eventos
 *   postgres_changes propagan.
 *
 * Adicionalmente escuchamos onAuthStateChange para captar TOKEN_REFRESHED
 * incluso si el store no actualizó accessToken (defensa contra desincronía
 * entre auth.store y supabase.auth).
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

  // Guardar canal entre renders para limpiar bien al desmontar.
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── Effect 1: fetch inicial + canal Realtime ────────────────────
  // Solo depende del usuario. NO incluimos accessToken aquí; eso lo
  // maneja el Effect 2 sin recrear el canal.
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      reset()
      return
    }

    let cancelled = false

    setLoading(true)
    notificacionService
      .list({ limit: 30 })
      .then((res) => {
        if (cancelled) return
        setItems(res.data)
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[useNotificationsRealtime] fetch inicial fallo:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

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
      .subscribe((status, err) => {
        // Log explícito del estado del canal para debug. Si dice
        // 'CHANNEL_ERROR' sabemos que el join falló (típicamente RLS o
        // token vencido). Antes esto era silencioso.
        if (status !== 'SUBSCRIBED' && status !== 'CLOSED') {
          // eslint-disable-next-line no-console
          console.warn('[notif realtime] channel status:', status, err)
        }
      })

    channelRef.current = channel

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [isAuthenticated, userId, setItems, setLoading, pushIncoming, reset])

  // ── Effect 2: setAuth del realtime cuando cambia el token ───────
  // Solo refresca el JWT del cliente Realtime. NO toca el canal.
  useEffect(() => {
    if (!accessToken) return
    supabase.realtime.setAuth(accessToken)
  }, [accessToken])

  // ── Effect 3: defensa contra desincronía entre auth.store y supabase.auth.
  // Si supabase rota el token internamente y nuestro store no se entera
  // a tiempo, captamos TOKEN_REFRESHED y re-autenticamos el realtime.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        supabase.realtime.setAuth(session.access_token)
      }
    })
    return () => {
      data.subscription.unsubscribe()
    }
  }, [])
}
