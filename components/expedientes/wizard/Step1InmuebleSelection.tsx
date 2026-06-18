/**
 * Step1InmuebleSelection - HP-247
 * Paso 1: Seleccion de inmueble para el expediente
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  IconSearch,
  IconLoader,
  IconX,
  IconHome,
  IconMapPin,
  IconAlertTriangle,
} from '@/components/icons'
import { formatCurrency } from '@/lib/constants'
import { inmuebleService } from '@/services/inmuebleService'
import { expedienteService } from '@/services/expedienteService'
import { useAuthStore } from '@/stores/auth.store'
import type { IInmueble } from '@/types/inmueble'
import type { WizardStep1Data } from '@/hooks/useExpedienteWizard'
import { WIZARD_MESSAGES } from './constants'
import { cn } from '@/lib/utils'

interface Step1InmuebleSelectionProps {
  data: WizardStep1Data
  errors: Record<string, string>
  onUpdate: (data: Partial<WizardStep1Data>) => void
}

const DEBOUNCE_MS = 300
const MIN_SEARCH_CHARS = 2
// Limite del dropdown "Mis inmuebles" (propietario/inmobiliaria). Si tienen
// mas, los excedentes se encuentran via el buscador como antes.
const MIS_INMUEBLES_LIMIT = 50

export function Step1InmuebleSelection({
  data,
  errors,
  onUpdate,
}: Step1InmuebleSelectionProps) {
  const userRol = useAuthStore((s) => s.user?.rol)
  // Propietario/inmobiliaria ven dropdown directo con sus propios inmuebles.
  // Admin/operador siempre usan el buscador (catalogo completo).
  const usaDropdownPropios = userRol === 'propietario' || userRol === 'inmobiliaria'

  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<IInmueble[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isCheckingExpediente, setIsCheckingExpediente] = useState(false)
  const [activeExpedienteInfo, setActiveExpedienteInfo] = useState<{
    numero: string
    estado: string
  } | null>(null)

  // "Mis inmuebles" — solo para propietario/inmobiliaria. El backend ya
  // filtra automaticamente por propietario_id = req.user.id en este rol.
  const [misInmuebles, setMisInmuebles] = useState<IInmueble[]>([])
  const [isLoadingMios, setIsLoadingMios] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  // Marca para auto-seleccionar el único inmueble solo una vez.
  const autoSelectedRef = useRef(false)

  // Fetch de "mis inmuebles" al montar (solo si aplica al rol).
  useEffect(() => {
    if (!usaDropdownPropios) return
    let cancelled = false
    setIsLoadingMios(true)
    inmuebleService
      .getInmuebles({ estado: 'disponible', limit: MIS_INMUEBLES_LIMIT })
      .then((res) => {
        if (!cancelled) setMisInmuebles(res.data)
      })
      .catch(() => {
        // Falla no bloqueante — el buscador sigue funcionando como fallback.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMios(false)
      })
    return () => {
      cancelled = true
    }
  }, [usaDropdownPropios])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Buscar inmuebles con debounce
  const searchInmuebles = useCallback(async (term: string) => {
    if (term.length < MIN_SEARCH_CHARS) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await inmuebleService.getInmuebles({
        search: term,
        estado: 'disponible',
        limit: 10,
      })
      setSearchResults(response.data)
      setShowDropdown(true)
    } catch (err) {
      console.error('Error searching inmuebles:', err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Manejar cambio en busqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      searchInmuebles(value)
    }, DEBOUNCE_MS)
  }

  // Seleccionar inmueble
  const handleSelectInmueble = async (inmueble: IInmueble) => {
    setShowDropdown(false)
    setSearchTerm('')
    setIsCheckingExpediente(true)
    setActiveExpedienteInfo(null)

    try {
      // Verificar si el inmueble tiene expediente activo
      const result = await expedienteService.checkActiveExpediente(inmueble.id)

      if (result.hasActiveExpediente && result.expediente) {
        setActiveExpedienteInfo({
          numero: result.expediente.numero,
          estado: result.expediente.estado,
        })
      }

      onUpdate({
        inmueble,
        hasActiveExpediente: result.hasActiveExpediente,
      })
    } catch (err) {
      console.warn('Error al verificar expediente activo:', err)
      // En caso de error, permitir continuar
      onUpdate({
        inmueble,
        hasActiveExpediente: false,
      })
    } finally {
      setIsCheckingExpediente(false)
    }
  }

  // Limpiar seleccion
  const handleClearSelection = () => {
    autoSelectedRef.current = true // no volver a auto-seleccionar tras limpiar a propósito
    setActiveExpedienteInfo(null)
    onUpdate({
      inmueble: null,
      hasActiveExpediente: false,
    })
  }

  // Auto-seleccionar cuando el usuario tiene exactamente 1 inmueble disponible:
  // en ese caso elegirlo a mano es un paso de más. Solo una vez (ref) y si no
  // hay nada seleccionado; si lo quita con la X, no se vuelve a forzar.
  useEffect(() => {
    if (autoSelectedRef.current || !usaDropdownPropios || data.inmueble) return
    if (misInmuebles.length === 1) {
      autoSelectedRef.current = true
      void handleSelectInmueble(misInmuebles[0])
    }
    // handleSelectInmueble se omite a propósito de las deps (no memoizado);
    // el ref evita re-disparos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [misInmuebles, usaDropdownPropios, data.inmueble])

  return (
    <div className="space-y-6">
      {/* Header del paso */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {WIZARD_MESSAGES.STEP1_TITLE}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {WIZARD_MESSAGES.STEP1_SUBTITLE}
        </p>
      </div>

      {/* Si no hay inmueble seleccionado, mostrar selector */}
      {!data.inmueble ? (
        <div className="space-y-4">
          {/* Quick-pick: dropdown nativo con "Mis inmuebles" para propietario
              e inmobiliaria. Aparece arriba del buscador para que en el caso
              comun (pocos inmuebles propios) elijan en un solo click. */}
          {usaDropdownPropios && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mis inmuebles disponibles
              </label>
              {isLoadingMios ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <IconLoader size={16} className="animate-spin" /> Cargando tus inmuebles...
                </div>
              ) : misInmuebles.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No tienes inmuebles disponibles. Usa el buscador de abajo para ver el catálogo completo.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {misInmuebles.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => handleSelectInmueble(i)}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-primary-400 hover:bg-primary-50/40 text-left transition-colors"
                    >
                      <div className="shrink-0 w-14 h-14 bg-gray-100 rounded-lg overflow-hidden">
                        {i.foto_fachada_url ? (
                          <Image
                            src={i.foto_fachada_url}
                            alt={i.direccion}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <IconHome size={20} className="text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {i.codigo} · {i.direccion}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{i.ciudad}</p>
                        <p className="text-sm font-semibold text-primary-600">
                          {formatCurrency(i.valor_arriendo)}/mes
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                ¿No lo encuentras aquí? Usa el buscador de abajo para ver el catálogo completo.
              </p>
            </div>
          )}

          <div className="relative" ref={dropdownRef}>
          {/* Input de busqueda */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {isSearching ? (
                <IconLoader size={20} className="text-gray-400 animate-spin" />
              ) : (
                <IconSearch size={20} className="text-gray-400" />
              )}
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={WIZARD_MESSAGES.SEARCH_INMUEBLE_PLACEHOLDER}
              className={cn(
                'block w-full pl-10 pr-4 py-3 border rounded-lg text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                errors.inmueble ? 'border-red-300' : 'border-gray-300'
              )}
            />
          </div>

          {/* Mensaje de minimo de caracteres */}
          {searchTerm.length > 0 && searchTerm.length < MIN_SEARCH_CHARS && (
            <p className="mt-2 text-xs text-gray-500">
              {WIZARD_MESSAGES.MIN_SEARCH_CHARS}
            </p>
          )}

          {/* Dropdown de resultados */}
          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <IconHome size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">{WIZARD_MESSAGES.NO_INMUEBLES_FOUND}</p>
                </div>
              ) : (
                <ul>
                  {searchResults.map((inmueble) => (
                    <li key={inmueble.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectInmueble(inmueble)}
                        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        {/* Foto miniatura */}
                        <div className="shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                          {inmueble.foto_fachada_url ? (
                            <Image
                              src={inmueble.foto_fachada_url}
                              alt={inmueble.direccion}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <IconHome size={24} className="text-gray-300" />
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {inmueble.codigo} - {inmueble.direccion}
                          </p>
                          <p className="text-xs text-gray-500">
                            {inmueble.ciudad}, {inmueble.departamento}
                          </p>
                          <p className="text-sm font-semibold text-primary-600 mt-1">
                            {formatCurrency(inmueble.valor_arriendo)}/mes
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Error de validacion */}
          {errors.inmueble && (
            <p className="mt-2 text-sm text-red-600">{errors.inmueble}</p>
          )}
          </div>
        </div>
      ) : (
        // Inmueble seleccionado - mostrar card
        <div className="space-y-4">
          {/* Verificando expediente activo */}
          {isCheckingExpediente && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <IconLoader size={16} className="animate-spin" />
              <span>Verificando disponibilidad...</span>
            </div>
          )}

          {/* Aviso informativo de expediente activo */}
          {data.hasActiveExpediente && activeExpedienteInfo && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <IconAlertTriangle size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Este inmueble ya tiene un expediente activo
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Expediente: <span className="font-medium">{activeExpedienteInfo.numero}</span> (estado: {activeExpedienteInfo.estado})
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Puede continuar y crear otro expediente para este inmueble.
                </p>
              </div>
            </div>
          )}

          {/* Card del inmueble seleccionado */}
          <div className={cn(
            'border rounded-lg overflow-hidden',
            data.hasActiveExpediente ? 'border-blue-300' : 'border-gray-200'
          )}>
            {/* Imagen */}
            <div className="relative h-48 bg-gray-100">
              {data.inmueble.foto_fachada_url ? (
                <Image
                  src={data.inmueble.foto_fachada_url}
                  alt={data.inmueble.direccion}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <IconHome size={48} className="text-gray-300" />
                </div>
              )}
              {/* Boton para quitar */}
              <button
                type="button"
                onClick={handleClearSelection}
                className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
              >
                <IconX size={16} className="text-gray-600" />
              </button>
            </div>

            {/* Info */}
            <div className="p-4 space-y-3">
              {/* Codigo y tipo */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">
                  {data.inmueble.codigo}
                </span>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full capitalize">
                  {data.inmueble.tipo}
                </span>
              </div>

              {/* Direccion */}
              <div className="flex items-start gap-2">
                <IconMapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {data.inmueble.direccion}
                  </p>
                  <p className="text-xs text-gray-500">
                    {data.inmueble.ciudad}, {data.inmueble.departamento}
                  </p>
                </div>
              </div>

              {/* Detalles */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">
                    {data.inmueble.habitaciones}
                  </p>
                  <p className="text-xs text-gray-500">Habitaciones</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">
                    {data.inmueble.banos}
                  </p>
                  <p className="text-xs text-gray-500">Banos</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">
                    {data.inmueble.estrato}
                  </p>
                  <p className="text-xs text-gray-500">Estrato</p>
                </div>
              </div>

              {/* Precio */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-2xl font-bold text-primary-600">
                  {formatCurrency(data.inmueble.valor_arriendo)}
                  <span className="text-sm font-normal text-gray-500">/mes</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
