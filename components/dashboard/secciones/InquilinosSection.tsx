'use client'

import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import { dashboardService, type InquilinoRow } from '@/services/dashboardService'
import {
  IconUsers,
  IconAlertTriangle,
  IconShieldCheck,
  IconCheckCircle,
  IconPhone,
  IconArrowRight,
  IconChevronDown,
  IconChevronUp,
  IconMail,
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
  type ChipTone,
} from '@/components/dashboard/secciones/_shared'

const esZonaRiesgo = (mes: number) => mes >= 8 && mes <= 14

const capitalizar = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

const resultadoTone = (resultado: string | null): ChipTone => {
  switch (resultado) {
    case 'aprobado':
      return 'green'
    case 'condicionado':
      return 'yellow'
    case 'rechazado':
      return 'red'
    default:
      return 'gray'
  }
}

const scoreTone = (score: number): ChipTone =>
  score >= 75 ? 'green' : score >= 55 ? 'yellow' : 'red'

// Carga del arriendo sobre los ingresos del inquilino (canon/ingresos × 100).
const cargaPct = (canon: number, ingresos: number | null) =>
  ingresos && ingresos > 0 ? Math.round((canon / ingresos) * 100) : null
const cargaTone = (pct: number): ChipTone => (pct > 40 ? 'red' : pct > 30 ? 'yellow' : 'green')

// Campo etiqueta/valor para la ficha de detalle expandible.
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-semibold uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-0.5 text-xs text-ink-800">{children}</div>
    </div>
  )
}

export function InquilinosSection() {
  const { data, loading, error, reload } = useSeccion<InquilinoRow[]>(() =>
    dashboardService.getInquilinos()
  )

  const [pago, setPago] = useState('todos')
  const [resultado, setResultado] = useState('todos')
  const [riesgo, setRiesgo] = useState('todos')
  const [municipio, setMunicipio] = useState('todos')
  const [expanded, setExpanded] = useState<string | null>(null)

  const rows = useMemo<InquilinoRow[]>(() => data ?? [], [data])

  const municipios = useMemo<string[]>(() => {
    const set = new Set<string>()
    rows.forEach((r) => {
      if (r.municipio) set.add(r.municipio)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es-CO'))
  }, [rows])

  const filtrados = useMemo<InquilinoRow[]>(
    () =>
      rows.filter((r) => {
        if (pago !== 'todos' && r.pago !== pago) return false
        if (resultado !== 'todos' && r.resultado !== resultado) return false
        if (riesgo === 'zona' && !esZonaRiesgo(r.mes)) return false
        if (riesgo === 'fuera' && esZonaRiesgo(r.mes)) return false
        if (municipio !== 'todos' && r.municipio !== municipio) return false
        return true
      }),
    [rows, pago, resultado, riesgo, municipio]
  )

  const total = rows.length
  const enRiesgo = useMemo(() => rows.filter((r) => esZonaRiesgo(r.mes)), [rows])
  const zonaRiesgo = enRiesgo.length
  const enMora = rows.filter((r) => r.pago === 'mora').length
  const alDia = total - enMora

  const conScore = rows.filter((r) => r.score != null)
  const scorePromedio = conScore.length
    ? Math.round(conScore.reduce((acc, r) => acc + (r.score ?? 0), 0) / conScore.length)
    : null

  const filtroActivo =
    pago !== 'todos' || resultado !== 'todos' || riesgo !== 'todos' || municipio !== 'todos'

  const limpiar = () => {
    setPago('todos')
    setResultado('todos')
    setRiesgo('todos')
    setMunicipio('todos')
  }

  const subtitulo = `${total} activo${total === 1 ? '' : 's'} · ${zonaRiesgo} en zona de riesgo M8-14`

  return (
    <div>
      <SeccionHeader title="Inquilinos" subtitle={subtitulo} />

      <KpiRow>
        <Kpi
          label="Activos al día"
          value={alDia}
          sub={`de ${total} inquilinos`}
          tone="green"
          Icon={IconCheckCircle}
        />
        <Kpi
          label="En mora"
          value={enMora}
          tone="red"
          accent="warning"
          Icon={IconAlertTriangle}
          onClick={() => setPago(pago === 'mora' ? 'todos' : 'mora')}
          active={pago === 'mora'}
        />
        <Kpi
          label="Score promedio"
          value={scorePromedio ?? '—'}
          sub={scorePromedio != null ? `${conScore.length} con estudio` : undefined}
          tone="blue"
          unavailable={scorePromedio == null}
          Icon={IconShieldCheck}
        />
        <Kpi
          label="Zona riesgo M8-14"
          value={zonaRiesgo}
          tone="purple"
          accent="risk"
          Icon={IconUsers}
          onClick={() => setRiesgo(riesgo === 'zona' ? 'todos' : 'zona')}
          active={riesgo === 'zona'}
        />
      </KpiRow>

      {enRiesgo.length > 0 && (
        <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50/60 p-3">
          <div className="flex items-center gap-2 text-purple-700">
            <IconAlertTriangle size={16} />
            <span className="text-xs font-bold uppercase tracking-wide">
              Zona de riesgo M8-14 · {enRiesgo.length}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {enRiesgo.map((r) => (
              <Chip key={r.contratoId} tone="risk">
                {r.inquilino} · M{r.mes}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <FiltroBar
        count={`${filtrados.length} de ${total}`}
        onClear={filtroActivo ? limpiar : undefined}
      >
        <FiltroSelect
          label="Riesgo"
          value={riesgo}
          onChange={setRiesgo}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'zona', label: 'Zona M8-14' },
            { value: 'fuera', label: 'Fuera' },
          ]}
        />
        <FiltroSelect
          label="Pago"
          value={pago}
          onChange={setPago}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'al_dia', label: 'Al día' },
            { value: 'mora', label: 'En mora' },
          ]}
        />
        <FiltroSelect
          label="Resultado"
          value={resultado}
          onChange={setResultado}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'aprobado', label: 'Aprobado' },
            { value: 'condicionado', label: 'Condicionado' },
            { value: 'rechazado', label: 'Rechazado' },
          ]}
        />
        <FiltroSelect
          label="Municipio"
          value={municipio}
          onChange={setMunicipio}
          options={[
            { value: 'todos', label: 'Todos' },
            ...municipios.map((m) => ({ value: m, label: m })),
          ]}
        />
      </FiltroBar>

      <SeccionEstado
        loading={loading}
        error={error}
        onRetry={reload}
        vacio={
          !loading && filtrados.length === 0
            ? {
                icon: IconUsers,
                titulo: filtroActivo ? 'Sin inquilinos con estos filtros' : 'Sin inquilinos activos',
                descripcion: filtroActivo
                  ? 'Ajusta o limpia los filtros para ver más resultados.'
                  : 'Aún no hay contratos activos con inquilinos para mostrar.',
                action: filtroActivo ? (
                  <button
                    onClick={limpiar}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-primary-400 hover:text-primary-600 transition-colors"
                  >
                    Limpiar filtros
                  </button>
                ) : undefined,
              }
            : false
        }
      >
        <Tabla
          zebra
          sticky
          head={[
            'Inquilino',
            'Cédula',
            'Inmueble',
            'Canon',
            'Score',
            'Resultado',
            'Mes',
            'Pago',
            'Municipio',
            'Coarr.',
            '',
          ]}
        >
          {filtrados.map((r) => {
            const abierto = expanded === r.contratoId
            const carga = cargaPct(r.canon, r.ingresos)
            return (
              <Fragment key={r.contratoId}>
                <tr>
                  <Td>
                    <span className="font-semibold text-ink-900">{r.inquilino}</span>
                    {r.telefono && (
                      <a
                        href={`tel:${r.telefono}`}
                        className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-500 hover:text-primary-600 transition-colors"
                      >
                        <IconPhone size={11} />
                        {r.telefono}
                      </a>
                    )}
                  </Td>
                  <Td>{r.cedula ?? '—'}</Td>
                  <Td>{r.inmueble}</Td>
                  <Td>{money(r.canon)}</Td>
                  <Td>{r.score != null ? <Chip tone={scoreTone(r.score)}>{r.score}</Chip> : '—'}</Td>
                  <Td>
                    {r.resultado ? (
                      <Chip tone={resultadoTone(r.resultado)}>{capitalizar(r.resultado)}</Chip>
                    ) : (
                      <Chip tone="gray">Pendiente</Chip>
                    )}
                  </Td>
                  <Td>
                    <Chip tone={esZonaRiesgo(r.mes) ? 'risk' : 'gray'}>M{r.mes}</Chip>
                  </Td>
                  <Td>
                    {r.pago === 'mora' ? (
                      <Chip tone="red">
                        <IconAlertTriangle size={11} /> Mora
                      </Chip>
                    ) : (
                      <Chip tone="green">Al día</Chip>
                    )}
                  </Td>
                  <Td>{r.municipio ?? '—'}</Td>
                  <Td>{r.coarrendatario ?? '—'}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => setExpanded(abierto ? null : r.contratoId)}
                        aria-label={abierto ? 'Ocultar ficha' : 'Ver ficha'}
                        aria-expanded={abierto}
                        className="rounded-lg border border-ink-200 px-2 py-1.5 text-ink-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
                      >
                        {abierto ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                      </button>
                      <Link
                        href={`/expedientes/${r.expedienteId}`}
                        aria-label={`Ver expediente de ${r.inquilino}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-primary-400 hover:text-primary-600 transition-colors"
                      >
                        Ver
                        <IconArrowRight size={13} />
                      </Link>
                    </div>
                  </Td>
                </tr>
                {abierto && (
                  <tr>
                    <td colSpan={11} className="border-b border-ink-100 bg-ink-50/60 px-4 py-3">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-4">
                        <Campo label="Email">
                          {r.email ? (
                            <a
                              href={`mailto:${r.email}`}
                              className="inline-flex items-center gap-1 text-primary-600 hover:underline"
                            >
                              <IconMail size={12} />
                              {r.email}
                            </a>
                          ) : (
                            '—'
                          )}
                        </Campo>
                        <Campo label="Ocupación">{r.ocupacion ?? '—'}</Campo>
                        <Campo label="Empresa">{r.empresa ?? '—'}</Campo>
                        <Campo label="Tipo de persona">{r.tipoPersona ? capitalizar(r.tipoPersona) : '—'}</Campo>
                        <Campo label="Actividad económica">{r.actividadEconomica ?? '—'}</Campo>
                        <Campo label="Ingresos mensuales">{r.ingresos != null ? money(r.ingresos) : '—'}</Campo>
                        <Campo label="Carga canon/ingresos">
                          {carga != null ? <Chip tone={cargaTone(carga)}>{carga}%</Chip> : '—'}
                        </Campo>
                        <Campo label="Vence">{fechaCorta(r.fechaFin)}</Campo>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </Tabla>
      </SeccionEstado>
    </div>
  )
}
