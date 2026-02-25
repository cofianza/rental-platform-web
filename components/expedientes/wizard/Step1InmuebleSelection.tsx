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

export function Step1InmuebleSelection({
  data,
  errors,
  onUpdate,
}: Step1InmuebleSelectionProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<IInmueble[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isCheckingExpediente, setIsCheckingExpediente] = useState(false)
  const [activeExpedienteInfo, setActiveExpedienteInfo] = useState<{
    numero: string
    estado: string
  } | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
    setActiveExpedienteInfo(null)
    onUpdate({
      inmueble: null,
      hasActiveExpediente: false,
    })
  }

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

      {/* Si no hay inmueble seleccionado, mostrar buscador */}
      {!data.inmueble ? (
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
          {errors.inmueble && !data.hasActiveExpediente && (
            <p className="mt-2 text-sm text-red-600">{errors.inmueble}</p>
          )}
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

          {/* Advertencia de expediente activo */}
          {data.hasActiveExpediente && activeExpedienteInfo && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <IconAlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {WIZARD_MESSAGES.INMUEBLE_HAS_ACTIVE_EXPEDIENTE}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Expediente: <span className="font-medium">{activeExpedienteInfo.numero}</span> (estado: {activeExpedienteInfo.estado})
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Seleccione otro inmueble para continuar.
                </p>
              </div>
            </div>
          )}

          {/* Card del inmueble seleccionado */}
          <div className={cn(
            'border rounded-lg overflow-hidden',
            data.hasActiveExpediente ? 'border-amber-300' : 'border-gray-200'
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
