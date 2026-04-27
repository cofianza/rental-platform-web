/**
 * MunicipioCombobox — autocomplete de municipios contra el catálogo Factus.
 *
 * Pega contra GET /api/v1/factus/municipalities?name=… (público, no requiere
 * auth previa porque se usa en el registro). Debounce 300ms.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '@/lib/constants'

export interface MunicipioOption {
  id: number
  code: string
  name: string
  department: { id: number; code: string; name: string }
}

interface Props {
  value: { id: number; nombre: string } | null
  onChange: (value: { id: number; nombre: string } | null) => void
  error?: string
  /** Token de acceso si el endpoint requiere auth. En registro va sin token. */
  authToken?: string
}

export function MunicipioCombobox({ value, onChange, error, authToken }: Props) {
  const [query, setQuery] = useState(value?.nombre || '')
  const [results, setResults] = useState<MunicipioOption[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al click fuera.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Buscar con debounce.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const headers: Record<string, string> = { Accept: 'application/json' }
        if (authToken) headers.Authorization = `Bearer ${authToken}`
        // Si hay token usamos el endpoint autenticado; si no (wizard de registro),
        // el público.
        const path = authToken ? '/factus/municipalities' : '/public/factus/municipalities'
        const res = await fetch(
          `${API_BASE_URL}${path}?name=${encodeURIComponent(query.trim())}`,
          { headers },
        )
        if (!res.ok) {
          setResults([])
          return
        }
        const json = await res.json()
        setResults(Array.isArray(json.data) ? json.data : [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, authToken])

  const handleSelect = (m: MunicipioOption) => {
    const label = `${m.name}, ${m.department.name}`
    setQuery(label)
    onChange({ id: m.id, nombre: label })
    setOpen(false)
  }

  const handleClear = () => {
    setQuery('')
    onChange(null)
    setResults([])
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Municipio (para facturación)
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            // Si el usuario edita el texto, invalidamos la selección hasta que elija otra.
            if (value) onChange(null)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Empieza a escribir tu municipio (ej. Medellín)"
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            aria-label="Limpiar"
          >
            ✕
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Buscando…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
          ) : (
            results.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelect(m)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 focus:bg-primary-50 focus:outline-none"
              >
                <span className="font-medium text-gray-900">{m.name}</span>
                <span className="text-gray-500"> · {m.department.name}</span>
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {!error && (
        <p className="mt-1 text-xs text-gray-500">
          Lo necesitamos para emitir tu factura electrónica si pagas el estudio crediticio.
        </p>
      )}
    </div>
  )
}
