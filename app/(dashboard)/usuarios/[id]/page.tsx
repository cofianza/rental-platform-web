'use client'

/**
 * Página de detalle de usuario - HP-180
 * Vista de perfil de usuario individual
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import { RoleBadge, StatusBadge } from '@/components/users'
import { SkeletonDetail } from '@/components/ui/Skeleton'
import {
  IconArrowLeft,
  IconUser,
  IconMail,
  IconPhone,
  IconCalendar,
} from '@/components/icons'
import { userService } from '@/services/userService'
import { useAuth } from '@/hooks/useAuth'
import type { IUserProfile } from '@/types/user'


/**
 * Componente de información
 */
function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-gray-100 rounded-lg shrink-0">
        <Icon size={20} className="text-gray-600" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-gray-900 font-medium break-words">{value || '-'}</p>
      </div>
    </div>
  )
}

/**
 * Formato de fecha
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function UsuarioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const userId = params.id as string

  const [user, setUser] = useState<IUserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar datos del usuario
  useEffect(() => {
    async function fetchUser() {
      if (!userId) return

      setIsLoading(true)
      setError(null)

      try {
        const userData = await userService.getUserById(userId)
        setUser(userData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar el usuario'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [userId])

  // Loading state
  if (isLoading) {
    return (
      <SkeletonDetail bloques={1} etiqueta="Cargando el perfil del usuario…" />
    )
  }

  // Error state
  if (error || !user) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 mb-4">{error || 'Usuario no encontrado'}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <IconArrowLeft size={16} />
              Volver
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  const fullName = `${user.nombre} ${user.apellido}`
  const isOwnProfile = currentUser?.id === user.id

  return (
    <div className="space-y-6">
      {/* Título de la pestaña: <title> de React 19 (va al <head>; al salir lo quita y queda el de la metadata). */}
      <title>{`${user.nombre} ${user.apellido} | Cofianza`}</title>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={fullName}
          subtitle={isOwnProfile ? 'Mi perfil' : 'Perfil de usuario'}
        />
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <IconArrowLeft size={16} />
          Volver
        </button>
      </div>

      {/* Contenido principal */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Avatar y badges */}
        <div className="bg-linear-to-r from-primary-600 to-primary-700 px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-white rounded-full flex items-center justify-center">
              <IconUser size={40} className="text-primary-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white break-words">{fullName}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <RoleBadge role={user.rol} />
                <StatusBadge activo={user.estado === 'activo'} />
              </div>
            </div>
          </div>
        </div>

        {/* Información del usuario */}
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Información de contacto
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoItem
              icon={IconMail}
              label="Correo electrónico"
              value={user.email}
            />
            <InfoItem
              icon={IconPhone}
              label="Teléfono"
              value={user.telefono || 'No registrado'}
            />
            <InfoItem
              icon={IconCalendar}
              label="Fecha de registro"
              value={formatDate(user.created_at)}
            />
            <InfoItem
              icon={IconCalendar}
              label="Última actualización"
              value={formatDate(user.updated_at)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
