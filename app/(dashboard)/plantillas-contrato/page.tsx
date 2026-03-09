'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { IconHome, IconChevronRight, IconPlus, IconLoader } from '@/components/icons'
import {
  PlantillasFilters,
  PlantillasTable,
  PlantillaFormModal,
} from '@/components/plantillas-contrato'
import { ConfirmDialog } from '@/components/users'
import { plantillaContratoService } from '@/services/plantillaContratoService'
import { useAuth } from '@/hooks/useAuth'
import type {
  IPlantillaContrato,
  IPlantillaContratoMeta,
  IPlantillaContratoFormData,
} from '@/types/plantilla-contrato'

function Breadcrumbs() {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
      <Link href="/" className="hover:text-primary-600 flex items-center gap-1">
        <IconHome size={16} />
        Inicio
      </Link>
      <IconChevronRight size={14} />
      <span className="text-gray-900 font-medium">Plantillas de Contrato</span>
    </nav>
  )
}

export default function PlantillasContratoPage() {
  const { user } = useAuth()

  // Data
  const [plantillas, setPlantillas] = useState<IPlantillaContrato[]>([])
  const [meta, setMeta] = useState<IPlantillaContratoMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [activa, setActiva] = useState<'true' | 'false' | ''>('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<'created_at' | 'nombre' | 'version'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Modals
  const [formModal, setFormModal] = useState<{
    isOpen: boolean
    plantilla: IPlantillaContrato | null
  }>({ isOpen: false, plantilla: null })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deactivateDialog, setDeactivateDialog] = useState<{
    isOpen: boolean
    plantilla: IPlantillaContrato | null
  }>({ isOpen: false, plantilla: null })
  const [isDeactivating, setIsDeactivating] = useState(false)

  // Permissions
  const isAdmin = user?.rol === 'administrador'
  const canCreate = isAdmin
  const canEdit = isAdmin
  const canDelete = isAdmin

  // Fetch
  const fetchPlantillas = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await plantillaContratoService.getPlantillas({
        search: search || undefined,
        activa: activa || undefined,
        page,
        limit: 10,
        sortBy,
        sortDir,
      })
      setPlantillas(result.data)
      setMeta(result.meta)
    } catch {
      setError('Error al cargar las plantillas')
    } finally {
      setIsLoading(false)
    }
  }, [search, activa, page, sortBy, sortDir])

  useEffect(() => {
    fetchPlantillas()
  }, [fetchPlantillas])

  // Debounce search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Handlers
  function handleSort(field: 'created_at' | 'nombre' | 'version') {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
    setPage(1)
  }

  function handleActivaChange(value: 'true' | 'false' | '') {
    setActiva(value)
    setPage(1)
  }

  async function handleFormSubmit(data: IPlantillaContratoFormData) {
    setIsSubmitting(true)
    try {
      if (formModal.plantilla) {
        await plantillaContratoService.updatePlantilla(formModal.plantilla.id, data)
        toast.success('Plantilla actualizada correctamente')
      } else {
        await plantillaContratoService.createPlantilla(data)
        toast.success('Plantilla creada correctamente')
      }
      setFormModal({ isOpen: false, plantilla: null })
      fetchPlantillas()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar la plantilla'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleConfirmDeactivate() {
    if (!deactivateDialog.plantilla) return
    setIsDeactivating(true)
    try {
      await plantillaContratoService.deletePlantilla(deactivateDialog.plantilla.id)
      toast.success('Plantilla desactivada correctamente')
      setDeactivateDialog({ isOpen: false, plantilla: null })
      fetchPlantillas()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al desactivar la plantilla'
      toast.error(message)
    } finally {
      setIsDeactivating(false)
    }
  }

  return (
    <div className="p-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantillas de Contrato</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las plantillas HTML para contratos de arrendamiento
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setFormModal({ isOpen: true, plantilla: null })}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
          >
            <IconPlus size={18} />
            Nueva Plantilla
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4">
        <PlantillasFilters
          search={searchInput}
          activa={activa}
          onSearchChange={setSearchInput}
          onActivaChange={handleActivaChange}
        />
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <IconLoader size={24} className="animate-spin text-primary-600" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-2">{error}</p>
            <button
              onClick={fetchPlantillas}
              className="text-sm text-primary-600 hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <PlantillasTable
            plantillas={plantillas}
            meta={meta}
            sortBy={sortBy}
            sortDir={sortDir}
            canEdit={canEdit}
            canDelete={canDelete}
            onSort={handleSort}
            onPageChange={setPage}
            onEdit={(p) => setFormModal({ isOpen: true, plantilla: p })}
            onDeactivate={(p) => setDeactivateDialog({ isOpen: true, plantilla: p })}
          />
        )}
      </div>

      {/* Form Modal */}
      <PlantillaFormModal
        isOpen={formModal.isOpen}
        plantilla={formModal.plantilla}
        isSubmitting={isSubmitting}
        onClose={() => setFormModal({ isOpen: false, plantilla: null })}
        onSubmit={handleFormSubmit}
      />

      {/* Deactivate Confirm */}
      <ConfirmDialog
        isOpen={deactivateDialog.isOpen}
        title="Desactivar plantilla"
        message={`¿Estas seguro de desactivar la plantilla "${deactivateDialog.plantilla?.nombre}"? No se podra usar para nuevos contratos.`}
        confirmText="Desactivar"
        isLoading={isDeactivating}
        onConfirm={handleConfirmDeactivate}
        onClose={() => setDeactivateDialog({ isOpen: false, plantilla: null })}
      />
    </div>
  )
}
