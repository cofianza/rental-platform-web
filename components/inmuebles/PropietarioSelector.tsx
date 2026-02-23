/**
 * Selector de Propietario - HP-174
 * Componente para buscar y seleccionar propietarios
 * Usa Supabase directamente para evitar problemas con el RPC de usuarios
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { IconSearch, IconLoader, IconX, IconUser } from '@/components/icons'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// Tipo simplificado para el selector (no necesita todos los campos de IUserProfile)
interface PropietarioOption {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  rol: string
  estado: string
}

interface PropietarioSelectorProps {
  value: string // propietario_id
  onChange: (propietarioId: string, propietario: PropietarioOption | null) => void
  disabled?: boolean
  error?: string
  initialPropietario?: { id: string; nombre: string; apellido: string } | null
}

export function PropietarioSelector({
  value: _value,
  onChange,
  disabled = false,
  error,
  initialPropietario,
}: PropietarioSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<PropietarioOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{
    id: string
    nombre: string
    apellido: string
  } | null>(initialPropietario || null)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Buscar usuarios cuando cambia el término de búsqueda
  // Usa Supabase directamente para evitar el bug del RPC list_users_with_email
  const searchUsers = useCallback(async (term: string) => {
    if (term.length < 2) {
      setUsers([])
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre, apellido, telefono, rol, estado')
        .eq('estado', 'activo')
        .or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%`)
        .order('nombre', { ascending: true })
        .limit(10)

      if (error) {
        console.error('Error searching users:', error)
        setUsers([])
        return
      }

      // Mapear a IUserProfile (sin email ya que no está en perfiles)
      const mappedUsers = (data || []).map((user) => ({
        id: user.id as string,
        nombre: user.nombre as string,
        apellido: user.apellido as string,
        email: '', // Email no disponible desde perfiles directamente
        telefono: user.telefono as string | null,
        rol: user.rol as string,
        estado: user.estado as string,
      }))

      setUsers(mappedUsers)
    } catch (err) {
      console.error('Error searching users:', err)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounce de búsqueda
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (search.length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchUsers(search)
      }, 300)
    } else {
      setUsers([])
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [search, searchUsers])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Actualizar selectedUser cuando cambia initialPropietario
  useEffect(() => {
    if (initialPropietario) {
      setSelectedUser(initialPropietario)
    }
  }, [initialPropietario])

  const handleSelect = (user: PropietarioOption) => {
    setSelectedUser({
      id: user.id,
      nombre: user.nombre || '',
      apellido: user.apellido || '',
    })
    onChange(user.id, user)
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = () => {
    setSelectedUser(null)
    onChange('', null)
    setSearch('')
    inputRef.current?.focus()
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Input de búsqueda o usuario seleccionado */}
      {selectedUser ? (
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2 border rounded-lg',
            error ? 'border-red-300' : 'border-gray-300',
            disabled ? 'bg-gray-100' : 'bg-white'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <IconUser size={16} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {selectedUser.nombre} {selectedUser.apellido}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <IconX size={16} className="text-gray-500" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <IconSearch
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={handleInputFocus}
            disabled={disabled}
            placeholder="Buscar propietario por nombre o email..."
            className={cn(
              'w-full pl-10 pr-4 py-2 border rounded-lg text-sm',
              'focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              error ? 'border-red-300' : 'border-gray-300',
              disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
            )}
          />
          {isLoading && (
            <IconLoader
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
            />
          )}
        </div>
      )}

      {/* Dropdown de resultados */}
      {isOpen && !selectedUser && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {search.length < 2 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              Escribe al menos 2 caracteres para buscar...
            </div>
          ) : isLoading ? (
            <div className="px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
              <IconLoader size={16} className="animate-spin" />
              Buscando...
            </div>
          ) : users.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No se encontraron propietarios
            </div>
          ) : (
            <ul>
              {users.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(user)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <IconUser size={16} className="text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.nombre} {user.apellido}
                      </p>
                      {user.email && (
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      )}
                      {user.rol && (
                        <p className="text-xs text-gray-400 truncate capitalize">{user.rol.replace('_', ' ')}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Mensaje de error */}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
