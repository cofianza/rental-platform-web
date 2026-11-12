import { CONTACTO_COFIANZA } from '@/lib/constants'
import { IconCheck, IconLoader } from '@/components/icons'
import type { IPagoProspecto } from '@/types/autorizacion'
import { enMedioDeFrase, tituloFirmado } from './textos'

/**
 * Autorización firmada (recién firmada o al reabrir el enlace). Si el
 * prospecto paga el estudio, dice en qué va el cobro; `sinInmueble` = estudio
 * creado sin propiedad (cambia el último punto de «Qué sigue»).
 */
export function PantallaFirmada({
  pagoRequerido,
  pago,
  esperaAgotada,
  quien,
  sinInmueble,
  hashDocumento,
}: {
  pagoRequerido: boolean
  pago: IPagoProspecto | null
  esperaAgotada: boolean
  quien: string
  sinInmueble: boolean
  hashDocumento: string | null
}) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
        <IconCheck size={30} className="text-primary-700" />
      </div>
      <h2 className="text-xl font-extrabold text-gray-900">
        {tituloFirmado(pagoRequerido, pago, esperaAgotada)}
      </h2>
      {/* Cada estado del cobro dice qué sigue. Antes, si el enlace no se
          generaba (sin correo, tope de canon, pasarela caída) o el pago
          estaba en proceso por PSE, la pantalla decía "estamos preparando
          tu enlace" para siempre. */}
      {pagoRequerido ? (
        <div className="mt-5">
          {pago?.payment_link_url ? (
            <>
              <p className="mb-3 text-sm text-gray-600">
                Falta un paso: pagar el estudio. Su evaluación inicia apenas se confirme el pago.
              </p>
              {/* CORR §5.3 (Ley 1480 art. 26): el total con IVA, destacado. */}
              {pago.monto_formateado && (
                <p className="mx-auto mb-3 max-w-xs rounded-xl bg-primary-50 px-4 py-3">
                  <span className="block text-xs font-medium uppercase tracking-wide text-primary-800">Valor del estudio</span>
                  <span className="block font-display text-2xl font-bold text-primary-900">{pago.monto_formateado}</span>
                </p>
              )}
              <a
                href={pago.payment_link_url}
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary-700 px-5 py-3 text-base font-semibold text-white hover:bg-primary-800 sm:w-auto"
              >
                Pagar el estudio ahora
              </a>
              <p className="mt-2 text-xs text-gray-500">
                El pago se hace en Mercado Pago. También le enviamos el enlace por correo y WhatsApp por si
                prefiere pagarlo después.
              </p>
            </>
          ) : pago?.estado === 'completado' ? (
            <p className="text-sm font-medium text-primary-700">
              Su pago ya está registrado y su evaluación está en marcha. No tiene que hacer nada más.
            </p>
          ) : pago?.estado === 'procesando' ? (
            <p className="text-sm text-gray-600">
              Su pago está en proceso. Apenas el banco lo confirme iniciamos su evaluación:{' '}
              <strong>no necesita pagar de nuevo.</strong>
            </p>
          ) : pago?.estado === 'sin_enlace' ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900">
              El enlace para pagar el estudio no se generó automáticamente. {quien} puede generarlo: pídaselo
              y le llegará por correo y WhatsApp. No tiene que volver a autorizar.
            </p>
          ) : esperaAgotada ? (
            <p className="text-sm text-gray-600">
              Su enlace de pago está tardando más de lo normal. Le llegará por correo y WhatsApp; también
              puede recargar esta página en unos minutos.
            </p>
          ) : (
            <p className="inline-flex items-center gap-2 text-sm text-gray-500">
              <IconLoader size={16} className="shrink-0 animate-spin" />
              Estamos preparando su enlace de pago{pago?.monto_formateado ? ` de ${pago.monto_formateado}` : ''}…
            </p>
          )}
        </div>
      ) : null}
      {/* Qué sigue. El resultado se promete solo por correo, igual que en
          /pago/resultado: el correo sale con todos los resultados; el
          WhatsApp solo con algunos (no con la revisión manual) y si hay celular. */}
      <div className="mx-auto mt-6 max-w-md text-left">
        <p className="text-sm font-semibold text-gray-900">Qué sigue</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-gray-600">
          {pagoRequerido && pago?.payment_link_url && <li>Pague el estudio con el botón de arriba.</li>}
          <li>
            {pagoRequerido && pago?.estado !== 'completado'
              ? 'Apenas el estudio esté pagado, consultamos su información en las centrales de riesgo. Suele tardar unos minutos.'
              : 'Ahora consultamos su información en las centrales de riesgo. Suele tardar unos minutos.'}
          </li>
          <li>
            Le avisamos el resultado por correo. Si su caso necesita la revisión de una persona de nuestro equipo, puede
            tardar un poco más.
          </li>
          <li>
            {sinInmueble
              ? 'Si se aprueba, le decimos hasta qué canon puede arrendar.'
              : `Si se aprueba, ${enMedioDeFrase(quien)} prepara el contrato y le llega el enlace para firmarlo.`}
          </li>
        </ol>
        <p className="mt-3 text-sm text-gray-500">Puede cerrar esta página.</p>
      </div>
      <p className="mt-6 text-xs text-gray-500">
        Su autorización quedó registrada con firma electrónica (Ley 527/1999). Si quiere revocarla, escríbanos a{' '}
        <a href={`mailto:${CONTACTO_COFIANZA.email}`} className="font-medium text-primary-700 underline">
          {CONTACTO_COFIANZA.email}
        </a>
        .
      </p>
      {/* El SHA-256 completo a la vista se leía como un error de la
          página. Sigue disponible (es su soporte legal), pero plegado. */}
      {hashDocumento && (
        <details className="mx-auto mt-2 max-w-md text-left">
          <summary className="cursor-pointer text-xs text-gray-500">Ver código de verificación</summary>
          <p className="mt-2 break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-[11px] text-gray-500">
            {hashDocumento}
          </p>
        </details>
      )}
    </div>
  )
}
