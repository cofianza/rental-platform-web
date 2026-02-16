/**
 * Store UI - Zustand
 * Maneja el estado de la interfaz (sidebar, modals, etc.)
 */

import { create } from 'zustand'

interface UIState {
  // Sidebar state
  sidebarExpanded: boolean
  sidebarOpen: boolean // Para mobile drawer

  // Actions
  toggleSidebar: () => void
  setSidebarExpanded: (expanded: boolean) => void
  openSidebar: () => void
  closeSidebar: () => void
}

export const useUIStore = create<UIState>((set) => ({
  // Estado inicial
  sidebarExpanded: true,
  sidebarOpen: false,

  // Actions
  toggleSidebar: () =>
    set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),

  setSidebarExpanded: (expanded: boolean) =>
    set({ sidebarExpanded: expanded }),

  openSidebar: () => set({ sidebarOpen: true }),

  closeSidebar: () => set({ sidebarOpen: false }),
}))
