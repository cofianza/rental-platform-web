/**
 * Gestión de perfiles aliados (Inmobiliarias / Propietarios) — admin.
 * Lista agregada (contratos/canon/mora) desde dashboardService + CRUD real
 * reutilizando userService (crear/editar/activar/desactivar) y UserForm.
 *
 * Un solo componente parametrizado por `rol` sirve a /inmobiliarias y
 * /propietarios.
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  money,
  moneyCompact,
  fechaCorta,
  SeccionEstado,
  SeccionHeader,
  KpiRow,
  Kpi,
  Chip,
  FiltroBar,
  FiltroSelect,
  Tabla,
  Td,
} from '@/components/dashboard/secciones/_shared'
import {
  IconBuilding2,
  IconUserCheck,
  IconDollarSign,
  IconAlertTriangle,
  IconPlus,
} from '@/components/icons'
import { UserForm } from '@/components/users'
import { ConfirmDialog } from '@/components/ui'
import { PerfilDetalleModal } from '@/components/dashboard/secciones/PerfilDetalleModal'
import { dashboardService } from '@/services/dashboardService'
import { userService } from '@/services/userService'
import { ApiClientError } from '@/lib/api'
import type { IUserFormData, IUserProfile, UserRole } from '@/types/user'

// Forma común de fila (InmobiliariaRow y PropietarioRow encajan).
interface PerfilRow {
  id: string
  nombre: string
  nit?: string | null
  contacto?: string | null
  cedula?: string | null
  telefono: string | null
  ciudad?: string | null
  estado: string
  desde: string
  contratosActivos: number
  canonTotal: number
  moraActivaCount: number
}

interface Props {
  rol: Extract<UserRole, 'inmobiliaria' | 'propietario'>
}

/** Inicial para el avatar (primera letra alfanumérica del nombre). */
const inicial = (nombre: string) => {
  const c = nombre.trim().charAt(0).toUpperCase()
  return c || '?'
}

export function GestionPerfilesPage({ rol }: Props) {
  const esInmobiliaria = rol === 'inmobiliaria'
  const singular = esInmobiliaria ? 'inmobiliaria' : 'propietario'
  const titulo = esInmobiliaria ? 'Inmobiliarias' : 'Propietarios'
  const subtitulo = esInmobiliaria
    ? 'Aliados inmobiliarios: portafolio, canon y estado de cuenta.'
    : 'Propietarios directos: portafolio, canon y estado de cuenta.'
  const labelNuevo = esInmobiliaria ? 'Nueva inmobiliaria' : 'Nuevo propietario'

  const [rows, setRows] = useState<PerfilRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [estado, setEstado] = useState('todos')
  const [ciudad, setCiudad] = useState('todas')
  const [busqueda, setBusqueda] = useState('')

  // Modal de crear/editar
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editUser, setEditUser] = useState<IUserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Confirm activar/desactivar
  const [confirmTarget, setConfirmTarget] = useState<PerfilRow | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Drawer de detalle 360°
  const [detalleId, setDetalleId] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    const loader = esInmobiliaria
      ? dashboardService.getInmobiliarias()
      : dashboardService.getPropietarios()
    loader
      .then((d) => setRows(d as PerfilRow[]))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [esInmobiliaria])

  useEffect(() => {
    reload()
  }, [reload])

  // Ciudades disponibles (ambos roles traen ciudad desde el API).
  const ciudades = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.ciudad).filter((c): c is string => !!c))).sort(
      (a, b) => a.localeCompare(b, 'es-CO'),
    )
  }, [rows])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return rows.filter((r) => {
      if (estado !== 'todos' && r.estado !== estado) return false
      if (ciudad !== 'todas' && r.ciudad !== ciudad) return false
      if (q && !r.nombre.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, estado, ciudad, busqueda])

  const hayFiltro = estado !== 'todos' || ciudad !== 'todas' || busqueda.trim() !== ''
  const limpiarFiltros = () => {
    setEstado('todos')
    setCiudad('todas')
    setBusqueda('')
  }

  const total = rows.length
  const activos = rows.filter((r) => r.estado === 'activo').length
  const contratos = rows.reduce((s, r) => s + r.contratosActivos, 0)
  const canon = rows.reduce((s, r) => s + r.canonTotal, 0)
  const conMora = rows.filter((r) => r.moraActivaCount > 0).length

  // ── Acciones ──────────────────────────────────────────────

  const openCreate = () => {
    setFormMode('create')
    setEditUser(null)
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = async (row: PerfilRow) => {
    setFormError(null)
    try {
      const user = await userService.getUserById(row.id)
      setEditUser(user)
      setFormMode('edit')
      setFormOpen(true)
    } catch {
      toast.error('No pudimos cargar los datos para editar.')
    }
  }

  const handleSubmit = async (data: IUserFormData): Promise<boolean> => {
    setSaving(true)
    setFormError(null)
    try {
      if (formMode === 'create') {
        await userService.createUser({ ...data, rol })
        toast.success(`${esInmobiliaria ? 'Inmobiliaria' : 'Propietario'} creada correctamente.`)
      } else if (editUser) {
        await userService.updateUser(editUser.id, data)
        toast.success('Cambios guardados.')
      }
      reload()
      return true
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'No pudimos guardar.'
      setFormError(msg)
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActivo = async () => {
    if (!confirmTarget) return
    setConfirmLoading(true)
    try {
      if (confirmTarget.estado === 'activo') await userService.deactivateUser(confirmTarget.id)
      else await userService.activateUser(confirmTarget.id)
      toast.success(confirmTarget.estado === 'activo' ? 'Cuenta desactivada.' : 'Cuenta activada.')
      setConfirmTarget(null)
      reload()
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'No se pudo actualizar.')
    } finally {
      setConfirmLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────

  const head = esInmobiliaria
    ? ['Nombre', 'NIT', 'Contacto', 'Ciudad', 'Estado', 'Contratos', 'Canon', 'Mora', '']
    : ['Nombre', 'Cédula', 'Teléfono', 'Ciudad', 'Estado', 'Contratos', 'Canon', 'Mora', '']

  const nuevoBtn = (
    <button
      onClick={openCreate}
      className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-600 transition-colors"
    >
      <IconPlus size={16} /> {labelNuevo}
    </button>
  )

  return (
    <div className="font-display">
      <SeccionHeader title={titulo} subtitle={subtitulo} right={nuevoBtn} />

      <KpiRow>
        <Kpi
          label={`Total ${titulo.toLowerCase()}`}
          value={total}
          sub={`${activos} activas`}
          Icon={esInmobiliaria ? IconBuilding2 : IconUserCheck}
        />
        <Kpi label="Activas" value={activos} tone="green" Icon={IconUserCheck} />
        <Kpi
          label="Con mora activa"
          value={conMora}
          tone="red"
          accent={conMora > 0 ? 'danger' : 'none'}
          Icon={IconAlertTriangle}
        />
        <Kpi
          label="Canon total"
          value={moneyCompact(canon)}
          sub={`${contratos} contratos`}
          tone="green"
          Icon={IconDollarSign}
        />
      </KpiRow>

      <FiltroBar count={`${filtrados.length} de ${total}`} onClear={hayFiltro ? limpiarFiltros : undefined}>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre…"
          aria-label="Buscar por nombre"
          className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs text-ink-700 placeholder:text-ink-400 focus:border-primary-600 focus:outline-none focus:ring-[3px] focus:ring-primary-600/10"
        />
        <FiltroSelect
          label="Estado"
          value={estado}
          onChange={setEstado}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'activo', label: 'Activo' },
            { value: 'inactivo', label: 'Inactivo' },
          ]}
        />
        {ciudades.length > 0 && (
          <FiltroSelect
            label="Ciudad"
            value={ciudad}
            onChange={setCiudad}
            options={[
              { value: 'todas', label: 'Todas las ciudades' },
              ...ciudades.map((c) => ({ value: c, label: c })),
            ]}
          />
        )}
      </FiltroBar>

      <SeccionEstado
        loading={loading}
        error={error}
        onRetry={reload}
        vacio={
          !loading && filtrados.length === 0
            ? {
                icon: esInmobiliaria ? IconBuilding2 : IconUserCheck,
                titulo: hayFiltro ? 'Sin resultados' : `Aún no hay ${titulo.toLowerCase()}`,
                descripcion: hayFiltro
                  ? 'Ningún registro coincide con los filtros aplicados.'
                  : `Crea ${esInmobiliaria ? 'la primera inmobiliaria' : 'el primer propietario'} para empezar a gestionar su portafolio.`,
                action: hayFiltro ? undefined : nuevoBtn,
              }
            : false
        }
      >
        <Tabla head={head} zebra density="compact">
          {filtrados.map((r) => (
            <tr key={r.id}>
              <Td>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">
                    {inicial(r.nombre)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink-900">{r.nombre}</div>
                    <div className="text-[10px] text-ink-500">Afiliado desde {fechaCorta(r.desde)}</div>
                  </div>
                </div>
              </Td>
              {esInmobiliaria ? (
                <>
                  <Td>{r.nit ?? '—'}</Td>
                  <Td>
                    {r.contacto ?? '—'}
                    {r.telefono && <div className="text-[10px] text-ink-500">{r.telefono}</div>}
                  </Td>
                  <Td>{r.ciudad ?? '—'}</Td>
                </>
              ) : (
                <>
                  <Td>{r.cedula ?? '—'}</Td>
                  <Td>{r.telefono ?? '—'}</Td>
                  <Td>{r.ciudad ?? '—'}</Td>
                </>
              )}
              <Td>
                <Chip tone={r.estado === 'activo' ? 'green' : 'gray'}>
                  {r.estado === 'activo' ? 'Activo' : 'Inactivo'}
                </Chip>
              </Td>
              <Td>{r.contratosActivos > 0 ? r.contratosActivos : '—'}</Td>
              <Td>{r.canonTotal > 0 ? money(r.canonTotal) : '—'}</Td>
              <Td>{r.moraActivaCount > 0 ? <Chip tone="red">{r.moraActivaCount}</Chip> : '—'}</Td>
              <Td className="text-right whitespace-nowrap">
                <div className="inline-flex items-center gap-1.5">
                  <button
                    onClick={() => setDetalleId(r.id)}
                    className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:border-primary-400 hover:text-primary-600 transition-colors"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:border-primary-400 hover:text-primary-600 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setConfirmTarget(r)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      r.estado === 'activo'
                        ? 'border-ink-200 text-ink-700 hover:border-red-400 hover:text-red-600'
                        : 'border-ink-200 text-ink-700 hover:border-primary-400 hover:text-primary-600'
                    }`}
                  >
                    {r.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </Tabla>
      </SeccionEstado>

      {/* Modal crear/editar (rol fijo) */}
      <UserForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        mode={formMode}
        user={editUser}
        isLoading={saving}
        error={formError}
        lockedRol={rol}
        titleCreate={labelNuevo}
      />

      {/* Confirmar activar/desactivar */}
      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleToggleActivo}
        title={confirmTarget?.estado === 'activo' ? `Desactivar ${singular}` : `Activar ${singular}`}
        message={
          confirmTarget?.estado === 'activo'
            ? `¿Desactivar a "${confirmTarget?.nombre}"? No podrá iniciar sesión hasta reactivarla.`
            : `¿Activar a "${confirmTarget?.nombre}"?`
        }
        variant={confirmTarget?.estado === 'activo' ? 'danger' : 'default'}
        isLoading={confirmLoading}
      />

      {/* Drawer de detalle 360° del aliado */}
      <PerfilDetalleModal perfilId={detalleId} onClose={() => setDetalleId(null)} />
    </div>
  )
}
