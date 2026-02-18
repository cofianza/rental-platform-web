/**
 * Store de Autenticación - Zustand (HP-95)
 * Maneja el estado de autenticación (tokens en memoria, no localStorage)
 */

import { create } from 'zustand'
import type { IUser, IAuthError, IAuthState } from '@/types/auth'
import type { PermissionMap } from '@/types/permissions'

interface AuthActions {
  // Setters
  setUser: (user: IUser | null) => void
  setAccessToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: IAuthError | null) => void
  setInitialized: (initialized: boolean) => void
  setPermissions: (permissions: PermissionMap | null) => void

  // Auth actions
  login: (user: IUser, accessToken: string) => void
  logout: () => void
  clearError: () => void
}

type AuthStore = IAuthState & AuthActions

const initialState: IAuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
  permissions: null,
}

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,

  // Setters
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setAccessToken: (accessToken) => set({ accessToken }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setInitialized: (isInitialized) => set({ isInitialized }),

  setPermissions: (permissions) => set({ permissions }),

  // Auth actions
  login: (user, accessToken) =>
    set({
      user,
      accessToken,
      isAuthenticated: true,
      error: null,
    }),

  logout: () =>
    set({
      ...initialState,
      isInitialized: true, // Mantener inicializado después del logout
    }),

  clearError: () => set({ error: null }),
}))

// Selector hooks para uso directo
export const useUser = () => useAuthStore((state) => state.user)
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
export const useAuthLoading = () => useAuthStore((state) => state.isLoading)
export const useAuthError = () => useAuthStore((state) => state.error)
export const usePermissionsData = () => useAuthStore((state) => state.permissions)
