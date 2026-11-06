/**
 * MotivosRevision — por qué una evaluación quedó en revisión, como lista.
 *
 * Los motivos vienen de `observaciones` (partirObservaciones en textoVisible):
 * una viñeta por motivo y, aparte y en tono secundario, el resumen de la
 * central («Datos de la central: …»), que no es un motivo. Hereda el color del
 * texto de la tarjeta (TarjetaSiguientePaso) para no poner gris sobre el ámbar.
 */

import { useId } from 'react'

interface GrupoMotivos {
  /** «Coarrendatario»: se muestra como «Coarrendatario:» encima de su lista. */
  etiqueta: string
  motivos: string[]
}

interface MotivosRevisionProps {
  titulo: string
  motivos: string[]
  /** Resumen de la central (sin el aviso de revisión). Vacío: no se muestra. */
  datos?: string
  /** Motivos de otra persona del estudio (el coarrendatario), agrupados. */
  grupos?: GrupoMotivos[]
  /**
   * Sin ningún motivo escrito (formato viejo, solo el aviso, la condición ya
   * vencida): lo que se dice tras el título. Nunca queda solo la línea de datos.
   */
  sinMotivos?: string
}

export function MotivosRevision({ titulo, motivos, datos, grupos = [], sinMotivos = 'lo decide un analista de Cofianza.' }: MotivosRevisionProps) {
  const id = useId()
  const conGrupos = grupos.filter((g) => g.motivos.length > 0)
  const conMotivos = motivos.length > 0 || conGrupos.length > 0
  return (
    <div>
      {!conMotivos && (
        <p>
          <span className="font-semibold">{titulo}</span> {sinMotivos}
        </p>
      )}
      {conMotivos && (
        <>
          <p id={id} className="font-semibold">
            {titulo}
          </p>
          {motivos.length > 0 && <Lista motivos={motivos} etiquetadoPor={id} />}
          {conGrupos.map((g) => (
            <div key={g.etiqueta} className="mt-2">
              <p id={`${id}-${g.etiqueta}`} className="font-medium">
                {g.etiqueta}:
              </p>
              <Lista motivos={g.motivos} etiquetadoPor={`${id} ${id}-${g.etiqueta}`} />
            </div>
          ))}
        </>
      )}
      {datos && (
        <p className="mt-1.5 text-xs leading-relaxed opacity-90">
          <span className="font-medium">Datos de la central:</span> {datos}
        </p>
      )}
    </div>
  )
}

function Lista({ motivos, etiquetadoPor }: { motivos: string[]; etiquetadoPor: string }) {
  return (
    <ul aria-labelledby={etiquetadoPor} className="mt-1 list-disc space-y-1 pl-5 marker:text-amber-700">
      {motivos.map((m) => (
        <li key={m} className="pl-0.5">
          {m}
        </li>
      ))}
    </ul>
  )
}
