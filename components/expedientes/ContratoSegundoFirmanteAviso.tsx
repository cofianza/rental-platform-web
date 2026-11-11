/**
 * El contrato anterior (el del propietario directo) no incluye al segundo
 * firmante: en vez de «Generar contrato», el canal para que Cofianza lo genere.
 */

import { IconInfo } from '@/components/icons'
import { CanalCofianza } from './ContactoCofianzaInline'

/** Errores de la API al generar el contrato anterior que se resuelven escribiendo a Cofianza. */
export const CODIGOS_CONTRATO_POR_COFIANZA = ['CONTRATO_REQUIERE_COARRENDATARIO', 'CONTRATO_REQUIERE_TITULAR']

const TEXTO_SEGUNDO_FIRMANTE = 'Este estudio tiene segundo firmante y el contrato para propietarios todavía no lo incluye.'

interface Props {
  titulo?: string
  /** Otro motivo de la API (p. ej. CONTRATO_REQUIERE_TITULAR); sin él, el del segundo firmante. */
  mensaje?: string
}

export function ContratoSegundoFirmanteAviso({ titulo, mensaje }: Props) {
  // El «Escríbanos…» de la API se reemplaza por el canal con enlaces.
  const motivo = mensaje ? mensaje.replace(/\s*Escr[ií]banos[^.]*\.?\s*$/, '').trim() : TEXTO_SEGUNDO_FIRMANTE
  return (
    <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      <div className="flex items-start gap-3">
        <IconInfo size={18} className="mt-0.5 shrink-0 text-blue-600" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          {titulo && <p className="font-semibold">{titulo}</p>}
          <p>
            {motivo} Escríbanos <CanalCofianza className="font-semibold text-blue-800 underline" /> y lo generamos nosotros.
          </p>
        </div>
      </div>
    </div>
  )
}
