/**
 * Admin de plataforma: gestión de miembros de CUALQUIER inmobiliaria.
 * Lista las organizaciones y, al expandir una, permite cambiar el rol de sus
 * miembros (promover a co-titular, degradar, sólo lectura) o revocarlos.
 * Reutiliza /api/v1/admin/inmobiliarias (rol administrador).
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { PageHeader, ConfirmDialog } from '@/components/ui'
import {
  IconUsers,
  IconLoader,
  IconShield,
  IconUser,
  IconEye,
  IconTrash,
  IconChevronDown,
  IconChevronRight,
  IconRefresh,
} from '@/components/icons'
import {
  adminActualizarConvenio,
  adminListInmobiliarias,
  adminListMiembros,
  adminCambiarRolMiembro,
  adminRevocarMiembro,
  type InmobiliariaAdmin,
  type AdminMiembrosResponse,
  type Miembro,
  type ModalidadFianza,
  type RolMiembro,
} from '@/services/miembrosService'

const MODALIDAD_LABEL: Record<ModalidadFianza, string> = {
  trasladada: 'Trasladada (la paga el arrendatario)',
  tradicional: 'Tradicional (la asume la inmobiliaria)',
}

/**
 * Convenio de Cofianza con la inmobiliaria (Contratos V3 §7.2): la modalidad de
 * la fianza que el asistente de contratos le presenta preseleccionada. La
 * inmobiliaria la puede cambiar contrato por contrato.
 */
function ConvenioPanel({ org, onGuardado }: { org: InmobiliariaAdmin; onGuardado: (m: ModalidadFianza | null) => void }) {
  const actual = org.modalidad_fianza_defecto ?? null
  const [valor, setValor] = useState<ModalidadFianza | ''>(actual ?? '')
  const [guardando, setGuardando] = useState(false)
  const cambio = (valor || null) !== actual

  const guardar = async () => {
    setGuardando(true)
    try {
      const r = await adminActualizarConvenio(org.id, valor || null)
      onGuardado(r.modalidad_fianza_defecto)
      toast.success('Convenio guardado. Aplica a los contratos que se inicien desde ahora.')
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message || 'No se pudo guardar el convenio')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
      <label htmlFor={`convenio-${org.id}`} className="block text-sm font-medium text-gray-900">
        Modalidad de la fianza por defecto
      </label>
      <p className="mt-0.5 text-xs text-gray-500">
        La que fija el convenio con esta inmobiliaria. Sale preseleccionada al crear un contrato y se puede cambiar en cada uno.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          id={`convenio-${org.id}`}
          value={valor}
          onChange={(e) => setValor(e.target.value as ModalidadFianza | '')}
          disabled={guardando}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 sm:flex-none"
        >
          <option value="">Sin modalidad por defecto</option>
          <option value="trasladada">{MODALIDAD_LABEL.trasladada}</option>
          <option value="tradicional">{MODALIDAD_LABEL.tradicional}</option>
        </select>
        <button
          type="button"
          onClick={guardar}
          disabled={!cambio || guardando}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando && <IconLoader size={14} className="animate-spin" />}
          Guardar
        </button>
      </div>
    </div>
  )
}

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
  const [revocarTarget, setRevocarTarget] = useState<Miembro | null>(null)
  // Cambio de rol pendiente de confirmar (antes se aplicaba al instante, incluso «Titular»).
  const [rolTarget, setRolTarget] = useState<{ m: Miembro; rol: RolMiembro } | null>(null)
  const [errorCarga, setErrorCarga] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const res = await adminListMiembros(orgId)
      setData(res)
      setErrorCarga(false)
    } catch {
      setErrorCarga(true)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const doCambiarRol = async (m: Miembro, nuevoRol: RolMiembro) => {
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

  const doRevocar = async (m: Miembro) => {
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
  if (errorCarga && !data) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p className="text-sm text-red-700">No se pudieron cargar los miembros.</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            void cargar()
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          <IconRefresh size={14} /> Reintentar
        </button>
      </div>
    )
  }
  if (!data || data.miembros.length === 0) {
    return <p className="px-5 py-4 text-sm text-gray-500">Sin miembros.</p>
  }

  return (
    <>
    <ul className="divide-y divide-gray-100 bg-gray-50/50">
      {data.miembros.map((m) => (
        <li key={m.id} className="px-5 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-gray-900 break-all">
                {m.nombre ? `${m.nombre} ${m.apellido ?? ''}`.trim() : m.email}
              </p>
              <RolBadge rol={m.rol_miembro} />
              {m.estado === 'invitado' && (
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Pendiente</span>
              )}
            </div>
            {m.nombre && m.email && <p className="text-xs text-gray-500 break-all">{m.email}</p>}
          </div>

          {m.estado === 'activo' && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={m.rol_miembro}
                disabled={busyId === m.id}
                onChange={(e) => {
                  const rol = e.target.value as RolMiembro
                  if (rol !== m.rol_miembro) setRolTarget({ m, rol })
                }}
                title="Cambiar rol"
                aria-label={`Rol de ${m.nombre || m.email}`}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
              >
                <option value="owner">Titular</option>
                <option value="miembro">Miembro</option>
                <option value="solo_lectura">Sólo lectura</option>
              </select>
              <button
                onClick={() => setRevocarTarget(m)}
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
    <ConfirmDialog
      isOpen={!!rolTarget}
      onClose={() => setRolTarget(null)}
      onConfirm={async () => {
        if (rolTarget) await doCambiarRol(rolTarget.m, rolTarget.rol)
      }}
      title={`Cambiar el rol a ${rolTarget ? ROL_LABEL[rolTarget.rol] : ''}`}
      message={`${rolTarget?.m.nombre || rolTarget?.m.email || 'Este miembro'} pasará a ${rolTarget ? ROL_LABEL[rolTarget.rol] : ''} en esta inmobiliaria.`}
      confirmLabel="Cambiar rol"
      isLoading={!!rolTarget && busyId === rolTarget.m.id}
    />
    <ConfirmDialog
      isOpen={!!revocarTarget}
      onClose={() => setRevocarTarget(null)}
      onConfirm={async () => {
        if (revocarTarget) await doRevocar(revocarTarget)
      }}
      title="Quitar miembro"
      message={`¿Quitar a ${revocarTarget?.nombre || revocarTarget?.email || 'este miembro'} de la inmobiliaria? Perderá el acceso a la cartera.`}
      confirmLabel="Quitar"
      variant="danger"
      isLoading={!!revocarTarget && busyId === revocarTarget.id}
    />
    </>
  )
}

export default function AdminInmobiliariasPage() {
  const [orgs, setOrgs] = useState<InmobiliariaAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [errorCarga, setErrorCarga] = useState(false)

  const cargarOrgs = useCallback(async () => {
    setLoading(true)
    try {
      setOrgs(await adminListInmobiliarias())
      setErrorCarga(false)
    } catch {
      setErrorCarga(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void cargarOrgs()
  }, [cargarOrgs])

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Equipos de inmobiliarias"
        subtitle="Gestiona el convenio, los miembros y los titulares de cada organización aliada."
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <IconLoader size={32} className="animate-spin text-primary-600" />
        </div>
      ) : errorCarga ? (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
          <p className="text-sm text-red-700 mb-3">No se pudieron cargar las inmobiliarias.</p>
          <button
            type="button"
            onClick={() => void cargarOrgs()}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <IconRefresh size={16} /> Reintentar
          </button>
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
                    {/* 1.6: dato de conversión — de qué afianzadora/aseguradora vienen. */}
                    {o.afianzadora_tipo && o.afianzadora_tipo !== 'ninguna' ? (
                      <p className="text-xs text-gray-400 truncate">
                        Venía de: {o.afianzadora_actual || 'sin nombre'} ({o.afianzadora_tipo})
                      </p>
                    ) : o.afianzadora_tipo === 'ninguna' ? (
                      <p className="text-xs text-gray-400 truncate">Sin afianzadora previa</p>
                    ) : null}
                    {o.modalidad_fianza_defecto && (
                      <p className="text-xs text-gray-400 truncate">
                        Fianza por defecto: {MODALIDAD_LABEL[o.modalidad_fianza_defecto]}
                      </p>
                    )}
                  </div>
                  {open ? (
                    <IconChevronDown size={18} className="text-gray-400 flex-shrink-0" />
                  ) : (
                    <IconChevronRight size={18} className="text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {open && (
                  <div className="border-t border-gray-200">
                    <ConvenioPanel
                      org={o}
                      onGuardado={(m) =>
                        setOrgs((xs) => xs.map((x) => (x.id === o.id ? { ...x, modalidad_fianza_defecto: m } : x)))
                      }
                    />
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
