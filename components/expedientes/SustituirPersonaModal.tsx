/**
 * SustituirPersonaModal — cambiar a una persona del estudio: el segundo
 * firmante o el solicitante (quién sale lo trae el aviso de la API).
 *
 * Antes de cargar a la persona nueva muestra el aviso que envía la API (qué
 * cuesta y cuántos cambios quedan) y pide confirmarlo. Si el cambio lleva
 * cobro, entrega el enlace de pago; la persona nueva se carga después, cuando
 * la API confirma el pago. Aquí no se calcula ni se fija ningún valor.
 *
 * Quien lo usa lo monta solo mientras hay un aviso abierto: al cerrarse se
 * desmonta y su estado empieza de nuevo.
 */

'use client'

import { useState } from 'react'
import { IconAlertTriangle, IconArrowRight, IconExternalLink, IconInfo, IconUsers } from '@/components/icons'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/constants'
import type { ICotizacionSustitucion, ISustitucionCreada } from '@/types/sustitucion'
import { avisoReemplazoEnRechazado, textoFirmarHastaCambio } from '@/lib/personaEstudio'

interface SustituirPersonaModalProps {
  isOpen: boolean
  onClose: () => void
  /** El aviso del valor que envió la API para este cambio. */
  cotizacion: ICotizacionSustitucion | null
  /** Abre el cambio con el valor confirmado. null = no se pudo (ya se informó). */
  onConfirmar: (cotizacion: ICotizacionSustitucion) => Promise<ISustitucionCreada | null>
  /** El estudio está no aprobable: con la persona nueva vuelve a revisión (punto 5 del reporte). */
  estudioRechazado?: boolean
}

export function SustituirPersonaModal({ isOpen, onClose, cotizacion, onConfirmar, estudioRechazado = false }: SustituirPersonaModalProps) {
  const [confirmando, setConfirmando] = useState(false)
  const [creada, setCreada] = useState<ISustitucionCreada | null>(null)

  if (!cotizacion) return null
  const esSolicitante = cotizacion.sale.persona === 'solicitante'
  const nombre = cotizacion.sale.nombre || (esSolicitante ? 'el solicitante' : 'el segundo firmante')
  const rolNuevo = esSolicitante ? 'solicitante' : 'segundo firmante'
  // La persona ya salió del estudio: solo falta cargar a otra en su lugar.
  const yaSalio = cotizacion.sale.ya_salio === true
  const conCobro = cotizacion.requiere_pago && cotizacion.total_a_pagar_cop > 0
  const pago = creada?.pago ?? null
  // Adenda 6 §6: el saldo a favor cubrió el cobro entero (sin enlace) o una parte (el enlace cobra lo que falta).
  const saldoAplicado = pago?.saldo_aplicado_cop ?? 0
  const cubiertoConSaldo = !!pago && !pago.url_pago && saldoAplicado > 0
  const porPagar = pago ? (pago.por_pagar_cop ?? pago.total_cop) : 0
  // Lo que la cotización dice que aplicaría el saldo a favor de quien mira.
  const saldoCotizado = conCobro ? (cotizacion.saldo_a_favor ?? null) : null
  // Estudio rechazado: vuelve a revisión con la persona nueva. Lo que el aviso de la API ya dice no se repite.
  const avisoRechazado = estudioRechazado && cotizacion.puede_sustituir ? avisoReemplazoEnRechazado(cotizacion) : null
  // Adenda 6 §7: la fecha límite real para enviar a firma con el resultado de este estudio (la manda la API).
  const firmarHasta = cotizacion.puede_sustituir ? textoFirmarHastaCambio(cotizacion.firmar_hasta) : null

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={cubiertoConSaldo ? 'Consulta adicional pagada' : pago ? 'Pague la consulta adicional' : yaSalio ? 'Cargar a otra persona' : `Reemplazar a ${nombre}`}
        size="md"
        footer={
          pago ? (
            <ModalAcciones>
              <button type="button" onClick={onClose} className={botonModal('secondary')}>
                Cerrar
              </button>
              {pago.url_pago && (
                <a href={pago.url_pago} target="_blank" rel="noopener noreferrer" className={botonModal('primary')}>
                  <IconExternalLink size={16} aria-hidden="true" />
                  Ir a pagar {formatCurrency(porPagar)}
                  <span className="sr-only"> (se abre en una pestaña nueva)</span>
                </a>
              )}
            </ModalAcciones>
          ) : (
            <ModalAcciones>
              <button type="button" onClick={onClose} className={botonModal('secondary')}>
                Cancelar
              </button>
              <button type="button" onClick={() => setConfirmando(true)} disabled={!cotizacion.puede_sustituir} className={botonModal('primary')}>
                Continuar
                <IconArrowRight size={16} aria-hidden="true" />
              </button>
            </ModalAcciones>
          )
        }
      >
        {cubiertoConSaldo ? (
          <div className="space-y-3 text-sm leading-relaxed text-gray-700">
            <p>
              El cambio quedó abierto y la consulta adicional se pagó con saldo a favor (
              <strong className="tabular-nums text-gray-900">{formatCurrency(saldoAplicado)}</strong>). Ya puede cargar a la persona nueva desde
              la tarjeta del estudio.
            </p>
          </div>
        ) : pago ? (
          <div className="space-y-3 text-sm leading-relaxed text-gray-700">
            <p>
              El cambio quedó abierto. Cuando el pago se confirme, actualice esta tarjeta del estudio («Ya pagué: actualizar») y cargue allí a la persona nueva.
            </p>
            <p className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              {saldoAplicado > 0 ? (
                <>
                  Saldo a favor aplicado: <strong className="tabular-nums text-gray-900">{formatCurrency(saldoAplicado)}</strong> · Por pagar:{' '}
                  <strong className="tabular-nums text-gray-900">{formatCurrency(porPagar)}</strong> (IVA incluido).
                </>
              ) : (
                <>
                  Valor a pagar: <strong className="tabular-nums text-gray-900">{formatCurrency(pago.total_cop)}</strong> (IVA incluido).
                </>
              )}
            </p>
            <p className="text-gray-600">Si cancela el cambio antes de que la persona nueva sea evaluada, el valor pagado no se pierde.</p>
          </div>
        ) : (
          <div className="space-y-3 text-sm leading-relaxed text-gray-700">
            <p className="flex gap-2">
              <IconUsers size={18} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
              <span>
                {yaSalio ? (
                  <>
                    <strong className="text-gray-900">{nombre}</strong> ya salió del estudio. Usted cargará a otra persona como {rolNuevo}.
                  </>
                ) : (
                  <>
                    <strong className="text-gray-900">{nombre}</strong> saldrá del estudio cuando usted cargue a otra persona en su lugar
                    {esSolicitante ? ' como solicitante. Desde ese momento deja de tener acceso al estudio, y la persona nueva autoriza y se evalúa' : ''}.
                  </>
                )}{' '}
                El estudio conserva su número, su inmueble y su historial.
              </span>
            </p>
            {avisoRechazado && (
              <p className="flex gap-2">
                <IconInfo size={18} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
                <span>{avisoRechazado}</span>
              </p>
            )}
            {firmarHasta && (
              <p className="flex gap-2">
                <IconInfo size={18} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
                <span>{firmarHasta}</span>
              </p>
            )}
            <p
              className={
                cotizacion.puede_sustituir
                  ? 'rounded-lg border border-primary-200 bg-primary-50 p-3 text-primary-950'
                  : 'flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900'
              }
            >
              {!cotizacion.puede_sustituir && <IconAlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
              <span>{cotizacion.aviso}</span>
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={async () => {
          const r = await onConfirmar(cotizacion)
          // No se pudo (p. ej. el valor cambió): se cierra para volver a consultar el valor vigente.
          if (!r) {
            onClose()
            return
          }
          // Con enlace (o pagada con saldo a favor) se muestra el resultado; sin cobro se cierra.
          if (r.pago) setCreada(r)
          else onClose()
        }}
        title="Confirmar el cambio de persona"
        message={
          <div className="space-y-2">
            {!yaSalio && <p>{nombre} saldrá del estudio al cargar a la persona nueva.</p>}
            <p>
              {conCobro ? (
                <>
                  Se generará un cobro de <strong className="tabular-nums">{formatCurrency(cotizacion.total_a_pagar_cop)}</strong> (IVA incluido) por la consulta de
                  la persona nueva. Se paga antes de cargarla.
                  {saldoCotizado && saldoCotizado.aplicaria_cop > 0 && (
                    <>
                      {' '}
                      {saldoCotizado.por_pagar_cop <= 0 ? (
                        <>Su saldo a favor lo cubre completo.</>
                      ) : (
                        <>
                          Se aplica su saldo a favor (<span className="tabular-nums">{formatCurrency(saldoCotizado.aplicaria_cop)}</span>) y queda por pagar{' '}
                          <strong className="tabular-nums">{formatCurrency(saldoCotizado.por_pagar_cop)}</strong>.
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                'Este cambio no tiene costo.'
              )}
            </p>
          </div>
        }
        confirmLabel={conCobro ? 'Confirmar y generar el cobro' : 'Confirmar el cambio'}
      />
    </>
  )
}
