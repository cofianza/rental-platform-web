'use client'

/**
 * Vista Detalle de Inmueble - HP-180
 * Muestra toda la información del inmueble con acciones contextuales
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'

import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ConfirmDialog } from '@/components/ui'
import {
  EstratoIndicator,
  InmuebleDetailSkeleton,
  ExpedientesSection,
  HistorialSection,
  GaleriaSection,
  PlantillaContratoPreview,
} from '@/components/inmuebles'
import type { IExpediente } from '@/types/expediente'
import { TIPO_LABELS, ESTADO_LABELS, ESTADO_BADGE_CLASSES } from '@/components/inmuebles/constants'
import { ResponsableMiembroCard } from '@/components/equipo/ResponsableMiembroCard'
import {
  IconArrowLeft,
  IconEdit,
  IconMapPin,
  IconBed,
  IconBath,
  IconCar,
  IconRuler,
  IconBuilding2,
  IconUser,
  IconPhone,
  IconMail,
  IconGlobe,
  IconPlay,
  IconPower,
  IconExternalLink,
  IconInfo,
  IconHistory,
  IconImages,
  IconFolderOpen,
  IconFileText,
  IconLoader,
  IconRefresh,
} from '@/components/icons'
import { inmuebleService } from '@/services/inmuebleService'
import { contratoService } from '@/services/contratoService'
import { ContratoTransicionModal } from '@/components/expedientes/ContratoTransicionModal'
import { useAuthStore } from '@/stores/auth.store'
import { useInmueblesStore } from '@/stores/inmuebles.store'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/constants'
import type { IInmueble, EstadoInmueble } from '@/types/inmueble'
import type { EstadoContrato } from '@/types/contrato'
import { cn } from '@/lib/utils'

type TabId = 'info' | 'expedientes' | 'historial' | 'galeria' | 'contrato'

export default function InmuebleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const user = useAuthStore((state) => state.user)

  const [inmueble, setInmueble] = useState<IInmueble | null>(null)
  const [expedientes, setExpedientes] = useState<IExpediente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingExpedientes, setIsLoadingExpedientes] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('info')
  // Keep-alive del tab Contrato: se monta en la primera visita y luego solo se
  // oculta con CSS — evita re-pedir el preview compilado en cada entrada al tab.
  const [contratoTabVisitado, setContratoTabVisitado] = useState(false)
  useEffect(() => {
    if (activeTab === 'contrato') setContratoTabVisitado(true)
  }, [activeTab])
  // Al navegar detalle→detalle (mismo componente, id distinto) resetear el
  // keep-alive y el tab: si no, el preview del contrato se montaría (oculto)
  // para el inmueble nuevo aunque nunca se abra el tab.
  useEffect(() => {
    setContratoTabVisitado(false)
    setActiveTab('info')
  }, [id])
  const [isTogglingVitrina, setIsTogglingVitrina] = useState(false)
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  // Contrato vigente del inmueble (cuando está 'ocupado') — para "Ver contrato"
  // y la acción "Terminar contrato" (que libera el inmueble).
  const [contratoVigente, setContratoVigente] = useState<{ id: string; estado: string } | null>(null)
  const [contratoVigenteResuelto, setContratoVigenteResuelto] = useState(false)
  const [showTerminarModal, setShowTerminarModal] = useState(false)
  const [transicionesContrato, setTransicionesContrato] = useState<Array<{ estado: EstadoContrato; label: string }>>([])
  const [terminarLoading, setTerminarLoading] = useState(false)

  // Permisos por rol
  const isAdmin = user?.rol === 'administrador'
  const isOperador = user?.rol === 'operador_analista'
  const isPropietario = user?.rol === 'propietario'
  const isInmobiliaria = user?.rol === 'inmobiliaria'
  // Miembro solo_lectura de la org: el API le niega TODA mutación (deny por
  // defecto del middleware); no pintarle Editar/Terminar/toggle para que no
  // descubra el bloqueo con un 403. (rol_miembro llega vía /auth/me; si aún no
  // está cargado se comporta como antes.)
  const isViewer = isInmobiliaria && user?.rol_miembro === 'solo_lectura'
  const canEdit = (isAdmin || isOperador || isPropietario || isInmobiliaria) && !isViewer
  const canDeactivate = isAdmin
  const canCreate = (isAdmin || isOperador || isPropietario || isInmobiliaria) && !isViewer

  // Cargar inmueble.
  // opts.silent = refresco EN SITIO (p. ej. tras terminar el contrato): NO toca
  // isLoading — el skeleton de página completa desmontaría todas las secciones
  // y sus efectos de montaje re-dispararían sus fetches (mismo anti-patrón de
  // bucle corregido en contratos/[id]). Un refresco silencioso que falla
  // tampoco tumba la página ya renderizada: avisa por toast.
  const fetchInmueble = useCallback(async (opts?: { silent?: boolean }) => {
    if (!id) return null
    const silent = opts?.silent ?? false

    if (!silent) {
      setIsLoading(true)
      setError(null)
    }

    try {
      const data = await inmuebleService.getInmuebleById(id)
      setInmueble(data)
      // Mantener la lista (store zustand) en sincronía para que al volver a
      // /inmuebles no se vean badges/valores viejos.
      useInmueblesStore.getState().updateInmuebleInList(data)
      // Devolvemos el inmueble fresco para que el caller pueda decidir sobre
      // él sin esperar el re-render (p. ej. el toast tras terminar contrato).
      return data
    } catch (err) {
      console.error('Error fetching inmueble:', err)
      if (!silent) setError('No se pudo cargar el inmueble')
      else toast.error('No se pudo refrescar el inmueble')
      return null
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [id])

  // Cargar expedientes
  const fetchExpedientes = useCallback(async () => {
    if (!id) return

    setIsLoadingExpedientes(true)
    try {
      const result = await inmuebleService.getExpedientesByInmueble(id)
      setExpedientes(result.data)
    } catch (err) {
      console.error('Error fetching expedientes:', err)
    } finally {
      setIsLoadingExpedientes(false)
    }
  }, [id])

  useEffect(() => {
    fetchInmueble()
  }, [fetchInmueble])

  useEffect(() => {
    if (activeTab === 'expedientes') {
      fetchExpedientes()
    }
  }, [activeTab, fetchExpedientes])

  // Título dinámico de la página
  useEffect(() => {
    if (inmueble) {
      document.title = `${inmueble.codigo} | Cofianza`
    }
    return () => {
      document.title = 'Cofianza'
    }
  }, [inmueble])

  // Contrato vigente: solo cuando el inmueble está 'ocupado' (tiene arriendo
  // activo). Habilita "Ver contrato" y "Terminar contrato". `resuelto`
  // distingue "cargando" de "no hay contrato vigente" (p. ej. ocupado por una
  // renovación aún en firma) — antes ese caso mostraba un spinner perpetuo.
  useEffect(() => {
    if (inmueble?.estado === 'ocupado' && inmueble.id) {
      setContratoVigenteResuelto(false)
      inmuebleService.getContratoVigente(inmueble.id)
        .then(setContratoVigente)
        .catch(() => setContratoVigente(null))
        .finally(() => setContratoVigenteResuelto(true))
    } else {
      setContratoVigente(null)
      setContratoVigenteResuelto(true)
    }
  }, [inmueble?.estado, inmueble?.id])

  // Toggle visibilidad vitrina
  const handleToggleVitrina = async () => {
    if (!inmueble || isTogglingVitrina) return

    setIsTogglingVitrina(true)
    try {
      const updated = await inmuebleService.toggleVisibleVitrina(
        inmueble.id,
        !inmueble.visible_vitrina
      )
      setInmueble(updated)
      useInmueblesStore.getState().updateInmuebleInList(updated)
      toast.success(
        updated.visible_vitrina
          ? 'Inmueble visible en la vitrina'
          : 'Inmueble oculto de la vitrina'
      )
    } catch (err) {
      console.error('Error toggling vitrina:', err)
      toast.error(err instanceof Error ? err.message : 'Error al cambiar la visibilidad')
    } finally {
      setIsTogglingVitrina(false)
    }
  }

  // Desactivar inmueble
  const handleDeactivate = async () => {
    if (!inmueble || isDeactivating) return

    setIsDeactivating(true)
    try {
      await inmuebleService.deleteInmueble(inmueble.id)
      // Quitar de la lista cacheada antes de navegar: si no, el inmueble
      // desactivado "parpadea" en /inmuebles hasta el siguiente fetch.
      useInmueblesStore.getState().removeInmuebleFromList(inmueble.id)
      toast.success('Inmueble desactivado exitosamente')
      router.push('/inmuebles')
    } catch (err) {
      console.error('Error deactivating inmueble:', err)
      toast.error('Error al desactivar el inmueble')
    } finally {
      setIsDeactivating(false)
      setShowDeactivateDialog(false)
    }
  }

  // Reactivar inmueble
  const handleReactivate = async () => {
    if (!inmueble) return

    try {
      const updated = await inmuebleService.updateInmueble(inmueble.id, {
        estado: 'disponible' as EstadoInmueble,
      })
      setInmueble(updated)
      useInmueblesStore.getState().updateInmuebleInList(updated)
      toast.success('Inmueble reactivado exitosamente')
    } catch (err) {
      console.error('Error reactivating inmueble:', err)
      toast.error('Error al reactivar el inmueble')
    }
  }

  // Terminar/cancelar el contrato vigente → libera el inmueble (vuelve a
  // 'disponible', fuera de vitrina). Reusa el modal de transición de contratos.
  const handleAbrirTerminar = async () => {
    if (!contratoVigente) return
    try {
      const data = await contratoService.getTransicionesDisponibles(contratoVigente.id)
      setTransicionesContrato(data.transiciones_disponibles)
      setShowTerminarModal(true)
    } catch {
      toast.error('No se pudieron cargar las acciones del contrato')
    }
  }

  const handleConfirmarTerminar = async (
    estadoDestino: EstadoContrato,
    comentario: string,
    motivo?: string,
  ): Promise<boolean> => {
    if (!contratoVigente) return false
    setTerminarLoading(true)
    try {
      await contratoService.transicionar(contratoVigente.id, {
        nuevo_estado: estadoDestino,
        comentario,
        motivo,
      })
      setShowTerminarModal(false)
      // Refresco EN SITIO: sin skeleton de página completa (no desmonta tabs).
      const updated = await fetchInmueble({ silent: true })
      // El API puede haber saltado la liberación (guard de renovación: otro
      // contrato del expediente sigue vigente/en firma) → el inmueble sigue
      // ocupado. Re-resolver el contrato vigente explícitamente (el efecto por
      // [estado] no re-corre si el estado no cambió) y no mentir en el toast.
      if (updated?.estado === 'ocupado') {
        const cv = await inmuebleService.getContratoVigente(id).catch(() => null)
        setContratoVigente(cv)
        toast.success('Contrato actualizado. El inmueble sigue ocupado por otro contrato en curso.')
      } else {
        setContratoVigente(null)
        toast.success('Contrato actualizado. El inmueble quedó disponible para arrendar de nuevo.')
      }
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el contrato')
      return false
    } finally {
      setTerminarLoading(false)
    }
  }

  // Loading state
  if (isLoading) {
    return <InmuebleDetailSkeleton />
  }

  // Error state
  if (error || !inmueble) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Inmuebles', href: '/inmuebles' },
            { label: 'Error' },
          ]}
        />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconBuilding2 size={32} className="text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {error || 'Inmueble no encontrado'}
          </h2>
          <p className="text-gray-600 mb-6">
            El inmueble que buscas no existe o no tienes permisos para verlo.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => fetchInmueble()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <IconRefresh size={16} />
              Reintentar
            </button>
            <button
              onClick={() => router.push('/inmuebles')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <IconArrowLeft size={16} />
              Volver al listado
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Calcular total mensual
  const totalMensual = inmueble.valor_arriendo + (inmueble.administracion || 0)

  // Acciones contextuales según estado
  const getContextualActions = () => {
    const actions: React.ReactNode[] = []

    // Editar (siempre disponible para roles con permiso)
    if (canEdit) {
      actions.push(
        <Link
          key="edit"
          href={`/inmuebles/${inmueble.id}/editar`}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <IconEdit size={16} />
          Editar
        </Link>
      )
    }

    switch (inmueble.estado) {
      case 'disponible':
        if (canEdit) {
          actions.push(
            <Link
              key="iniciar-estudio"
              href={`/expedientes/nuevo?inmueble_id=${inmueble.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <IconPlay size={16} />
              Iniciar Estudio
            </Link>
          )
        }
        if (canDeactivate) {
          actions.push(
            <button
              key="deactivate"
              onClick={() => setShowDeactivateDialog(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <IconPower size={16} />
              Desactivar
            </button>
          )
        }
        break

      case 'en_estudio':
        // No se pueden iniciar nuevos estudios
        actions.push(
          <div
            key="blocked"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg cursor-not-allowed"
          >
            <IconPlay size={16} />
            <span>En estudio activo</span>
          </div>
        )
        break

      case 'ocupado':
        if (canEdit) {
          if (contratoVigente) {
            actions.push(
              <Link
                key="ver-contrato"
                href={`/contratos/${contratoVigente.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <IconExternalLink size={16} />
                Ver Contrato
              </Link>
            )
            actions.push(
              <button
                key="terminar-contrato"
                onClick={handleAbrirTerminar}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <IconPower size={16} />
                Terminar contrato
              </button>
            )
          } else if (!contratoVigenteResuelto) {
            actions.push(
              <span
                key="ver-contrato-loading"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-400"
              >
                <IconLoader size={16} className="animate-spin" />
                Cargando contrato…
              </span>
            )
          } else {
            // Ocupado sin contrato VIGENTE: típico de una renovación aún en
            // firma con el contrato padre ya finalizado. Antes esto era un
            // spinner perpetuo; el contrato en curso se gestiona desde el
            // expediente/detalle de contratos.
            actions.push(
              <span
                key="ver-contrato-en-proceso"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-500"
              >
                Ocupado por un contrato en proceso (p. ej. renovación en firma)
              </span>
            )
          }
        }
        break

      case 'inactivo':
        if (canDeactivate) {
          actions.push(
            <button
              key="reactivate"
              onClick={handleReactivate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <IconPower size={16} />
              Reactivar
            </button>
          )
        }
        break
    }

    return actions
  }

  const tabs = [
    { id: 'info' as TabId, label: 'Información', icon: IconInfo },
    { id: 'contrato' as TabId, label: 'Contrato', icon: IconFileText },
    { id: 'expedientes' as TabId, label: 'Expedientes', icon: IconFolderOpen },
    { id: 'historial' as TabId, label: 'Historial', icon: IconHistory },
    { id: 'galeria' as TabId, label: 'Galería', icon: IconImages },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Inmuebles', href: '/inmuebles' },
          { label: inmueble.codigo },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{inmueble.codigo}</h1>
            <span
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-full',
                ESTADO_BADGE_CLASSES[inmueble.estado]
              )}
            >
              {ESTADO_LABELS[inmueble.estado]}
            </span>
          </div>
          <p className="text-gray-500 flex items-center gap-1">
            <IconMapPin size={14} />
            {inmueble.direccion}, {inmueble.ciudad}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {getContextualActions()}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Image and details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero image */}
          <div className="relative aspect-video w-full bg-gray-100 rounded-lg overflow-hidden">
            {inmueble.foto_fachada_url ? (
              <Image
                src={inmueble.foto_fachada_url}
                alt={`Fachada de ${inmueble.codigo}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 66vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                <IconBuilding2 size={64} />
                <span className="mt-2 text-sm">Sin foto de fachada</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                        activeTab === tab.id
                          ? 'border-primary-600 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      )}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="p-4">
              {activeTab === 'info' && (
                <div className="space-y-6">
                  {/* Responsable (multi-tenant Fase 3) — solo inmobiliaria */}
                  {isInmobiliaria && (
                    <ResponsableMiembroCard
                      titulo="Responsable del inmueble"
                      ayuda='Si desactivaste "los miembros ven todo", el responsable verá este inmueble y sus expedientes.'
                      miembroResponsableId={inmueble.miembro_responsable_id}
                      onAssign={async (miembroId) => {
                        await inmuebleService.asignarResponsable(inmueble.id, miembroId)
                        setInmueble((prev) => (prev ? { ...prev, miembro_responsable_id: miembroId } : prev))
                      }}
                    />
                  )}
                  {/* Basic info */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Información Básica</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div>
                        <dt className="text-gray-500">Tipo</dt>
                        <dd className="text-gray-900 font-medium">
                          {TIPO_LABELS[inmueble.tipo]}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Uso</dt>
                        <dd className="text-gray-900 font-medium">
                          {inmueble.uso === 'vivienda'
                            ? 'Vivienda'
                            : inmueble.uso === 'mixto'
                              ? 'Mixto'
                              : 'Comercio'}
                        </dd>
                      </div>
                      {inmueble.destinacion && (
                        <div>
                          <dt className="text-gray-500">Destinación</dt>
                          <dd className="text-gray-900">{inmueble.destinacion}</dd>
                        </div>
                      )}
                      {inmueble.descripcion && (
                        <div className="sm:col-span-2">
                          <dt className="text-gray-500">Descripción</dt>
                          <dd className="text-gray-900">{inmueble.descripcion}</dd>
                        </div>
                      )}
                      {inmueble.notas_internas && (
                        <div className="sm:col-span-2">
                          <dt className="text-gray-500">Notas internas</dt>
                          <dd className="text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-200 text-xs">
                            {inmueble.notas_internas}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Location */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Ubicación</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div className="sm:col-span-2">
                        <dt className="text-gray-500">Dirección</dt>
                        <dd className="text-gray-900">{inmueble.direccion}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Ciudad</dt>
                        <dd className="text-gray-900">{inmueble.ciudad}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Departamento</dt>
                        <dd className="text-gray-900">{inmueble.departamento}</dd>
                      </div>
                      {inmueble.barrio && (
                        <div>
                          <dt className="text-gray-500">Barrio</dt>
                          <dd className="text-gray-900">{inmueble.barrio}</dd>
                        </div>
                      )}
                      {inmueble.piso && (
                        <div>
                          <dt className="text-gray-500">Piso</dt>
                          <dd className="text-gray-900">{inmueble.piso}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Characteristics */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Características</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <IconBed size={18} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{inmueble.habitaciones}</p>
                          <p className="text-xs text-gray-500">Habitaciones</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <IconBath size={18} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{inmueble.banos}</p>
                          <p className="text-xs text-gray-500">Baños</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <IconCar size={18} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {inmueble.parqueadero ? inmueble.parqueaderos || 1 : 0}
                          </p>
                          <p className="text-xs text-gray-500">Parqueaderos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <IconRuler size={18} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {inmueble.area_m2 || '—'}
                          </p>
                          <p className="text-xs text-gray-500">m²</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Estrato */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Estrato</h3>
                    <EstratoIndicator estrato={inmueble.estrato} size="md" />
                  </div>

                </div>
              )}

              {/* Tab Contrato: lazy en la primera visita y luego KEEP-ALIVE
                  (oculto con CSS, no desmontado) — el preview compilado del
                  contrato es una petición cara al backend y se re-pedía en
                  CADA entrada al tab. El botón "Recargar" del componente
                  sigue siendo la vía para refrescarlo. */}
              {contratoTabVisitado && (
                <div className={activeTab === 'contrato' ? '' : 'hidden'}>
                  <PlantillaContratoPreview inmuebleId={inmueble.id} />
                </div>
              )}

              {activeTab === 'expedientes' && (
                <ExpedientesSection
                  expedientes={expedientes}
                  inmuebleId={inmueble.id}
                  isLoading={isLoadingExpedientes}
                  canCreate={canCreate && inmueble.estado === 'disponible'}
                />
              )}

              {activeTab === 'historial' && (
                <HistorialSection inmuebleId={inmueble.id} />
              )}

              {activeTab === 'galeria' && (
                <GaleriaSection
                  inmuebleId={inmueble.id}
                  canEdit={canEdit}
                  onFachadaChange={(newUrl) => setInmueble((prev) => prev ? { ...prev, foto_fachada_url: newUrl } : prev)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Financial info */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Información Financiera</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Arriendo mensual</dt>
                <dd className="text-gray-900 font-medium">
                  {formatCurrency(inmueble.valor_arriendo)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Administración</dt>
                <dd className="text-gray-900">
                  {inmueble.administracion
                    ? formatCurrency(inmueble.administracion)
                    : '—'}
                </dd>
              </div>
              {inmueble.valor_comercial && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Valor comercial</dt>
                  <dd className="text-gray-900">
                    {formatCurrency(inmueble.valor_comercial)}
                  </dd>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <dt className="text-gray-900 font-medium">Total mensual</dt>
                <dd className="text-primary-600 font-bold text-lg">
                  {formatCurrency(totalMensual)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Owner info */}
          {inmueble.propietario && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Propietario</h3>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                  <IconUser size={20} className="text-primary-600" />
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/usuarios/${inmueble.propietario.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-primary-600 transition-colors"
                  >
                    {inmueble.propietario.nombre} {inmueble.propietario.apellido}
                  </Link>
                  {inmueble.propietario.email && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <IconMail size={12} />
                      {inmueble.propietario.email}
                    </p>
                  )}
                  {inmueble.propietario.telefono && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <IconPhone size={12} />
                      {inmueble.propietario.telefono}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Visibility toggle. Publicado DE VERDAD = flag + estado disponible
              (la vitrina pública exige ambos): el toggle se pinta con ese
              derivado — antes se pintaba VERDE con el flag crudo en un
              inmueble ocupado, contradiciendo el copy de abajo. Se permite
              APAGAR un flag residual en no-disponibles (el API solo bloquea
              encender); encender solo en 'disponible'. */}
          {canEdit && (() => {
            const publicado = inmueble.visible_vitrina && inmueble.estado === 'disponible'
            const toggleBloqueado =
              isTogglingVitrina || (inmueble.estado !== 'disponible' && !inmueble.visible_vitrina)
            return (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconGlobe size={18} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    Visible en vitrina
                  </span>
                </div>
                <button
                  onClick={handleToggleVitrina}
                  disabled={toggleBloqueado}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                    publicado ? 'bg-primary-600' : 'bg-gray-200',
                    toggleBloqueado && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      publicado ? 'translate-x-5' : 'translate-x-0'
                    )}
                  >
                    {isTogglingVitrina && (
                      <IconLoader
                        size={12}
                        className="absolute inset-0 m-auto text-gray-400 animate-spin"
                      />
                    )}
                  </span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {inmueble.estado !== 'disponible'
                  ? inmueble.visible_vitrina
                    ? 'Este inmueble conserva una marca de vitrina antigua; usa el interruptor para retirarla. Podrá publicarse de nuevo cuando esté libre.'
                    : 'Solo los inmuebles disponibles pueden publicarse en la vitrina. Se podrá cuando el inmueble esté libre.'
                  : inmueble.visible_vitrina
                    ? 'El inmueble es visible para el público en la vitrina.'
                    : 'El inmueble está oculto de la vitrina pública.'}
              </p>
            </div>
            )
          })()}

          {/* Metadata */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-gray-500">Creado</dt>
                <dd className="text-gray-700">{formatDate(inmueble.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Última actualización</dt>
                <dd className="text-gray-700">{formatDateTime(inmueble.updated_at)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Deactivate confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeactivateDialog}
        onClose={() => setShowDeactivateDialog(false)}
        onConfirm={handleDeactivate}
        title="Desactivar Inmueble"
        message={`¿Estás seguro de que deseas desactivar el inmueble ${inmueble.codigo}? Esta acción lo marcará como inactivo y no aparecerá en el listado.`}
        confirmLabel="Desactivar"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={isDeactivating}
      />

      {/* Terminar contrato vigente → libera el inmueble (reusa el modal de
          transición de contratos). */}
      {contratoVigente && (
        <ContratoTransicionModal
          isOpen={showTerminarModal}
          onClose={() => setShowTerminarModal(false)}
          estadoActual={contratoVigente.estado as EstadoContrato}
          transicionesDisponibles={transicionesContrato}
          onConfirmar={handleConfirmarTerminar}
          isLoading={terminarLoading}
        />
      )}
    </div>
  )
}
