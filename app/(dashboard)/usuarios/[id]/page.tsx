'use client'

/**
 * Página de detalle de usuario - HP-180
 * Vista de perfil de usuario individual
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui'
import { RoleBadge, StatusBadge } from '@/components/users'
import {
  IconLoader,
  IconArrowLeft,
  IconUser,
  IconMail,
  IconPhone,
  IconCalendar,
  IconHome,
  IconChevronRight,
} from '@/components/icons'
import { userService } from '@/services/userService'
import { useAuth } from '@/hooks/useAuth'
import type { IUserProfile } from '@/types/user'

/**
 * Breadcrumbs component
 */
function Breadcrumbs({ userName }: { userName?: string }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
      <Link href="/" className="hover:text-primary-600 flex items-center gap-1">
        <IconHome size={16} />
        Inicio
      </Link>
      <IconChevronRight size={14} />
      <Link href="/usuarios" className="hover:text-primary-600">
        Usuarios
      </Link>
      <IconChevronRight size={14} />
      <span className="text-gray-900 font-medium">
        {userName || 'Detalle'}
      </span>
    </nav>
  )
}

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
      <div className="p-2 bg-gray-100 rounded-lg">
        <Icon size={20} className="text-gray-600" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-gray-900 font-medium">{value || '-'}</p>
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
        // Actualizar título de la página
        document.title = `${userData.nombre} ${userData.apellido} | Habitar Propiedades`
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
      <div className="space-y-6">
        <Breadcrumbs />
        <div className="flex items-center justify-center h-64">
          <IconLoader size={32} className="text-primary-600 animate-spin" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !user) {
    return (
      <div className="space-y-6">
        <Breadcrumbs />
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 mb-4">{error || 'Usuario no encontrado'}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <IconArrowLeft size={16} />
              Volver
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
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
      {/* Breadcrumbs */}
      <Breadcrumbs userName={fullName} />

      {/* Header */}
      <div className="flex items-start justify-between">
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
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
              <IconUser size={40} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{fullName}</h2>
              <div className="flex items-center gap-2 mt-2">
                <RoleBadge role={user.rol} />
                <StatusBadge activo={user.estado === 'activo'} />
              </div>
            </div>
          </div>
        </div>

        {/* Información del usuario */}
        <div className="p-6">
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
