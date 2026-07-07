'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { IconEye, IconDownload, IconArrowRight, IconLoader, IconChevronLeft, IconChevronRight, IconRefresh } from '@/components/icons'
import { ESTADOS_CONTRATO, type EstadoContratoKey, formatDateTime } from '@/lib/constants'
import { contratoService } from '@/services/contratoService'
import { ContratoTransicionModal } from '@/components/expedientes/ContratoTransicionModal'
import { RegenerarContratoModal } from './RegenerarContratoModal'
import { useAuth } from '@/hooks/useAuth'
import type { IContratoListItem, IContratoMeta, IContratoListFilters, EstadoContrato } from '@/types/contrato'

const TERMINAL_STATES: EstadoContrato[] = ['finalizado', 'cancelado']

interface ContratosTableProps {
  contratos: IContratoListItem[]
  meta: IContratoMeta
  filters: IContratoListFilters
  onPageChange: (page: number) => void
  onRefetch: () => void
}

export function ContratosTable({ contratos, meta, filters, onPageChange, onRefetch }: ContratosTableProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [transicionContrato, setTransicionContrato] = useState<IContratoListItem | null>(null)
  const [transicionesDisponibles, setTransicionesDisponibles] = useState<Array<{ estado: EstadoContrato; label: string }>>([])
  const [morasActivasTransicion, setMorasActivasTransicion] = useState(0)
  const [transicionLoading, setTransicionLoading] = useState(false)

  const canManage = user?.rol === 'administrador' || user?.rol === 'operador_analista'
  // Regenerar tambien lo pueden hacer propietario e inmobiliaria sobre
  // sus contratos en borrador (cambian fecha/duracion/canon).
  const canRegenerar =
    canManage || user?.rol === 'propietario' || user?.rol === 'inmobiliaria'

  // Modal de regenerar
  const [regenerarTarget, setRegenerarTarget] = useState<IContratoListItem | null>(null)

  async function handleDownload(e: React.MouseEvent, contrato: IContratoListItem) {
    e.stopPropagation()
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

  async function handleOpenTransicion(e: React.MouseEvent, contrato: IContratoListItem) {
    e.stopPropagation()
    try {
      const data = await contratoService.getTransicionesDisponibles(contrato.id)
      setTransicionesDisponibles(data.transiciones_disponibles)
      setMorasActivasTransicion(data.moras_activas ?? 0)
      setTransicionContrato(contrato)
    } catch {
      toast.error('Error al obtener transiciones disponibles')
    }
  }

  async function handleConfirmarTransicion(estadoDestino: EstadoContrato, comentario: string, motivo?: string): Promise<boolean> {
    if (!transicionContrato) return false
    setTransicionLoading(true)
    try {
      await contratoService.transicionar(transicionContrato.id, {
        nuevo_estado: estadoDestino,
        comentario,
        motivo,
      })
      toast.success('Estado del contrato actualizado')
      setTransicionContrato(null)
      onRefetch()
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cambiar estado'
      toast.error(message)
      return false
    } finally {
      setTransicionLoading(false)
    }
  }

  if (contratos.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-gray-500 text-lg mb-1">No se encontraron contratos</p>
        <p className="text-sm text-gray-400">Intenta ajustar los filtros de busqueda</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Archivo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expediente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inmueble</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contratos.map((c) => {
                const config = ESTADOS_CONTRATO[c.estado as EstadoContratoKey]
                const expediente = c.expedientes
                const inmueble = expediente?.inmuebles

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
                      {expediente ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/expedientes/${c.expediente_id}`)
                          }}
                          className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          {expediente.numero}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {inmueble ? (
                        <div>
                          <p className="text-sm text-gray-900">{inmueble.direccion}</p>
                          <p className="text-xs text-gray-500">{inmueble.ciudad}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config?.bgColor || 'bg-gray-100'} ${config?.textColor || 'text-gray-700'}`}>
                        {config?.label || c.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        v{c.version}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {c.fecha_generacion ? formatDateTime(c.fecha_generacion) : formatDateTime(c.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/contratos/${c.id}`)
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 rounded-md hover:bg-gray-100"
                          title="Ver detalle"
                        >
                          <IconEye size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDownload(e, c)}
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
                        {canRegenerar && c.estado === 'borrador' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setRegenerarTarget(c)
                            }}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-gray-100"
                            title="Editar y regenerar"
                          >
                            <IconRefresh size={16} />
                          </button>
                        )}
                        {canManage && !TERMINAL_STATES.includes(c.estado) && (
                          <button
                            onClick={(e) => handleOpenTransicion(e, c)}
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

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {contratos.map((c) => {
          const config = ESTADOS_CONTRATO[c.estado as EstadoContratoKey]
          const expediente = c.expedientes
          const inmueble = expediente?.inmuebles

          return (
            <div
              key={c.id}
              onClick={() => router.push(`/contratos/${c.id}`)}
              className="p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">{c.nombre_archivo || 'contrato.pdf'}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config?.bgColor || 'bg-gray-100'} ${config?.textColor || 'text-gray-700'}`}>
                  {config?.label || c.estado}
                </span>
              </div>
              {expediente && (
                <p className="text-xs text-gray-500 mb-1">Expediente: {expediente.numero}</p>
              )}
              {inmueble && (
                <p className="text-xs text-gray-500 mb-2">{inmueble.direccion}, {inmueble.ciudad}</p>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  {c.fecha_generacion ? formatDateTime(c.fecha_generacion) : formatDateTime(c.created_at)}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  v{c.version}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-600">
            Mostrando {((filters.page || 1) - 1) * (filters.limit || 10) + 1} - {Math.min((filters.page || 1) * (filters.limit || 10), meta.total)} de {meta.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange((filters.page || 1) - 1)}
              disabled={(filters.page || 1) <= 1}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-700">
              {filters.page || 1} / {meta.totalPages}
            </span>
            <button
              onClick={() => onPageChange((filters.page || 1) + 1)}
              disabled={(filters.page || 1) >= meta.totalPages}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Transicion modal */}
      {transicionContrato && (
        <ContratoTransicionModal
          isOpen={true}
          onClose={() => setTransicionContrato(null)}
          estadoActual={transicionContrato.estado}
          transicionesDisponibles={transicionesDisponibles}
          onConfirmar={handleConfirmarTransicion}
          isLoading={transicionLoading}
          morasActivas={morasActivasTransicion}
        />
      )}

      {/* Regenerar modal */}
      <RegenerarContratoModal
        isOpen={!!regenerarTarget}
        onClose={() => setRegenerarTarget(null)}
        contrato={
          regenerarTarget
            ? {
                id: regenerarTarget.id,
                fecha_inicio: regenerarTarget.fecha_inicio ?? null,
                duracion_meses: regenerarTarget.duracion_meses ?? null,
                valor_arriendo: regenerarTarget.valor_arriendo ?? null,
              }
            : null
        }
        onRegenerated={onRefetch}
      />
    </>
  )
}
