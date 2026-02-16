/**
 * SearchInput - Campo de búsqueda con icono y debounce
 * Client Component - requiere interactividad
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { IconSearch, IconX } from '@/components/icons'
import { cn } from '@/lib/utils'

export interface SearchInputProps {
  placeholder?: string
  onSearch: (value: string) => void
  debounceMs?: number
  className?: string
}

export function SearchInput({
  placeholder = 'Buscar...',
  onSearch,
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [value, setValue] = useState('')

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [value, debounceMs, onSearch])

  const handleClear = useCallback(() => {
    setValue('')
  }, [])

  return (
    <div className={cn('relative', className)}>
      {/* Icono de lupa */}
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <IconSearch size={18} className="text-gray-400" />
      </div>

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg',
          'text-sm placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'transition-colors'
        )}
      />

      {/* Botón X para limpiar */}
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-700 transition-colors"
          aria-label="Limpiar búsqueda"
        >
          <IconX size={16} className="text-gray-400 hover:text-gray-600" />
        </button>
      )}
    </div>
  )
}
