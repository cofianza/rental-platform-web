/**
 * Evaluación vencida (o sin canon evaluado): la nueva se hace en un ESTUDIO
 * NUEVO. Un estudio admite un solo pago de evaluación (índice
 * uq_pagos_estudio_activo) y su máquina de estados no vuelve de `aprobado` a
 * evaluación; además, mientras este siga activo el API no deja crear otro para
 * la misma persona e inmueble (idx_expediente_activo_solicitante_inmueble).
 * Por eso: se cancela este (con su borrador de contrato, que libera el
 * inmueble) y se abre el asistente de estudio nuevo con el mismo inmueble y
 * arrendatario.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconArrowRight } from '@/components/icons'
import { expedienteService } from '@/services/expedienteService'

// Lo ven también el arrendatario y el dueño (motivo de la cancelación): neutro.
const MOTIVO = 'La evaluación crediticia ya no está vigente para el contrato: se evalúa de nuevo en un estudio nuevo.'

interface Props {
  expedienteId: string
  /** Hay un borrador de contrato: también se cancela (y se libera el inmueble). */
  conBorrador?: boolean
}

export function EvaluarEnEstudioNuevo({ expedienteId, conBorrador }: Props) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)

  const confirmar = async () => {
    try {
      const exp = await expedienteService.ejecutarTransicion(expedienteId, {
        estado_destino: 'cerrado',
        etiqueta: 'Cancelar estudio',
        comentario: MOTIVO,
      })
      toast.success('Estudio cancelado. Crea el estudio nuevo.')
      router.push(`/expedientes/nuevo?inmueble_id=${exp.inmueble_id}&solicitante_id=${exp.solicitante_id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cancelar el estudio.')
    }
  }

  return (
    <>
      <Button tamano="sm" onClick={() => setAbierto(true)}>
        Crear estudio nuevo <IconArrowRight size={14} />
      </Button>
      <ConfirmDialog
        isOpen={abierto}
        onClose={() => setAbierto(false)}
        onConfirm={confirmar}
        title="¿Evaluar de nuevo en un estudio nuevo?"
        message={
          <div className="space-y-2">
            <p>La evaluación nueva va en un estudio nuevo y se cobra como cualquier estudio. Al continuar:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Este estudio se cancela y queda en el historial.</li>
              {conBorrador && (
                <li>El borrador del contrato también se cancela y el inmueble se libera. Lo que llenaste no pasa al estudio nuevo.</li>
              )}
              <li>Se abre el estudio nuevo con el mismo inmueble y el mismo arrendatario.</li>
            </ul>
          </div>
        }
        confirmLabel="Cancelar este y crear el nuevo"
        cancelLabel="Volver"
      />
    </>
  )
}
