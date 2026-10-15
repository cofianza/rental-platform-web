/**
 * CobroTarifaContrato — plan cobro-tarifa-mensual: las tarjetas del cobro en la
 * ficha de un contrato que causa tarifa (V3 o migrado, firmado, con
 * inmobiliaria): el canon reajustado (B9) y la fecha efectiva de terminación
 * (A5). Los avisos de la API enlazan a /contratos/{id}, que muestra los
 * migrados y manda los V3 al asistente (EstadoFirma): por eso van en los dos.
 */

'use client'

import { RegistrarCanonReajustado } from '@/components/contratos/RegistrarCanonReajustado'
import { TerminacionEfectivaTarifa } from '@/components/contratos/TerminacionEfectivaTarifa'
import { useCobroDeContrato } from '@/hooks/useTarifaCobro'
import { hoyBogota } from '@/hooks/useContratoV3'
import { aniversarioPorConfirmar } from '@/lib/tarifaCobro'
import { useAuthStore } from '@/stores/auth.store'

export function CobroTarifaContrato({
  contratoId,
  estado,
  fechaInicio,
  causaTarifa,
  editable,
}: {
  contratoId: string
  estado: string
  /** AAAA-MM-DD. */
  fechaInicio: string | null | undefined
  /** V3 o migrado, ya firmado: los únicos que pueden causar tarifa mensual. */
  causaTarifa: boolean
  /** false para solo lectura (y perfil incompleto en el asistente). */
  editable: boolean
}) {
  const rol = useAuthStore((s) => s.user?.rol)
  const cofianza = rol === 'administrador' || rol === 'operador_analista'
  const pide =
    editable && causaTarifa && ['vigente', 'finalizado', 'cancelado'].includes(estado) && (cofianza || rol === 'inmobiliaria')
  const { cobro, recargar } = useCobroDeContrato(pide ? contratoId : null)
  // El propietario directo no tiene cobro de tarifa mensual.
  if (!cobro?.con_inmobiliaria) return null

  // B9: la inmobiliaria (no solo_lectura) o el administrador confirman el canon en los 30 días previos al aniversario.
  const aniversario =
    (rol === 'inmobiliaria' || rol === 'administrador') && estado === 'vigente' && fechaInicio
      ? aniversarioPorConfirmar(fechaInicio, hoyBogota())
      : null

  return (
    <>
      {aniversario && (
        <RegistrarCanonReajustado
          contratoId={contratoId}
          aniversario={aniversario}
          canonActual={cobro.canon_vigente}
          liquidacionActiva={cobro.liquidacion_activa}
        />
      )}
      {/* A5: Cofianza registra la fecha efectiva de terminación. */}
      {cofianza && (
        <TerminacionEfectivaTarifa
          contratoId={contratoId}
          actual={cobro.fecha_terminacion_efectiva}
          fechaInicio={fechaInicio}
          vigente={estado === 'vigente'}
          onRegistrada={recargar}
        />
      )}
    </>
  )
}
