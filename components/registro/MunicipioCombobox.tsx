/**
 * MunicipioCombobox — autocomplete de municipios contra el catálogo DIVIPOLA.
 *
 * Pega contra GET /api/v1/factus/municipalities?name=… (público, no requiere
 * auth previa porque se usa en el registro). Debounce 300ms.
 *
 * Reporte de la Oficina Virtual (25-nov), punto 4: también es el campo de
 * ciudad del inmueble, del solicitante y del coarrendatario. Muestra
 * «Municipio, Departamento» y, con `guardado`, una ciudad escrita a mano antes
 * del buscador: si es una del catálogo la elige sola; si no, la muestra y pide
 * elegirla de la lista (no se pierde).
 */

'use client'

import { IconAlertTriangle, IconX } from '@/components/icons'
import { useEffect, useId, useRef, useState } from 'react'
import { API_BASE_URL } from '@/lib/constants'
import { departamentoSiDistinto, esElMunicipio, etiquetaMunicipio } from '@/lib/municipios'

export interface MunicipioOption {
  id: number
  code: string
  name: string
  department: { id: number; code: string; name: string }
}

interface Props {
  /** V2 Factus exige código DANE (5 dígitos string, ej. "11001"). */
  value: { codigo: string; nombre: string } | null
  /**
   * `municipio` es la opción elegida (nombre y departamento por separado); null al limpiar.
   * `automatico`: la eligió el campo solo porque la ciudad `guardado` es esa (nadie la cambió).
   */
  onChange: (
    value: { codigo: string; nombre: string } | null,
    municipio?: MunicipioOption,
    opciones?: { automatico: boolean },
  ) => void
  error?: string
  /** Token de acceso si el endpoint requiere auth. En registro va sin token. */
  authToken?: string
  /** Etiqueta propia; null = la pone quien lo usa (con `id`). */
  label?: string | null
  /** Texto de ayuda bajo el campo; null = ninguno. */
  ayuda?: string | null
  placeholder?: string
  /** id del input, para una etiqueta externa. */
  id?: string
  /** La ciudad guardada antes del buscador (texto libre), mientras no haya `value`. */
  guardado?: { ciudad: string | null | undefined; departamento: string | null | undefined } | null
  disabled?: boolean
}

const AYUDA_FACTURA = 'Lo necesitamos para emitir su factura electrónica si paga el estudio de arrendamiento.'

async function buscarMunicipios(nombre: string, authToken?: string): Promise<MunicipioOption[]> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  // Si hay token usamos el endpoint autenticado; si no (wizard de registro,
  // enlace del coarrendatario), el público.
  const path = authToken ? '/factus/municipalities' : '/public/factus/municipalities'
  const res = await fetch(`${API_BASE_URL}${path}?name=${encodeURIComponent(nombre)}`, { headers })
  if (!res.ok) return []
  const json = await res.json()
  return Array.isArray(json.data) ? json.data : []
}

export function MunicipioCombobox({
  value,
  onChange,
  error,
  authToken,
  label = 'Municipio (para facturación)',
  ayuda = AYUDA_FACTURA,
  placeholder = 'Empiece a escribir su municipio (ej. Medellín)',
  id,
  guardado,
  disabled,
}: Props) {
  const textoGuardado = guardado ? etiquetaMunicipio(guardado.ciudad, guardado.departamento) : ''
  const [query, setQuery] = useState(value?.nombre || textoGuardado)
  const [results, setResults] = useState<MunicipioOption[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  // La ciudad guardada a mano que no se encontró en el catálogo (se pide elegirla).
  const [fueraDeCatalogo, setFueraDeCatalogo] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Generado: el combobox se usa en varias pantallas y un id fijo se repetiria.
  const idGenerado = useId()
  const inputId = id ?? idGenerado
  const ayudaId = `${inputId}-ayuda`

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

  const handleSelect = (m: MunicipioOption) => {
    const label = etiquetaMunicipio(m.name, m.department.name)
    setQuery(label)
    setFueraDeCatalogo(false)
    onChange({ codigo: m.code, nombre: label }, m)
    setOpen(false)
  }

  // La ciudad guardada antes del buscador: si está en el catálogo se elige sola
  // (mismo nombre y departamento); si no, queda a la vista y se pide elegirla.
  const ciudadGuardada = guardado?.ciudad?.trim() ?? ''
  const departamentoGuardado = guardado?.departamento ?? ''
  const tieneValor = !!value
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })
  useEffect(() => {
    if (tieneValor || ciudadGuardada.length < 2) return
    let vigente = true
    buscarMunicipios(ciudadGuardada, authToken)
      .then((opciones) => {
        if (!vigente) return
        const m = opciones.find((o) => esElMunicipio(o, ciudadGuardada, departamentoGuardado))
        if (m) {
          const label = etiquetaMunicipio(m.name, m.department.name)
          setQuery(label)
          onChangeRef.current({ codigo: m.code, nombre: label }, m, { automatico: true })
        } else {
          // Llegó después del primer render (datos cargados aparte): que se vea.
          const texto = etiquetaMunicipio(ciudadGuardada, departamentoGuardado)
          setQuery((q) => q || texto)
          setFueraDeCatalogo(true)
        }
      })
      .catch(() => {
        if (!vigente) return
        const texto = etiquetaMunicipio(ciudadGuardada, departamentoGuardado)
        setQuery((q) => q || texto)
        setFueraDeCatalogo(true)
      })
    return () => {
      vigente = false
    }
    // Solo con la ciudad guardada que llega al abrir el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciudadGuardada, departamentoGuardado])

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
        setResults(await buscarMunicipios(query.trim(), authToken))
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

  const handleClear = () => {
    setQuery('')
    onChange(null)
    setResults([])
  }

  const avisoGuardado = !value && fueraDeCatalogo && textoGuardado && query === textoGuardado
  const textoAyuda = error ? null : avisoGuardado ? null : ayuda

  return (
    <div ref={containerRef} className="relative">
      {label !== null && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value)
            // Si el usuario edita el texto, invalidamos la selección (o la ciudad guardada) hasta que elija otra.
            if (value || guardado) onChange(null)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          // Enter no envía el formulario que lo contiene (p. ej. datos de la
          // factura): si la lista está abierta, elige el primer resultado.
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (open && !loading && results.length > 0 && !value) handleSelect(results[0])
          }}
          placeholder={placeholder}
          aria-invalid={!!error || !!avisoGuardado}
          aria-describedby={error || avisoGuardado || textoAyuda ? ayudaId : undefined}
          className={`w-full min-h-11 rounded-lg border pl-3 pr-10 py-2 text-base sm:text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            error ? 'border-red-300 bg-red-50' : avisoGuardado ? 'border-amber-300 bg-amber-50' : 'border-gray-300'
          }`}
          autoComplete="off"
        />
        {(value || avisoGuardado) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-gray-500 hover:text-gray-600"
            aria-label="Limpiar"
          >
            <IconX size={14} aria-hidden />
          </button>
        )}
      </div>

      {open && !disabled && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Buscando…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
          ) : (
            results.map((m) => {
              // «Caldas, Antioquia»; Bogotá sin repetir su departamento.
              const departamento = departamentoSiDistinto(m.name, m.department.name)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m)}
                  className="w-full min-h-11 text-left px-3 py-2.5 text-sm hover:bg-primary-50 focus:bg-primary-50 focus:outline-none"
                >
                  <span className="font-medium text-gray-900">{m.name}</span>
                  {departamento && <span className="text-gray-500">, {departamento}</span>}
                </button>
              )
            })
          )}
        </div>
      )}

      {error ? (
        <p id={ayudaId} className="mt-1 text-xs text-red-600">{error}</p>
      ) : avisoGuardado ? (
        <p id={ayudaId} className="mt-1 flex items-start gap-1.5 text-xs text-amber-800">
          <IconAlertTriangle size={14} className="mt-px shrink-0" aria-hidden />
          <span>«{textoGuardado}» no está en el listado oficial de municipios. Búsquelo y elíjalo de la lista.</span>
        </p>
      ) : textoAyuda ? (
        <p id={ayudaId} className="mt-1 text-xs text-gray-500">{textoAyuda}</p>
      ) : null}
    </div>
  )
}
