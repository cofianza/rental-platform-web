/**
 * «Seguir sin el coarrendatario» (reporte de Gerencia, 21-nov, punto 3; Adenda 5 §12): con el titular
 * aprobado no se le pide segundo firmante, así que el coarrendatario invitado que no responde no puede
 * frenar el contrato. Cancela la invitación pendiente (la misma acción que «Cancelar invitación» de la
 * tarjeta del coarrendatario) y el contrato se crea solo con el titular. La API es la puerta: solo
 * cancela una invitación sin aceptar y solo para quien gestiona el estudio.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconUserX } from '@/components/icons'
import { coarrendatarioService } from '@/services/coarrendatarioService'

interface Props {
  expedienteId: string
  /** traba_contrato.aviso_prima (estudios anteriores a la Adenda 5): lo que cambia en la prima sin él. Lo redacta la API. */
  avisoPrima?: string | null
  /** Tras cancelar: recarga el estudio (o el asistente) para que el freno desaparezca. */
  onCambio?: () => void
}

export function SeguirSinCoarrendatario({ expedienteId, avisoPrima, onCambio }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [cancelando, setCancelando] = useState(false)

  const confirmar = async () => {
    setCancelando(true)
    try {
      await coarrendatarioService.cancelar(expedienteId)
      toast.success('Invitación cancelada. El contrato se hará solo con el titular.')
      onCambio?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cancelar la invitación.')
    } finally {
      setCancelando(false)
    }
  }

  return (
    <>
      <Button tamano="sm" variante="secondary" className="min-h-10" onClick={() => setAbierto(true)} disabled={cancelando}>
        <IconUserX size={14} />
        Seguir sin el coarrendatario
      </Button>
      <ConfirmDialog
        isOpen={abierto}
        onClose={() => setAbierto(false)}
        onConfirm={confirmar}
        title="¿Seguir sin el coarrendatario?"
        message={
          <div className="space-y-2">
            <p>Se cancela la invitación y el contrato se crea solo con el titular. El coarrendatario ya no podrá aceptarla.</p>
            {avisoPrima && <p>{avisoPrima}</p>}
          </div>
        }
        confirmLabel="Seguir sin el coarrendatario"
        cancelLabel="Volver"
        isLoading={cancelando}
      />
    </>
  )
}
