'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { dashboardService, type PerfilDetalle } from '@/services/dashboardService'
import {
  money,
  moneyCompact,
  fechaCorta,
  Chip,
  Kpi,
  KpiRow,
  Tabla,
  Td,
  type ChipTone,
} from '@/components/dashboard/secciones/_shared'
import {
  IconLoader,
  IconHome,
  IconFileText,
  IconDollarSign,
  IconAlertTriangle,
  IconBank,
  IconMail,
} from '@/components/icons'

const ESTADO_CONTRATO_TONE: Record<string, ChipTone> = {
  vigente: 'green',
  firmado: 'blue',
  aprobado: 'green',
  finalizado: 'gray',
  cancelado: 'red',
  borrador: 'gray',
  pendiente_firma: 'yellow',
  en_revision: 'yellow',
}

const esZonaRiesgo = (mes: number) => mes >= 8 && mes <= 14

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-semibold uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-0.5 text-xs text-ink-800">{children}</div>
    </div>
  )
}

export function PerfilDetalleModal({
  perfilId,
  onClose,
}: {
  perfilId: string | null
  onClose: () => void
}) {
  const [data, setData] = useState<PerfilDetalle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!perfilId) {
      setData(null)
      setError(null)
      return
    }
    let cancel = false
    setLoading(true)
    setError(null)
    setData(null)
    dashboardService
      .getPerfilDetalle(perfilId)
      .then((d) => {
        if (!cancel) setData(d)
      })
      .catch((e) => {
        if (!cancel) setError(e instanceof Error ? e.message : 'No se pudo cargar el detalle')
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [perfilId])

  const recaudoVacio =
    !!data &&
    !data.recaudo.banco &&
    !data.recaudo.numeroCuenta &&
    !data.recaudo.whatsapp &&
    !data.recaudo.email &&
    !data.recaudo.titularNombre

  return (
    <Modal isOpen={!!perfilId} onClose={onClose} title={data?.nombre ?? 'Detalle del aliado'} size="lg">
      {loading && (
        <div className="flex items-center justify-center py-16">
          <IconLoader size={28} className="animate-spin text-primary-600" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="max-h-[72vh] space-y-5 overflow-y-auto pr-1">
          {/* Identidad */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Chip tone={data.estado === 'activo' ? 'green' : 'gray'}>
              {data.estado === 'activo' ? 'Activo' : 'Inactivo'}
            </Chip>
            <span className="text-ink-500">
              {data.rol === 'inmobiliaria' ? 'Inmobiliaria' : 'Propietario'}
            </span>
            {data.ciudad && <span className="text-ink-500">· {data.ciudad}</span>}
            <span className="ml-auto text-[11px] text-ink-400">
              Afiliado desde {fechaCorta(data.desde)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
            <Campo label="NIT / Documento">{data.nit || data.documento || '—'}</Campo>
            <Campo label="Teléfono">
              {data.telefono ? (
                <a href={`tel:${data.telefono}`} className="text-primary-600 hover:underline">
                  {data.telefono}
                </a>
              ) : (
                '—'
              )}
            </Campo>
            <Campo label="Dirección">{data.direccion ?? '—'}</Campo>
            <Campo label="Representante">{data.representante ?? '—'}</Campo>
            <Campo label="Matrícula arrendador">{data.matriculaArrendador ?? '—'}</Campo>
          </div>

          {/* Resumen de cartera */}
          <KpiRow>
            <Kpi label="Inmuebles" value={data.resumen.inmuebles} Icon={IconHome} />
            <Kpi
              label="Contratos activos"
              value={data.resumen.contratosActivos}
              tone="green"
              Icon={IconFileText}
            />
            <Kpi
              label="Canon activo"
              value={moneyCompact(data.resumen.canonActivo)}
              tone="green"
              Icon={IconDollarSign}
            />
            <Kpi
              label="Mora activa"
              value={data.resumen.moraActiva}
              tone="red"
              accent={data.resumen.moraActiva > 0 ? 'danger' : 'none'}
              Icon={IconAlertTriangle}
            />
          </KpiRow>

          {/* Datos de recaudo */}
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-500">
              <IconBank size={13} /> Datos de recaudo
            </h3>
            {recaudoVacio ? (
              <p className="text-xs text-ink-400">Sin datos de recaudo configurados.</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 rounded-xl border border-ink-200 bg-ink-50/40 p-3 sm:grid-cols-3">
                <Campo label="Banco">{data.recaudo.banco ?? '—'}</Campo>
                <Campo label="Tipo de cuenta">{data.recaudo.tipoCuenta ?? '—'}</Campo>
                <Campo label="Número de cuenta">{data.recaudo.numeroCuenta ?? '—'}</Campo>
                <Campo label="Titular">{data.recaudo.titularNombre ?? '—'}</Campo>
                <Campo label="NIT/CC titular">{data.recaudo.titularNit ?? '—'}</Campo>
                <Campo label="WhatsApp recaudo">{data.recaudo.whatsapp ?? '—'}</Campo>
                <Campo label="Email recaudo">
                  {data.recaudo.email ? (
                    <a
                      href={`mailto:${data.recaudo.email}`}
                      className="inline-flex items-center gap-1 text-primary-600 hover:underline"
                    >
                      <IconMail size={12} />
                      {data.recaudo.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </Campo>
              </div>
            )}
          </div>

          {/* Cartera de contratos */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">
              Cartera de contratos · {data.contratos.length}
            </h3>
            {data.contratos.length === 0 ? (
              <p className="text-xs text-ink-400">Este aliado aún no tiene contratos.</p>
            ) : (
              <Tabla head={['Inmueble', 'Inquilino', 'Canon', 'Mes', 'Estado', 'Pago']} density="compact" zebra>
                {data.contratos.map((c) => (
                  <tr key={c.id}>
                    <Td>{c.inmueble}</Td>
                    <Td>{c.inquilino}</Td>
                    <Td>{money(c.canon)}</Td>
                    <Td>
                      <Chip tone={esZonaRiesgo(c.mes) ? 'risk' : 'gray'}>M{c.mes}</Chip>
                    </Td>
                    <Td>
                      <Chip tone={ESTADO_CONTRATO_TONE[c.estado] ?? 'gray'}>{c.estado}</Chip>
                    </Td>
                    <Td>
                      {c.pago === 'mora' ? <Chip tone="red">Mora</Chip> : <Chip tone="green">Al día</Chip>}
                    </Td>
                  </tr>
                ))}
              </Tabla>
            )}
          </div>

          {/* Inmuebles */}
          {data.inmuebles.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">
                Inmuebles · {data.inmuebles.length}
              </h3>
              <Tabla head={['Código', 'Dirección', 'Ciudad', 'Estado']} density="compact" zebra>
                {data.inmuebles.map((i) => (
                  <tr key={i.id}>
                    <Td>{i.codigo ?? '—'}</Td>
                    <Td>{i.direccion ?? '—'}</Td>
                    <Td>{i.ciudad ?? '—'}</Td>
                    <Td>
                      <Chip tone={i.estado === 'disponible' ? 'green' : i.estado === 'ocupado' ? 'blue' : 'gray'}>
                        {i.estado ?? '—'}
                      </Chip>
                    </Td>
                  </tr>
                ))}
              </Tabla>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
