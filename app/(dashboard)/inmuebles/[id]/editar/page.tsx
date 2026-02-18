'use client'

/**
 * Página de Editar Inmueble - HP-174
 * Formulario para editar un inmueble existente
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { InmuebleForm } from '@/components/inmuebles'
import { PageHeader } from '@/components/ui'
import { IconLoader } from '@/components/icons'
import { inmuebleService } from '@/services/inmuebleService'
import type { IInmueble } from '@/types/inmueble'

export default function EditarInmueblePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [inmueble, setInmueble] = useState<IInmueble | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInmueble() {
      if (!id) return

      setIsLoading(true)
      setError(null)

      try {
        const data = await inmuebleService.getInmuebleById(id)
        setInmueble(data)
      } catch (err) {
        console.error('Error fetching inmueble:', err)
        setError('No se pudo cargar el inmueble')
        toast.error('Error al cargar el inmueble')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInmueble()
  }, [id])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar Inmueble" subtitle="Cargando datos..." />
        <div className="flex items-center justify-center h-64">
          <IconLoader size={32} className="text-primary-600 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !inmueble) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar Inmueble" subtitle="Error al cargar" />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-600 mb-4">{error || 'Inmueble no encontrado'}</p>
          <button
            onClick={() => router.push('/inmuebles')}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Volver al listado
          </button>
        </div>
      </div>
    )
  }

  return <InmuebleForm mode="edit" inmueble={inmueble} />
}
