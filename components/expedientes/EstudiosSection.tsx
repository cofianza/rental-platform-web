/**
 * EstudiosSection
 * Lista de estudios de riesgo crediticio en el detalle de expediente
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconLoader, IconPlus, IconEye, IconMail, IconX, IconRefresh, IconClipboardList } from '@/components/icons'
import { estudioService } from '@/services/estudioService'
import { useAuthStore } from '@/stores/auth.store'
import { SolicitarEstudioModal } from './SolicitarEstudioModal'
import { EstudioDetailModal } from './EstudioDetailModal'
import { RegistrarResultadoModal } from './RegistrarResultadoModal'
import type { IEstudio, ICreateEstudioInput } from '@/types/estudio'

// ============================================
// Constants
// ============================================

const PROVEEDOR_LABELS: Record<string, string> = {
  transunion: 'TransUnion',
  sifin: 'SIFIN',
  datacredito: 'DataCredito',
}

const ESTADOS_FINALIZADOS = ['completado', 'fallido', 'cancelado']
const ESTADOS_PERMITIDOS_RESULTADO = ['solicitado', 'en_proceso']

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ============================================
// Props
// ============================================

interface EstudiosSectionProps {
  expedienteId: string
}

export function EstudiosSection({ expedienteId }: EstudiosSectionProps) {
  const user = useAuthStore((s) => s.user)
  const canManage = user?.rol === 'administrador' || user?.rol === 'operador_analista'

  const [estudios, setEstudios] = useState<IEstudio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [showSolicitar, setShowSolicitar] = useState(false)
  const [showDetail, setShowDetail] = useState<IEstudio | null>(null)
  const [cancelTarget, setCancelTarget] = useState<IEstudio | null>(null)
  const [resultadoTarget, setResultadoTarget] = useState<IEstudio | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // ============================================
  // Fetch
  // ============================================

  const fetchEstudios = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await estudioService.getEstudiosForExpediente(expedienteId)
      setEstudios(res.data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar estudios'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => {
    fetchEstudios()
  }, [fetchEstudios])

  // ============================================
  // Actions
  // ============================================

  const handleCreate = async (data: ICreateEstudioInput) => {
    setActionLoading(true)
    try {
      await estudioService.createEstudio(expedienteId, data)
      toast.success('Estudio solicitado exitosamente')
      await fetchEstudios()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al solicitar estudio'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    setActionLoading(true)
    try {
      await estudioService.cancelEstudio(cancelTarget.id)
      toast.success('Estudio cancelado')
      setCancelTarget(null)
      await fetchEstudios()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cancelar estudio'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendLink = async (estudio: IEstudio) => {
    setActionLoading(true)
    try {
      const res = await estudioService.enviarEnlace(estudio.id)
      toast.success(`Enlace enviado a ${res.email_destino}`)
      await fetchEstudios()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar enlace'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  // ============================================
  // Check if there's an active estudio
  // ============================================

  const hasActiveEstudio = estudios.some(
    (e) => !ESTADOS_FINALIZADOS.includes(e.estado),
  )

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader size={24} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <button
          onClick={fetchEstudios}
          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
        >
          <IconRefresh size={16} />
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
          Estudios de Riesgo Crediticio
        </h3>
        {canManage && (
          <button
            onClick={() => setShowSolicitar(true)}
            disabled={hasActiveEstudio || actionLoading}
            title={hasActiveEstudio ? 'Ya existe un estudio activo' : undefined}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IconPlus size={16} />
            Solicitar estudio
          </button>
        )}
      </div>

      {/* Empty state */}
      {estudios.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <IconClipboardList size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No hay estudios de riesgo
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            No hay estudios de riesgo crediticio para este expediente.
          </p>
          {canManage && (
            <button
              onClick={() => setShowSolicitar(true)}
              disabled={hasActiveEstudio}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconPlus size={16} />
              Solicitar estudio
            </button>
          )}
        </div>
      )}

      {/* List */}
      {estudios.length > 0 && (
        <div className="space-y-3">
          {estudios.map((estudio) => (
            <div
              key={estudio.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        estudio.proveedor === 'transunion'
                          ? 'bg-blue-100 text-blue-700'
                          : estudio.proveedor === 'manual'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {PROVEEDOR_LABELS[estudio.proveedor] || estudio.proveedor}
                    </span>
                    <Badge estado={estudio.estado} />
                    <Badge estado={estudio.resultado} />
                  </div>
                  <div className="text-sm text-gray-500 space-x-3">
                    <span>{formatDate(estudio.fecha_solicitud || estudio.created_at)}</span>
                    <span>{estudio.duracion_contrato_meses} meses</span>
                    {estudio.solicitado_por && (
                      <span>
                        por {estudio.solicitado_por.nombre} {estudio.solicitado_por.apellido}
                      </span>
                    )}
                  </div>
                  {estudio.score != null && (
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          estudio.score >= 600
                            ? 'bg-green-100 text-green-700'
                            : estudio.score >= 400
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        Score: {estudio.score}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setShowDetail(estudio)}
                      title="Ver detalle"
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <IconEye size={18} />
                    </button>

                    {!ESTADOS_FINALIZADOS.includes(estudio.estado) && (
                      <>
                        {ESTADOS_PERMITIDOS_RESULTADO.includes(estudio.estado) && estudio.resultado === 'pendiente' && (
                          <button
                            onClick={() => setResultadoTarget(estudio)}
                            disabled={actionLoading}
                            title="Registrar resultado"
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                          >
                            <IconClipboardList size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleSendLink(estudio)}
                          disabled={actionLoading}
                          title="Enviar enlace al solicitante"
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg disabled:opacity-50"
                        >
                          <IconMail size={18} />
                        </button>
                        <button
                          onClick={() => setCancelTarget(estudio)}
                          disabled={actionLoading}
                          title="Cancelar estudio"
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        >
                          <IconX size={18} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <SolicitarEstudioModal
        isOpen={showSolicitar}
        onClose={() => setShowSolicitar(false)}
        onConfirmar={handleCreate}
        isLoading={actionLoading}
      />

      <EstudioDetailModal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        estudio={showDetail}
      />

      <RegistrarResultadoModal
        isOpen={!!resultadoTarget}
        onClose={() => setResultadoTarget(null)}
        estudio={resultadoTarget}
        onSuccess={() => {
          toast.success('Resultado registrado exitosamente')
          setResultadoTarget(null)
          fetchEstudios()
        }}
      />

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancelar estudio"
        message="Esta seguro que desea cancelar este estudio? Esta accion no se puede deshacer."
        confirmLabel="Cancelar estudio"
        variant="danger"
        isLoading={actionLoading}
      />
    </div>
  )
}
