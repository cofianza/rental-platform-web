/**
 * SaldosAFavorSection — Adenda 6 §6 y 6.1 §6: los saldos a favor de quienes
 * pagaron por anticipado un estudio o una consulta adicional que no se llegó a
 * consultar. Solo administradores. El saldo se descuenta solo del siguiente
 * pago de quien pagó; si quien pagó es una persona natural (propietario directo
 * o la persona que pagó el estudio) y pide la devolución (por correo o
 * WhatsApp), aquí se registra la solicitud: la API la deja en la cola de
 * Reembolsos con la fecha límite de 15 días hábiles. A las inmobiliarias nunca
 * se les devuelve en dinero.
 */

'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { IconChevronDown, IconLoader, IconRefresh, IconUndo, IconWallet } from '@/components/icons'
import { useSaldosAFavorAdmin } from '@/hooks/useSaldoAFavor'
import { movimientoSuma, type CanalSolicitudDevolucion, type ISaldoAFavorAdmin, type TipoDuenoSaldo } from '@/services/saldoAFavorService'
import { formatCurrency, formatDate } from '@/lib/constants'
import { cn, formatNumeroEstudio } from '@/lib/utils'

const TIPO: Record<TipoDuenoSaldo, string> = {
  inmobiliaria: 'Inmobiliaria',
  propietario: 'Propietario',
  persona: 'Persona que pagó',
}

const CANALES: Array<{ value: CanalSolicitudDevolucion; label: string }> = [
  { value: 'correo', label: 'Correo' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'otro', label: 'Otro' },
]

const NOTA_MIN = 5
const NOTA_MAX = 500

export function SaldosAFavorSection() {
  const { datos, isLoading, error, recargar, registrarDevolucion, registrando } = useSaldosAFavorAdmin()
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const [devolver, setDevolver] = useState<ISaldoAFavorAdmin | null>(null)

  const alternar = (id: string) =>
    setAbiertos((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })

  if (isLoading && !datos) return <SkeletonTable filas={4} columnas={4} etiqueta="Cargando saldos a favor…" />

  if (error && !datos) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <button onClick={() => void recargar()} className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800">
          <IconRefresh size={14} />
          Reintentar
        </button>
      </div>
    )
  }

  if (!datos?.habilitado) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <p className="text-sm text-gray-600">El saldo a favor no está activo.</p>
      </div>
    )
  }

  const saldos = datos.saldos

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">Saldos a favor</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Lo pagado por anticipado que no se llegó a consultar. El de una inmobiliaria o un propietario se descuenta solo de su siguiente pago; el de una persona que pagó por el enlace se le devuelve cuando lo pide.
            Si una persona natural pide que se le devuelva, registre aquí su solicitud: queda en Reembolsos con la fecha límite.
          </p>
        </div>
        <button
          onClick={() => void recargar()}
          disabled={isLoading}
          className="inline-flex min-h-10 items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 shrink-0"
        >
          <IconRefresh size={14} className={isLoading ? 'animate-spin' : ''} />
          Refrescar
        </button>
      </div>

      {saldos.length === 0 ? (
        <div className="p-8 text-center">
          <IconWallet size={32} className="mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-500">No hay saldos a favor.</p>
        </div>
      ) : (
        <ul className={cn('divide-y divide-gray-100 transition-opacity', isLoading && 'pointer-events-none opacity-60')} aria-busy={isLoading}>
          {saldos.map((s) => {
            const abierto = abiertos.has(s.id)
            const panelId = `saldo-movimientos-${s.id}`
            return (
              <li key={s.id} className="px-4 sm:px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 break-words">{s.dueno.nombre}</span>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {TIPO[s.tipo_dueno] ?? s.tipo_dueno}
                      </span>
                    </div>
                    {s.dueno.detalle && <p className="mt-0.5 text-xs text-gray-500 break-words">{s.dueno.detalle}</p>}
                    <p className="mt-1 text-lg font-bold tabular-nums text-gray-900">{formatCurrency(s.saldo_cop)}</p>
                    {s.tipo_dueno === 'inmobiliaria' && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        Las inmobiliarias no reciben devoluciones en dinero: el saldo se aplica a sus pagos siguientes.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row shrink-0 w-full sm:w-auto">
                    {s.movimientos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => alternar(s.id)}
                        aria-expanded={abierto}
                        aria-controls={panelId}
                        className={botonModal('secondary')}
                      >
                        <IconChevronDown size={14} className={cn('transition-transform', abierto && 'rotate-180')} aria-hidden="true" />
                        {abierto ? 'Ocultar movimientos' : 'Ver movimientos'}
                      </button>
                    )}
                    {s.puede_devolver && (
                      <button type="button" onClick={() => setDevolver(s)} disabled={registrando !== null} className={botonModal('primary')}>
                        <IconUndo size={14} aria-hidden="true" />
                        Registrar solicitud de devolución
                      </button>
                    )}
                  </div>
                </div>
                {abierto && (
                  <ul id={panelId} className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50/50">
                    {s.movimientos.map((m) => {
                      const suma = movimientoSuma(m.tipo)
                      return (
                        <li key={m.id} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800 break-words">{m.descripcion}</p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {formatDate(m.created_at)}
                              {m.expediente && (
                                <>
                                  {' · '}
                                  <Link href={`/expedientes/${m.expediente.id}`} className="font-mono text-primary-700 hover:underline">
                                    {formatNumeroEstudio(m.expediente.numero)}
                                  </Link>
                                </>
                              )}
                              {m.fecha_limite && ` · Devolver a más tardar el ${formatDate(m.fecha_limite)}`}
                            </p>
                          </div>
                          <span className={cn('shrink-0 text-sm font-semibold tabular-nums', suma ? 'text-primary-700' : 'text-gray-700')}>
                            {suma ? '+' : '−'}
                            {formatCurrency(m.monto_cop)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {devolver && (
        <SolicitudDevolucionModal
          saldo={devolver}
          enviando={registrando === devolver.id}
          onClose={() => setDevolver(null)}
          onConfirm={async (canal, nota) => {
            try {
              const r = await registrarDevolucion(devolver.id, { canal, nota })
              toast.success(`Quedó en la cola de reembolsos: devolver a más tardar el ${formatDate(r.fecha_limite)}.`, { duration: 10000 })
              if (r.filas.some((f) => f.modo === 'manual')) {
                toast.info('Una parte se devuelve a mano (transferencia): márquela resuelta en Reembolsos cuando la haga.', { duration: 12000 })
              }
              setDevolver(null)
            } catch (err) {
              toast.error(err instanceof Error && err.message ? err.message : 'No se pudo registrar la solicitud de devolución.')
            }
          }}
        />
      )}
    </div>
  )
}

function SolicitudDevolucionModal({
  saldo,
  enviando,
  onClose,
  onConfirm,
}: {
  saldo: ISaldoAFavorAdmin
  enviando: boolean
  onClose: () => void
  onConfirm: (canal: CanalSolicitudDevolucion, nota: string) => Promise<void>
}) {
  const [canal, setCanal] = useState<CanalSolicitudDevolucion>('correo')
  const [nota, setNota] = useState('')
  const canalId = useId()
  const notaId = useId()
  const ayudaId = useId()
  const valido = nota.trim().length >= NOTA_MIN && nota.trim().length <= NOTA_MAX

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Registrar solicitud de devolución"
      description={`${saldo.dueno.nombre} pidió que le devolvamos su saldo a favor (${formatCurrency(saldo.saldo_cop)}). Queda en Reembolsos con la fecha límite de 15 días hábiles desde hoy.`}
      footer={
        <ModalAcciones>
          <button type="button" onClick={onClose} disabled={enviando} className={botonModal('secondary')}>
            Volver
          </button>
          <button
            type="button"
            onClick={() => void onConfirm(canal, nota.trim())}
            disabled={!valido || enviando}
            aria-busy={enviando || undefined}
            className={botonModal('primary')}
          >
            {enviando && <IconLoader size={16} className="animate-spin" aria-hidden="true" />}
            Registrar solicitud
          </button>
        </ModalAcciones>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor={canalId} className="block text-sm font-medium text-gray-800 mb-1">
            Por dónde la pidió
          </label>
          <select
            id={canalId}
            value={canal}
            onChange={(e) => setCanal(e.target.value as CanalSolicitudDevolucion)}
            className="w-full min-h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {CANALES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={notaId} className="block text-sm font-medium text-gray-800 mb-1">
            Nota <span className="text-coral-700">*</span>
          </label>
          <textarea
            id={notaId}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            maxLength={NOTA_MAX}
            aria-describedby={ayudaId}
            required
            placeholder="Ej.: la pidió por correo el 26/11; se verificó la identidad de quien pagó."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p id={ayudaId} className="mt-1 text-xs text-gray-500">
            Entre {NOTA_MIN} y {NOTA_MAX} caracteres ({nota.trim().length}/{NOTA_MAX}).
          </p>
        </div>
      </div>
    </Modal>
  )
}
