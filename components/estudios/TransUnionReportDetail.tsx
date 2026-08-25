/**
 * TransUnionReportDetail
 * Detalle colapsable del reporte TransUnion Combo 1901
 * Secciones: Tercero | Resumen Crediticio | Detalle por Tipo | Huella de Consulta
 */

'use client'

import { useState } from 'react'
import { IconChevronDown, IconChevronUp } from '@/components/icons'
import type {
  TransUnionResponse,
  TransUnionConsolidadoRegistro,
  TransUnionHuellaConsulta,
} from '@/types/transunion'

interface TransUnionReportDetailProps {
  data: TransUnionResponse
}

// ── Helpers ─────────────────────────────────────────────────

function formatCOP(value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') return '$0'
  const num = typeof value === 'string' ? parseInt(value, 10) : value
  if (isNaN(num)) return String(value)
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  try {
    // El buro envia fechas 'AAAA-MM-DD' sin zona horaria. `new Date` las
    // interpreta como UTC y en Colombia (UTC-5) se mostrarian un dia antes, lo
    // que rompe el cruce de la fecha de expedicion contra la cedula escaneada.
    const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim())
    const fecha = soloFecha
      ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
      : new Date(dateStr)
    if (Number.isNaN(fecha.getTime())) return dateStr
    return fecha.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// ── Accordion Section ───────────────────────────────────────

function AccordionSection({
  title,
  defaultOpen = false,
  children,
  badge,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          {badge}
        </div>
        {open ? (
          <IconChevronUp size={16} className="text-gray-400" />
        ) : (
          <IconChevronDown size={16} className="text-gray-400" />
        )}
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────

export function TransUnionReportDetail({ data }: TransUnionReportDetailProps) {
  const tercero = data.Tercero
  const infoComercial = data.Informacion_Comercial_154
  const consolidado = infoComercial?.Consolidado
  const registroTotal = consolidado?.Registro
  const resumenPrincipal = consolidado?.ResumenPrincipal?.Registro
  const huellas = infoComercial?.HuellaConsulta?.Consulta

  return (
    <div className="space-y-3">
      {/* Sección 1: Datos del Tercero */}
      {tercero && (
        <AccordionSection title="Datos del Tercero" defaultOpen>
          <div className="space-y-0">
            <InfoRow label="Nombre" value={tercero.NombreTitular ?? '—'} />
            <InfoRow
              label="Documento"
              value={`${tercero.TipoIdentificacion ?? ''} ${tercero.NumeroIdentificacion ?? ''}`}
            />
            <InfoRow
              label="Estado documento"
              value={
                tercero.Estado ? (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      tercero.Estado === 'VIGENTE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {tercero.Estado}
                  </span>
                ) : (
                  '—'
                )
              }
            />
            <InfoRow label="Rango de edad" value={tercero.RangoEdad ?? '—'} />
            <InfoRow label="Lugar de expedicion" value={tercero.LugarExpedicion ?? '—'} />
            <InfoRow label="Fecha de expedicion" value={formatDate(tercero.FechaExpedicion)} />
          </div>
        </AccordionSection>
      )}

      {/* Sección 2: Resumen Crediticio */}
      {registroTotal && (
        <AccordionSection
          title="Resumen Crediticio"
          defaultOpen
          badge={
            <span className="text-[10px] text-gray-400 font-normal">Consolidado general</span>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              label="Obligaciones totales"
              value={registroTotal.NumeroObligaciones ?? '0'}
              isNumber
            />
            <SummaryCard
              label="Al dia"
              value={registroTotal.NumeroObligacionesDia ?? '0'}
              isNumber
              color="green"
            />
            <SummaryCard
              label="En mora"
              value={registroTotal.CantidadObligacionesMora ?? '0'}
              isNumber
              color={parseInt(registroTotal.CantidadObligacionesMora ?? '0', 10) > 0 ? 'red' : 'green'}
            />
            <SummaryCard
              label="Valor en mora"
              value={formatCOP(registroTotal.ValorMora)}
              color={parseInt(registroTotal.ValorMora ?? '0', 10) > 0 ? 'red' : 'green'}
            />
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <InfoRow label="Saldo total" value={formatCOP(registroTotal.TotalSaldo)} />
            <InfoRow label="Saldo al dia" value={formatCOP(registroTotal.SaldoObligacionesDia)} />
            <InfoRow label="Saldo en mora" value={formatCOP(registroTotal.SaldoObligacionesMora)} />
          </div>
        </AccordionSection>
      )}

      {/* Sección 3: Detalle por Tipo */}
      {resumenPrincipal && resumenPrincipal.length > 0 && (
        <AccordionSection title="Detalle por Tipo de Obligacion">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-1 font-medium text-gray-500">Tipo</th>
                  <th className="text-right py-2 px-1 font-medium text-gray-500"># Oblig.</th>
                  <th className="text-right py-2 px-1 font-medium text-gray-500">Saldo Total</th>
                  <th className="text-right py-2 px-1 font-medium text-gray-500">En Mora</th>
                  <th className="text-right py-2 px-1 font-medium text-gray-500">Valor Mora</th>
                </tr>
              </thead>
              <tbody>
                {resumenPrincipal.map((item: TransUnionConsolidadoRegistro, idx: number) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="py-1.5 px-1 text-gray-700">{item.PaqueteInformacion ?? '—'}</td>
                    <td className="py-1.5 px-1 text-right text-gray-900">{item.NumeroObligaciones ?? '0'}</td>
                    <td className="py-1.5 px-1 text-right text-gray-900">{formatCOP(item.TotalSaldo)}</td>
                    <td className="py-1.5 px-1 text-right text-gray-900">{formatCOP(item.SaldoObligacionesMora)}</td>
                    <td className="py-1.5 px-1 text-right text-gray-900">{formatCOP(item.ValorMora)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AccordionSection>
      )}

      {/* Sección 4: Huella de Consulta */}
      {huellas && huellas.length > 0 && (
        <AccordionSection title="Huella de Consulta">
          <div className="space-y-2">
            {huellas.slice(0, 10).map((consulta: TransUnionHuellaConsulta, idx: number) => (
              <div key={idx} className="flex items-start justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-xs font-medium text-gray-700">
                    {consulta.NombreEntidad ?? 'Entidad desconocida'}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {consulta.Ciudad ?? ''}{consulta.MotivoConsulta ? ` · ${consulta.MotivoConsulta}` : ''}
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                  {formatDate(consulta.FechaConsulta)}
                </span>
              </div>
            ))}
            {huellas.length > 10 && (
              <p className="text-[10px] text-gray-400 text-center">
                y {huellas.length - 10} consultas mas...
              </p>
            )}
          </div>
        </AccordionSection>
      )}
    </div>
  )
}

// ── Summary Card ────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  color,
  isNumber,
}: {
  label: string
  value: string
  color?: 'green' | 'red'
  isNumber?: boolean
}) {
  const colorClasses = color === 'red'
    ? 'text-red-700 bg-red-50 border-red-100'
    : color === 'green'
      ? 'text-green-700 bg-green-50 border-green-100'
      : 'text-gray-700 bg-gray-50 border-gray-100'

  return (
    <div className={`rounded-lg border p-2.5 ${colorClasses}`}>
      <p className="text-[10px] opacity-70 mb-0.5">{label}</p>
      <p className={`${isNumber ? 'text-lg' : 'text-sm'} font-bold`}>{value}</p>
    </div>
  )
}
