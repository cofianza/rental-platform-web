'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { PageHeader, ConfirmDialog } from '@/components/ui'
import { IconLoader, IconPlus, IconEdit, IconMenu } from '@/components/icons'
import { useAuth } from '@/hooks/useAuth'
import { tipoDocumentoAdminService } from '@/services/tipoDocumentoAdminService'
import type { ITipoDocumento } from '@/types/documento'
import { cn } from '@/lib/utils'

type FilterActivo = 'todos' | 'activos' | 'inactivos'

// Mime type → human label
const MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
}

function formatMime(mime: string): string {
  return MIME_LABELS[mime] || mime
}

// ============================================
// SortableRow
// ============================================

interface SortableRowProps {
  tipo: ITipoDocumento
  onEdit: (id: string) => void
  onToggle: (tipo: ITipoDocumento) => void
}

function SortableRow({ tipo, onEdit, onToggle }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tipo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-b border-gray-100 hover:bg-gray-50 transition-colors',
        isDragging && 'opacity-50 bg-primary-50',
      )}
    >
      {/* Drag handle */}
      <td className="px-3 py-3 w-10">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
          aria-label="Arrastrar para reordenar"
        >
          <IconMenu size={16} />
        </button>
      </td>
      {/* Orden */}
      <td className="px-3 py-3 text-sm text-gray-500 w-16 text-center">{tipo.orden}</td>
      {/* Codigo */}
      <td className="px-3 py-3 text-sm font-mono text-gray-700">{tipo.codigo}</td>
      {/* Nombre */}
      <td className="px-3 py-3 text-sm font-medium text-gray-900">{tipo.nombre}</td>
      {/* Obligatorio */}
      <td className="px-3 py-3 w-28">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            tipo.es_obligatorio
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600',
          )}
        >
          {tipo.es_obligatorio ? 'Si' : 'No'}
        </span>
      </td>
      {/* Formatos */}
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1">
          {tipo.formatos_aceptados.map((f) => (
            <span
              key={f}
              className="inline-flex px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700"
            >
              {formatMime(f)}
            </span>
          ))}
        </div>
      </td>
      {/* Tamano max */}
      <td className="px-3 py-3 text-sm text-gray-600 w-20 text-center">
        {tipo.tamano_maximo_mb} MB
      </td>
      {/* Activo */}
      <td className="px-3 py-3 w-24">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            tipo.activo
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700',
          )}
        >
          {tipo.activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      {/* Acciones */}
      <td className="px-3 py-3 w-28">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(tipo.id)}
            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="Editar"
          >
            <IconEdit size={16} />
          </button>
          <button
            onClick={() => onToggle(tipo)}
            className={cn(
              'px-2 py-1 text-xs rounded-lg transition-colors',
              tipo.activo
                ? 'text-red-600 hover:bg-red-50'
                : 'text-green-600 hover:bg-green-50',
            )}
          >
            {tipo.activo ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </td>
    </tr>
  )
}

// ============================================
// Main page
// ============================================

function TiposDocumentoContent() {
  const router = useRouter()
  const { user, isInitialized } = useAuth()
  const isAdmin = user?.rol === 'administrador'

  const [tipos, setTipos] = useState<ITipoDocumento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isReordering, setIsReordering] = useState(false)
  const [filterActivo, setFilterActivo] = useState<FilterActivo>('todos')
  const [search, setSearch] = useState('')
  const [toggleDialog, setToggleDialog] = useState<{
    isOpen: boolean
    tipo: ITipoDocumento | null
  }>({ isOpen: false, tipo: null })
  const [isToggling, setIsToggling] = useState(false)

  // Redirect non-admin
  useEffect(() => {
    if (isInitialized && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [isInitialized, isAdmin, router])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Fetch
  const fetchTipos = useCallback(async () => {
    setIsLoading(true)
    try {
      const activoParam =
        filterActivo === 'activos' ? 'true' : filterActivo === 'inactivos' ? 'false' : undefined
      const response = await tipoDocumentoAdminService.list({
        limit: 100,
        activo: activoParam,
        search: search || undefined,
      })
      setTipos(response.data)
    } catch {
      toast.error('Error al cargar tipos de documento')
    } finally {
      setIsLoading(false)
    }
  }, [filterActivo, search])

  useEffect(() => {
    if (isAdmin) fetchTipos()
  }, [fetchTipos, isAdmin])

  // DnD handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tipos.findIndex((t) => t.id === active.id)
    const newIndex = tipos.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(tipos, oldIndex, newIndex)
    setTipos(reordered)

    setIsReordering(true)
    try {
      const items = reordered.map((t, i) => ({ id: t.id, orden: i }))
      await tipoDocumentoAdminService.reordenar(items)
      toast.success('Orden actualizado')
    } catch {
      toast.error('Error al reordenar')
      fetchTipos()
    } finally {
      setIsReordering(false)
    }
  }

  // Toggle activo
  const handleToggleConfirm = async () => {
    if (!toggleDialog.tipo) return
    setIsToggling(true)
    try {
      const updated = await tipoDocumentoAdminService.toggleActivo(toggleDialog.tipo.id)
      setTipos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      toast.success(updated.activo ? 'Tipo activado' : 'Tipo desactivado')
      setToggleDialog({ isOpen: false, tipo: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cambiar estado'
      toast.error(message)
    } finally {
      setIsToggling(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader size={32} className="text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tipos de Documento"
        subtitle={`${tipos.length} tipos configurados`}
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Filter pills */}
          {(['todos', 'activos', 'inactivos'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterActivo(filter)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                filterActivo === filter
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="ml-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent w-48"
          />
        </div>

        <Link
          href="/tipos-documento/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <IconPlus size={16} />
          Nuevo tipo
        </Link>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <IconLoader size={32} className="text-primary-600 animate-spin" />
        </div>
      ) : tipos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">No se encontraron tipos de documento</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {isReordering && (
              <div className="px-4 py-2 bg-primary-50 text-primary-700 text-xs font-medium">
                Guardando orden...
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 w-10" />
                    <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase text-center w-16">
                      Orden
                    </th>
                    <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase text-left">
                      Codigo
                    </th>
                    <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase text-left">
                      Nombre
                    </th>
                    <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase text-left w-28">
                      Obligatorio
                    </th>
                    <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase text-left">
                      Formatos
                    </th>
                    <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase text-center w-20">
                      Max
                    </th>
                    <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase text-left w-24">
                      Estado
                    </th>
                    <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase text-left w-28">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <SortableContext
                  items={tipos.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {tipos.map((tipo) => (
                      <SortableRow
                        key={tipo.id}
                        tipo={tipo}
                        onEdit={(id) => router.push(`/tipos-documento/${id}/editar`)}
                        onToggle={(t) =>
                          setToggleDialog({ isOpen: true, tipo: t })
                        }
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </div>
          </div>
        </DndContext>
      )}

      {/* Toggle confirm dialog */}
      <ConfirmDialog
        isOpen={toggleDialog.isOpen}
        onClose={() => setToggleDialog({ isOpen: false, tipo: null })}
        onConfirm={handleToggleConfirm}
        title={
          toggleDialog.tipo?.activo ? 'Desactivar tipo' : 'Activar tipo'
        }
        message={
          toggleDialog.tipo?.activo
            ? `¿Desactivar "${toggleDialog.tipo?.nombre}"? No aparecera como opcion al subir documentos.`
            : `¿Activar "${toggleDialog.tipo?.nombre}"? Estara disponible al subir documentos.`
        }
        confirmLabel={toggleDialog.tipo?.activo ? 'Desactivar' : 'Activar'}
        variant={toggleDialog.tipo?.activo ? 'danger' : 'default'}
        isLoading={isToggling}
      />
    </div>
  )
}

export default function TiposDocumentoPage() {
  return <TiposDocumentoContent />
}
