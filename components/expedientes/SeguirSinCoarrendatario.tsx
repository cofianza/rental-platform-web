/**
 * «Seguir sin el segundo firmante» (reporte de Gerencia, 21-nov, punto 3; Adenda 5 §12): con el titular
 * aprobado no se le pide segundo firmante, así que el invitado que no responde no puede
 * frenar el contrato. Cancela la invitación pendiente (la misma acción que «Cancelar invitación» de la
 * tarjeta del coarrendatario) y el contrato se crea solo con el titular.
 *
 * Bloque 4 (`caso: 'en_curso'`): lo mismo cuando la persona ya aceptó y su evaluación sigue en curso, o
 * Cofianza la está verificando: el mismo botón la saca del estudio. La API es la puerta en los dos casos:
 * decide si la persona puede salir y solo se lo permite a quien gestiona el estudio.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconUserX } from '@/components/icons'
import { coarrendatarioService } from '@/services/coarrendatarioService'

/**
 * Los textos de cada caso: la invitación sin responder, o la persona que ya aceptó (en evaluación o en
 * verificación). Un solo nombre, el del estado («Aprobado · segundo firmante…»): «segundo firmante», también
 * en el botón y en el diálogo.
 */
export const TEXTOS_SEGUIR_SIN = {
  invitacion: {
    boton: 'Seguir sin el segundo firmante',
    titulo: '¿Seguir sin el segundo firmante?',
    mensaje: 'Se cancela la invitación y el contrato se crea solo con el titular. El segundo firmante ya no podrá aceptarla.',
    hecho: 'Invitación cancelada. El contrato se hará solo con el titular.',
    error: 'No se pudo cancelar la invitación.',
  },
  en_curso: {
    boton: 'Seguir sin el segundo firmante',
    titulo: '¿Seguir sin el segundo firmante?',
    mensaje: 'El segundo firmante sale del estudio y su evaluación ya no cuenta. El contrato se crea solo con el titular; si el estudio se había aprobado contando con esa persona, se decide de nuevo sin ella.',
    hecho: 'El segundo firmante salió del estudio. El contrato se hará solo con el titular.',
    error: 'No se pudo retirar al segundo firmante.',
  },
} as const

/** La aprobación contaba con quien salió: la API decidió el estudio de nuevo y ya no está aprobado. */
export const TEXTO_SALIO_Y_YA_NO_APROBADO =
  'El segundo firmante salió del estudio. Sin esa persona el estudio ya no queda aprobado: revise en el estudio cómo continúa.'

interface Props {
  expedienteId: string
  /** 'invitacion' (por defecto): aún no responde. 'en_curso': ya aceptó, y su evaluación sigue en curso o en verificación. */
  caso?: keyof typeof TEXTOS_SEGUIR_SIN
  /** traba_contrato.aviso_prima (estudios anteriores a la Adenda 5): lo que cambia en la prima sin él. Lo redacta la API. */
  avisoPrima?: string | null
  /** Tras cancelar: recarga el estudio (o el asistente) para que el freno desaparezca. */
  onCambio?: () => void
}

export function SeguirSinCoarrendatario({ expedienteId, caso = 'invitacion', avisoPrima, onCambio }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const t = TEXTOS_SEGUIR_SIN[caso]

  const confirmar = async () => {
    setCancelando(true)
    try {
      const res = await coarrendatarioService.seguirSinEl(expedienteId)
      if (res?.expediente_estado === 'condicionado') toast.warning(TEXTO_SALIO_Y_YA_NO_APROBADO)
      else toast.success(t.hecho)
      onCambio?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.error)
    } finally {
      setCancelando(false)
    }
  }

  return (
    <>
      <Button tamano="sm" variante="secondary" className="min-h-10" onClick={() => setAbierto(true)} disabled={cancelando}>
        <IconUserX size={14} />
        {t.boton}
      </Button>
      <ConfirmDialog
        isOpen={abierto}
        onClose={() => setAbierto(false)}
        onConfirm={confirmar}
        title={t.titulo}
        message={
          <div className="space-y-2">
            <p>{t.mensaje}</p>
            {avisoPrima && <p>{avisoPrima}</p>}
          </div>
        }
        confirmLabel={t.boton}
        cancelLabel="Volver"
        isLoading={cancelando}
      />
    </>
  )
}
