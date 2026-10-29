/**
 * Coincidencia de un arrendatario en las listas restrictivas OFAC u ONU
 * (Adenda 1 §6). Un analista de Cofianza la confirma (el contrato no se migra
 * y se avisa a los administradores para el protocolo SAGRILAFT) o la descarta
 * como falso positivo, con motivo. La decisión no se deshace desde aquí.
 * Solo backoffice: nunca se le muestra a la inmobiliaria.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button, MotivoDialog } from '@/components/ui'
import { IconAlertTriangle, IconShield } from '@/components/icons'
import { migracionService } from '@/services/migracionService'
import type { CodigoLista, ListasFila } from '@/types/migracion'

const CORTO: Record<CodigoLista, string> = { ofac_sdn: 'OFAC SDN', ofac_consolidada: 'OFAC consolidada', onu: 'ONU' }

export function CoincidenciasListas({
  inmobiliariaId,
  persona,
  listas,
  onDecidida,
  consecuencia,
}: {
  inmobiliariaId: string
  persona: { documento: string | null; nombre: string; n_fila?: number }
  listas: ListasFila
  onDecidida: () => void
  /** Qué pasa con el contrato si se confirma. Por defecto, el de la carga: no se migra ni figura en el Acta. */
  consecuencia?: string
}) {
  const [dialogo, setDialogo] = useState<'confirmada' | 'descartada' | null>(null)
  const [guardando, setGuardando] = useState(false)

  if (listas.estado === 'confirmada')
    return (
      <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-red-700">
        <IconShield size={14} className="mt-0.5 shrink-0" />
        Coincidencia confirmada en listas restrictivas: el contrato no se migra y no figura en el Acta.
      </p>
    )
  if (listas.estado === 'descartada')
    return <p className="mt-1 text-xs text-ink-500">Coincidencia en listas restrictivas descartada por Cofianza (no es la misma persona).</p>
  if (listas.estado !== 'por_confirmar') return null

  const fila = persona.n_fila != null ? ` de la fila ${persona.n_fila}` : ''
  const efecto = consecuencia ?? `El contrato${fila} no se migra y no figura en el Acta.`

  const decidir = async (decision: 'confirmada' | 'descartada', motivo: string) => {
    setGuardando(true)
    try {
      await migracionService.decidirListas(inmobiliariaId, { ...persona, decision, motivo })
      toast.success(decision === 'confirmada' ? `Coincidencia confirmada. ${efecto} Se avisó a los administradores.` : 'Coincidencia descartada.')
      setDialogo(null)
      onDecidida()
    } catch (e) {
      toast.error((e instanceof Error && e.message) || 'No se pudo guardar la decisión.')
      return false
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
      <p className="flex items-center gap-1.5 font-semibold">
        <IconAlertTriangle size={14} className="shrink-0" /> Coincidencia en listas restrictivas por confirmar
      </p>
      <ul className="mt-1 space-y-0.5 pl-5">
        {listas.coincidencias.map((c) => (
          <li key={`${c.lista}|${c.ref}|${c.tipo}`}>
            {CORTO[c.lista]} · {c.nombre_lista} · {c.tipo === 'documento' ? 'mismo número de documento' : 'nombre igual o parecido'}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variante="danger" tamano="sm" disabled={guardando} onClick={() => setDialogo('confirmada')}>
          Confirmar coincidencia
        </Button>
        <Button variante="secondary" tamano="sm" disabled={guardando} onClick={() => setDialogo('descartada')}>
          Descartar (no es la misma persona)
        </Button>
      </div>

      <MotivoDialog
        isOpen={dialogo === 'confirmada'}
        onClose={() => setDialogo(null)}
        onConfirm={(motivo) => decidir('confirmada', motivo)}
        title="Confirmar la coincidencia"
        variant="danger"
        confirmLabel="Confirmar coincidencia"
        label="Motivo (queda en la bitácora)"
        minLength={10}
        isLoading={guardando}
        descripcion={`Confirme solo si es la misma persona. ${efecto} Se avisa a los administradores para activar el protocolo SAGRILAFT. La decisión no se puede deshacer.`}
      />
      <MotivoDialog
        isOpen={dialogo === 'descartada'}
        onClose={() => setDialogo(null)}
        onConfirm={(motivo) => decidir('descartada', motivo)}
        title="Descartar la coincidencia"
        confirmLabel="Descartar coincidencia"
        label="Motivo del descarte (obligatorio)"
        minLength={10}
        isLoading={guardando}
        descripcion="Descarte solo si comprobó que no es la misma persona (por ejemplo, otro documento, otra fecha de nacimiento u otra nacionalidad). El contrato sigue con la validación normal."
      />
    </div>
  )
}
