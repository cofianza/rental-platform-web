'use client'

import { useMemo, useState } from 'react'
import { dashboardService, type PropietarioRow } from '@/services/dashboardService'
import {
  IconUsers,
  IconCheck,
  IconFileText,
  IconDollarSign,
  IconAlertTriangle,
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
  type ChipTone,
} from './_shared'

const estadoTone = (estado: string): ChipTone => {
  switch (estado) {
    case 'activo':
      return 'green'
    case 'inactivo':
      return 'gray'
    default:
      return 'gray'
  }
}

export function PropietariosSection() {
  const { data, loading, error, reload } = useSeccion<PropietarioRow[]>(() =>
    dashboardService.getPropietarios(),
  )
  const [estado, setEstado] = useState<string>('todos')

  const propietarios = useMemo(() => data ?? [], [data])

  const filtrados = useMemo(
    () => propietarios.filter((p) => estado === 'todos' || p.estado === estado),
    [propietarios, estado],
  )

  const total = propietarios.length
  const activos = propietarios.filter((p) => p.estado === 'activo').length
  const contratos = propietarios.reduce((acc, p) => acc + p.contratosActivos, 0)
  const canonTotal = propietarios.reduce((acc, p) => acc + p.canonTotal, 0)

  return (
    <div>
      <SeccionHeader
        title="Propietarios"
        subtitle="Arrendadores registrados, sus contratos activos y estado de cartera."
      />

      <KpiRow>
        <Kpi label="Total" value={total} Icon={IconUsers} />
        <Kpi label="Activos" value={activos} tone="green" Icon={IconCheck} />
        <Kpi label="Contratos" value={contratos} tone="blue" Icon={IconFileText} />
        <Kpi label="Canon total" value={money(canonTotal)} tone="green" Icon={IconDollarSign} />
      </KpiRow>

      <FiltroBar count={`${filtrados.length} de ${total}`}>
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
      </FiltroBar>

      <SeccionEstado
        loading={loading}
        error={error}
        onRetry={reload}
        vacio={!loading && filtrados.length === 0}
      >
        <Tabla head={['Nombre', 'Cédula', 'Teléfono', 'Estado', 'Contratos', 'Canon', 'Mora']}>
          {filtrados.map((p) => (
            <tr key={p.id}>
              <Td className="font-semibold text-ink-900">{p.nombre}</Td>
              <Td>{p.cedula ?? '—'}</Td>
              <Td>{p.telefono ?? '—'}</Td>
              <Td>
                <Chip tone={estadoTone(p.estado)}>{p.estado}</Chip>
              </Td>
              <Td>{p.contratosActivos}</Td>
              <Td>{money(p.canonTotal)}</Td>
              <Td>
                {p.moraActivaCount > 0 ? (
                  <Chip tone="red">
                    <IconAlertTriangle size={11} /> {p.moraActivaCount}
                  </Chip>
                ) : (
                  '—'
                )}
              </Td>
            </tr>
          ))}
        </Tabla>
      </SeccionEstado>
    </div>
  )
}
