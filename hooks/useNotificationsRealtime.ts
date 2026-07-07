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
    // Realtime es un lujo, no la vía crítica (el Effect 4 poll de 60s cubre
    // la funcionalidad). Si el join del canal falla repetidamente —RLS, WS
    // bloqueado por red/proxy, o churn de StrictMode/Fast Refresh en dev—
    // supabase-js reintenta en bucle y ensucia la consola con
    // "WebSocket failed" + CHANNEL_ERROR. Tras unos intentos nos rendimos y
    // cerramos el canal; el polling mantiene las notificaciones al día.
    let errorCount = 0
    let gaveUp = false

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

    // setAuth ANTES de subscribe: el join de postgres_changes necesita el JWT
    // del usuario para que RLS (auth.uid()) autorice el filtro user_id=eq.…
    // Effect 2 lo mantiene fresco en refrescos posteriores; esto asegura que
    // el PRIMER join lleve el token sin depender del orden de los efectos.
    const currentToken = useAuthStore.getState().accessToken
    if (currentToken) supabase.realtime.setAuth(currentToken)

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
        // Si este effect ya se limpió (re-montaje, cambio de usuario), este
        // callback pertenece a un canal viejo: no toques el estado nuevo.
        if (cancelled) return
        if (status === 'SUBSCRIBED') {
          errorCount = 0
          return
        }
        // Solo CHANNEL_ERROR / TIMED_OUT cuentan como fallo real. Tras 3
        // intentos cerramos el canal para cortar el bucle de reconexión
        // (y el ruido en consola) — el polling de 60s toma el relevo.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          errorCount += 1
          if (errorCount >= 3 && !gaveUp) {
            gaveUp = true
            // eslint-disable-next-line no-console
            console.warn(
              '[notif realtime] canal deshabilitado tras varios fallos; ' +
                'las notificaciones seguirán vía polling (60s).',
              err,
            )
            // Cerramos SIEMPRE el canal local de este effect, nunca el que
            // haya en el ref (podría ser uno nuevo de un re-montaje posterior).
            supabase.removeChannel(channel)
            if (channelRef.current === channel) channelRef.current = null
          }
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

  // ── Effect 4: polling cada 60s como red de seguridad ────────────
  // Realtime via postgres_changes es la via principal, pero si la WS se
  // cae (red intermitente, idle prolongado, evento perdido), el badge se
  // queda desactualizado. Cada 60 segundos refrescamos la lista desde el
  // backend para garantizar que las notificaciones lleguen incluso si el
  // canal Realtime esta inactivo. La pestaña en background pausa el
  // setInterval (browser throttling), asi que el costo es bajo.
  useEffect(() => {
    if (!isAuthenticated || !userId) return
    const tick = () => {
      notificacionService
        .list({ limit: 30 })
        .then((res) => setItems(res.data))
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('[notif polling] fetch fallo:', err)
        })
    }
    const intervalId = setInterval(tick, 60_000)
    return () => clearInterval(intervalId)
  }, [isAuthenticated, userId, setItems])
}
