/**
 * Gestión de equipo de la inmobiliaria (multi-tenant).
 * El owner invita miembros (como staff o sólo lectura), reenvía/cancela
 * invitaciones, cambia roles (promover a co-titular, degradar, sólo lectura)
 * y revoca. Cualquier miembro puede salir de la organización.
 * Reutiliza los endpoints /inmobiliaria/miembros.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader, ConfirmDialog } from '@/components/ui'
import {
  IconUsers,
  IconMail,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconLoader,
  IconShield,
  IconUser,
  IconEye,
  IconUserCheck,
  IconClock,
  IconLogOut,
} from '@/components/icons'
import {
  listMiembros,
  invitarMiembro,
  reenviarMiembro,
  revocarMiembro,
  cambiarRolMiembro,
  salirDeMiInmobiliaria,
  setMiembrosVenTodo,
  type MiembrosResponse,
  type Miembro,
  type RolMiembro,
} from '@/services/miembrosService'

const ROL_LABEL: Record<RolMiembro, string> = {
  owner: 'Titular',
  miembro: 'Miembro',
  solo_lectura: 'Sólo lectura',
}

function RolBadge({ rol }: { rol: RolMiembro }) {
  if (rol === 'owner') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
        <IconShield size={12} />
        Titular
      </span>
    )
  }
  if (rol === 'solo_lectura') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
        <IconEye size={12} />
        Sólo lectura
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
      <IconUser size={12} />
      Miembro
    </span>
  )
}

export default function EquipoPage() {
  const router = useRouter()
  const [data, setData] = useState<MiembrosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [rolInvitar, setRolInvitar] = useState<'miembro' | 'solo_lectura'>('miembro')
  const [inviting, setInviting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [savingVenTodo, setSavingVenTodo] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [confirm, setConfirm] = useState<{
    title: string
    message: string
    confirmLabel?: string
    variant?: 'default' | 'danger'
    onConfirm: () => void | Promise<void>
  } | null>(null)
  const [procesandoConfirm, setProcesandoConfirm] = useState(false)

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
      const res = await invitarMiembro(correo, rolInvitar)
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

  const handleToggleVenTodo = async (value: boolean) => {
    setSavingVenTodo(true)
    try {
      await setMiembrosVenTodo(value)
      toast.success(
        value ? 'Ahora los miembros ven toda la cartera' : 'Ahora cada miembro ve solo lo suyo',
      )
      await cargar()
    } catch (err: unknown) {
      const ex = err as { message?: string }
      toast.error(ex.message || 'No se pudo actualizar la configuración')
    } finally {
      setSavingVenTodo(false)
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

  const doRevocar = async (m: Miembro) => {
    setBusyId(m.id)
    try {
      await revocarMiembro(m.id)
      toast.success(m.estado === 'invitado' ? 'Invitación cancelada' : 'Miembro removido')
      await cargar()
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message || 'No se pudo completar la acción')
    } finally {
      setBusyId(null)
    }
  }
  const handleRevocar = (m: Miembro) => {
    const esInvit = m.estado === 'invitado'
    setConfirm({
      title: esInvit ? 'Cancelar invitación' : 'Quitar miembro',
      message: esInvit
        ? `¿Cancelar la invitación enviada a ${m.email}?`
        : `¿Quitar a ${m.nombre || m.email} del equipo? Perderá el acceso a la cartera de la inmobiliaria.`,
      confirmLabel: esInvit ? 'Cancelar invitación' : 'Quitar',
      variant: 'danger',
      onConfirm: () => doRevocar(m),
    })
  }

  const doCambiarRol = async (m: Miembro, nuevoRol: RolMiembro) => {
    setBusyId(m.id)
    try {
      await cambiarRolMiembro(m.id, nuevoRol)
      toast.success(`Rol actualizado a ${ROL_LABEL[nuevoRol]}`)
      await cargar()
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message || 'No se pudo cambiar el rol')
    } finally {
      setBusyId(null)
    }
  }
  const handleCambiarRol = (m: Miembro, nuevoRol: RolMiembro) => {
    if (nuevoRol === m.rol_miembro) return
    if (nuevoRol === 'owner') {
      setConfirm({
        title: 'Promover a titular',
        message: `¿Promover a ${m.nombre || m.email} como titular (co-titular)? Podrá gestionar el equipo y los datos de la inmobiliaria.`,
        confirmLabel: 'Promover',
        onConfirm: () => doCambiarRol(m, nuevoRol),
      })
      return
    }
    void doCambiarRol(m, nuevoRol)
  }

  const doSalir = async () => {
    setLeaving(true)
    try {
      await salirDeMiInmobiliaria()
      toast.success('Saliste de la inmobiliaria')
      router.push('/dashboard')
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message || 'No se pudo procesar la salida')
      setLeaving(false)
    }
  }
  const handleSalir = () => {
    setConfirm({
      title: 'Salir de la inmobiliaria',
      message: 'Perderás el acceso a su cartera (inmuebles, expedientes, etc.). ¿Continuar?',
      confirmLabel: 'Salir',
      variant: 'danger',
      onConfirm: doSalir,
    })
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
                <select
                  value={rolInvitar}
                  onChange={(e) => setRolInvitar(e.target.value as 'miembro' | 'solo_lectura')}
                  className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  title="Rol del miembro"
                >
                  <option value="miembro">Miembro (gestiona datos)</option>
                  <option value="solo_lectura">Sólo lectura</option>
                </select>
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
                El miembro recibirá un enlace para unirse. Un <strong>miembro</strong> puede crear y
                editar datos de la cartera; uno de <strong>sólo lectura</strong> solo puede
                consultarlos. Podrás cambiar su rol o promoverlo a titular más adelante.
              </p>
            </div>
          )}

          {/* Acceso de los miembros (owner-only) */}
          {data.soy_owner && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Acceso de los miembros a la cartera
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 max-w-xl">
                    {data.miembros_ven_todo
                      ? 'Los miembros ven TODA la cartera de la inmobiliaria (inmuebles, expedientes, moras).'
                      : 'Cada miembro ve solo lo que creó o lo que le asignes. Los titulares siempre ven todo.'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={data.miembros_ven_todo}
                  disabled={savingVenTodo}
                  onClick={() => handleToggleVenTodo(!data.miembros_ven_todo)}
                  title={data.miembros_ven_todo ? 'Ven todo' : 'Ven solo lo suyo'}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${data.miembros_ven_todo ? 'bg-primary-600' : 'bg-gray-300'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${data.miembros_ven_todo ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {m.nombre ? `${m.nombre} ${m.apellido ?? ''}`.trim() : m.email}
                      </p>
                      <RolBadge rol={m.rol_miembro} />
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

                    {/* Selector de rol (owner, miembros activos) */}
                    {data.soy_owner && m.estado === 'activo' && (
                      <select
                        value={m.rol_miembro}
                        disabled={busyId === m.id}
                        onChange={(e) => handleCambiarRol(m, e.target.value as RolMiembro)}
                        title="Cambiar rol"
                        className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                      >
                        <option value="owner">Titular</option>
                        <option value="miembro">Miembro</option>
                        <option value="solo_lectura">Sólo lectura</option>
                      </select>
                    )}

                    {/* Reenviar / cancelar invitaciones pendientes (owner) */}
                    {data.soy_owner && m.estado === 'invitado' && (
                      <div className="flex items-center gap-1">
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
                        <button
                          onClick={() => handleRevocar(m)}
                          disabled={busyId === m.id}
                          title="Cancelar invitación"
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    )}

                    {/* Quitar a otro miembro activo (owner) */}
                    {data.soy_owner && m.estado === 'activo' && !m.es_yo && (
                      <button
                        onClick={() => handleRevocar(m)}
                        disabled={busyId === m.id}
                        title="Quitar miembro"
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      >
                        <IconTrash size={16} />
                      </button>
                    )}

                    {/* Salir (yo mismo, si estoy activo) */}
                    {m.es_yo && m.estado === 'activo' && (
                      <button
                        onClick={handleSalir}
                        disabled={leaving}
                        title="Salir de la inmobiliaria"
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg disabled:opacity-50"
                      >
                        {leaving ? <IconLoader size={14} className="animate-spin" /> : <IconLogOut size={14} />}
                        Salir
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return
          setProcesandoConfirm(true)
          try {
            await confirm.onConfirm()
          } finally {
            setProcesandoConfirm(false)
          }
        }}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel}
        variant={confirm?.variant}
        isLoading={procesandoConfirm}
      />
    </div>
  )
}
