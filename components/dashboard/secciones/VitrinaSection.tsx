'use client'

import { useMemo, useState } from 'react'
import {
  dashboardService,
  type VitrinaData,
  type VitrinaPublicadoRow,
  type VitrinaProspectoRow,
} from '@/services/dashboardService'
import {
  IconBuilding2,
  IconEye,
  IconImages,
  IconInbox,
  IconPhone,
} from '@/components/icons'
import {
  Chip,
  type ChipTone,
  FiltroBar,
  FiltroSelect,
  fechaCorta,
  Kpi,
  KpiRow,
  money,
  SeccionEstado,
  SeccionHeader,
  Tabla,
  Td,
  useSeccion,
} from '@/components/dashboard/secciones/_shared'

const capitalizar = (s: string | null | undefined): string => {
  if (!s) return '—'
  const limpio = s.replace(/_/g, ' ')
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

const ESTADO_TONE: Record<string, ChipTone> = {
  disponible: 'green',
  ocupado: 'blue',
  en_estudio: 'orange',
  inactivo: 'gray',
}

const estadoTone = (estado: string): ChipTone => ESTADO_TONE[estado] ?? 'gray'

export function VitrinaSection() {
  const { data, loading, error, reload } = useSeccion<VitrinaData>(() =>
    dashboardService.getVitrinaAdmin(),
  )

  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos')

  const publicados: VitrinaPublicadoRow[] = useMemo(() => data?.publicados ?? [], [data])
  const prospectos: VitrinaProspectoRow[] = data?.prospectos ?? []

  const totalVisitas = useMemo(
    () => publicados.reduce((acc: number, p: VitrinaPublicadoRow) => acc + (p.visitas ?? 0), 0),
    [publicados],
  )
  const totalContactos = useMemo(
    () => publicados.reduce((acc: number, p: VitrinaPublicadoRow) => acc + (p.contactos ?? 0), 0),
    [publicados],
  )

  const publicadosFiltrados = useMemo(
    () =>
      estadoFiltro === 'todos'
        ? publicados
        : publicados.filter((p: VitrinaPublicadoRow) => p.estado === estadoFiltro),
    [publicados, estadoFiltro],
  )

  const opcionesEstado = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'disponible', label: 'Disponible' },
    { value: 'en_estudio', label: 'En estudio' },
    { value: 'ocupado', label: 'Ocupado' },
    { value: 'inactivo', label: 'Inactivo' },
  ]

  const vacio = !data || (publicados.length === 0 && prospectos.length === 0)

  return (
    <div>
      <SeccionHeader
        title="Vitrina"
        subtitle="Inmuebles publicados y prospectos generados desde la vitrina pública"
      />

      <KpiRow>
        <Kpi label="Publicados" value={publicados.length} tone="green" Icon={IconImages} />
        <Kpi label="Visitas mes" value={totalVisitas} tone="blue" Icon={IconEye} />
        <Kpi label="Contactos" value={totalContactos} tone="orange" Icon={IconPhone} />
        <Kpi label="Prospectos" value={prospectos.length} Icon={IconInbox} />
      </KpiRow>

      <FiltroBar count={`${publicadosFiltrados.length} de ${publicados.length} publicados`}>
        <FiltroSelect
          label="Filtrar por estado"
          value={estadoFiltro}
          onChange={setEstadoFiltro}
          options={opcionesEstado}
        />
      </FiltroBar>

      <SeccionEstado loading={loading} error={error} onRetry={reload} vacio={vacio}>
        <h3 className="mt-6 mb-2 text-sm font-bold text-ink-900">Inmuebles publicados</h3>
        {publicadosFiltrados.length === 0 ? (
          <div className="rounded-xl border border-ink-200 bg-white py-10 text-center text-xs text-ink-500">
            No hay inmuebles publicados para el filtro seleccionado.
          </div>
        ) : (
          <Tabla
            head={[
              'Inmueble',
              'Tipo',
              'Canon',
              'Municipio',
              'Publicado',
              'Estado',
              'Visitas',
              'Contactos',
            ]}
          >
            {publicadosFiltrados.map((p: VitrinaPublicadoRow) => (
              <tr key={p.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <IconBuilding2 size={14} className="text-ink-400" />
                    <span className="font-medium text-ink-900">{p.inmueble}</span>
                  </div>
                  {p.codigo && <span className="text-[10px] text-ink-500">{p.codigo}</span>}
                </Td>
                <Td>{capitalizar(p.tipo)}</Td>
                <Td>{money(p.canon)}</Td>
                <Td>{p.municipio ?? '—'}</Td>
                <Td>{fechaCorta(p.publicado)}</Td>
                <Td>
                  <Chip tone={estadoTone(p.estado)}>{capitalizar(p.estado)}</Chip>
                </Td>
                <Td>{p.visitas}</Td>
                <Td>{p.contactos}</Td>
              </tr>
            ))}
          </Tabla>
        )}

        <h3 className="mt-6 mb-2 text-sm font-bold text-ink-900">Prospectos</h3>
        {prospectos.length === 0 ? (
          <div className="rounded-xl border border-ink-200 bg-white py-10 text-center text-xs text-ink-500">
            No hay prospectos registrados.
          </div>
        ) : (
          <Tabla
            head={['Prospecto', 'Teléfono', 'Inmueble', 'Fecha', 'Fuente', 'Estado', 'Notas']}
          >
            {prospectos.map((p: VitrinaProspectoRow) => (
              <tr key={p.expedienteId}>
                <Td className="font-medium text-ink-900">{p.nombre}</Td>
                <Td>{p.telefono ?? '—'}</Td>
                <Td>{p.inmueble}</Td>
                <Td>{fechaCorta(p.fecha)}</Td>
                <Td>{capitalizar(p.fuente)}</Td>
                <Td>
                  <Chip tone="purple">{capitalizar(p.estado)}</Chip>
                </Td>
                <Td className="max-w-50 truncate">{p.notas || '—'}</Td>
              </tr>
            ))}
          </Tabla>
        )}
      </SeccionEstado>
    </div>
  )
}
