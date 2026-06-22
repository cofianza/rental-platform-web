/**
 * Admin de plataforma: gestión de miembros de CUALQUIER inmobiliaria.
 * Lista las organizaciones y, al expandir una, permite cambiar el rol de sus
 * miembros (promover a co-titular, degradar, sólo lectura) o revocarlos.
 * Reutiliza /api/v1/admin/inmobiliarias (rol administrador).
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui'
import {
  IconUsers,
  IconLoader,
  IconShield,
  IconUser,
  IconEye,
  IconTrash,
  IconChevronDown,
  IconChevronRight,
} from '@/components/icons'
import {
  adminListInmobiliarias,
  adminListMiembros,
  adminCambiarRolMiembro,
  adminRevocarMiembro,
  type InmobiliariaAdmin,
  type AdminMiembrosResponse,
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

function MiembrosPanel({ orgId }: { orgId: string }) {
  const [data, setData] = useState<AdminMiembrosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      const res = await adminListMiembros(orgId)
      setData(res)
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message || 'No se pudieron cargar los miembros')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const handleCambiarRol = async (m: Miembro, nuevoRol: RolMiembro) => {
    if (nuevoRol === m.rol_miembro) return
    setBusyId(m.id)
    try {
      await adminCambiarRolMiembro(orgId, m.id, nuevoRol)
      toast.success(`Rol actualizado a ${ROL_LABEL[nuevoRol]}`)
      await cargar()
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message || 'No se pudo cambiar el rol')
    } finally {
      setBusyId(null)
    }
  }

  const handleRevocar = async (m: Miembro) => {
    if (!window.confirm(`Quitar a ${m.nombre || m.email} de esta inmobiliaria?`)) return
    setBusyId(m.id)
    try {
      await adminRevocarMiembro(orgId, m.id)
      toast.success('Miembro removido')
      await cargar()
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message || 'No se pudo revocar')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <IconLoader size={20} className="animate-spin text-primary-600" />
      </div>
    )
  }
  if (!data || data.miembros.length === 0) {
    return <p className="px-5 py-4 text-sm text-gray-500">Sin miembros.</p>
  }

  return (
    <ul className="divide-y divide-gray-100 bg-gray-50/50">
      {data.miembros.map((m) => (
        <li key={m.id} className="px-5 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-gray-900 truncate">
                {m.nombre ? `${m.nombre} ${m.apellido ?? ''}`.trim() : m.email}
              </p>
              <RolBadge rol={m.rol_miembro} />
              {m.estado === 'invitado' && (
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Pendiente</span>
              )}
            </div>
            {m.nombre && m.email && <p className="text-xs text-gray-500 truncate">{m.email}</p>}
          </div>

          {m.estado === 'activo' && (
            <div className="flex items-center gap-2 flex-shrink-0">
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
              <button
                onClick={() => handleRevocar(m)}
                disabled={busyId === m.id}
                title="Quitar miembro"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
              >
                <IconTrash size={16} />
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function AdminInmobiliariasPage() {
  const [orgs, setOrgs] = useState<InmobiliariaAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [abierta, setAbierta] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setOrgs(await adminListInmobiliarias())
      } catch (err: unknown) {
        toast.error((err as { message?: string }).message || 'No se pudieron cargar las inmobiliarias')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Equipos de inmobiliarias"
        subtitle="Gestiona los miembros y titulares de cada organización aliada."
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <IconLoader size={32} className="animate-spin text-primary-600" />
        </div>
      ) : orgs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <IconUsers size={32} className="text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No hay inmobiliarias registradas todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map((o) => {
            const open = abierta === o.id
            return (
              <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setAbierta(open ? null : o.id)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{o.nombre}</p>
                    <p className="text-xs text-gray-500 truncate">
                      Titular: {o.owner_nombre || '—'} · {o.miembros_activos} activos
                      {o.invitaciones_pendientes > 0 && ` · ${o.invitaciones_pendientes} pendientes`}
                      {o.estado !== 'activa' && ` · ${o.estado}`}
                    </p>
                  </div>
                  {open ? (
                    <IconChevronDown size={18} className="text-gray-400 flex-shrink-0" />
                  ) : (
                    <IconChevronRight size={18} className="text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {open && (
                  <div className="border-t border-gray-200">
                    <MiembrosPanel orgId={o.id} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
