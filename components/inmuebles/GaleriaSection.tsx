/**
 * Galería de Fotos del Inmueble - HP-203
 * Componente completo con upload, grid, lightbox, drag & drop y gestión de fotos
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  IconUpload,
  IconX,
  IconLoader,
  IconTrash,
  IconEdit,
  IconCheck,
  IconImage,
  IconHome,
} from '@/components/icons'
import { Lightbox } from '@/components/ui/Lightbox'
import { ConfirmDialog } from '@/components/ui'
import { inmuebleService } from '@/services/inmuebleService'
import { cn } from '@/lib/utils'
import type { IFotoInmueble } from '@/types/inmueble'
import { FOTO_LIMITS } from '@/types/inmueble'

interface GaleriaSectionProps {
  inmuebleId: string
  canEdit?: boolean
  onFachadaChange?: (newUrl: string) => void
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  error?: string
}

interface SortablePhotoProps {
  foto: IFotoInmueble
  index: number
  canEdit: boolean
  isSettingFachada: string | null
  onSetFachada: (foto: IFotoInmueble) => void
  onEditDescription: (foto: IFotoInmueble) => void
  onDelete: (foto: IFotoInmueble) => void
  onClick: (index: number) => void
}

/**
 * Componente de foto ordenable con drag & drop
 */
function SortablePhoto({
  foto,
  index,
  canEdit,
  isSettingFachada,
  onSetFachada,
  onEditDescription,
  onDelete,
  onClick,
}: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: foto.id, disabled: !canEdit })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative aspect-square rounded-lg overflow-hidden bg-gray-100',
        canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      )}
      {...attributes}
      {...listeners}
    >
      <div
        className="absolute inset-0"
        onClick={(e) => {
          if (!isDragging) {
            e.stopPropagation()
            onClick(index)
          }
        }}
      >
        <Image
          src={foto.url_thumbnail || foto.url}
          alt={foto.descripcion || `Foto ${index + 1}`}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
          draggable={false}
        />
      </div>

      {/* Badge de fachada */}
      {foto.es_fachada && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-primary-600 text-white text-xs font-medium rounded flex items-center gap-1 z-10">
          <IconHome size={12} />
          Fachada
        </div>
      )}

      {/* Overlay con acciones */}
      {canEdit && !isDragging && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 z-20">
          {/* Set as fachada */}
          {!foto.es_fachada && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSetFachada(foto)
              }}
              disabled={isSettingFachada === foto.id}
              className="p-2 bg-white rounded-full text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
              title="Establecer como fachada"
            >
              {isSettingFachada === foto.id ? (
                <IconLoader size={16} className="animate-spin" />
              ) : (
                <IconHome size={16} />
              )}
            </button>
          )}

          {/* Edit description */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEditDescription(foto)
            }}
            className="p-2 bg-white rounded-full text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            title="Editar descripción"
          >
            <IconEdit size={16} />
          </button>

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(foto)
            }}
            className="p-2 bg-white rounded-full text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Eliminar"
          >
            <IconTrash size={16} />
          </button>
        </div>
      )}

      {/* Descripción */}
      {foto.descripcion && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-linear-to-t from-black/60 to-transparent z-10">
          <p className="text-xs text-white truncate">{foto.descripcion}</p>
        </div>
      )}
    </div>
  )
}

export function GaleriaSection({ inmuebleId, canEdit = false, onFachadaChange }: GaleriaSectionProps) {
  const [fotos, setFotos] = useState<IFotoInmueble[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [editingFoto, setEditingFoto] = useState<IFotoInmueble | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [deletingFoto, setDeletingFoto] = useState<IFotoInmueble | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSavingDescription, setIsSavingDescription] = useState(false)
  const [isSettingFachada, setIsSettingFachada] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Sensors para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requiere mover 8px antes de iniciar drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Cargar fotos
  const fetchFotos = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await inmuebleService.getFotos(inmuebleId)
      setFotos(data.sort((a, b) => a.orden - b.orden))
    } catch (error) {
      console.error('Error fetching fotos:', error)
    } finally {
      setIsLoading(false)
    }
  }, [inmuebleId])

  useEffect(() => {
    fetchFotos()
  }, [fetchFotos])

  // Validar archivo
  const validateFile = (file: File): string | null => {
    const allowedTypes: readonly string[] = FOTO_LIMITS.ALLOWED_TYPES
    if (!allowedTypes.includes(file.type)) {
      return 'Tipo de archivo no permitido. Solo JPEG, PNG y WebP.'
    }
    if (file.size > FOTO_LIMITS.MAX_FILE_SIZE) {
      return 'El archivo excede 5MB.'
    }
    return null
  }

  // Subir archivos
  const uploadFiles = async (files: File[]) => {
    const remainingSlots = FOTO_LIMITS.MAX_FOTOS_PER_INMUEBLE - fotos.length

    if (remainingSlots <= 0) {
      toast.error(`Límite alcanzado: máximo ${FOTO_LIMITS.MAX_FOTOS_PER_INMUEBLE} fotos por inmueble.`)
      return
    }

    const filesToUpload = files.slice(0, remainingSlots)

    if (filesToUpload.length < files.length) {
      toast.warning(`Solo se subirán ${filesToUpload.length} de ${files.length} fotos por límite.`)
    }

    // Crear entradas de progreso
    const newUploading: UploadingFile[] = filesToUpload.map((file) => ({
      id: Math.random().toString(36).substring(2),
      file,
      progress: 0,
    }))

    setUploadingFiles((prev) => [...prev, ...newUploading])

    // Subir cada archivo
    for (const uploading of newUploading) {
      const error = validateFile(uploading.file)

      if (error) {
        setUploadingFiles((prev) =>
          prev.map((u) => (u.id === uploading.id ? { ...u, error, progress: 100 } : u))
        )
        continue
      }

      try {
        // Simular progreso (el upload real no tiene progreso granular)
        setUploadingFiles((prev) =>
          prev.map((u) => (u.id === uploading.id ? { ...u, progress: 30 } : u))
        )

        const newFoto = await inmuebleService.uploadFoto(inmuebleId, uploading.file, {
          orden: fotos.length + newUploading.indexOf(uploading),
        })

        setUploadingFiles((prev) =>
          prev.map((u) => (u.id === uploading.id ? { ...u, progress: 100 } : u))
        )

        setFotos((prev) => [...prev, newFoto].sort((a, b) => a.orden - b.orden))

        // Remover de la lista después de un momento
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((u) => u.id !== uploading.id))
        }, 1000)
      } catch (err) {
        console.error('Error uploading file:', err)
        setUploadingFiles((prev) =>
          prev.map((u) =>
            u.id === uploading.id
              ? { ...u, error: 'Error al subir', progress: 100 }
              : u
          )
        )
      }
    }
  }

  // Handler de drag end para reordenar
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = fotos.findIndex((f) => f.id === active.id)
    const newIndex = fotos.findIndex((f) => f.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Actualizar UI optimistamente
    const reorderedFotos = arrayMove(fotos, oldIndex, newIndex)
    setFotos(reorderedFotos)

    // Persistir en backend
    setIsReordering(true)
    try {
      const fotoIds = reorderedFotos.map((f) => f.id)
      await inmuebleService.reordenarFotos(inmuebleId, fotoIds)
      toast.success('Orden actualizado')
    } catch (error) {
      console.error('Error reordering fotos:', error)
      toast.error('Error al reordenar fotos')
      // Revertir cambio
      fetchFotos()
    } finally {
      setIsReordering(false)
    }
  }

  // Handlers de drag & drop para upload
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (canEdit) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (!canEdit) return

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    )
    if (files.length > 0) {
      uploadFiles(files)
    }
  }

  // Seleccionar archivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      uploadFiles(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Guardar descripción
  const handleSaveDescription = async () => {
    if (!editingFoto) return

    setIsSavingDescription(true)
    try {
      const updated = await inmuebleService.updateFoto(inmuebleId, editingFoto.id, {
        descripcion: editDescription || null,
      })
      setFotos((prev) =>
        prev.map((f) => (f.id === editingFoto.id ? updated : f))
      )
      setEditingFoto(null)
      toast.success('Descripción actualizada')
    } catch (error) {
      console.error('Error updating description:', error)
      toast.error('Error al actualizar descripción')
    } finally {
      setIsSavingDescription(false)
    }
  }

  // Eliminar foto
  const handleDeleteFoto = async () => {
    if (!deletingFoto) return

    setIsDeleting(true)
    try {
      await inmuebleService.deleteFoto(inmuebleId, deletingFoto.id, deletingFoto.url)
      setFotos((prev) => prev.filter((f) => f.id !== deletingFoto.id))
      setDeletingFoto(null)
      toast.success('Foto eliminada')
    } catch (error) {
      console.error('Error deleting foto:', error)
      toast.error('Error al eliminar foto')
    } finally {
      setIsDeleting(false)
    }
  }

  // Marcar como fachada
  const handleSetFachada = async (foto: IFotoInmueble) => {
    if (foto.es_fachada) return

    setIsSettingFachada(foto.id)
    try {
      const updated = await inmuebleService.setFotoFachada(inmuebleId, foto.id)
      // Actualizar todas las fotos (desmarcar la anterior fachada)
      setFotos((prev) =>
        prev.map((f) => ({
          ...f,
          es_fachada: f.id === foto.id ? updated.es_fachada : false,
        }))
      )
      onFachadaChange?.(foto.url)
      toast.success('Foto de fachada actualizada')
    } catch (error) {
      console.error('Error setting fachada:', error)
      toast.error('Error al establecer foto de fachada')
    } finally {
      setIsSettingFachada(null)
    }
  }

  // Abrir editor de descripción
  const openEditDescription = (foto: IFotoInmueble) => {
    setEditingFoto(foto)
    setEditDescription(foto.descripcion || '')
  }

  // Lightbox
  const lightboxImages = fotos.map((f) => ({
    url: f.url,
    descripcion: f.descripcion,
  }))

  const atLimit = fotos.length >= FOTO_LIMITS.MAX_FOTOS_PER_INMUEBLE

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader size={24} className="text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload zone (solo si puede editar y no está en límite) */}
      {canEdit && (
        <div
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : atLimit
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-primary-400 cursor-pointer'
          )}
          onClick={() => !atLimit && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={atLimit}
          />

          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                atLimit ? 'bg-gray-200' : 'bg-primary-100'
              )}
            >
              <IconUpload
                size={24}
                className={atLimit ? 'text-gray-400' : 'text-primary-600'}
              />
            </div>

            {atLimit ? (
              <>
                <p className="text-sm font-medium text-gray-500">
                  Límite de fotos alcanzado
                </p>
                <p className="text-xs text-gray-400">
                  Máximo {FOTO_LIMITS.MAX_FOTOS_PER_INMUEBLE} fotos por inmueble
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">
                  Arrastra fotos aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-gray-500">
                  JPEG, PNG o WebP. Máximo 5MB por archivo. {fotos.length}/{FOTO_LIMITS.MAX_FOTOS_PER_INMUEBLE} fotos
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hint de reordenar (solo si puede editar y hay fotos) */}
      {canEdit && fotos.length > 1 && (
        <p className="text-xs text-gray-500 text-center">
          {isReordering ? (
            <span className="flex items-center justify-center gap-1">
              <IconLoader size={12} className="animate-spin" />
              Guardando orden...
            </span>
          ) : (
            'Arrastra las fotos para reordenarlas'
          )}
        </p>
      )}

      {/* Archivos subiendo */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uf) => (
            <div
              key={uf.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                <IconImage size={20} className="text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{uf.file.name}</p>
                {uf.error ? (
                  <p className="text-xs text-red-600">{uf.error}</p>
                ) : (
                  <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 transition-all duration-300"
                      style={{ width: `${uf.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {uf.error && (
                <button
                  onClick={() =>
                    setUploadingFiles((prev) => prev.filter((u) => u.id !== uf.id))
                  }
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <IconX size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Grid de fotos */}
      {fotos.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <IconImage size={32} className="text-gray-400" />
          </div>
          <p className="text-gray-600">No hay fotos del inmueble</p>
          {canEdit && (
            <p className="text-sm text-gray-500 mt-1">
              Arrastra fotos arriba o haz clic para agregarlas
            </p>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fotos.map((f) => f.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {fotos.map((foto, index) => (
                <SortablePhoto
                  key={foto.id}
                  foto={foto}
                  index={index}
                  canEdit={canEdit}
                  isSettingFachada={isSettingFachada}
                  onSetFachada={handleSetFachada}
                  onEditDescription={openEditDescription}
                  onDelete={setDeletingFoto}
                  onClick={setLightboxIndex}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Lightbox */}
      <Lightbox
        images={lightboxImages}
        currentIndex={lightboxIndex ?? 0}
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        onPrevious={() => setLightboxIndex((prev) => (prev ?? 0) - 1)}
        onNext={() => setLightboxIndex((prev) => (prev ?? 0) + 1)}
      />

      {/* Modal editar descripción */}
      {editingFoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Editar descripción
            </h3>

            <div className="mb-4">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 mb-3">
                <Image
                  src={editingFoto.url}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              </div>
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Ej: Sala principal, Cocina, Habitación 1..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                {editDescription.length}/100 caracteres
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingFoto(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDescription}
                disabled={isSavingDescription}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingDescription ? (
                  <IconLoader size={16} className="animate-spin" />
                ) : (
                  <IconCheck size={16} />
                )}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo confirmar eliminar */}
      <ConfirmDialog
        isOpen={!!deletingFoto}
        onClose={() => setDeletingFoto(null)}
        onConfirm={handleDeleteFoto}
        title="Eliminar foto"
        message={
          deletingFoto?.es_fachada
            ? 'Esta es la foto de fachada. Al eliminarla, deberás seleccionar otra foto como fachada. ¿Continuar?'
            : '¿Estás seguro de que deseas eliminar esta foto? Esta acción no se puede deshacer.'
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
