'use client'

/**
 * Hook de Expedientes - HP-229 + Bandejas Operativas
 * Maneja la lista de expedientes con sincronización de URL, debounce, ordenamiento y bandejas
 */

import { useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useUltimaPeticion } from '@/hooks/useUltimaPeticion'
import { toast } from 'sonner'
import { useExpedientesStore, DEFAULT_EXPEDIENTE_FILTERS } from '@/stores/expedientesStore'
import { expedienteService } from '@/services/expedienteService'
import { ApiClientError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import type { IExpedienteFilters, EstadoExpediente, EstudioFiltro } from '@/types/expediente'
import {
  clavePestana,
  esRolCofianza,
  ESTUDIO_FILTROS,
  filtrosDesdeUrl,
  soloCambioLaBusqueda,
  urlDeFiltros,
} from '@/lib/filtrosExpedientes'

/** Los chips que solo acepta la API nueva (reporte de Gerencia, punto 6); `condicionado` es su unión. */
const FILTROS_ADENDA5: EstudioFiltro[] = ['segundo_firmante', 'bloqueado', 'revision_cofianza']

/** Los filtros del reporte de la Oficina Virtual (25-nov): una API anterior los rechaza (400) y se vuelve a «Todos». */
const FILTROS_OFICINA_VIRTUAL: EstudioFiltro[] = ['cerrado', 'espera_autorizacion', 'sin_autorizar']

const DEBOUNCE_DELAY = 300

const EXPEDIENTE_MESSAGES = {
  FETCH_ERROR: 'Error al cargar los estudios',
  STATS_ERROR: 'Error al cargar estadísticas',
  ANALISTAS_ERROR: 'Error al cargar analistas',
}

/** `conStats: false` para vistas que no muestran las estadísticas de estudios (una llamada menos). */
export function useExpedientes({ conStats = true }: { conStats?: boolean } = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Los filtros de la carga anterior: solo un cambio de la búsqueda espera (debounce).
  const filtrosPreviosRef = useRef<IExpedienteFilters | null>(null)
  const initializedRef = useRef(false)

  // Auth
  const user = useAuthStore((state) => state.user)

  // Estado del store
  const expedientes = useExpedientesStore((state) => state.expedientes)
  const meta = useExpedientesStore((state) => state.meta)
  const stats = useExpedientesStore((state) => state.stats)
  const statsDe = useExpedientesStore((state) => state.statsDe)
  const filters = useExpedientesStore((state) => state.filters)
  const analistas = useExpedientesStore((state) => state.analistas)
  const inmobiliarias = useExpedientesStore((state) => state.inmobiliarias)
  const errorInmobiliarias = useExpedientesStore((state) => state.errorInmobiliarias)
  const sinFiltroInmobiliaria = useExpedientesStore((state) => state.sinFiltroInmobiliaria)
  const isLoading = useExpedientesStore((state) => state.isLoading)
  const isLoadingStats = useExpedientesStore((state) => state.isLoadingStats)
  const error = useExpedientesStore((state) => state.error)
  const selectedExpediente = useExpedientesStore((state) => state.selectedExpediente)
  const pestanaCargada = useExpedientesStore((state) => state.pestanaCargada)
  const activeBandeja = useExpedientesStore((state) => state.activeBandeja)
  const misExpedientes = useExpedientesStore((state) => state.misExpedientes)

  // Acciones del store
  const setExpedientes = useExpedientesStore((state) => state.setExpedientes)
  const setMeta = useExpedientesStore((state) => state.setMeta)
  const setStats = useExpedientesStore((state) => state.setStats)
  const setFilters = useExpedientesStore((state) => state.setFilters)
  const setAnalistas = useExpedientesStore((state) => state.setAnalistas)
  const setInmobiliarias = useExpedientesStore((state) => state.setInmobiliarias)
  const setSinFiltroInmobiliaria = useExpedientesStore((state) => state.setSinFiltroInmobiliaria)
  const setLoading = useExpedientesStore((state) => state.setLoading)
  const setLoadingStats = useExpedientesStore((state) => state.setLoadingStats)
  const setError = useExpedientesStore((state) => state.setError)
  const setSelectedExpediente = useExpedientesStore((state) => state.setSelectedExpediente)
  const setPestanaCargada = useExpedientesStore((state) => state.setPestanaCargada)
  const resetFilters = useExpedientesStore((state) => state.resetFilters)
  const toggleEstadoFilter = useExpedientesStore((state) => state.toggleEstadoFilter)
  const storeSetActiveBandeja = useExpedientesStore((state) => state.setActiveBandeja)
  const storeSetMisExpedientes = useExpedientesStore((state) => state.setMisExpedientes)

  /**
   * Sincroniza URL params -> Store (al montar)
   */
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // Filtros de la URL (al volver a la lista o al abrir un enlace compartido): solo lo válido
    // (filtrosDesdeUrl). El de inmobiliaria, solo para Cofianza.
    const yo = useAuthStore.getState().user
    const urlFilters = filtrosDesdeUrl(searchParams, { conInmobiliaria: esRolCofianza(yo?.rol) })
    // Sincronizar bandeja si es un solo estado
    if (urlFilters.estado?.length === 1) storeSetActiveBandeja(urlFilters.estado[0])
    // «Asignados a mí» es el analista = quien mira: al volver, el interruptor sigue encendido.
    if (urlFilters.analista_id && urlFilters.analista_id === yo?.id) storeSetMisExpedientes(true)

    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters)
    }
  }, [searchParams, setFilters, storeSetActiveBandeja, storeSetMisExpedientes])

  // El banner de bloqueos enlaza a ?estudio_filtro=requiere_accion. El efecto
  // de arriba corre una sola vez: con la lista ya montada, el filtro se aplica aquí.
  const estudioFiltroUrl = searchParams.get('estudio_filtro') as EstudioFiltro | null
  useEffect(() => {
    if (!estudioFiltroUrl || !ESTUDIO_FILTROS.includes(estudioFiltroUrl)) return
    if (estudioFiltroUrl !== useExpedientesStore.getState().filters.estudio_filtro) {
      setFilters({ estudio_filtro: estudioFiltroUrl, page: 1 })
    }
  }, [estudioFiltroUrl, setFilters])

  /**
   * Actualiza URL cuando cambian los filtros
   */
  const updateUrl = useCallback(
    (newFilters: IExpedienteFilters) => {
      // Los filtros en la URL: volver atrás o compartir el enlace conserva la vista (urlDeFiltros).
      const queryString = urlDeFiltros(newFilters, DEFAULT_EXPEDIENTE_FILTERS)
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      router.replace(newUrl, { scroll: false })
    },
    [pathname, router]
  )

  /**
   * Carga expedientes desde la API
   */
  // Número de la última petición: una respuesta vieja (búsqueda o filtro
  // anterior que tardó más) se descarta en vez de pisar la vigente.
  const iniciarPeticion = useUltimaPeticion()
  const fetchExpedientes = useCallback(async () => {
    const vigente = iniciarPeticion()
    const pestana = clavePestana(filters)
    setLoading(true)
    setError(null)

    try {
      // El filtro de inmobiliaria es solo de Cofianza: nunca viaja con otro rol (la API lo rechazaría).
      const consulta = esRolCofianza(useAuthStore.getState().user?.rol) ? filters : { ...filters, inmobiliaria_id: '' }
      const response = await expedienteService.getExpedientes(consulta)
      if (!vigente()) return
      setExpedientes(response.data)
      setMeta(response.meta)
      setPestanaCargada(pestana)
    } catch (err) {
      if (!vigente()) return
      // Una API anterior no conoce los chips de la Adenda 5 (p. ej. llegan en la URL) y responde 400:
      // se cae a «Condicionados», su unión, sin mostrar un error.
      if (
        err instanceof ApiClientError &&
        err.statusCode === 400 &&
        filters.estudio_filtro &&
        FILTROS_ADENDA5.includes(filters.estudio_filtro)
      ) {
        setFilters({ estudio_filtro: 'condicionado', page: 1 })
        return
      }
      if (err instanceof ApiClientError && err.statusCode === 400 && filters.estudio_filtro && FILTROS_OFICINA_VIRTUAL.includes(filters.estudio_filtro)) {
        setFilters({ estudio_filtro: 'todos', page: 1 })
        return
      }
      const message = err instanceof Error ? err.message : EXPEDIENTE_MESSAGES.FETCH_ERROR
      setError(message)
      toast.error(message)
    } finally {
      if (vigente()) setLoading(false)
    }
  }, [filters, iniciarPeticion, setLoading, setError, setExpedientes, setMeta, setPestanaCargada, setFilters])

  /**
   * Carga estadísticas de expedientes
   */
  // Con el filtro «Inmobiliaria» (solo Cofianza) los conteos de las pestañas son de esa organización: se piden de nuevo
  // al cambiarlo y, mientras llegan, la lista sabe que los que tiene son de otro filtro (statsVigentes).
  const inmobiliariaFiltro = esRolCofianza(user?.rol) && !sinFiltroInmobiliaria ? (filters.inmobiliaria_id ?? '') : ''
  const iniciarPeticionStats = useUltimaPeticion()
  const fetchStats = useCallback(async () => {
    const vigente = iniciarPeticionStats()
    setLoadingStats(true)

    try {
      const statsData = await expedienteService.getStats(inmobiliariaFiltro ? { inmobiliaria_id: inmobiliariaFiltro } : undefined)
      if (!vigente()) return
      setStats(statsData, inmobiliariaFiltro)
    } catch (err) {
      console.error('Error loading stats:', err)
    } finally {
      if (vigente()) setLoadingStats(false)
    }
  }, [iniciarPeticionStats, inmobiliariaFiltro, setLoadingStats, setStats])

  /**
   * Organizaciones del filtro «Inmobiliaria» (solo Cofianza; una vez: quedan en el store).
   */
  const fetchInmobiliarias = useCallback(async () => {
    const st = useExpedientesStore.getState()
    if (!esRolCofianza(useAuthStore.getState().user?.rol) || st.inmobiliarias || st.sinFiltroInmobiliaria) return
    // Reintento tras un error: «Cargando…» mientras tanto.
    if (st.errorInmobiliarias) setInmobiliarias(null, false)
    try {
      setInmobiliarias(await expedienteService.getInmobiliariasFiltro())
    } catch (err) {
      // Una API anterior a esta función no tiene la ruta (cae en GET /:id y su validación del uuid: 400) ni el filtro
      // (lo descartaría en silencio): no se muestra ni se envía, para no decir «Inmobiliaria: X» con la lista de todas.
      if (err instanceof ApiClientError && (err.statusCode === 404 || (err.statusCode === 400 && err.code === 'VALIDATION_ERROR'))) {
        setSinFiltroInmobiliaria(true)
        if (useExpedientesStore.getState().filters.inmobiliaria_id) setFilters({ inmobiliaria_id: '', page: 1 })
        return
      }
      console.error('Error loading inmobiliarias:', err)
      setInmobiliarias(null, true)
    }
  }, [setInmobiliarias, setSinFiltroInmobiliaria, setFilters])

  /**
   * Carga lista de analistas para filtro
   */
  const fetchAnalistas = useCallback(async () => {
    try {
      const analistasData = await expedienteService.getAnalistas()
      setAnalistas(analistasData)
    } catch (err) {
      console.error('Error loading analistas:', err)
    }
  }, [setAnalistas])

  /**
   * Efecto para cargar expedientes cuando cambian los filtros. Solo la búsqueda espera a que se deje
   * de escribir (debounce); el chip, la bandeja, el orden, la página y la primera carga van ya (reporte
   * de Gerencia, punto 12: antes todo esperaba 300 ms mostrando la lista anterior).
   */
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    const espera = soloCambioLaBusqueda(filtrosPreviosRef.current, filters) ? DEBOUNCE_DELAY : 0
    filtrosPreviosRef.current = filters
    // También sin espera va en un temporizador: si los filtros cambian en el mismo instante (la URL al
    // montar), la limpieza lo cancela y no sale una petición que se descartaría.
    debounceRef.current = setTimeout(() => {
      fetchExpedientes()
      updateUrl(filters)
    }, espera)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [filters, fetchExpedientes, updateUrl])

  /**
   * Cargar analistas y stats al montar
   */
  useEffect(() => {
    fetchAnalistas()
    fetchInmobiliarias()
  }, [fetchAnalistas, fetchInmobiliarias])

  // Las estadísticas, al montar y al cambiar el filtro de inmobiliaria. En un temporizador, como la lista: si el filtro
  // cambia en el mismo instante (la URL al montar), sale una sola petición.
  useEffect(() => {
    if (!conStats) return
    // Ya cuenta como «cargando»: las pestañas no muestran por un instante «sin conteo» antes de pedirlos.
    setLoadingStats(true)
    const t = setTimeout(() => void fetchStats(), 0)
    return () => clearTimeout(t)
  }, [fetchStats, conStats, setLoadingStats])

  /**
   * Actualiza filtros (con reset de página si no es cambio de página)
   */
  const handleFilterChange = useCallback(
    (newFilters: Partial<IExpedienteFilters>) => {
      if (!('page' in newFilters)) {
        setFilters({ ...newFilters, page: 1 })
      } else {
        setFilters(newFilters)
      }
    },
    [setFilters]
  )

  /**
   * Cambia el ordenamiento
   */
  const handleSort = useCallback(
    (column: IExpedienteFilters['sortBy']) => {
      const newOrder =
        filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc'
      setFilters({ sortBy: column, sortOrder: newOrder, page: 1 })
    },
    [filters.sortBy, filters.sortOrder, setFilters]
  )

  /**
   * Limpia filtros y recarga
   */
  const clearFilters = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  /**
   * Verifica si hay filtros activos (excluye bandeja). El responsable cuenta:
   * sin él, con uno elegido y la lista vacía, el estado vacío decía «Todavía
   * no tiene estudios» y no ofrecía «Limpiar filtros».
   */
  const hasActiveFilters = useCallback(() => {
    return (
      filters.search !== '' ||
      filters.fecha_desde !== '' ||
      filters.fecha_hasta !== '' ||
      filters.analista_id !== '' ||
      !!filters.miembro_responsable_id ||
      !!filters.inmobiliaria_id
    )
  }, [filters])

  /**
   * Selecciona una bandeja (filtra por estado)
   */
  const setActiveBandeja = useCallback(
    (bandeja: EstadoExpediente | null) => {
      storeSetActiveBandeja(bandeja)
    },
    [storeSetActiveBandeja]
  )

  /**
   * Toggle "Mis Expedientes" - filtra por analista_id del usuario logueado
   */
  const toggleMisExpedientes = useCallback(() => {
    const newValue = !misExpedientes
    storeSetMisExpedientes(newValue)

    if (newValue && user?.id) {
      setFilters({ analista_id: user.id, page: 1 })
    } else {
      setFilters({ analista_id: '', page: 1 })
    }
  }, [misExpedientes, user, storeSetMisExpedientes, setFilters])

  // Las filas son de la pestaña elegida (chip o bandeja). Si no, son de la anterior y no se muestran.
  const filasDeLaPestana = pestanaCargada === clavePestana(filters)

  return {
    // Estado
    expedientes,
    filasDeLaPestana,
    meta,
    stats,
    filters,
    analistas,
    /** Filtro «Inmobiliaria» (solo Cofianza): null = cargando. */
    inmobiliarias,
    errorInmobiliarias,
    /** La API no tiene el filtro: no se muestra. */
    sinFiltroInmobiliaria,
    reintentarInmobiliarias: fetchInmobiliarias,
    /** Los conteos de las pestañas son del filtro de inmobiliaria vigente (si no, todavía llegan los nuevos). */
    statsVigentes: statsDe === inmobiliariaFiltro,
    isLoading,
    isLoadingStats,
    error,
    selectedExpediente,

    // Bandejas
    activeBandeja,
    misExpedientes,
    setActiveBandeja,
    toggleMisExpedientes,

    // Acciones de filtros
    setFilters: handleFilterChange,
    clearFilters,
    handleSort,
    toggleEstadoFilter,
    hasActiveFilters,

    // Fetch
    fetchExpedientes,
    fetchStats,
    fetchAnalistas,

    // Selección
    setSelectedExpediente,
  }
}
