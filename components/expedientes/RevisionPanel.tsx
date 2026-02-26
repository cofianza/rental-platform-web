/**
 * RevisionPanel - Panel de revision de documentos para operadores/admin
 * Muestra documentos con filtros, preview, y acciones de aprobar/rechazar
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  IconCheck,
  IconX,
  IconLoader,
  IconRefresh,
  IconEye,
  IconFileText,
  IconImage,
  IconClock,
  IconAlertTriangle,
  IconShield,
} from '@/components/icons'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DocumentViewer } from '@/components/ui/DocumentViewer'
import { RechazoModal } from './RechazoModal'
import { documentoService } from '@/services/documentoService'
import type { IDocumento, EstadoDocumento } from '@/types/documento'

// ============================================
// Helpers
// ============================================

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getEstadoBadgeClass(estado: EstadoDocumento): string {
  switch (estado) {
    case 'aprobado':
      return 'bg-green-100 text-green-700'
    case 'rechazado':
      return 'bg-red-100 text-red-700'
    case 'pendiente':
      return 'bg-yellow-100 text-yellow-700'
    case 'reemplazado':
      return 'bg-gray-100 text-gray-500'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function getEstadoLabel(estado: EstadoDocumento): string {
  switch (estado) {
    case 'aprobado':
      return 'Aprobado'
    case 'rechazado':
      return 'Rechazado'
    case 'pendiente':
      return 'Pendiente'
    case 'reemplazado':
      return 'Reemplazado'
    default:
      return estado
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================
// Types
// ============================================

type FilterEstado = 'todos' | EstadoDocumento

interface RevisionPanelProps {
  expedienteId: string
  onRevisionChange?: () => void
}

// ============================================
// Component
// ============================================

export function RevisionPanel({ expedienteId, onRevisionChange }: RevisionPanelProps) {
  const [documentos, setDocumentos] = useState<IDocumento[]>([])
  const [totalDocumentos, setTotalDocumentos] = useState(0)
  const [pendientes, setPendientes] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<FilterEstado>('todos')

  // Action states
  const [aprobarTarget, setAprobarTarget] = useState<IDocumento | null>(null)
  const [isAprobando, setIsAprobando] = useState(false)
  const [rechazarTarget, setRechazarTarget] = useState<IDocumento | null>(null)
  const [isRechazando, setIsRechazando] = useState(false)

  // Preview
  const [previewDoc, setPreviewDoc] = useState<IDocumento | null>(null)

  // ============================================
  // Fetch data
  // ============================================

  const fetchDocumentos = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await documentoService.getDocumentosByExpediente(expedienteId, {
        limit: 100,
        sortBy: 'created_at',
        sortOrder: 'desc',
      })

      const docs = result.documentos.filter((d) => d.estado !== 'reemplazado')
      setDocumentos(docs)
      setTotalDocumentos(docs.length)
      setPendientes(docs.filter((d) => d.estado === 'pendiente').length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar documentos')
    } finally {
      setIsLoading(false)
    }
  }, [expedienteId])

  useEffect(() => {
    fetchDocumentos()
  }, [fetchDocumentos])

  // ============================================
  // Aprobar
  // ============================================

  const handleAprobar = async () => {
    if (!aprobarTarget || isAprobando) return

    setIsAprobando(true)
    const target = aprobarTarget
    setAprobarTarget(null)

    try {
      const updated = await documentoService.aprobarDocumento(target.id)
      setDocumentos((prev) =>
        prev.map((d) => (d.id === target.id ? { ...d, ...updated } : d))
      )
      setPendientes((prev) => Math.max(0, prev - 1))
      toast.success(`"${target.nombre_original}" aprobado`)
      onRevisionChange?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al aprobar')
    } finally {
      setIsAprobando(false)
    }
  }

  // ============================================
  // Rechazar
  // ============================================

  const handleRechazar = async (motivo: string) => {
    if (!rechazarTarget || isRechazando) return

    setIsRechazando(true)
    const target = rechazarTarget

    try {
      const updated = await documentoService.rechazarDocumento(target.id, motivo)
      setDocumentos((prev) =>
        prev.map((d) => (d.id === target.id ? { ...d, ...updated } : d))
      )
      toast.success(`"${target.nombre_original}" rechazado`)
      setRechazarTarget(null)
      onRevisionChange?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al rechazar')
    } finally {
      setIsRechazando(false)
    }
  }

  // ============================================
  // Filtro
  // ============================================

  const filteredDocs =
    filtroEstado === 'todos'
      ? documentos
      : documentos.filter((d) => d.estado === filtroEstado)

  const filterCounts = {
    todos: documentos.length,
    pendiente: documentos.filter((d) => d.estado === 'pendiente').length,
    aprobado: documentos.filter((d) => d.estado === 'aprobado').length,
    rechazado: documentos.filter((d) => d.estado === 'rechazado').length,
  }

  // ============================================
  // Render
  // ============================================

  if (isLoading) {
    return (
      <div className="mt-8 border-t border-gray-200 pt-6">
        <div className="flex items-center gap-2 text-gray-500">
          <IconLoader size={18} className="animate-spin" />
          <span className="text-sm">Cargando panel de revision...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-8 border-t border-gray-200 pt-6">
        <div className="text-center py-4">
          <IconAlertTriangle size={32} className="mx-auto text-red-300 mb-2" />
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <button
            onClick={fetchDocumentos}
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
          >
            <IconRefresh size={14} />
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (documentos.length === 0) return null

  const allApproved = pendientes === 0 && documentos.every((d) => d.estado === 'aprobado')

  return (
    <div className="mt-8 border-t border-gray-200 pt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconShield size={20} className="text-primary-600" />
          <h4 className="text-base font-semibold text-gray-900">Revision de documentos</h4>
        </div>
        <button
          onClick={fetchDocumentos}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
          title="Actualizar"
        >
          <IconRefresh size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {totalDocumentos - pendientes} de {totalDocumentos} documentos revisados
          </span>
          <span className="font-medium text-gray-900">
            {totalDocumentos > 0
              ? Math.round(((totalDocumentos - pendientes) / totalDocumentos) * 100)
              : 0}
            %
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              allApproved ? 'bg-green-500' : 'bg-primary-600'
            }`}
            style={{
              width: `${totalDocumentos > 0 ? ((totalDocumentos - pendientes) / totalDocumentos) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Success banner */}
      {allApproved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <IconCheck size={18} className="text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-700">
            Todos los documentos han sido aprobados
          </p>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: 'todos', label: 'Todos' },
            { key: 'pendiente', label: 'Pendientes' },
            { key: 'aprobado', label: 'Aprobados' },
            { key: 'rechazado', label: 'Rechazados' },
          ] as { key: FilterEstado; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltroEstado(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filtroEstado === key
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label} ({filterCounts[key as keyof typeof filterCounts] ?? 0})
          </button>
        ))}
      </div>

      {/* Document list */}
      <div className="space-y-3">
        {filteredDocs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No hay documentos con este filtro
          </p>
        ) : (
          filteredDocs.map((doc) => {
            const isImage = doc.tipo_mime?.startsWith('image/')
            const isPdf = doc.tipo_mime === 'application/pdf'
            const canPreview = isImage || isPdf

            return (
              <div
                key={doc.id}
                className="border border-gray-200 rounded-lg p-4 bg-white space-y-3"
              >
                {/* Doc info row */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                    {isImage ? (
                      <IconImage size={20} className="text-gray-600" />
                    ) : (
                      <IconFileText size={20} className="text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.nombre_original}
                      </p>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${getEstadoBadgeClass(
                          doc.estado
                        )}`}
                      >
                        {getEstadoLabel(doc.estado)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {doc.tipo_documento?.nombre ?? 'Sin tipo'} • {formatFileSize(doc.tamano_bytes)} • v{doc.version}
                    </p>
                    {doc.fecha_revision && doc.validador && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Revisado por {doc.validador.nombre} {doc.validador.apellido} el{' '}
                        {formatDate(doc.fecha_revision)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Rejection reason */}
                {doc.estado === 'rechazado' && doc.motivo_rechazo && (
                  <div className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg">
                    <IconAlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-600">{doc.motivo_rechazo}</p>
                  </div>
                )}

                {/* Preview thumbnail for images */}
                {isImage && doc.archivo_url && (
                  <div
                    className="relative w-full h-32 bg-gray-50 rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => setPreviewDoc(doc)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={doc.archivo_url}
                      alt={doc.nombre_original}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <IconEye
                        size={24}
                        className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {canPreview && (
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <IconEye size={14} />
                      Ver
                    </button>
                  )}

                  {doc.estado === 'pendiente' && (
                    <>
                      <button
                        onClick={() => setAprobarTarget(doc)}
                        disabled={isAprobando}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 ml-auto"
                      >
                        <IconCheck size={14} />
                        Aprobar
                      </button>
                      <button
                        onClick={() => setRechazarTarget(doc)}
                        disabled={isRechazando}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <IconX size={14} />
                        Rechazar
                      </button>
                    </>
                  )}

                  {doc.estado === 'aprobado' && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 ml-auto">
                      <IconCheck size={14} />
                      Aprobado
                    </span>
                  )}

                  {doc.estado === 'rechazado' && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400 ml-auto">
                      <IconClock size={14} />
                      Esperando resubida
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Aprobar confirmation */}
      <ConfirmDialog
        isOpen={!!aprobarTarget}
        onClose={() => setAprobarTarget(null)}
        onConfirm={handleAprobar}
        title="Aprobar documento"
        message={`¿Confirmas que el documento "${aprobarTarget?.nombre_original}" cumple con los requisitos?`}
        confirmLabel="Aprobar"
        isLoading={isAprobando}
      />

      {/* Rechazar modal */}
      <RechazoModal
        isOpen={!!rechazarTarget}
        onClose={() => setRechazarTarget(null)}
        onConfirm={handleRechazar}
        documentoNombre={rechazarTarget?.nombre_original ?? ''}
        isLoading={isRechazando}
      />

      {/* Document viewer */}
      <DocumentViewer
        documento={previewDoc}
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  )
}
