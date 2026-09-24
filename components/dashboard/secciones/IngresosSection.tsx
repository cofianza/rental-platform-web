/**
 * Centro de Control — sección "Ingresos".
 *
 * Consume GET /api/v1/dashboard/admin/ingresos. El ingreso de Cofianza es la
 * tarifa mensual de cada contrato activo (el % de su estudio sobre su canon) y
 * causa IVA (Adenda 1 de contratos §1.1). Es lo causado, no lo recaudado: el
 * recaudo de la tarifa lo hace el arrendador, fuera de la plataforma.
 */

'use client'

import Link from 'next/link'
import { dashboardService } from '@/services/dashboardService'
import type { IngresosData, IngresoContratoRow, IngresoExcluidoRow } from '@/services/dashboardService'
import {
  IconDollarSign,
  IconReceipt,
  IconFileText,
  IconCheck,
  IconInfo,
  IconExternalLink,
  IconBarChart3,
  IconAlertTriangle,
} from '@/components/icons'
import {
  money,
  moneyCompact,
  useSeccion,
  SeccionEstado,
  SeccionHeader,
  KpiRow,
  Kpi,
  Chip,
  Tabla,
  Td,
  fechaCorta,
} from './_shared'

// Por qué un contrato activo no entra en el ingreso del mes (no se inventa su tarifa).
function motivoExcluido(e: IngresoExcluidoRow): string {
  if (e.motivo === 'inicia_despues') return `empieza el ${fechaCorta(e.fechaInicio)}`
  if (e.motivo === 'sin_estudio') return 'sin estudio completado: no se sabe su tarifa'
  return 'no se pudo leer su tarifa; vuelve a cargar más tarde'
}

// Etiqueta del periodo actual ("mayo 2026"), capitalizada.
function periodoActual(): string {
  const etiqueta = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  return etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1)
}

export function IngresosSection() {
  const { data, loading, error, reload } = useSeccion<IngresosData>(() =>
    dashboardService.getIngresosAdmin(),
  )

  const filas: IngresoContratoRow[] = data?.porContrato ?? []
  const excluidos: IngresoExcluidoRow[] = data?.excluidos ?? []
  const vacio = !data || filas.length === 0
  const contratosActivos = filas.length
  const ivaExento = data?.ivaGarantiaPorcentaje === 0

  // Proyección anual a tarifa y contratos actuales (deriva de datos presentes).
  const proyeccionAnual = (data?.totalAfianzamiento ?? 0) * 12

  return (
    <div className="font-display">
      <SeccionHeader
        title={`Ingresos · ${periodoActual()}`}
        subtitle="La tarifa mensual de cada contrato activo (el % de su estudio sobre su canon), más IVA. Es lo causado del mes, no lo recaudado."
        right={
          <Link
            href="/facturacion"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:border-ink-300 hover:bg-ink-50"
          >
            <IconExternalLink size={14} /> Ir a Facturación
          </Link>
        }
      />

      {/* Comunicación clara del régimen de IVA de la garantía. */}
      {data &&
        (ivaExento ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-ink-200 bg-ink-50/60 px-3 py-2">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600">
              <IconReceipt size={14} />
            </span>
            <Chip tone="green">Garantía exenta de IVA</Chip>
            <span className="text-[11px] text-ink-500">
              El afianzamiento no genera IVA; el total bruto equivale al afianzamiento.
            </span>
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-coral-200 bg-coral-50/50 px-3 py-2">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-coral-50 text-coral-700">
              <IconInfo size={14} />
            </span>
            <Chip tone="orange">IVA de la tarifa {data.ivaGarantiaPorcentaje}%</Chip>
            <span className="text-[11px] text-ink-500">
              IVA causado: <span className="font-semibold text-ink-700">{money(data.totalIva)}</span>
            </span>
          </div>
        ))}

      <KpiRow>
        <Kpi
          label="Afianzamiento del mes"
          value={moneyCompact(data?.totalAfianzamiento)}
          sub={money(data?.totalAfianzamiento)}
          tone="green"
          Icon={IconDollarSign}
        />
        <Kpi
          label="Proyección anual"
          value={moneyCompact(proyeccionAnual)}
          sub="a tarifa y contratos actuales"
          tone="blue"
          Icon={IconBarChart3}
        />
        <Kpi
          label="Tarifa promedio"
          value={money(data?.valorAfianzamientoMensual)}
          sub={`por contrato · ${contratosActivos} activos`}
          tone="gray"
          Icon={IconFileText}
        />
        <Kpi
          label="Total bruto"
          value={moneyCompact(data?.totalBruto)}
          sub={ivaExento ? 'sin IVA (exento)' : `incl. IVA ${money(data?.totalIva)}`}
          tone="orange"
          Icon={IconReceipt}
        />
      </KpiRow>

      <SeccionHeader title="Afianzamiento por contrato" />

      <SeccionEstado
        loading={loading}
        error={error}
        onRetry={reload}
        vacio={
          !loading && vacio
            ? {
                icon: IconFileText,
                titulo: 'Sin afianzamiento este periodo',
                descripcion: 'No hay contratos activos que generen afianzamiento.',
              }
            : false
        }
      >
        <Tabla
          head={['Inquilino', 'Inmueble', 'Canon', 'Afianzamiento', 'IVA', 'Total']}
          density="compact"
          zebra
        >
          {filas.map((r: IngresoContratoRow) => (
            <tr key={r.contratoId}>
              <Td className="font-medium text-ink-900">{r.inquilino}</Td>
              <Td>{r.inmueble}</Td>
              <Td>{money(r.canon)}</Td>
              <Td>{money(r.afianzamiento)}</Td>
              <Td>{money(r.iva)}</Td>
              <Td className="font-semibold text-ink-900">{money(r.total)}</Td>
            </tr>
          ))}
          {data && filas.length > 0 && (
            <tr className="bg-ink-50">
              <Td className="font-bold text-ink-900">Total</Td>
              <Td>
                <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
                  <IconCheck size={12} /> {filas.length} contratos
                </span>
              </Td>
              <Td />
              <Td className="font-bold text-ink-900">{money(data.totalAfianzamiento)}</Td>
              <Td className="font-bold text-ink-900">{money(data.totalIva)}</Td>
              <Td className="font-bold text-ink-900">{money(data.totalBruto)}</Td>
            </tr>
          )}
        </Tabla>
      </SeccionEstado>

      {excluidos.length > 0 && (
        <div className="mt-4 rounded-lg border border-ink-200 bg-ink-50/60 px-3 py-2 text-[11px] text-ink-600">
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink-700">
            <IconAlertTriangle size={12} /> No entran en el mes ({excluidos.length})
          </p>
          <ul className="space-y-0.5">
            {excluidos.map((e) => (
              <li key={e.contratoId}>
                {e.inquilino} · {e.inmueble} — {motivoExcluido(e)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
