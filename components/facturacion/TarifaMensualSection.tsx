/**
 * TarifaMensualSection — panel de Cofianza del cobro de la tarifa mensual
 * (plan cobro-tarifa-mensual §4). El último día de cada mes la API arma una
 * cuenta de cobro por inmobiliaria, con una línea por contrato; aquí se
 * filtran, se emiten (con la factura en Factus), se marcan pagadas por
 * transferencia y Gerencia General anula líneas. Las líneas Trasladada van en
 * la cuenta pero no en la factura.
 *
 * Los titulares de la inmobiliaria (B8) ven aquí sus «Cuentas de cobro
 * Cofianza»: lista, detalle, PDF de la factura, «no recaudada» en Trasladada y
 * el aviso de datos fiscales faltantes. La API filtra por su organización.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { MotivoDialog } from '@/components/ui/MotivoDialog'
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconFileText,
  IconLoader,
  IconRefresh,
} from '@/components/icons'
import { formatCurrency, formatDate } from '@/lib/constants'
import { accionesDeCuenta, accionesDeLinea, contarCuentas, SITUACION_LABELS, SITUACIONES_FILTRO } from '@/lib/tarifaCobro'
import { hoyBogota } from '@/hooks/useContratoV3'
import { useCuentaCobro, useCuentasCobro } from '@/hooks/useTarifaCobro'
import { tarifaCobroService } from '@/services/tarifaCobroService'
import { facturacionService } from '@/services/facturacionService'
import { useAuthStore } from '@/stores/auth.store'
import type { ICuentaCobro, ICuentaCobroDetalle, ILineaCobro, SituacionCuenta } from '@/types/tarifaCobro'

const mesTexto = (periodo: string) =>
  new Date(`${periodo.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
const pesos = (v: number | string | null) => (v == null ? '—' : formatCurrency(Math.round(Number(v))))
const errorDe = (err: unknown, porDefecto: string) => (err instanceof Error ? err.message : porDefecto)

const SITUACION_CLASES: Record<SituacionCuenta, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  bloqueada_fiscal: 'bg-amber-50 text-amber-800',
  emitiendo: 'bg-blue-50 text-blue-700',
  emitida: 'bg-blue-50 text-blue-700',
  pagada: 'bg-green-50 text-green-700',
  parcial: 'bg-amber-50 text-amber-800',
  vencida: 'bg-red-50 text-red-700',
  anulada: 'bg-gray-100 text-gray-500',
}

const LINEA_LABELS: Record<ILineaCobro['estado'], string> = {
  pendiente: 'Pendiente',
  pagada: 'Pagada',
  no_recaudada: 'No recaudada',
  anulada: 'Anulada',
}

type Filtro = SituacionCuenta | 'nota_credito' | null

export function TarifaMensualSection() {
  const rol = useAuthStore((s) => s.user?.rol)
  // La pestaña solo se le muestra al titular; la API también lo exige.
  const titular = rol === 'inmobiliaria'
  const [mes, setMes] = useState('') // AAAA-MM del <input type="month">
  const periodo = mes ? `${mes}-01` : ''
  const { cuentas: todas, cargando, error, recargar } = useCuentasCobro(periodo)
  const [filtro, setFiltro] = useState<Filtro>(null)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [descargando, setDescargando] = useState(false)

  // El titular no ve borradores: se recalculan cada pasada y aún no se cobran.
  const cuentas = titular ? todas.filter((c) => c.estado !== 'borrador') : todas
  const situaciones = titular ? SITUACIONES_FILTRO.filter((s) => s !== 'borrador') : SITUACIONES_FILTRO
  const { porSituacion, notaCredito } = contarCuentas(cuentas)
  const visibles = cuentas.filter((c) =>
    !filtro ? true : filtro === 'nota_credito' ? c.nota_credito_pendiente : c.situacion === filtro,
  )

  const descargarExcel = async () => {
    setDescargando(true)
    try {
      await tarifaCobroService.descargarLiquidacion(periodo)
    } catch (err) {
      toast.error(errorDe(err, 'No se pudo descargar el Excel'))
    } finally {
      setDescargando(false)
    }
  }

  const chip = (id: Filtro, label: string, n: number) => (
    <button
      key={id ?? 'todas'}
      type="button"
      onClick={() => setFiltro(id)}
      aria-pressed={filtro === id}
      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
        filtro === id ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {label} ({n})
    </button>
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{titular ? 'Cuentas de cobro Cofianza' : 'Tarifa mensual'}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {titular
                ? 'La tarifa mensual de sus contratos con Cofianza: una cuenta por mes, con una línea por contrato. Vence el día 10 y se paga por transferencia. En Trasladada, marque «No recaudada» si el arrendatario no le pagó la tarifa.'
                : 'Una cuenta de cobro por inmobiliaria y mes, con una línea por contrato. Vence el día 10; la inmobiliaria la paga por transferencia. Las líneas Trasladada se cobran, pero no se facturan.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="tarifa-mes" className="sr-only">
              Mes
            </label>
            <input
              id="tarifa-mes"
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            {!titular && (
            <button
              type="button"
              onClick={descargarExcel}
              disabled={!periodo || descargando}
              title={periodo ? 'Descargar las líneas del mes en Excel' : 'Elija un mes para descargar el Excel'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {descargando ? <IconLoader size={14} className="animate-spin" /> : <IconDownload size={14} />}
              Excel
            </button>
            )}
            <button
              type="button"
              onClick={recargar}
              disabled={cargando}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconRefresh size={14} className={cargando ? 'animate-spin' : ''} />
              Refrescar
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {chip(null, 'Todas', cuentas.length)}
          {situaciones.map((s) => chip(s, SITUACION_LABELS[s], porSituacion[s]))}
          {chip('nota_credito', 'Nota crédito pendiente', notaCredito)}
        </div>
        {titular && porSituacion.bloqueada_fiscal > 0 && <AvisoDatosFiscales />}
      </div>

      {cargando && !cuentas.length ? (
        <div className="p-6 flex items-center justify-center">
          <IconLoader size={20} className="animate-spin text-gray-500" />
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={recargar}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800"
          >
            <IconRefresh size={14} />
            Reintentar
          </button>
        </div>
      ) : visibles.length === 0 ? (
        <div className="p-8 text-center">
          {cuentas.length ? (
            <IconCheck size={32} className="mx-auto text-green-500 mb-3" />
          ) : (
            <IconFileText size={32} className="mx-auto text-gray-400 mb-3" />
          )}
          <p className="text-sm text-gray-500">
            {cuentas.length
              ? 'No hay cuentas de cobro con ese filtro.'
              : 'Aún no hay cuentas de cobro. Se arman el último día de cada mes con los contratos que causan tarifa.'}
          </p>
        </div>
      ) : (
        <div className={`divide-y divide-gray-100 ${cargando ? 'opacity-50' : ''}`}>
          {visibles.map((c) => (
            <FilaCuenta
              key={c.id}
              cuenta={c}
              abierta={abierta === c.id}
              onToggle={() => setAbierta(abierta === c.id ? null : c.id)}
              rol={rol}
              onCambio={recargar}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FilaCuenta({
  cuenta: c,
  abierta,
  onToggle,
  rol,
  onCambio,
}: {
  cuenta: ICuentaCobro
  abierta: boolean
  onToggle: () => void
  rol: string | undefined
  onCambio: () => void
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierta}
        className="w-full px-6 py-4 flex items-center gap-3 text-left hover:bg-gray-50"
      >
        {abierta ? <IconChevronDown size={16} className="text-gray-500 shrink-0" /> : <IconChevronRight size={16} className="text-gray-500 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{c.inmobiliarias?.nombre ?? 'Inmobiliaria'}</span>
            <span className="text-sm text-gray-600 capitalize">{mesTexto(c.periodo)}</span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${SITUACION_CLASES[c.situacion]}`}>
              {SITUACION_LABELS[c.situacion]}
            </span>
            {c.nota_credito_pendiente && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700">
                <IconAlertTriangle size={12} />
                Nota crédito pendiente
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {c.lineas_n} {c.lineas_n === 1 ? 'contrato' : 'contratos'} · vence el {formatDate(c.vence_en)}
            {c.saldo_cop != null && c.saldo_cop > 0 ? ` · saldo ${pesos(c.saldo_cop)}` : ''}
          </p>
        </div>
        <span className="text-sm font-semibold text-gray-900 shrink-0">{pesos(c.total_cop)}</span>
      </button>
      {abierta && <DetalleCuenta id={c.id} rol={rol} onCambio={onCambio} />}
    </div>
  )
}

type Pagando = { tipo: 'cuenta'; id: string; total: number } | { tipo: 'linea'; id: string; total: number; contrato: string }

function DetalleCuenta({ id, rol, onCambio }: { id: string; rol: string | undefined; onCambio: () => void }) {
  const { cuenta, cargando, error, recargar } = useCuentaCobro(id)
  const [confirmar, setConfirmar] = useState<'emitir' | 'reintentar' | null>(null)
  const [pagando, setPagando] = useState<Pagando | null>(null)
  const [anulando, setAnulando] = useState<ILineaCobro | null>(null)
  const [anulandoEnCurso, setAnulandoEnCurso] = useState(false)
  const [noRecaudada, setNoRecaudada] = useState<ILineaCobro | null>(null)

  const tras = async (accion: () => Promise<unknown>, ok: string, fallo: string) => {
    try {
      await accion()
      toast.success(ok)
      await recargar()
      onCambio()
      return true
    } catch (err) {
      toast.error(errorDe(err, fallo))
      return false
    }
  }

  if (cargando && !cuenta)
    return (
      <div className="px-6 pb-4 flex justify-center">
        <IconLoader size={18} className="animate-spin text-gray-500" />
      </div>
    )
  if (error || !cuenta)
    return (
      <div className="px-6 pb-4 text-center">
        <p className="text-sm text-red-700">{error ?? 'No pudimos cargar la cuenta de cobro'}</p>
        <button onClick={recargar} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800">
          <IconRefresh size={14} />
          Reintentar
        </button>
      </div>
    )

  const acciones = accionesDeCuenta(cuenta, rol)

  return (
    <div className="px-6 pb-5 space-y-3 bg-gray-50/50">
      <ConfirmDialog
        isOpen={confirmar !== null}
        onClose={() => setConfirmar(null)}
        onConfirm={() =>
          tras(
            () => tarifaCobroService.emitir(cuenta.id),
            confirmar === 'reintentar' ? 'Factura reintentada: la cuenta quedó emitida.' : 'Cuenta de cobro emitida.',
            'No se pudo emitir la cuenta de cobro',
          )
        }
        title={confirmar === 'reintentar' ? 'Reintentar la factura' : 'Emitir la cuenta de cobro'}
        message={
          confirmar === 'reintentar'
            ? 'La emisión anterior no terminó. Si Factus ya había emitido la factura, se recupera por su referencia; si no, se vuelve a enviar. Solo se puede reintentar pasados 10 minutos desde el intento anterior.'
            : `Se congelan las ${cuenta.lineas.filter((l) => l.estado !== 'anulada').length} líneas por ${pesos(cuenta.total_cop)}, y, con la facturación encendida, se emite la factura de las líneas facturables y se avisa a los titulares de la inmobiliaria.`
        }
        confirmLabel={confirmar === 'reintentar' ? 'Reintentar' : 'Emitir'}
      />
      <PagoTarifaModal
        pagando={pagando}
        onClose={() => setPagando(null)}
        onConfirm={(datos) =>
          tras(
            () =>
              pagando!.tipo === 'cuenta'
                ? tarifaCobroService.pagarCuenta(pagando!.id, datos)
                : tarifaCobroService.pagarLinea(pagando!.id, datos),
            'Pago registrado.',
            'No se pudo registrar el pago',
          )
        }
      />
      <ConfirmDialog
        isOpen={noRecaudada !== null}
        onClose={() => setNoRecaudada(null)}
        onConfirm={() =>
          tras(
            () => tarifaCobroService.marcarNoRecaudada(noRecaudada!.id),
            'Línea marcada como no recaudada. Recuerde reportar la mora del arrendatario.',
            'No se pudo marcar la línea',
          )
        }
        title="Tarifa no recaudada"
        message={
          noRecaudada
            ? `Se informará a Cofianza que el arrendatario no le pagó la tarifa de ${mesTexto(noRecaudada.periodo)} del contrato ${noRecaudada.contrato?.numero ?? ''}. ` +
              'No se le cobra mientras tanto; recuerde reportar la mora. Cuando el arrendatario pague, remita el valor y Cofianza lo registrará como pagado.'
            : ''
        }
        confirmLabel="Marcar no recaudada"
      />
      <MotivoDialog
        key={anulando?.id}
        isOpen={anulando !== null}
        onClose={() => setAnulando(null)}
        isLoading={anulandoEnCurso}
        onConfirm={async (motivo) => {
          if (!anulando) return
          setAnulandoEnCurso(true)
          // Sin Gerencia General la API responde 403 con su mensaje: se muestra tal cual.
          const ok = await tras(() => tarifaCobroService.anularLinea(anulando.id, motivo), 'Línea anulada.', 'No se pudo anular la línea')
          setAnulandoEnCurso(false)
          if (!ok) return false
          setAnulando(null)
        }}
        title="Anular línea de cobro"
        descripcion={
          anulando
            ? `Se anula la tarifa de ${mesTexto(anulando.periodo)} del contrato ${anulando.contrato?.numero ?? ''}. Solo la Gerencia General puede hacerlo.` +
              (cuenta.factura_id && anulando.facturable ? ' Ya salió en la factura: quedará marcada para nota crédito.' : '')
            : ''
        }
        confirmLabel="Anular línea"
        variant="danger"
      />

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {cuenta.factura_id && (
          <Link
            href={`/facturacion/${cuenta.factura_id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800"
          >
            <IconFileText size={14} />
            Ver factura
          </Link>
        )}
        {cuenta.factura_id && (
          <button
            type="button"
            onClick={() =>
              facturacionService
                .descargarYGuardar(cuenta.factura_id!, 'pdf')
                .catch((err) => toast.error(errorDe(err, 'No se pudo descargar el PDF de la factura')))
            }
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800"
          >
            <IconDownload size={14} />
            PDF de la factura
          </button>
        )}
        {cuenta.cliente_nit && (
          <span className="text-xs text-gray-500">
            {cuenta.cliente_razon_social} · NIT {cuenta.cliente_nit}
          </span>
        )}
        <div className="flex-1" />
        {acciones.emitir && (
          <button
            type="button"
            onClick={() => setConfirmar('emitir')}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800"
          >
            Emitir
          </button>
        )}
        {acciones.reintentar && (
          <button
            type="button"
            onClick={() => setConfirmar('reintentar')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800"
          >
            <IconRefresh size={14} />
            Reintentar factura
          </button>
        )}
        {acciones.pagar && (
          <button
            type="button"
            onClick={() => setPagando({ tipo: 'cuenta', id: cuenta.id, total: cuenta.saldo_cop })}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Marcar cuenta pagada
          </button>
        )}
      </div>
      {cuenta.estado === 'bloqueada_fiscal' && rol === 'inmobiliaria' && <AvisoDatosFiscales />}
      {cuenta.estado === 'bloqueada_fiscal' && rol !== 'inmobiliaria' && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <IconAlertTriangle size={12} className="inline mr-1 -mt-0.5" />
          Faltan datos fiscales de la inmobiliaria. Ya se avisó a sus titulares; la cuenta vuelve sola a borrador cuando
          los completen.
        </p>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Contrato</th>
              <th className="px-3 py-2 text-left font-medium">Mes</th>
              <th className="px-3 py-2 text-left font-medium">Modalidad</th>
              <th className="px-3 py-2 text-right font-medium">Canon sin IVA</th>
              <th className="px-3 py-2 text-right font-medium">Tarifa</th>
              <th className="px-3 py-2 text-right font-medium">Días</th>
              <th className="px-3 py-2 text-right font-medium">Base</th>
              <th className="px-3 py-2 text-right font-medium">IVA</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-3 py-2 text-left font-medium">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cuenta.lineas.map((l) => (
              <FilaLinea
                key={l.id}
                linea={l}
                cuenta={cuenta}
                rol={rol}
                onPagar={setPagando}
                onAnular={setAnulando}
                onNoRecaudada={setNoRecaudada}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilaLinea({
  linea: l,
  cuenta,
  rol,
  onPagar,
  onAnular,
  onNoRecaudada,
}: {
  linea: ILineaCobro
  cuenta: ICuentaCobroDetalle
  rol: string | undefined
  onPagar: (p: Pagando) => void
  onAnular: (l: ILineaCobro) => void
  onNoRecaudada: (l: ILineaCobro) => void
}) {
  const acciones = accionesDeLinea(l, cuenta.estado, rol)
  const numero = l.contrato?.numero ?? l.contrato_id.slice(0, 8)
  return (
    <tr className={l.estado === 'anulada' ? 'text-gray-400' : 'text-gray-700'}>
      <td className="px-3 py-2 font-mono">{numero}</td>
      <td className="px-3 py-2">{l.periodo.slice(0, 7)}</td>
      <td className="px-3 py-2 capitalize">
        {l.modalidad}
        {!l.facturable && <span className="block normal-case text-gray-500">sin factura</span>}
      </td>
      <td className="px-3 py-2 text-right">{pesos(l.canon_base)}</td>
      <td className="px-3 py-2 text-right">{Number(l.pct)} %</td>
      <td className="px-3 py-2 text-right">
        {l.dias}/{l.dias_mes}
      </td>
      <td className="px-3 py-2 text-right">{pesos(l.base_cop)}</td>
      <td className="px-3 py-2 text-right">{pesos(l.iva_cop)}</td>
      <td className="px-3 py-2 text-right font-medium">{pesos(l.total_cop)}</td>
      <td className="px-3 py-2">
        {LINEA_LABELS[l.estado]}
        {l.pagada_en && <span className="block text-gray-500">el {formatDate(l.pagada_en)}{l.referencia_pago ? ` · ${l.referencia_pago}` : ''}</span>}
        {l.anulada_motivo && <span className="block text-gray-500">{l.anulada_motivo}</span>}
        {l.requiere_nota_credito && <span className="block text-red-700">Nota crédito pendiente</span>}
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        {acciones.pagar && (
          <button
            type="button"
            onClick={() => onPagar({ tipo: 'linea', id: l.id, total: Number(l.total_cop), contrato: numero })}
            className="font-medium text-primary-700 hover:text-primary-800"
          >
            Marcar pagada
          </button>
        )}
        {acciones.anular && (
          <button type="button" onClick={() => onAnular(l)} className="ml-3 font-medium text-red-700 hover:text-red-800">
            Anular
          </button>
        )}
        {acciones.noRecaudada && (
          <button type="button" onClick={() => onNoRecaudada(l)} className="font-medium text-amber-800 hover:text-amber-900">
            No recaudada
          </button>
        )}
      </td>
    </tr>
  )
}

/** Basado en PagoManualModal: la referencia de la transferencia y el día en que la inmobiliaria pagó. */
function PagoTarifaModal({
  pagando,
  onClose,
  onConfirm,
}: {
  pagando: Pagando | null
  onClose: () => void
  onConfirm: (datos: { referencia: string; fecha: string }) => Promise<boolean>
}) {
  const [referencia, setReferencia] = useState('')
  const [fecha, setFecha] = useState(hoyBogota)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cerrar = () => {
    if (enviando) return
    setReferencia('')
    setFecha(hoyBogota())
    setError(null)
    onClose()
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!referencia.trim()) return setError('Indique la referencia del pago')
    if (!fecha) return setError('Seleccione la fecha de pago')
    if (fecha > hoyBogota()) return setError('La fecha de pago no puede ser futura')
    setError(null)
    setEnviando(true)
    const ok = await onConfirm({ referencia: referencia.trim(), fecha })
    setEnviando(false)
    if (ok) {
      setReferencia('')
      onClose()
    }
  }

  return (
    <Modal isOpen={pagando !== null} onClose={cerrar} title="Registrar pago de la tarifa" size="md">
      <form onSubmit={enviar} className="space-y-4">
        {pagando && (
          <p className="text-sm text-gray-600">
            {pagando.tipo === 'cuenta'
              ? `Se marcan como pagadas todas las líneas pendientes de la cuenta (${pesos(pagando.total)}). Las no recaudadas quedan como están.`
              : `Se marca como pagada la línea del contrato ${pagando.contrato} (${pesos(pagando.total)}).`}
          </p>
        )}
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pago-tarifa-referencia" className="block text-sm font-medium text-gray-700 mb-1">
              Referencia de la transferencia <span className="text-red-500">*</span>
            </label>
            <input
              id="pago-tarifa-referencia"
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              maxLength={120}
              placeholder="Número de referencia o transacción"
              disabled={enviando}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="pago-tarifa-fecha" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de pago <span className="text-red-500">*</span>
            </label>
            <input
              id="pago-tarifa-fecha"
              type="date"
              value={fecha}
              max={hoyBogota()}
              onChange={(e) => setFecha(e.target.value)}
              disabled={enviando}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={cerrar}
            disabled={enviando}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {enviando && <IconLoader size={16} className="animate-spin" />}
            {enviando ? 'Registrando…' : 'Registrar pago'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/** D14: sin NIT ni datos fiscales completos, la cuenta no se puede emitir; los completa el titular. */
function AvisoDatosFiscales() {
  return (
    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      <IconAlertTriangle size={12} className="inline mr-1 -mt-0.5" />
      Faltan datos fiscales de su inmobiliaria (persona jurídica con NIT) para emitir la cuenta de cobro. Complételos en{' '}
      <Link href="/configuracion/datos-contrato" className="font-medium underline hover:text-amber-900">
        Datos para contrato
      </Link>
      ; la cuenta se libera sola cuando estén completos.
    </p>
  )
}
