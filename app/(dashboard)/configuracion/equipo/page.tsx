/**
 * Gestión de equipo de la inmobiliaria (multi-tenant Fase 2).
 * El owner invita miembros por email, reenvía o revoca. Los miembros ven el
 * equipo en solo-lectura. Reutiliza los endpoints /inmobiliaria/miembros.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui'
import {
  IconUsers,
  IconMail,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconLoader,
  IconShield,
  IconUserCheck,
  IconClock,
} from '@/components/icons'
import {
  listMiembros,
  invitarMiembro,
  reenviarMiembro,
  revocarMiembro,
  type MiembrosResponse,
  type Miembro,
} from '@/services/miembrosService'

export default function EquipoPage() {
  const [data, setData] = useState<MiembrosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      const res = await listMiembros()
      setData(res)
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || 'No se pudo cargar el equipo')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const handleInvitar = async (e: React.FormEvent) => {
    e.preventDefault()
    const correo = email.trim()
    if (!correo) return
    setInviting(true)
    try {
      const res = await invitarMiembro(correo)
      toast.success(res.reenviada ? 'Invitación reenviada' : 'Invitación enviada')
      setEmail('')
      await cargar()
    } catch (err: unknown) {
      const ex = err as { message?: string }
      toast.error(ex.message || 'No se pudo enviar la invitación')
    } finally {
      setInviting(false)
    }
  }

  const handleReenviar = async (m: Miembro) => {
    setBusyId(m.id)
    try {
      await reenviarMiembro(m.id)
      toast.success('Invitación reenviada')
      await cargar()
    } catch (err: unknown) {
      const ex = err as { message?: string }
      toast.error(ex.message || 'No se pudo reenviar')
    } finally {
      setBusyId(null)
    }
  }

  const handleRevocar = async (m: Miembro) => {
    const etiqueta = m.estado === 'invitado' ? 'Cancelar esta invitación' : `Quitar a ${m.email}`
    if (!window.confirm(`${etiqueta}?`)) return
    setBusyId(m.id)
    try {
      await revocarMiembro(m.id)
      toast.success(m.estado === 'invitado' ? 'Invitación cancelada' : 'Miembro removido')
      await cargar()
    } catch (err: unknown) {
      const ex = err as { message?: string }
      toast.error(ex.message || 'No se pudo completar la acción')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Equipo"
        subtitle="Invita a tu equipo a gestionar la cartera de la inmobiliaria en conjunto."
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <IconLoader size={32} className="animate-spin text-primary-600" />
        </div>
      ) : !data || !data.organizacion.id ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <IconUsers size={32} className="text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            Aún no tienes una organización configurada. Si crees que es un error, contacta a soporte.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Formulario de invitación (solo owner) */}
          {data.soy_owner && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <IconPlus size={16} className="text-primary-600" />
                Invitar a un miembro
              </h2>
              <form onSubmit={handleInvitar} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <IconMail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-coral-500 rounded-lg hover:bg-coral-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {inviting ? <IconLoader size={16} className="animate-spin" /> : <IconMail size={16} />}
                  Enviar invitación
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-3">
                El miembro recibirá un enlace para unirse. Si no tiene cuenta, podrá crearla; si ya
                la tiene, solo deberá aceptar. Tendrá acceso a la cartera de la inmobiliaria.
              </p>
            </div>
          )}

          {/* Roster */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
              <IconUsers size={16} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">
                {data.organizacion.nombre} · {data.miembros.length}{' '}
                {data.miembros.length === 1 ? 'persona' : 'personas'}
              </h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {data.miembros.map((m) => (
                <li key={m.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {m.nombre ? `${m.nombre} ${m.apellido ?? ''}`.trim() : m.email}
                      </p>
                      {m.rol_miembro === 'owner' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                          <IconShield size={12} />
                          Titular
                        </span>
                      )}
                      {m.es_yo && <span className="text-xs text-gray-400">(tú)</span>}
                    </div>
                    {m.nombre && m.email && (
                      <p className="text-xs text-gray-500 truncate">{m.email}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {m.estado === 'activo' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <IconUserCheck size={12} />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        <IconClock size={12} />
                        Invitación pendiente
                      </span>
                    )}

                    {data.soy_owner && m.rol_miembro !== 'owner' && (
                      <div className="flex items-center gap-1">
                        {m.estado === 'invitado' && (
                          <button
                            onClick={() => handleReenviar(m)}
                            disabled={busyId === m.id}
                            title="Reenviar invitación"
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg disabled:opacity-50"
                          >
                            {busyId === m.id ? (
                              <IconLoader size={16} className="animate-spin" />
                            ) : (
                              <IconRefresh size={16} />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleRevocar(m)}
                          disabled={busyId === m.id}
                          title={m.estado === 'invitado' ? 'Cancelar invitación' : 'Quitar miembro'}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
