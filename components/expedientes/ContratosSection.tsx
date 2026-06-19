'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { IconPlus, IconDownload, IconEye, IconRefresh, IconLoader, IconArrowRight, IconMail } from '@/components/icons'
import { GenerarContratoModal } from './GenerarContratoModal'
import { ContratoTransicionModal } from './ContratoTransicionModal'
import { FirmaSolicitudesSection } from './FirmaSolicitudesSection'
import { contratoService } from '@/services/contratoService'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/lib/constants'
import type { IContrato, EstadoContrato } from '@/types/contrato'

const ESTADO_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  borrador: { label: 'Borrador', bg: 'bg-gray-100', text: 'text-gray-700' },
  en_revision: { label: 'En Revision', bg: 'bg-amber-100', text: 'text-amber-700' },
  aprobado: { label: 'Aprobado', bg: 'bg-green-100', text: 'text-green-700' },
  pendiente_firma: { label: 'Enviado a Firma', bg: 'bg-purple-100', text: 'text-purple-700' },
  firmado: { label: 'Firmado', bg: 'bg-teal-100', text: 'text-teal-700' },
  vigente: { label: 'Vigente', bg: 'bg-blue-100', text: 'text-blue-700' },
  finalizado: { label: 'Finalizado', bg: 'bg-slate-100', text: 'text-slate-700' },
  cancelado: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-700' },
}

const TERMINAL_STATES: EstadoContrato[] = ['finalizado', 'cancelado']

interface ContratosSectionProps {
  expedienteId: string
  /** Estado del expediente — el contrato solo se genera tras la aprobación. */
  expedienteEstado?: string
}

export function ContratosSection({ expedienteId, expedienteEstado }: ContratosSectionProps) {
  const { user } = useAuth()
  const router = useRouter()

  const [contratos, setContratos] = useState<IContrato[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [generarOpen, setGenerarOpen] = useState(false)
  const [transicionContrato, setTransicionContrato] = useState<IContrato | null>(null)
  const [transicionesDisponibles, setTransicionesDisponibles] = useState<Array<{ estado: EstadoContrato; label: string }>>([])
  const [transicionLoading, setTransicionLoading] = useState(false)

  // Action loading
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [firmaContratoId, setFirmaContratoId] = useState<string | null>(null)

  // Permissions
  // El contrato se genera automaticamente al aprobar el estudio (orchestrator).
  // Admin/operador/inmobiliaria pueden generar manualmente como fallback
  // (la inmobiliaria es el arrendador y necesita poder disparar la generacion
  // si el orchestrator fallo). Propietario individual solo puede regenerar.
  const canCreate =
    user?.rol === 'administrador' ||
    user?.rol === 'operador_analista' ||
    user?.rol === 'inmobiliaria'
  const canRegenerate = canCreate || user?.rol === 'propietario'
  // El contrato (paso 5) solo se genera cuando el estudio fue aprobado o
  // condicionado. Mismo gate que el backend (generarContrato).
  const expedienteAprobado = expedienteEstado === 'aprobado' || expedienteEstado === 'condicionado'

  const fetchContratos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await contratoService.getContratosForExpediente(expedienteId, { limit: 50 })
      setContratos(result.data)
    } catch {
      setError('Error al cargar los contratos')
    } finally {
      setIsLoading(false)
    }
  }, [expedienteId])

  useEffect(() => {
    fetchContratos()
  }, [fetchContratos])

  async function handleDownload(contrato: IContrato) {
    setDownloadingId(contrato.id)
    try {
      const result = await contratoService.descargarContrato(contrato.id)
      const a = document.createElement('a')
      a.href = result.url
      a.download = result.nombre_archivo || 'contrato.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      toast.error('Error al descargar el contrato')
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleRegenerar(contrato: IContrato) {
    setRegeneratingId(contrato.id)
    try {
      await contratoService.regenerarContrato(contrato.id)
      toast.success('Contrato regenerado correctamente')
      fetchContratos()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al regenerar'
      toast.error(message)
    } finally {
      setRegeneratingId(null)
    }
  }

  function handleGenerated() {
    setGenerarOpen(false)
    fetchContratos()
  }

  async function handleOpenTransicion(contrato: IContrato) {
    try {
      const data = await contratoService.getTransicionesDisponibles(contrato.id)
      setTransicionesDisponibles(data.transiciones_disponibles)
      setTransicionContrato(contrato)
    } catch {
      toast.error('Error al obtener las transiciones disponibles')
    }
  }

  async function handleConfirmarTransicion(estadoDestino: EstadoContrato, comentario: string, motivo?: string) {
    if (!transicionContrato) return
    setTransicionLoading(true)
    try {
      await contratoService.transicionar(transicionContrato.id, {
        nuevo_estado: estadoDestino,
        comentario,
        motivo,
      })
      toast.success('Estado del contrato actualizado')
      setTransicionContrato(null)
      fetchContratos()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cambiar estado'
      toast.error(message)
    } finally {
      setTransicionLoading(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader size={24} className="animate-spin text-primary-600" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-2">{error}</p>
        <button onClick={fetchContratos} className="text-sm text-primary-600 hover:underline">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Contratos ({contratos.length})
        </h3>
        {canCreate && expedienteAprobado && (
          <button
            onClick={() => setGenerarOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            <IconPlus size={16} />
            Generar Contrato
          </button>
        )}
      </div>

      {/* Empty state */}
      {contratos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-2">No hay contratos generados</p>
          {!expedienteAprobado ? (
            <p className="text-sm text-gray-400">
              El contrato se podrá generar cuando el estudio del arrendatario
              esté aprobado.
            </p>
          ) : canCreate ? (
            <p className="text-sm text-gray-400">
              Pulsa &quot;Generar Contrato&quot; para crear uno con la plantilla activa.
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              El contrato se generará cuando el propietario lo emita, ahora que el
              estudio fue aprobado.
            </p>
          )}
        </div>
      ) : (
        /* Table */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Archivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contratos.map((c) => {
                  const estadoStyle = ESTADO_STYLES[c.estado] || ESTADO_STYLES.borrador
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/contratos/${c.id}`)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {c.nombre_archivo || 'contrato.pdf'}
                        </p>
                        {c.fecha_inicio && (
                          <p className="text-xs text-gray-500">
                            Inicio: {c.fecha_inicio} | {c.duracion_meses || 12} meses
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          v{c.version}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoStyle.bg} ${estadoStyle.text}`}>
                          {estadoStyle.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {c.fecha_generacion ? formatDateTime(c.fecha_generacion) : formatDateTime(c.created_at)}
                      </td>
                      <td
                        className="px-6 py-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/contratos/${c.id}`)}
                            className="p-1.5 text-gray-400 hover:text-primary-600 rounded-md hover:bg-gray-100"
                            title="Ver detalle"
                          >
                            <IconEye size={16} />
                          </button>
                          <button
                            onClick={() => handleDownload(c)}
                            disabled={downloadingId === c.id || !c.storage_key}
                            className="p-1.5 text-gray-400 hover:text-primary-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
                            title="Descargar PDF"
                          >
                            {downloadingId === c.id ? (
                              <IconLoader size={16} className="animate-spin" />
                            ) : (
                              <IconDownload size={16} />
                            )}
                          </button>
                          {canRegenerate && c.estado === 'borrador' && (
                            <button
                              onClick={() => handleRegenerar(c)}
                              disabled={regeneratingId === c.id}
                              className="p-1.5 text-gray-400 hover:text-amber-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
                              title="Regenerar PDF"
                            >
                              {regeneratingId === c.id ? (
                                <IconLoader size={16} className="animate-spin" />
                              ) : (
                                <IconRefresh size={16} />
                              )}
                            </button>
                          )}
                          {canRegenerate && c.estado === 'pendiente_firma' && (
                            <button
                              onClick={() => setFirmaContratoId(firmaContratoId === c.id ? null : c.id)}
                              className={`p-1.5 rounded-md hover:bg-gray-100 ${firmaContratoId === c.id ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-primary-600'}`}
                              title="Solicitudes de firma"
                            >
                              <IconMail size={16} />
                            </button>
                          )}
                          {canRegenerate && !TERMINAL_STATES.includes(c.estado) && (
                            <button
                              onClick={() => handleOpenTransicion(c)}
                              className="p-1.5 text-gray-400 hover:text-primary-600 rounded-md hover:bg-gray-100"
                              title="Cambiar estado"
                            >
                              <IconArrowRight size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Firma Solicitudes */}
      {firmaContratoId && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <FirmaSolicitudesSection
            contratoId={firmaContratoId}
            estadoContrato={contratos.find((c) => c.id === firmaContratoId)?.estado || ''}
            canManage={canCreate}
          />
        </div>
      )}

      {/* Generar Modal */}
      <GenerarContratoModal
        isOpen={generarOpen}
        expedienteId={expedienteId}
        onClose={() => setGenerarOpen(false)}
        onGenerated={handleGenerated}
      />

      {/* Transicion Modal */}
      {transicionContrato && (
        <ContratoTransicionModal
          isOpen={true}
          onClose={() => setTransicionContrato(null)}
          estadoActual={transicionContrato.estado}
          transicionesDisponibles={transicionesDisponibles}
          onConfirmar={handleConfirmarTransicion}
          isLoading={transicionLoading}
        />
      )}
    </div>
  )
}
