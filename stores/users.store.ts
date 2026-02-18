/**
 * Store de Usuarios - Zustand (HP-117)
 * Maneja el estado de la lista de usuarios y filtros
 */

import { create } from 'zustand'
import type {
  IUserProfile,
  IUserFilters,
  IUsersMeta,
  IUsersState,
  UserModalMode,
} from '@/types/user'
import { DEFAULT_FILTERS } from '@/components/users/constants'

interface UsersActions {
  // Setters
  setUsers: (users: IUserProfile[]) => void
  setMeta: (meta: IUsersMeta | null) => void
  setFilters: (filters: Partial<IUserFilters>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedUser: (user: IUserProfile | null) => void
  setModalMode: (mode: UserModalMode) => void

  // Actions
  resetFilters: () => void
  openCreateModal: () => void
  openEditModal: (user: IUserProfile) => void
  closeModal: () => void
  updateUserInList: (user: IUserProfile) => void
  removeUserFromList: (userId: string) => void
}

type UsersStore = IUsersState & UsersActions

const initialState: IUsersState = {
  users: [],
  meta: null,
  filters: DEFAULT_FILTERS,
  isLoading: false,
  error: null,
  selectedUser: null,
  modalMode: null,
}

export const useUsersStore = create<UsersStore>((set) => ({
  ...initialState,

  // Setters
  setUsers: (users) => set({ users }),

  setMeta: (meta) => set({ meta }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setSelectedUser: (selectedUser) => set({ selectedUser }),

  setModalMode: (modalMode) => set({ modalMode }),

  // Actions
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  openCreateModal: () =>
    set({
      modalMode: 'create',
      selectedUser: null,
    }),

  openEditModal: (user) =>
    set({
      modalMode: 'edit',
      selectedUser: user,
    }),

  closeModal: () =>
    set({
      modalMode: null,
      selectedUser: null,
    }),

  updateUserInList: (updatedUser) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === updatedUser.id ? updatedUser : user
      ),
    })),

  removeUserFromList: (userId) =>
    set((state) => ({
      users: state.users.filter((user) => user.id !== userId),
    })),
}))

// Selector hooks para uso directo
export const useUsers = () => useUsersStore((state) => state.users)
export const useUsersMeta = () => useUsersStore((state) => state.meta)
export const useUsersFilters = () => useUsersStore((state) => state.filters)
export const useUsersLoading = () => useUsersStore((state) => state.isLoading)
export const useUsersError = () => useUsersStore((state) => state.error)
export const useSelectedUser = () => useUsersStore((state) => state.selectedUser)
export const useUserModalMode = () => useUsersStore((state) => state.modalMode)
