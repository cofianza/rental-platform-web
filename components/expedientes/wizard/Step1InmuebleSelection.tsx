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
import { TIPO_LABELS } from '@/components/inmuebles/constants'
import { EstudiosActivosBadge } from '@/components/inmuebles/InmuebleBadges'
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

// Estado del inmueble → badge visual.
//
// Flujo de Gerencia §4.2 (CAMBIO APROBADO): tener estudios en curso YA NO
// bloquea la propiedad. Una inmobiliaria muestra el mismo inmueble a varios
// interesados y necesita evaluarlos en paralelo. Lo único que impide
// seleccionar es que la propiedad ya esté comprometida:
//   - 'ocupado' + reservado → un candidato aprobado tiene el contrato en curso
//   - 'ocupado' + arrendado → contrato vigente
//   - 'inactivo'            → el dueño la dio de baja
// 'en_estudio' quedó como legado (ya no se escribe) y por eso ahora SÍ es
// seleccionable: una fila histórica no puede seguir bloqueando.
const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  disponible: { label: 'Disponible', cls: 'bg-green-100 text-green-700' },
  en_estudio: { label: 'Disponible', cls: 'bg-green-100 text-green-700' },
  ocupado: { label: 'Arrendado', cls: 'bg-gray-200 text-gray-700' },
  inactivo: { label: 'Inactivo', cls: 'bg-gray-100 text-gray-500' },
}
function estadoBadge(i: IInmueble) {
  if (i.estado === 'ocupado' && i.reservado && !i.arrendado) {
    return { label: 'Reservado', cls: 'bg-amber-100 text-amber-700' }
  }
  return ESTADO_BADGE[i.estado] ?? { label: i.estado, cls: 'bg-gray-100 text-gray-600' }
}

/** §4.2: solo una propiedad comprometida deja de admitir candidatos. */
function esSeleccionable(i: IInmueble): boolean {
  return i.estado !== 'ocupado' && i.estado !== 'inactivo'
}

function motivoNoSeleccionable(i: IInmueble): string {
  if (i.estado === 'inactivo') return 'Inactivo: reactívalo desde el detalle del inmueble'
  if (i.reservado && !i.arrendado) {
    return 'Reservado: hay un candidato aprobado y el contrato está en proceso.'
  }
  return 'Ya está arrendado (contrato firmado)'
}
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

  // Fetch de "mis inmuebles" al montar (solo si aplica al rol).
  useEffect(() => {
    if (!usaDropdownPropios) return
    let cancelled = false
    setIsLoadingMios(true)
    inmuebleService
      // Sin filtro de estado: mostramos TODOS sus inmuebles con su badge de
      // estado (disponible / en estudio / arrendado) para que vea cuáles están
      // bloqueados; solo los 'disponible' se pueden seleccionar.
      .getInmuebles({ limit: MIS_INMUEBLES_LIMIT })
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
      // Sin filtro de estado (§4.2): una propiedad con estudios en curso sigue
      // siendo 'disponible' y debe encontrarse; las comprometidas también se
      // listan, con su badge, y son las únicas no seleccionables. §4.1 pide
      // buscar por código, dirección o ciudad — de eso ya se encarga
      // search_inmueble_ids con unaccent() en el backend.
      const response = await inmuebleService.getInmuebles({
        search: term,
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
        <h2 className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-gray-900">
          <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
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
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-gray-500">
                Mis inmuebles
              </label>
              {isLoadingMios ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <IconLoader size={16} className="animate-spin" /> Cargando tus inmuebles...
                </div>
              ) : misInmuebles.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No tienes inmuebles. Usa el buscador de abajo para ver el catálogo completo.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {misInmuebles.map((i) => {
                    const seleccionable = esSeleccionable(i)
                    const badge = estadoBadge(i)
                    const motivoBloqueo = motivoNoSeleccionable(i)
                    const card = (
                      <>
                        <div className="shrink-0 w-14 h-14 bg-gray-100 rounded-lg overflow-hidden">
                          {i.foto_fachada_url ? (
                            <Image src={i.foto_fachada_url} alt={i.direccion} width={56} height={56} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <IconHome size={20} className="text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{i.codigo} · {i.direccion}</p>
                            <span className={cn('shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide', badge.cls)}>
                              {badge.label}
                            </span>
                            {/* §4.2: el indicador informa, no impide seleccionar. */}
                            <EstudiosActivosBadge count={i.estudios_activos} reservado={i.reservado} arrendado={i.arrendado} />
                          </div>
                          <p className="text-xs text-gray-500 truncate">{i.ciudad}</p>
                          {seleccionable ? (
                            <p className="text-sm font-bold text-primary-600">{formatCurrency(i.valor_arriendo)}/mes</p>
                          ) : (
                            <p className="text-xs text-gray-500">{motivoBloqueo}</p>
                          )}
                        </div>
                      </>
                    )
                    return seleccionable ? (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => handleSelectInmueble(i)}
                        className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition-colors hover:border-primary-400 hover:bg-primary-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      >
                        {card}
                      </button>
                    ) : (
                      <div
                        key={i.id}
                        title={motivoBloqueo}
                        className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 opacity-70"
                      >
                        {card}
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Puedes evaluar varios candidatos para la misma propiedad al tiempo. Solo se reserva cuando uno queda aprobado. ¿No la encuentras? Usa el buscador.
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
                'block w-full rounded-lg border py-3 pl-10 pr-4 text-base sm:text-sm',
                'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500',
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
            <div className="absolute z-10 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
              {searchResults.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <IconHome size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">{WIZARD_MESSAGES.NO_INMUEBLES_FOUND}</p>
                </div>
              ) : (
                <ul>
                  {searchResults.map((inmueble) => {
                    // El buscador ya no filtra por estado (§4.2): lista todo lo
                    // que coincida y marca lo comprometido, en vez de esconderlo.
                    const seleccionable = esSeleccionable(inmueble)
                    const badge = estadoBadge(inmueble)
                    return (
                    <li key={inmueble.id}>
                      <button
                        type="button"
                        disabled={!seleccionable}
                        title={seleccionable ? undefined : motivoNoSeleccionable(inmueble)}
                        onClick={() => handleSelectInmueble(inmueble)}
                        className={cn(
                          'w-full px-4 py-3 flex items-start gap-3 transition-colors text-left',
                          seleccionable ? 'hover:bg-gray-50' : 'cursor-not-allowed bg-gray-50 opacity-70',
                        )}
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
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {inmueble.codigo} - {inmueble.direccion}
                            </p>
                            <span className={cn('shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide', badge.cls)}>
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {inmueble.ciudad}, {inmueble.departamento}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <p className="text-sm font-semibold text-primary-600">
                              {formatCurrency(inmueble.valor_arriendo)}/mes
                            </p>
                            <EstudiosActivosBadge count={inmueble.estudios_activos} reservado={inmueble.reservado} arrendado={inmueble.arrendado} />
                          </div>
                          {!seleccionable && (
                            <p className="mt-1 text-xs text-gray-500">{motivoNoSeleccionable(inmueble)}</p>
                          )}
                        </div>
                      </button>
                    </li>
                    )
                  })}
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
                  {(data.inmueble?.estudios_activos ?? 0) > 0
                    ? `Este inmueble ya tiene ${data.inmueble?.estudios_activos} ${(data.inmueble?.estudios_activos ?? 0) === 1 ? 'estudio' : 'estudios'} en curso.`
                    : 'Este inmueble ya tiene un expediente activo'}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Expediente: <span className="font-medium">{activeExpedienteInfo.numero}</span> (estado: {activeExpedienteInfo.estado})
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Puedes iniciar otro; la propiedad se reserva únicamente cuando uno quede aprobado.
                </p>
              </div>
            </div>
          )}

          {/* Card del inmueble seleccionado */}
          <div className={cn(
            'overflow-hidden rounded-xl border',
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
              {/* Codigo + estado + tipo */}
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-500 truncate">
                    {data.inmueble.codigo}
                  </span>
                  <span className={cn('shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide', estadoBadge(data.inmueble).cls)}>
                    {estadoBadge(data.inmueble).label}
                  </span>
                  <EstudiosActivosBadge count={data.inmueble.estudios_activos} reservado={data.inmueble.reservado} arrendado={data.inmueble.arrendado} />
                </span>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full shrink-0">
                  {TIPO_LABELS[data.inmueble.tipo as keyof typeof TIPO_LABELS] || data.inmueble.tipo}
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
                  <p className="text-xl font-black leading-none tracking-tight text-gray-900">
                    {data.inmueble.habitaciones}
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">Habitaciones</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black leading-none tracking-tight text-gray-900">
                    {data.inmueble.banos}
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">Baños</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black leading-none tracking-tight text-gray-900">
                    {data.inmueble.estrato}
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">Estrato</p>
                </div>
              </div>

              {/* Precio */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-2xl font-black tracking-tight text-primary-600">
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
