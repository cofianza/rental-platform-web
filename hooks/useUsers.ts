'use client'

/**
 * Hook de usuarios - HP-117
 * Maneja la lista de usuarios con sincronización de URL y debounce
 */

import { useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useUsersStore } from '@/stores/users.store'
import { userService } from '@/services/userService'
import { DEFAULT_FILTERS, USER_MESSAGES } from '@/components/users/constants'
import type { IUserFilters, IUserFormData, IUserProfile, UserRole } from '@/types/user'

const DEBOUNCE_DELAY = 300

export function useUsers() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)

  // Estado del store
  const users = useUsersStore((state) => state.users)
  const meta = useUsersStore((state) => state.meta)
  const filters = useUsersStore((state) => state.filters)
  const isLoading = useUsersStore((state) => state.isLoading)
  const error = useUsersStore((state) => state.error)
  const selectedUser = useUsersStore((state) => state.selectedUser)
  const modalMode = useUsersStore((state) => state.modalMode)

  // Acciones del store
  const setUsers = useUsersStore((state) => state.setUsers)
  const setMeta = useUsersStore((state) => state.setMeta)
  const setFilters = useUsersStore((state) => state.setFilters)
  const setLoading = useUsersStore((state) => state.setLoading)
  const setError = useUsersStore((state) => state.setError)
  const openCreateModal = useUsersStore((state) => state.openCreateModal)
  const openEditModal = useUsersStore((state) => state.openEditModal)
  const closeModal = useUsersStore((state) => state.closeModal)
  const updateUserInList = useUsersStore((state) => state.updateUserInList)
  const resetFilters = useUsersStore((state) => state.resetFilters)

  /**
   * Sincroniza URL params -> Store (al montar)
   */
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const urlFilters: Partial<IUserFilters> = {}

    const search = searchParams.get('search')
    const role = searchParams.get('role') as UserRole | null
    const is_active = searchParams.get('is_active') as 'true' | 'false' | null
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')

    if (search) urlFilters.search = search
    if (role) urlFilters.role = role
    if (is_active) urlFilters.is_active = is_active
    if (page) urlFilters.page = parseInt(page, 10)
    if (limit) urlFilters.limit = parseInt(limit, 10)

    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters)
    }
  }, [searchParams, setFilters])

  /**
   * Actualiza URL cuando cambian los filtros
   */
  const updateUrl = useCallback(
    (newFilters: IUserFilters) => {
      const params = new URLSearchParams()

      if (newFilters.search) params.set('search', newFilters.search)
      if (newFilters.role) params.set('role', newFilters.role)
      if (newFilters.is_active) params.set('is_active', newFilters.is_active)
      if (newFilters.page > 1) params.set('page', newFilters.page.toString())
      if (newFilters.limit !== DEFAULT_FILTERS.limit) {
        params.set('limit', newFilters.limit.toString())
      }

      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      router.replace(newUrl, { scroll: false })
    },
    [pathname, router]
  )

  /**
   * Carga usuarios desde la API
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await userService.getUsers(filters)
      setUsers(response.data)
      setMeta(response.meta)
    } catch (err) {
      const message = err instanceof Error ? err.message : USER_MESSAGES.FETCH_ERROR
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [filters, setLoading, setError, setUsers, setMeta])

  /**
   * Efecto para cargar usuarios cuando cambian los filtros
   */
  useEffect(() => {
    // Debounce para búsqueda
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchUsers()
      updateUrl(filters)
    }, DEBOUNCE_DELAY)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [filters, fetchUsers, updateUrl])

  /**
   * Actualiza filtros (con reset de página si no es cambio de página)
   */
  const handleFilterChange = useCallback(
    (newFilters: Partial<IUserFilters>) => {
      // Si cambia algo que no es la página, resetear a página 1
      if (!('page' in newFilters)) {
        setFilters({ ...newFilters, page: 1 })
      } else {
        setFilters(newFilters)
      }
    },
    [setFilters]
  )

  /**
   * Crea un nuevo usuario
   */
  const createUser = useCallback(
    async (data: IUserFormData): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        await userService.createUser(data)
        closeModal()
        await fetchUsers()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : USER_MESSAGES.CREATE_ERROR
        setError(message)
        return false
      } finally {
        setLoading(false)
      }
    },
    [closeModal, fetchUsers, setLoading, setError]
  )

  /**
   * Actualiza un usuario existente
   */
  const updateUser = useCallback(
    async (id: string, data: Partial<IUserFormData>): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const updated = await userService.updateUser(id, data)
        updateUserInList(updated)
        closeModal()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : USER_MESSAGES.UPDATE_ERROR
        setError(message)
        return false
      } finally {
        setLoading(false)
      }
    },
    [closeModal, updateUserInList, setLoading, setError]
  )

  /**
   * Activa un usuario
   */
  const activateUser = useCallback(
    async (user: IUserProfile): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const updated = await userService.activateUser(user.id)
        updateUserInList(updated)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : USER_MESSAGES.ACTIVATE_ERROR
        setError(message)
        return false
      } finally {
        setLoading(false)
      }
    },
    [updateUserInList, setLoading, setError]
  )

  /**
   * Desactiva un usuario
   */
  const deactivateUser = useCallback(
    async (user: IUserProfile): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const updated = await userService.deactivateUser(user.id)
        updateUserInList(updated)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : USER_MESSAGES.DEACTIVATE_ERROR
        setError(message)
        return false
      } finally {
        setLoading(false)
      }
    },
    [updateUserInList, setLoading, setError]
  )

  /**
   * Limpia filtros y recarga
   */
  const clearFilters = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  return {
    // Estado
    users,
    meta,
    filters,
    isLoading,
    error,
    selectedUser,
    modalMode,

    // Acciones de filtros
    setFilters: handleFilterChange,
    clearFilters,
    fetchUsers,

    // Acciones de modal
    openCreateModal,
    openEditModal,
    closeModal,

    // Acciones CRUD
    createUser,
    updateUser,
    activateUser,
    deactivateUser,
  }
}
