'use client'

/**
 * Panel super-admin: limpieza de usuarios huérfanos en auth.users.
 *
 * Mario (5-may-2026): además del botón "eliminar" del panel principal,
 * pidió un panel para borrar "de un plumazo" a los usuarios sueltos —
 * los que quedan invisibles en /usuarios porque su INSERT en perfiles
 * falló a mitad de un registro. Aquí se listan y se borran.
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui'
import { IconLoader, IconTrash, IconAlertTriangle } from '@/components/icons'
import { userService } from '@/services/userService'
import { useAuth } from '@/hooks/useAuth'
import type { IOrphanAuthUser } from '@/types/user'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HuerfanosPage() {
  const router = useRouter()
  const { user, isInitialized } = useAuth()
  const [orphans, setOrphans] = useState<IOrphanAuthUser[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const isAdmin = user?.rol === 'administrador'

  useEffect(() => {
    if (isInitialized && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [isInitialized, isAdmin, router])

  const fetchOrphans = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    setError(null)
    try {
      const data = await userService.listOrphans()
      setOrphans(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al listar huérfanos')
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetchOrphans()
  }, [isAdmin, fetchOrphans])

  const handleDelete = async (orphan: IOrphanAuthUser) => {
    if (!confirm(`¿Eliminar definitivamente ${orphan.email || orphan.id}? Esta acción es irreversible.`)) {
      return
    }
    setDeleting(orphan.id)
    try {
      // Sin force — los huérfanos no tienen relaciones en perfiles, así que
      // el pre-flight backend pasa siempre. Si el RDBMS rechaza por otra FK
      // rara, el endpoint devuelve el detalle.
      await userService.deleteUser(orphan.id, { force: true })
      toast.success(`Eliminado ${orphan.email || orphan.id}`)
      // Quito de la lista local (UX rápido) y refetch para reconciliar.
      setOrphans((prev) => (prev ? prev.filter((o) => o.id !== orphan.id) : prev))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar'
      toast.error(msg)
    } finally {
      setDeleting(null)
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
        title="Limpieza de cuentas huérfanas"
        subtitle="auth.users sin entrada en perfiles — registros incompletos"
      />

      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <IconAlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-900 space-y-1">
          <p>
            Estos usuarios <strong>existen en auth.users</strong> pero no aparecen en el listado normal de
            <Link href="/usuarios" className="text-amber-900 underline ml-1">/usuarios</Link>
            porque su perfil nunca llegó a crearse (un registro que falló a mitad).
          </p>
          <p>
            Eliminar aquí los borra definitivamente de auth.users. Si quien apareció era una persona real
            que sí debe poder registrarse, este botón libera el email para reintentar.
          </p>
        </div>
      </div>

      {loading && !orphans && (
        <div className="flex items-center justify-center h-32">
          <IconLoader size={32} className="text-primary-600 animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {orphans && orphans.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-600">
            No hay cuentas huérfanas. Todos los usuarios en auth.users tienen perfil asociado.
          </p>
        </div>
      )}

      {orphans && orphans.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metadata</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orphans.map((orphan) => (
                  <tr key={orphan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{orphan.email || '—'}</p>
                        <p className="text-xs text-gray-400 font-mono">{orphan.id.slice(0, 8)}…</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(orphan.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {orphan.last_sign_in_at ? formatDate(orphan.last_sign_in_at) : <span className="text-gray-400">nunca</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-xs">
                      <span className="truncate block">
                        {Object.keys(orphan.user_metadata).length > 0
                          ? Object.entries(orphan.user_metadata)
                              .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
                              .join(' · ')
                          : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDelete(orphan)}
                        disabled={deleting === orphan.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {deleting === orphan.id ? (
                          <IconLoader size={14} className="animate-spin" />
                        ) : (
                          <IconTrash size={14} />
                        )}
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-gray-200">
            {orphans.map((orphan) => (
              <div key={orphan.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{orphan.email || '—'}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">{orphan.id}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(orphan)}
                    disabled={deleting === orphan.id}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleting === orphan.id ? <IconLoader size={12} className="animate-spin" /> : <IconTrash size={12} />}
                    Eliminar
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  Creado: {formatDate(orphan.created_at)}
                </div>
                <div className="text-xs text-gray-500">
                  Último login: {orphan.last_sign_in_at ? formatDate(orphan.last_sign_in_at) : 'nunca'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <Link
          href="/usuarios"
          className="text-sm font-medium text-primary-700 hover:text-primary-800 hover:underline"
        >
          ← Volver a usuarios
        </Link>
        <button
          onClick={fetchOrphans}
          disabled={loading}
          className="text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
        >
          {loading ? 'Recargando…' : 'Recargar lista'}
        </button>
      </div>
    </div>
  )
}
