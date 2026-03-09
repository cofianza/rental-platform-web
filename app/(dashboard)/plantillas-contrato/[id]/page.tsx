'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  IconHome,
  IconChevronRight,
  IconArrowLeft,
  IconEdit,
  IconPower,
  IconEye,
  IconLoader,
} from '@/components/icons'
import { PlantillaFormModal, PlantillaPreviewModal } from '@/components/plantillas-contrato'
import { ConfirmDialog } from '@/components/users'
import { plantillaContratoService } from '@/services/plantillaContratoService'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/lib/constants'
import type { IPlantillaContrato } from '@/types/plantilla-contrato'

export default function PlantillaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [plantilla, setPlantilla] = useState<IPlantillaContrato | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewVariables, setPreviewVariables] = useState<string[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)

  // Permissions
  const isAdmin = user?.rol === 'administrador'
  const canEdit = isAdmin
  const canDelete = isAdmin

  const fetchPlantilla = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await plantillaContratoService.getPlantillaById(id)
      setPlantilla(data)
    } catch {
      setError('No se pudo cargar la plantilla')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPlantilla()
  }, [fetchPlantilla])

  async function handleUpdate(data: { nombre: string; descripcion?: string; contenido: string; activa?: boolean }) {
    setIsSubmitting(true)
    try {
      await plantillaContratoService.updatePlantilla(id, data)
      toast.success('Plantilla actualizada correctamente')
      setFormOpen(false)
      fetchPlantilla()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePreview() {
    setIsLoadingPreview(true)
    try {
      const result = await plantillaContratoService.previewPlantilla(id)
      setPreviewHtml(result.html)
      setPreviewVariables(result.variables_used)
      setPreviewOpen(true)
    } catch {
      toast.error('Error al generar la vista previa')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  async function handleDeactivate() {
    setIsDeactivating(true)
    try {
      await plantillaContratoService.deletePlantilla(id)
      toast.success('Plantilla desactivada')
      setDeactivateOpen(false)
      fetchPlantilla()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al desactivar'
      toast.error(message)
    } finally {
      setIsDeactivating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <IconLoader size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (error || !plantilla) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">{error || 'Plantilla no encontrada'}</p>
        <button
          onClick={() => router.push('/plantillas-contrato')}
          className="text-primary-600 hover:underline text-sm"
        >
          Volver al listado
        </button>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-primary-600 flex items-center gap-1">
          <IconHome size={16} />
          Inicio
        </Link>
        <IconChevronRight size={14} />
        <Link href="/plantillas-contrato" className="hover:text-primary-600">
          Plantillas
        </Link>
        <IconChevronRight size={14} />
        <span className="text-gray-900 font-medium truncate max-w-xs">{plantilla.nombre}</span>
      </nav>

      {/* Back + Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={() => router.push('/plantillas-contrato')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-2"
          >
            <IconArrowLeft size={16} />
            Volver
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {plantilla.nombre}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              v{plantilla.version}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                plantilla.activa
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {plantilla.activa ? 'Activa' : 'Inactiva'}
            </span>
          </h1>
          {plantilla.descripcion && (
            <p className="text-sm text-gray-500 mt-1">{plantilla.descripcion}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            disabled={isLoadingPreview}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoadingPreview ? (
              <IconLoader size={16} className="animate-spin" />
            ) : (
              <IconEye size={16} />
            )}
            Vista Previa
          </button>
          {canEdit && (
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              <IconEdit size={16} />
              Editar
            </button>
          )}
          {canDelete && plantilla.activa && (
            <button
              onClick={() => setDeactivateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50"
            >
              <IconPower size={16} />
              Desactivar
            </button>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Variables */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Variables ({plantilla.variables?.length || 0})
            </h2>
            {plantilla.variables && plantilla.variables.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {plantilla.variables.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No se detectaron variables</p>
            )}
          </div>

          {/* Contenido */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Contenido HTML</h2>
            <pre className="bg-gray-50 rounded-lg p-4 text-xs font-mono text-gray-700 overflow-x-auto max-h-96 whitespace-pre-wrap">
              {plantilla.contenido}
            </pre>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Informacion</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Version</dt>
                <dd className="font-medium text-gray-900">{plantilla.version}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Estado</dt>
                <dd className="font-medium text-gray-900">{plantilla.activa ? 'Activa' : 'Inactiva'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Creada</dt>
                <dd className="font-medium text-gray-900">{formatDateTime(plantilla.created_at)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Actualizada</dt>
                <dd className="font-medium text-gray-900">{formatDateTime(plantilla.updated_at)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <PlantillaFormModal
        isOpen={formOpen}
        plantilla={plantilla}
        isSubmitting={isSubmitting}
        onClose={() => setFormOpen(false)}
        onSubmit={handleUpdate}
      />

      {/* Preview Modal */}
      <PlantillaPreviewModal
        isOpen={previewOpen}
        nombre={plantilla.nombre}
        html={previewHtml}
        variables={previewVariables}
        onClose={() => setPreviewOpen(false)}
      />

      {/* Deactivate Confirm */}
      <ConfirmDialog
        isOpen={deactivateOpen}
        title="Desactivar plantilla"
        message={`¿Estas seguro de desactivar "${plantilla.nombre}"? No se podra usar para nuevos contratos.`}
        confirmText="Desactivar"
        isLoading={isDeactivating}
        onConfirm={handleDeactivate}
        onClose={() => setDeactivateOpen(false)}
      />
    </div>
  )
}
