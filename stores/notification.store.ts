/**
 * Store de Notificaciones — Zustand.
 *
 * Mantiene la lista (truncada a las mas recientes) y el contador de no-leidas.
 * El backend escribe; este store recibe via:
 *   - Fetch inicial al montar el dashboard.
 *   - Stream Realtime (useNotificationsRealtime) que dispara `pushIncoming`.
 *   - Acciones del usuario (marcar-leida, marcar-todas).
 */

import { create } from 'zustand'
import type { INotificacion } from '@/services/notificacionService'

const MAX_KEEP = 50

interface NotificationState {
  // Las mas recientes primero. Cap suave a MAX_KEEP para no sangrar memoria
  // si el store queda vivo durante una sesion larga.
  items: INotificacion[]
  unreadCount: number
  isLoading: boolean
  /** created_at más reciente que había al limpiar la campana: el polling no
   *  vuelve a mostrar las leídas de hasta ese momento. */
  limpiadoEn: string | null

  // Setters
  setItems: (items: INotificacion[]) => void
  setUnreadCount: (n: number) => void
  setLoading: (loading: boolean) => void

  // Realtime push: insert nuevo o reemplaza si ya existe (UPDATE de leida_at).
  pushIncoming: (item: INotificacion) => void

  // User actions
  markRead: (id: string, leidaAt: string) => void
  markAllRead: (leidaAt: string) => void
  /** Vacia el dropdown sin afectar el historial en backend. Usado por el
   *  boton "Limpiar campana" para marcar+ocultar de un solo click. */
  clearAll: () => void
  reset: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  unreadCount: 0,
  isLoading: false,
  limpiadoEn: null,

  setItems: (items) =>
    set((state) => {
      const { limpiadoEn } = state
      const visibles = limpiadoEn
        ? items.filter((n) => !(n.leida_at && n.created_at <= limpiadoEn))
        : items
      return {
        items: visibles.slice(0, MAX_KEEP),
        unreadCount: visibles.filter((n) => !n.leida_at).length,
      }
    }),

  setUnreadCount: (unreadCount) => set({ unreadCount }),

  setLoading: (isLoading) => set({ isLoading }),

  pushIncoming: (item) =>
    set((state) => {
      const existing = state.items.findIndex((n) => n.id === item.id)
      if (existing >= 0) {
        // UPDATE — eg. el backend marco leida via otra sesion. Reemplazamos.
        const next = [...state.items]
        next[existing] = item
        return {
          items: next,
          unreadCount: next.filter((n) => !n.leida_at).length,
        }
      }
      // Ya leída y fuera de la lista: es el eco del UPDATE de «Marcar todas»
      // tras limpiar la campana, no una nueva (esas llegan sin leida_at).
      if (item.leida_at) return state
      // INSERT — nueva notificacion.
      const next = [item, ...state.items].slice(0, MAX_KEEP)
      return {
        items: next,
        unreadCount: state.unreadCount + (item.leida_at ? 0 : 1),
      }
    }),

  markRead: (id, leidaAt) =>
    set((state) => {
      const next = state.items.map((n) => (n.id === id ? { ...n, leida_at: leidaAt } : n))
      return {
        items: next,
        unreadCount: next.filter((n) => !n.leida_at).length,
      }
    }),

  markAllRead: (leidaAt) =>
    set((state) => ({
      items: state.items.map((n) => (n.leida_at ? n : { ...n, leida_at: leidaAt })),
      unreadCount: 0,
    })),

  clearAll: () =>
    set((state) => ({
      items: [],
      unreadCount: 0,
      limpiadoEn: state.items.reduce((m, n) => (n.created_at > m ? n.created_at : m), state.limpiadoEn ?? ''),
    })),

  reset: () => set({ items: [], unreadCount: 0, isLoading: false, limpiadoEn: null }),
}))
