'use client'

/**
 * Sección Usuarios del Centro de Control.
 * Reutiliza userService.getUsers y bitacoraService.getLogs. Muestra KPIs,
 * tabla de usuarios (filtrable por rol) y un panel de actividad reciente.
 */

import { useMemo, useState } from 'react'
import { userService } from '@/services/userService'
import { bitacoraService } from '@/services/bitacoraService'
import type { IUserProfile } from '@/types/user'
import type { IAuditLog } from '@/types/bitacora'
import {
  IconUsers,
  IconUserCheck,
  IconActivity,
} from '@/components/icons'
import {
  fechaCorta,
  useSeccion,
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

interface UsuariosData {
  usuarios: IUserProfile[]
  logs: IAuditLog[]
}

const ROL_LABELS: Record<string, string> = {
  administrador: 'Administrador',
  operador_analista: 'Operador / Analista',
  gerencia_consulta: 'Gerencia / Consulta',
  propietario: 'Propietario',
  inmobiliaria: 'Inmobiliaria',
  solicitante: 'Solicitante',
}

const esActivo = (u: IUserProfile): boolean =>
  u.estado ? u.estado === 'activo' : u.activo === true

const rolLabel = (rol: string): string => ROL_LABELS[rol] ?? rol

export function UsuariosSection() {
  const { data, loading, error, reload } = useSeccion<UsuariosData>(async () => ({
    usuarios: (await userService.getUsers({})).data,
    logs: (await bitacoraService.getLogs({ page: 1, limit: 10 })).data,
  }))

  const [rolFiltro, setRolFiltro] = useState<string>('')

  const usuarios = useMemo(() => data?.usuarios ?? [], [data])
  const logs = data?.logs ?? []

  const totalUsuarios = usuarios.length
  const activos = usuarios.filter(esActivo).length

  const opcionesRol = useMemo(() => {
    const roles = Array.from(new Set(usuarios.map((u) => u.rol)))
    return [
      { value: '', label: 'Todos los roles' },
      ...roles.map((r) => ({ value: r, label: rolLabel(r) })),
    ]
  }, [usuarios])

  const filtrados = useMemo(
    () => (rolFiltro ? usuarios.filter((u) => u.rol === rolFiltro) : usuarios),
    [usuarios, rolFiltro],
  )

  return (
    <section>
      <SeccionHeader
        title="Usuarios"
        subtitle="Equipo con acceso a la plataforma y actividad reciente"
      />

      <KpiRow>
        <Kpi label="Total usuarios" value={totalUsuarios} tone="blue" Icon={IconUsers} />
        <Kpi label="Activos" value={activos} tone="green" Icon={IconUserCheck} />
        <Kpi label="Acciones recientes" value={logs.length} tone="purple" Icon={IconActivity} />
      </KpiRow>

      <FiltroBar count={`${filtrados.length} de ${totalUsuarios}`}>
        <FiltroSelect
          label="Filtrar por rol"
          value={rolFiltro}
          onChange={setRolFiltro}
          options={opcionesRol}
        />
      </FiltroBar>

      <SeccionEstado
        loading={loading}
        error={error}
        onRetry={reload}
        vacio={!loading && filtrados.length === 0}
      >
        <Tabla head={['Nombre', 'Email', 'Rol', 'Estado', 'Desde']}>
          {filtrados.map((u) => {
            const activo = esActivo(u)
            const nombre =
              u.nombre_completo ?? [u.nombre, u.apellido].filter(Boolean).join(' ').trim()
            return (
              <tr key={u.id}>
                <Td className="font-semibold text-ink-900">{nombre || '—'}</Td>
                <Td>{u.email}</Td>
                <Td>{rolLabel(u.rol)}</Td>
                <Td>
                  <Chip tone={activo ? 'green' : 'gray'}>{activo ? 'Activo' : 'Inactivo'}</Chip>
                </Td>
                <Td>{fechaCorta(u.created_at)}</Td>
              </tr>
            )
          })}
        </Tabla>
      </SeccionEstado>

      {logs.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-bold text-ink-900">Actividad reciente</h3>
          <div className="rounded-xl border border-ink-200 bg-white">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 border-b border-ink-100 px-3 py-2.5 text-xs text-ink-700 last:border-b-0"
              >
                <span className="font-semibold text-ink-900">
                  {log.usuario_nombre ?? 'Sistema'}
                </span>
                <span>{log.accion}</span>
                {log.entidad && <span className="text-ink-500">· {log.entidad}</span>}
                <span className="ml-auto text-[11px] text-ink-400">
                  {fechaCorta(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
