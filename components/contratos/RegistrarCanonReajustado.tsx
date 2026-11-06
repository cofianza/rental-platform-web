/**
 * RegistrarCanonReajustado — plan cobro-tarifa-mensual B9/B8. Hasta 30 días
 * antes de cada aniversario de la fecha de inicio, la API le pide a la
 * inmobiliaria el canon reajustado (aviso «Confirme el canon reajustado»). Aquí
 * se registra: la tarifa mensual se liquida sobre ese canon desde el mes del
 * aniversario (o el siguiente, si cae a mitad de mes). Sin confirmarlo, se
 * sigue liquidando sobre el canon actual.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { CampoPesos } from '@/components/contratos/v3/campos'
import { IconAlertTriangle, IconCalendar, IconLoader } from '@/components/icons'
import { formatCurrency, formatDate } from '@/lib/constants'
import { mesTexto, periodoDesde } from '@/lib/tarifaCobro'
import { tarifaCobroService } from '@/services/tarifaCobroService'

export function RegistrarCanonReajustado({
  contratoId,
  aniversario,
  canonActual,
  liquidacionActiva,
  confirmado,
  propuesto,
  onRegistrado,
}: {
  contratoId: string
  /** AAAA-MM-DD: el aniversario en que se reajusta el canon. */
  aniversario: string
  /** El canon con que se liquida la tarifa este mes, el mismo piso que valida la API. */
  canonActual: number | null
  /** TARIFA_LIQUIDACION_ENABLED: si no, la tarifa todavía no se liquida en la plataforma. */
  liquidacionActiva: boolean
  /** El canon que ya está registrado para este aniversario (la API lo manda al recargar la página). */
  confirmado: { valor: number; desde: string } | null
  /** V3: la propuesta con IPC; en migrados no hay. */
  propuesto: { valor: number; ipc_anual: number } | null
  onRegistrado: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [canon, setCanon] = useState<number | undefined>(undefined)
  // Es la base de la tarifa mensual: antes de guardar se muestra «de $X a $Y desde {mes}».
  const [revisando, setRevisando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Lo recién registrado mientras llega la recarga (y con la API anterior, que no manda `confirmado`).
  const [registrado, setRegistrado] = useState<{ valor: number; desde: string } | null>(null)
  const hecho = registrado ?? confirmado
  const mesDesde = mesTexto(periodoDesde(aniversario))
  const textoPropuesta = propuesto
    ? `Con la variación del IPC de ${propuesto.ipc_anual.toLocaleString('es-CO')} %, el canon reajustado sería de hasta ${formatCurrency(propuesto.valor)}.`
    : null
  const menor = canon !== undefined && !!canonActual && canon < canonActual

  const cerrar = () => {
    if (enviando) return
    setError(null)
    setRevisando(false)
    setAbierto(false)
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canon) return setError('Indique el canon reajustado.')
    setError(null)
    if (!revisando) return setRevisando(true)
    setEnviando(true)
    try {
      await tarifaCobroService.registrarCanon(contratoId, aniversario, canon)
      toast.success('Canon reajustado registrado.')
      setRegistrado({ valor: canon, desde: periodoDesde(aniversario) })
      onRegistrado()
      setRevisando(false)
      setAbierto(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el canon. Intente de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-amber-200 p-5">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <IconCalendar size={15} className="text-amber-700" />
        Reajuste anual del canon
      </p>
      <p className="mt-1 text-sm text-gray-600">
        {hecho
          ? `Registrado: ${formatCurrency(hecho.valor)} desde ${mesTexto(hecho.desde)}. Si necesita corregirlo, regístrelo de nuevo.`
          : `El ${formatDate(aniversario)} el contrato cumple un año más y el canon se reajusta. Mientras no registre el canon reajustado, la tarifa mensual se ${liquidacionActiva ? 'liquida' : 'liquidará'} sobre el canon actual.`}
      </p>
      {!hecho && textoPropuesta && <p className="mt-1 text-sm text-gray-600">{textoPropuesta}</p>}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800"
      >
        {hecho ? 'Corregir canon reajustado' : 'Registrar canon reajustado'}
      </button>

      <Modal
        isOpen={abierto}
        onClose={cerrar}
        title="Registrar canon reajustado"
        description={`Rige desde el aniversario del contrato (${formatDate(aniversario)}).`}
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="space-y-2">
            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}
            <ModalAcciones>
              <button
                type="button"
                onClick={revisando ? () => setRevisando(false) : cerrar}
                disabled={enviando}
                className={botonModal('secondary')}
              >
                {revisando ? 'Corregir' : 'Cancelar'}
              </button>
              <button type="submit" form="registrar-canon-form" disabled={enviando} aria-busy={enviando || undefined} className={botonModal('primary')}>
                {enviando && <IconLoader size={16} className="animate-spin" aria-hidden="true" />}
                {enviando ? 'Registrando…' : revisando ? 'Confirmar y registrar' : 'Revisar'}
              </button>
            </ModalAcciones>
          </div>
        }
      >
        <form id="registrar-canon-form" noValidate onSubmit={enviar} className="space-y-4">
          <p className="text-sm text-gray-600">
            Canon actual: <strong className="font-medium text-gray-900">{canonActual ? formatCurrency(canonActual) : '—'}</strong>.
            Si el aniversario cae a mitad de mes, la tarifa toma el nuevo canon desde el mes siguiente. No puede ser menor
            que el canon actual.{textoPropuesta && ` ${textoPropuesta}`}
          </p>
          {revisando && canon ? (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
              <p>
                Canon {canonActual ? <>de <strong>{formatCurrency(canonActual)}</strong> </> : ''}a{' '}
                <strong>{formatCurrency(canon)}</strong>, desde {mesDesde}. La tarifa mensual se liquida sobre este valor.
              </p>
              {menor && (
                <p className="flex items-start gap-1.5 text-amber-800">
                  <IconAlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  El nuevo canon es menor que el actual. Revise que el valor esté bien escrito.
                </p>
              )}
            </div>
          ) : (
            <CampoPesos
              label="Canon mensual reajustado (COP)"
              requerido
              value={canon}
              onChange={(v) => {
                setCanon(v)
                setError(null)
              }}
              disabled={enviando}
              placeholder="Ej.: 2.500.000"
            />
          )}
        </form>
      </Modal>
    </div>
  )
}
