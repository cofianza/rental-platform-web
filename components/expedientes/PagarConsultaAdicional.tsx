/**
 * PagarConsultaAdicional — cuando evaluar el estudio con un canon mayor
 * necesita una consulta adicional. El valor lo cotiza la API en su respuesta;
 * aquí se confirma y se entrega el enlace de pago.
 */

'use client'

import { useState } from 'react'
import { IconCreditCard, IconExternalLink, IconLoader } from '@/components/icons'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { botonModal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/constants'
import { useConsultaAdicionalCanon } from '@/hooks/useSustituciones'
import type { IConsultaAdicionalCanon, IValorConsultaAdicional } from '@/types/sustitucion'

interface PagarConsultaAdicionalProps {
  estudioId: string
  inmuebleId: string
  /** Lo que cotizó la API. */
  valor: IValorConsultaAdicional
  /** La API respondió que no hacía falta consultar y el estudio ya quedó evaluado. */
  onSinCobro?: () => void
}

export function PagarConsultaAdicional({ estudioId, inmuebleId, valor, onSinCobro }: PagarConsultaAdicionalProps) {
  const { pedir, pidiendo } = useConsultaAdicionalCanon()
  const [confirmando, setConfirmando] = useState(false)
  const [respuesta, setRespuesta] = useState<IConsultaAdicionalCanon | null>(null)
  // Si la API cotiza otro valor al confirmar, se muestra el nuevo antes de confirmar otra vez.
  const [vigente, setVigente] = useState(valor)

  if (respuesta?.url_pago) {
    return (
      <div className="mt-3 space-y-2">
        <a href={respuesta.url_pago} target="_blank" rel="noopener noreferrer" className={botonModal('primary', 'w-full sm:w-auto')}>
          <IconExternalLink size={16} aria-hidden="true" />
          Ir a pagar {formatCurrency(respuesta.total_cop)}
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </a>
        <p className="text-xs">Cuando el pago se confirme hacemos la consulta y le avisamos. Después vuelva a intentarlo: no tendrá otro costo mientras el reporte esté vigente.</p>
      </div>
    )
  }
  if (respuesta?.estado === 'consultada') {
    return <p className="mt-3 text-xs">La consulta adicional quedó hecha. Vuelva a intentarlo: ya no tiene costo.</p>
  }
  if (respuesta?.estado === 'pagada') {
    return <p className="mt-3 text-xs">La consulta ya está pagada, pero no pudimos hacerla en este momento. Inténtelo de nuevo más tarde: no se cobra otra vez.</p>
  }

  return (
    <>
      <button type="button" onClick={() => setConfirmando(true)} disabled={pidiendo} aria-busy={pidiendo || undefined} className={botonModal('secondary', 'mt-3 w-full sm:w-auto')}>
        {pidiendo ? <IconLoader size={16} className="animate-spin" aria-hidden="true" /> : <IconCreditCard size={16} aria-hidden="true" />}
        Pedir la consulta adicional ({formatCurrency(vigente.total_cop)})
      </button>
      <ConfirmDialog
        isOpen={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={async () => {
          const r = await pedir(estudioId, inmuebleId, vigente)
          if (!r) return
          if ('valorNuevo' in r) {
            setVigente(r.valorNuevo)
            return
          }
          setRespuesta(r)
          if (r.estado === 'no_requiere') onSinCobro?.()
        }}
        title="Pedir la consulta adicional"
        message={
          <div className="space-y-2">
            <p>
              Se generará un cobro de <strong className="tabular-nums">{formatCurrency(vigente.total_cop)}</strong> (IVA incluido)
              {vigente.consultas > 1 ? `, por ${vigente.consultas} personas` : ''}. Si ya estaba pagada, no se cobra otra vez. La consulta se hace cuando el pago se
              confirme.
            </p>
            <p>La consulta no garantiza que el estudio quede habilitado para este canon y, una vez hecha, su valor no se devuelve.</p>
          </div>
        }
        confirmLabel="Confirmar"
        isLoading={pidiendo}
      />
    </>
  )
}
