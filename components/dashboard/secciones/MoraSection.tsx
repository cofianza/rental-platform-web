'use client'

/**
 * Sección Mora — Centro de Control.
 * Lista tickets de mora (flujo 3 fases) reutilizando morasService.
 * Incluye el desembolso de Cofianza al propietario (cofianza_pago_*).
 */

import { useMemo, useState } from 'react'
import { morasService, type IMoraTicket, type MoraEstado } from '@/services/morasService'
import {
  Chip,
  FiltroBar,
  FiltroSelect,
  Kpi,
  KpiRow,
  money,
  fechaCorta,
  SeccionEstado,
  SeccionHeader,
  Tabla,
  Td,
  useSeccion,
  type ChipTone,
} from '@/components/dashboard/secciones/_shared'
import {
  IconAlertTriangle,
  IconClock,
  IconDollarSign,
  IconReceipt,
} from '@/components/icons'

const ESTADOS_ACTIVOS: MoraEstado[] = ['fase_1', 'fase_2', 'fase_3']

const esActiva = (m: IMoraTicket) => ESTADOS_ACTIVOS.includes(m.estado)

const faseNumero = (estado: MoraEstado): number => {
  const match = /^fase_(\d+)$/.exec(estado)
  return match ? parseInt(match[1], 10) : 0
}

const diasMora = (m: IMoraTicket): number => {
  const t = new Date(m.reportado_at).getTime()
  if (Number.isNaN(t)) return 0
  return Math.floor((Date.now() - t) / 86_400_000)
}

const ESTADO_LABEL: Record<MoraEstado, string> = {
  fase_1: 'Fase 1',
  fase_2: 'Fase 2',
  fase_3: 'Fase 3',
  pagada: 'Pagada',
  cancelada: 'Cancelada',
}

const FILTRO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'todas', label: 'Todas las fases' },
  { value: 'fase_1', label: 'Fase 1' },
  { value: 'fase_2', label: 'Fase 2' },
  { value: 'fase_3', label: 'Fase 3' },
  { value: 'pagada', label: 'Pagada' },
  { value: 'cancelada', label: 'Cancelada' },
]

function ChipFase({ estado }: { estado: MoraEstado }) {
  if (estado === 'pagada' || estado === 'cancelada') {
    return <Chip tone="gray">{ESTADO_LABEL[estado]}</Chip>
  }
  const fase = faseNumero(estado)
  const tone: ChipTone = fase >= 3 ? 'purple' : fase === 2 ? 'red' : 'orange'
  return <Chip tone={tone}>Fase {fase}</Chip>
}

export function MoraSection() {
  const { data, loading, error, reload } = useSeccion<{ data: IMoraTicket[] }>(
    () => morasService.list({}),
  )
  const [filtroEstado, setFiltroEstado] = useState<string>('todas')

  const moras = useMemo<IMoraTicket[]>(() => data?.data ?? [], [data])

  const filtrados = useMemo<IMoraTicket[]>(() => {
    if (filtroEstado === 'todas') return moras
    return moras.filter((m) => m.estado === filtroEstado)
  }, [moras, filtroEstado])

  const activas = useMemo<IMoraTicket[]>(() => moras.filter(esActiva), [moras])

  const montoEnMora = activas.reduce((acc, m) => acc + Number(m.monto_mora ?? 0), 0)

  const diasPromedio = activas.length
    ? Math.round(activas.reduce((acc, m) => acc + diasMora(m), 0) / activas.length)
    : 0

  const desembolsado = moras
    .filter((m) => m.cofianza_pago_realizado)
    .reduce((acc, m) => acc + Number(m.cofianza_pago_monto ?? 0), 0)

  return (
    <div>
      <SeccionHeader title="Mora" subtitle="Gestión de cobro en 3 fases" />

      <KpiRow>
        <Kpi
          label="Casos activos"
          value={activas.length}
          tone="red"
          Icon={IconAlertTriangle}
        />
        <Kpi
          label="Monto en mora"
          value={money(montoEnMora)}
          tone="red"
          Icon={IconDollarSign}
        />
        <Kpi
          label="Días promedio"
          value={diasPromedio}
          sub="de casos activos"
          tone="orange"
          Icon={IconClock}
        />
        <Kpi
          label="Desembolsado"
          value={money(desembolsado)}
          sub="pagado a propietarios"
          tone="purple"
          Icon={IconReceipt}
        />
      </KpiRow>

      <FiltroBar count={`${filtrados.length} de ${moras.length} casos`}>
        <FiltroSelect
          label="Fase / estado"
          value={filtroEstado}
          onChange={setFiltroEstado}
          options={FILTRO_OPTIONS}
        />
      </FiltroBar>

      <SeccionEstado
        loading={loading}
        error={error}
        onRetry={reload}
        vacio={!loading && filtrados.length === 0}
      >
        <Tabla
          head={['Ticket', 'Inquilino', 'Inmueble', 'Monto', 'Días', 'Fase', 'Fecha', 'Cofianza pagó']}
        >
          {filtrados.map((m) => (
            <tr key={m.id} className="hover:bg-ink-50">
              <Td className="font-semibold text-ink-900">{m.ticket_numero}</Td>
              <Td>{m.inquilino_nombre}</Td>
              <Td>{m.inmueble_direccion ?? m.inmueble_codigo ?? '—'}</Td>
              <Td className="font-semibold">{money(m.monto_mora)}</Td>
              <Td>{esActiva(m) ? `${diasMora(m)} d` : '—'}</Td>
              <Td>
                <ChipFase estado={m.estado} />
              </Td>
              <Td>{fechaCorta(m.reportado_at)}</Td>
              <Td>
                {m.cofianza_pago_realizado ? (
                  <Chip tone="red">{money(m.cofianza_pago_monto)}</Chip>
                ) : (
                  <Chip tone="gray">No</Chip>
                )}
              </Td>
            </tr>
          ))}
        </Tabla>
      </SeccionEstado>
    </div>
  )
}
