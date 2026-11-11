/**
 * El contrato de propietarios (flujo anterior) no se puede hacer en este estudio
 * (coarrendatario vinculado, o el titular de la decisión no es el solicitante):
 * en vez de «Generar contrato», por qué no y cómo seguir.
 *
 * Decisiones del 11-nov: a la inmobiliaria y al propietario, «Escríbanos … y le
 * indicamos cómo continuar» (nunca «lo generamos nosotros», D1); a Cofianza,
 * sin «Escríbanos»: se gestiona fuera de la plataforma (D4).
 */

'use client'

import { IconInfo } from '@/components/icons'
import { useUsuarioVista } from './VerComo'
import { esRolInterno } from './textoVisible'
import { CanalCofianza } from './ContactoCofianzaInline'

/** Errores de la API al generar el contrato anterior que no se resuelven en la plataforma. */
export const CODIGOS_CONTRATO_POR_COFIANZA = ['CONTRATO_REQUIERE_COARRENDATARIO', 'CONTRATO_REQUIERE_TITULAR']

const TEXTO_COARRENDATARIO = 'Este estudio tiene coarrendatario y el contrato para propietarios todavía no lo incluye.'
const TEXTO_INTERNO_COARRENDATARIO =
  'Este estudio tiene coarrendatario y el contrato para propietarios todavía no lo incluye; se gestiona fuera de la plataforma.'

/** El «Escríbanos …» de la API (hasta el final) se reemplaza por el canal con enlaces o, para Cofianza, se quita. */
export const sinEscribanos = (mensaje: string) => mensaje.replace(/\s*Escr[ií]banos[\s\S]*$/, '').trim()

interface Props {
  titulo?: string
  /** El código de la API (contrato_anterior_bloqueado o el error al generar). */
  codigo?: string
  /** El motivo de la API; vacío o ausente = el texto del coarrendatario. */
  mensaje?: string
}

export function ContratoSegundoFirmanteAviso({ titulo, codigo = 'CONTRATO_REQUIERE_COARRENDATARIO', mensaje }: Props) {
  const interno = esRolInterno(useUsuarioVista()?.rol)
  const motivo = (mensaje && sinEscribanos(mensaje)) || TEXTO_COARRENDATARIO
  return (
    <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      <div className="flex items-start gap-3">
        <IconInfo size={18} className="mt-0.5 shrink-0 text-blue-600" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          {titulo && <p className="font-semibold">{titulo}</p>}
          {interno ? (
            <p>
              {codigo === 'CONTRATO_REQUIERE_COARRENDATARIO'
                ? TEXTO_INTERNO_COARRENDATARIO
                : `${motivo.replace(/\.?$/, '.')} Se gestiona fuera de la plataforma.`}
            </p>
          ) : (
            <p>
              {motivo} Escríbanos <CanalCofianza className="font-semibold text-blue-800 underline" /> y le indicamos cómo
              continuar.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
