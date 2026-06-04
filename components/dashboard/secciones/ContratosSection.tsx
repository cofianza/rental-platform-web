/**
 * Centro de Control — Sección Contratos.
 * Lista los contratos administrados (GET /dashboard/admin/contratos) con KPIs
 * de cartera, filtros por estado y estado de pago, y chips de estado/vencimiento.
 */

'use client'

import { useMemo, useState } from 'react'
import { dashboardService } from '@/services/dashboardService'
import type { ContratoAdminRow } from '@/services/dashboardService'
import {
  IconFileText,
  IconCheck,
  IconAlertTriangle,
  IconDollarSign,
} from '@/components/icons'
import {
  money,
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
import type { ChipTone } from '@/components/dashboard/secciones/_shared'

const TODOS = '__todos__'

function estadoTone(estado: string): ChipTone {
  switch (estado) {
    case 'vigente':
      return 'green'
    case 'firmado':
      return 'blue'
    case 'finalizado':
    case 'cancelado':
      return 'gray'
    default:
      return 'yellow'
  }
}

function pagoChip(pago: ContratoAdminRow['pago']) {
  return pago === 'mora' ? <Chip tone="red">Mora</Chip> : <Chip tone="green">Al día</Chip>
}

export function ContratosSection() {
  const { data, loading, error, reload } = useSeccion<ContratoAdminRow[]>(() =>
    dashboardService.getContratosAdmin(),
  )

  const [estado, setEstado] = useState<string>(TODOS)
  const [pago, setPago] = useState<string>(TODOS)

  const rows = useMemo<ContratoAdminRow[]>(() => data ?? [], [data])

  const estadoOptions = useMemo(() => {
    const presentes = Array.from(new Set(rows.map((r) => r.estado))).sort()
    return [
      { value: TODOS, label: 'Todos los estados' },
      ...presentes.map((e) => ({ value: e, label: e.replace(/_/g, ' ') })),
    ]
  }, [rows])

  const filtrados = useMemo(
    () =>
      rows.filter(
        (r) => (estado === TODOS || r.estado === estado) && (pago === TODOS || r.pago === pago),
      ),
    [rows, estado, pago],
  )

  const total = rows.length
  const vigentes = rows.filter((r) => r.estado === 'vigente').length
  const porVencer = rows.filter((r) => r.porVencer).length
  const canonActivos = rows
    .filter((r) => r.estado === 'firmado' || r.estado === 'vigente')
    .reduce((acc, r) => acc + (r.canon ?? 0), 0)

  return (
    <div>
      <SeccionHeader
        title="Contratos"
        subtitle="Cartera de contratos administrados y su estado de pago"
      />

      <KpiRow>
        <Kpi label="Total" value={total} Icon={IconFileText} />
        <Kpi label="Vigentes" value={vigentes} tone="green" Icon={IconCheck} />
        <Kpi label="Por vencer" value={porVencer} tone="orange" Icon={IconAlertTriangle} />
        <Kpi label="Canon activos" value={money(canonActivos)} tone="green" Icon={IconDollarSign} />
      </KpiRow>

      <FiltroBar count={`${filtrados.length} de ${total}`}>
        <FiltroSelect
          label="Filtrar por estado"
          value={estado}
          onChange={setEstado}
          options={estadoOptions}
        />
        <FiltroSelect
          label="Filtrar por pago"
          value={pago}
          onChange={setPago}
          options={[
            { value: TODOS, label: 'Todos los pagos' },
            { value: 'al_dia', label: 'Al día' },
            { value: 'mora', label: 'Mora' },
          ]}
        />
      </FiltroBar>

      <SeccionEstado
        loading={loading}
        error={error}
        onRetry={reload}
        vacio={!loading && filtrados.length === 0}
      >
        <Tabla
          head={[
            'Inmueble',
            'Inquilino',
            'Propietario',
            'Canon',
            'Inicio',
            'Fin',
            'Mes',
            'Estado',
            'Pago',
          ]}
        >
          {filtrados.map((r) => (
            <tr key={r.id} className="hover:bg-ink-50/60">
              <Td className="font-medium text-ink-900">{r.inmueble}</Td>
              <Td>{r.inquilino}</Td>
              <Td>{r.propietario}</Td>
              <Td className="whitespace-nowrap">{money(r.canon)}</Td>
              <Td className="whitespace-nowrap">{fechaCorta(r.inicio)}</Td>
              <Td className="whitespace-nowrap">{fechaCorta(r.fin)}</Td>
              <Td>{r.mes}</Td>
              <Td>
                <div className="flex flex-wrap items-center gap-1">
                  <Chip tone={estadoTone(r.estado)}>{r.estado.replace(/_/g, ' ')}</Chip>
                  {r.porVencer && <Chip tone="orange">Por vencer</Chip>}
                </div>
              </Td>
              <Td>{pagoChip(r.pago)}</Td>
            </tr>
          ))}
        </Tabla>
      </SeccionEstado>
    </div>
  )
}
