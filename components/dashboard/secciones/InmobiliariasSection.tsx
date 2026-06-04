/**
 * Centro de Control — Sección Inmobiliarias.
 * Lista las inmobiliarias afiliadas con sus KPIs de cartera y filtros por
 * estado y ciudad. Reutiliza los helpers compartidos de `_shared`.
 */

'use client'

import { useMemo, useState } from 'react'
import { dashboardService } from '@/services/dashboardService'
import type { InmobiliariaRow } from '@/services/dashboardService'
import {
  IconBuilding2,
  IconCheck,
  IconFileText,
  IconDollarSign,
} from '@/components/icons'
import {
  money,
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

export function InmobiliariasSection() {
  const { data, loading, error, reload } = useSeccion<InmobiliariaRow[]>(() =>
    dashboardService.getInmobiliarias(),
  )

  const [estado, setEstado] = useState('todos')
  const [ciudad, setCiudad] = useState('todas')

  const rows = useMemo(() => data ?? [], [data])

  const ciudades = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.ciudad).filter((c): c is string => Boolean(c))),
      ).sort((a, b) => a.localeCompare(b, 'es')),
    [rows],
  )

  const filtrados = useMemo(
    () =>
      rows.filter((r) => {
        if (estado !== 'todos' && r.estado !== estado) return false
        if (ciudad !== 'todas' && r.ciudad !== ciudad) return false
        return true
      }),
    [rows, estado, ciudad],
  )

  const totalInmobiliarias = rows.length
  const activas = rows.filter((r) => r.estado === 'activo').length
  const contratos = rows.reduce((acc, r) => acc + r.contratosActivos, 0)
  const canonTotal = rows.reduce((acc, r) => acc + r.canonTotal, 0)

  return (
    <div>
      <SeccionHeader
        title="Inmobiliarias"
        subtitle="Inmobiliarias afiliadas y su cartera de contratos activos."
      />

      <KpiRow>
        <Kpi label="Total inmobiliarias" value={totalInmobiliarias} Icon={IconBuilding2} />
        <Kpi label="Activas" value={activas} tone="green" Icon={IconCheck} />
        <Kpi label="Contratos" value={contratos} tone="blue" Icon={IconFileText} />
        <Kpi label="Canon total" value={money(canonTotal)} tone="green" Icon={IconDollarSign} />
      </KpiRow>

      <FiltroBar count={`${filtrados.length} de ${totalInmobiliarias}`}>
        <FiltroSelect
          label="Estado"
          value={estado}
          onChange={setEstado}
          options={[
            { value: 'todos', label: 'Todos los estados' },
            { value: 'activo', label: 'Activo' },
            { value: 'inactivo', label: 'Inactivo' },
          ]}
        />
        <FiltroSelect
          label="Ciudad"
          value={ciudad}
          onChange={setCiudad}
          options={[
            { value: 'todas', label: 'Todas las ciudades' },
            ...ciudades.map((c) => ({ value: c, label: c })),
          ]}
        />
      </FiltroBar>

      <SeccionEstado
        loading={loading}
        error={error}
        onRetry={reload}
        vacio={!loading && filtrados.length === 0}
      >
        <Tabla head={['Nombre', 'NIT', 'Contacto', 'Ciudad', 'Estado', 'Contratos', 'Canon', 'Mora']}>
          {filtrados.map((r) => (
            <tr key={r.id} className="hover:bg-ink-50/60">
              <Td className="font-semibold text-ink-900">{r.nombre}</Td>
              <Td>{r.nit || '—'}</Td>
              <Td>
                {r.contacto ? (
                  <span>
                    {r.contacto}
                    {r.cargoContacto && (
                      <span className="block text-[10px] text-ink-500">{r.cargoContacto}</span>
                    )}
                  </span>
                ) : (
                  '—'
                )}
              </Td>
              <Td>{r.ciudad || '—'}</Td>
              <Td>
                <Chip tone={r.estado === 'activo' ? 'green' : 'gray'}>{r.estado}</Chip>
              </Td>
              <Td>{r.contratosActivos}</Td>
              <Td>{money(r.canonTotal)}</Td>
              <Td>
                {r.moraActivaCount > 0 ? <Chip tone="red">{r.moraActivaCount}</Chip> : '0'}
              </Td>
            </tr>
          ))}
        </Tabla>
      </SeccionEstado>
    </div>
  )
}
