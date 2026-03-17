/**
 * Página de detalle de expediente - HP-243, HP-295
 * Vista detallada con tabs, barra de progreso y acciones contextuales
 * HP-295: Documentos con drag & drop upload
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Tabs, Badge, Avatar } from '@/components/ui'
import type { Tab } from '@/components/ui/Tabs'
import {
  IconArrowLeft,
  IconEdit,
  IconLoader,
  IconRefresh,
  IconUser,
  IconFolderOpen,
  IconAlertTriangle,
} from '@/components/icons'
import {
  ExpedienteProgressBar,
  TransicionModal,
  ComentariosSection,
  TimelineSection,
  AsignacionResponsableModal,
  DocumentosSection,
  EstudiosSection,
  AutorizacionSection,
  ContratosSection,
} from '@/components/expedientes'
import { PagosSection, PagoEstudioSection } from '@/components/pagos'
import { useAuthStore } from '@/stores/auth.store'
import { expedienteService } from '@/services/expedienteService'
import { formatCurrency, formatDate } from '@/lib/constants'
import type {
  IExpedienteDetalle,
  ITransicionDisponible,
  EstadoExpediente,
} from '@/types/expediente'

export default function ExpedienteDetallePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const user = useAuthStore((s) => s.user)

  // Pendientes count for badge
  const [pendientesCount, setPendientesCount] = useState(0)

  const tabs: Tab[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'documentos', label: 'Documentos', count: pendientesCount > 0 ? pendientesCount : undefined },
    { id: 'estudios', label: 'Estudios' },
    { id: 'contratos', label: 'Contratos' },
    { id: 'pagos', label: 'Pagos' },
    { id: 'comentarios', label: 'Comentarios' },
    { id: 'timeline', label: 'Timeline' },
  ]

  // Estado principal
  const [expediente, setExpediente] = useState<IExpedienteDetalle | null>(null)
  const [transiciones, setTransiciones] = useState<ITransicionDisponible[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  // Estado de tabs
  const [activeTab, setActiveTab] = useState('resumen')

  // Estado de modales
  const [showTransicionModal, setShowTransicionModal] = useState(false)
  const [showAsignacionModal, setShowAsignacionModal] = useState(false)
  const [isExecutingTransicion, setIsExecutingTransicion] = useState(false)
  const [isAsignando, setIsAsignando] = useState(false)

  // Cargar expediente
  const fetchExpediente = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setNotFound(false)

    try {
      // Primero cargar el expediente (crítico)
      const expedienteData = await expedienteService.getExpedienteDetalle(id)
      setExpediente(expedienteData)

      // Luego intentar cargar transiciones (no crítico)
      try {
        const transicionesData = await expedienteService.getTransicionesDisponibles(id)
        setTransiciones(transicionesData)
      } catch {
        // Si falla, simplemente no hay transiciones disponibles
        console.warn('No se pudieron cargar las transiciones disponibles')
        setTransiciones([])
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('no encontrado')) {
        setNotFound(true)
      } else {
        const message = err instanceof Error ? err.message : 'Error al cargar el expediente'
        setError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchExpediente()
  }, [fetchExpediente])

  // Ejecutar transición
  const handleEjecutarTransicion = async (
    estadoDestino: EstadoExpediente,
    comentario: string
  ) => {
    setIsExecutingTransicion(true)
    try {
      const expedienteActualizado = await expedienteService.ejecutarTransicion(id, {
        estado_destino: estadoDestino,
        comentario,
      })
      setExpediente(expedienteActualizado)

      // Recargar transiciones disponibles (no crítico)
      try {
        const nuevasTransiciones = await expedienteService.getTransicionesDisponibles(id)
        setTransiciones(nuevasTransiciones)
      } catch {
        setTransiciones([])
      }

      toast.success('Estado actualizado correctamente')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cambiar el estado'
      toast.error(message)
      throw err
    } finally {
      setIsExecutingTransicion(false)
    }
  }

  // Asignar responsable
  const handleAsignarResponsable = async (analistaId: string) => {
    setIsAsignando(true)
    try {
      const expedienteActualizado = await expedienteService.asignarResponsable(id, analistaId)
      setExpediente(expedienteActualizado)
      toast.success('Responsable asignado correctamente')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al asignar responsable'
      toast.error(message)
      throw err
    } finally {
      setIsAsignando(false)
    }
  }

  // Estado de carga
  if (isLoading) {
    return <ExpedienteDetalleSkeleton />
  }

  // Estado 404
  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <IconFolderOpen size={64} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Expediente no encontrado
        </h2>
        <p className="text-gray-500 mb-6">
          El expediente que buscas no existe o fue eliminado.
        </p>
        <button
          onClick={() => router.push('/expedientes')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Volver al listado
        </button>
      </div>
    )
  }

  // Estado de error
  if (error || !expediente) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <IconAlertTriangle size={64} className="text-red-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Error al cargar el expediente
        </h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button
          onClick={fetchExpediente}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <IconRefresh size={18} />
          Reintentar
        </button>
      </div>
    )
  }

  const nombreAnalista = expediente.analista
    ? `${expediente.analista.nombre} ${expediente.analista.apellido}`.trim()
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/expedientes')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
          >
            <IconArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="space-y-2">
            {/* Código y estado */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">
                {expediente.numero_expediente}
              </h1>
              <Badge estado={expediente.estado} />
            </div>

            {/* Info del inmueble y solicitante */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
              {expediente.inmueble && (
                <span>
                  <span className="text-gray-400">Inmueble:</span>{' '}
                  {expediente.inmueble.titulo || expediente.inmueble.direccion}
                </span>
              )}
              {expediente.solicitante && (
                <span>
                  <span className="text-gray-400">Solicitante:</span>{' '}
                  {`${expediente.solicitante.nombre} ${expediente.solicitante.apellido}`.trim()}
                </span>
              )}
            </div>

            {/* Responsable */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Responsable:</span>
              {nombreAnalista ? (
                <button
                  onClick={() => setShowAsignacionModal(true)}
                  className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <Avatar name={nombreAnalista} size="sm" />
                  <span>{nombreAnalista}</span>
                  <IconEdit size={14} className="text-gray-400" />
                </button>
              ) : (
                <button
                  onClick={() => setShowAsignacionModal(true)}
                  className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 transition-colors"
                >
                  <IconUser size={14} />
                  Asignar responsable
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 ml-12 lg:ml-0">
          {transiciones.length > 0 && (
            <button
              onClick={() => setShowTransicionModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Cambiar estado
            </button>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <ExpedienteProgressBar estadoActual={expediente.estado} />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Contenido de tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Tab: Resumen */}
        {activeTab === 'resumen' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sección Inmueble */}
              <div className="border border-gray-200 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Inmueble
                </h3>
                {expediente.inmueble ? (
                  <div className="space-y-3 text-sm">
                    <InfoRow label="Dirección" value={expediente.inmueble.direccion} />
                    <InfoRow
                      label="Ciudad"
                      value={`${expediente.inmueble.ciudad}, ${expediente.inmueble.departamento}`}
                    />
                    <InfoRow label="Tipo" value={expediente.inmueble.tipo} />
                    {expediente.inmueble.uso && (
                      <InfoRow label="Uso" value={expediente.inmueble.uso} />
                    )}
                    {expediente.inmueble.estrato && (
                      <InfoRow label="Estrato" value={expediente.inmueble.estrato} />
                    )}
                    <InfoRow
                      label="Canon"
                      value={formatCurrency(expediente.inmueble.valor_arriendo)}
                      highlight
                    />
                    {expediente.inmueble.valor_administracion && (
                      <InfoRow
                        label="Administración"
                        value={formatCurrency(expediente.inmueble.valor_administracion)}
                      />
                    )}
                    {expediente.inmueble.area_construida && (
                      <InfoRow
                        label="Área"
                        value={`${expediente.inmueble.area_construida} m²`}
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Sin inmueble asociado</p>
                )}
              </div>

              {/* Sección Solicitante */}
              <div className="border border-gray-200 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Solicitante
                </h3>
                {expediente.solicitante ? (
                  <div className="space-y-3 text-sm">
                    <InfoRow
                      label="Nombre"
                      value={`${expediente.solicitante.nombre} ${expediente.solicitante.apellido}`.trim()}
                    />
                    {expediente.solicitante.tipo_persona && (
                      <InfoRow
                        label="Tipo persona"
                        value={expediente.solicitante.tipo_persona === 'natural' ? 'Natural' : 'Jurídica'}
                      />
                    )}
                    <InfoRow
                      label="Documento"
                      value={`${expediente.solicitante.tipo_documento} ${expediente.solicitante.numero_documento}`}
                    />
                    <InfoRow label="Email" value={expediente.solicitante.email} />
                    {expediente.solicitante.telefono && (
                      <InfoRow label="Teléfono" value={expediente.solicitante.telefono} />
                    )}
                    {expediente.solicitante.ciudad && (
                      <InfoRow
                        label="Ciudad"
                        value={`${expediente.solicitante.ciudad}, ${expediente.solicitante.departamento || ''}`}
                      />
                    )}
                    {expediente.solicitante.ocupacion && (
                      <InfoRow label="Ocupación" value={expediente.solicitante.ocupacion} />
                    )}
                    {expediente.solicitante.ingresos_mensuales && (
                      <InfoRow
                        label="Ingresos"
                        value={formatCurrency(expediente.solicitante.ingresos_mensuales)}
                        highlight
                      />
                    )}
                    {expediente.solicitante.nivel_educativo && (
                      <InfoRow label="Nivel educativo" value={expediente.solicitante.nivel_educativo} />
                    )}
                    {expediente.solicitante.habitara_inmueble !== null && (
                      <InfoRow
                        label="Habitará el inmueble"
                        value={expediente.solicitante.habitara_inmueble ? 'Sí' : 'No'}
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Sin solicitante asociado</p>
                )}
              </div>

              {/* Sección Expediente */}
              <div className="border border-gray-200 rounded-lg p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Datos del Expediente
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <InfoRow label="Fecha creación" value={formatDate(expediente.created_at)} />
                  {expediente.creador && (
                    <InfoRow
                      label="Creado por"
                      value={`${expediente.creador.nombre} ${expediente.creador.apellido}`.trim()}
                    />
                  )}
                  <InfoRow
                    label="Responsable"
                    value={nombreAnalista || 'Sin asignar'}
                  />
                </div>
                {expediente.notas && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Notas internas</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                      {expediente.notas}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Documentos (HP-295) */}
        {activeTab === 'documentos' && (
          <div className="p-6">
            <DocumentosSection
              expedienteId={id}
              userRole={user?.rol}
              onPendientesChange={setPendientesCount}
            />
          </div>
        )}

        {/* Tab: Estudios */}
        {activeTab === 'estudios' && (
          <div className="p-6 space-y-6">
            <PagoEstudioSection expedienteId={id} onPagoCompletado={fetchExpediente} />
            <AutorizacionSection expedienteId={id} />
            <EstudiosSection expedienteId={id} />
          </div>
        )}

        {/* Tab: Contratos */}
        {activeTab === 'contratos' && (
          <div className="p-6">
            <ContratosSection expedienteId={id} />
          </div>
        )}

        {/* Tab: Pagos (HP-351) */}
        {activeTab === 'pagos' && (
          <div className="p-6">
            <PagosSection expedienteId={id} />
          </div>
        )}

        {/* Tab: Comentarios (HP-263) */}
        {activeTab === 'comentarios' && (
          <div className="p-6">
            <ComentariosSection expedienteId={id} />
          </div>
        )}

        {/* Tab: Timeline (HP-270) */}
        {activeTab === 'timeline' && (
          <div className="p-6">
            <TimelineSection expedienteId={id} />
          </div>
        )}
      </div>

      {/* Modal de transición */}
      <TransicionModal
        isOpen={showTransicionModal}
        onClose={() => setShowTransicionModal(false)}
        estadoActual={expediente.estado}
        transicionesDisponibles={transiciones}
        onConfirmar={handleEjecutarTransicion}
        isLoading={isExecutingTransicion}
      />

      {/* Modal de asignación de responsable */}
      <AsignacionResponsableModal
        isOpen={showAsignacionModal}
        onClose={() => setShowAsignacionModal(false)}
        expedienteId={id}
        analistaActual={expediente.analista}
        onAsignar={handleAsignarResponsable}
        isLoading={isAsignando}
      />
    </div>
  )
}

// Componente helper para filas de información
function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string | number | null | undefined
  highlight?: boolean
}) {
  if (value === null || value === undefined) return null

  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className={`text-right ${highlight ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
        {value}
      </span>
    </div>
  )
}

// Skeleton de carga
function ExpedienteDetalleSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <div className="h-8 w-40 bg-gray-200 rounded" />
            <div className="h-6 w-24 bg-gray-200 rounded-full" />
          </div>
          <div className="h-4 w-64 bg-gray-200 rounded" />
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Progress bar skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="w-16 h-3 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-24 bg-gray-200 rounded" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-5">
              <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="flex justify-between">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
