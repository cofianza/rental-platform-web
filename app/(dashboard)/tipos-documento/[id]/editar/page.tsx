'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Breadcrumbs } from '@/components/ui'
import { IconLoader } from '@/components/icons'
import { TipoDocumentoForm } from '@/components/tipos-documento/TipoDocumentoForm'
import { tipoDocumentoAdminService } from '@/services/tipoDocumentoAdminService'
import { useAuth } from '@/hooks/useAuth'
import type { ITipoDocumento, ICreateTipoDocumento } from '@/types/documento'

export default function EditarTipoDocumentoPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { user, isInitialized } = useAuth()
  const isAdmin = user?.rol === 'administrador'

  const [tipo, setTipo] = useState<ITipoDocumento | null>(null)
  const [isFetching, setIsFetching] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isInitialized && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [isInitialized, isAdmin, router])

  useEffect(() => {
    if (!isAdmin || !id) return
    setIsFetching(true)
    tipoDocumentoAdminService
      .getById(id)
      .then(setTipo)
      .catch(() => {
        toast.error('Tipo de documento no encontrado')
        router.push('/tipos-documento')
      })
      .finally(() => setIsFetching(false))
  }, [id, isAdmin, router])

  const handleSubmit = async (data: ICreateTipoDocumento): Promise<boolean> => {
    setIsLoading(true)
    try {
      await tipoDocumentoAdminService.update(id, data)
      toast.success('Tipo de documento actualizado')
      router.push('/tipos-documento')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar'
      toast.error(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAdmin || isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader size={32} className="text-primary-600 animate-spin" />
      </div>
    )
  }

  if (!tipo) return null

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Tipos Documento', href: '/tipos-documento' },
          { label: `Editar: ${tipo.nombre}` },
        ]}
      />

      <h1 className="text-xl font-semibold text-gray-900">Editar Tipo de Documento</h1>

      <TipoDocumentoForm
        mode="edit"
        initialData={tipo}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/tipos-documento')}
        isLoading={isLoading}
      />
    </div>
  )
}
