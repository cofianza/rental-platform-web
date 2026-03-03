'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Breadcrumbs } from '@/components/ui'
import { IconLoader } from '@/components/icons'
import { TipoDocumentoForm } from '@/components/tipos-documento/TipoDocumentoForm'
import { tipoDocumentoAdminService } from '@/services/tipoDocumentoAdminService'
import { useAuth } from '@/hooks/useAuth'
import type { ICreateTipoDocumento } from '@/types/documento'

export default function NuevoTipoDocumentoPage() {
  const router = useRouter()
  const { user, isInitialized } = useAuth()
  const isAdmin = user?.rol === 'administrador'
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isInitialized && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [isInitialized, isAdmin, router])

  const handleSubmit = async (data: ICreateTipoDocumento): Promise<boolean> => {
    setIsLoading(true)
    try {
      await tipoDocumentoAdminService.create(data)
      toast.success('Tipo de documento creado')
      router.push('/tipos-documento')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear tipo de documento'
      toast.error(message)
      return false
    } finally {
      setIsLoading(false)
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
      <Breadcrumbs
        items={[
          { label: 'Tipos Documento', href: '/tipos-documento' },
          { label: 'Nuevo' },
        ]}
      />

      <h1 className="text-xl font-semibold text-gray-900">Nuevo Tipo de Documento</h1>

      <TipoDocumentoForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push('/tipos-documento')}
        isLoading={isLoading}
      />
    </div>
  )
}
