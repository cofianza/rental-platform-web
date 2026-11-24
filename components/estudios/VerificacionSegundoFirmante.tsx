'use client'

/**
 * El segundo firmante es válido pero quedó «en verificación»: Auco no respondió
 * la consulta de listas restrictivas a tiempo, o sus antecedentes piden
 * revisión. Mientras tanto el estudio no se decide con las dos personas. Un
 * analista de Cofianza lo da por verificado (con la constancia de cómo lo
 * revisó) o le pide otra vez la consulta a Auco. Solo administrador y operador
 * analista: la API manda `verificacion_segundo_firmante` solo a ellos y solo
 * cuando hay algo que resolver.
 */

import { useId, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconAlertTriangle, IconClock, IconLoader, IconRefresh, IconShieldCheck } from '@/components/icons'
import { formatDateTime } from '@/lib/constants'
import { efectoVerificacionSegundo, fraseResultadoLimpio } from '@/lib/personaEstudio'
import { useVerificacionSegundoFirmante } from '@/hooks/useVerificacionSegundoFirmante'
import type { IVerificacionSegundoFirmante } from '@/types/estudio'

const MIN_NOTA = 10

/** Ancla de la verificación en el Resumen del estudio: destino de «Ir a la verificación» de la franja del turno. */
export const ID_VERIFICACION_SEGUNDO = 'verificacion-segundo-firmante'

const BOTON =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto'

export function VerificacionSegundoFirmante({
  estudioId,
  verificacion,
  onHecho,
  estudioAprobado = false,
}: {
  estudioId: string
  verificacion: IVerificacionSegundoFirmante
  /** Recarga el detalle (con o sin éxito): los botones reflejan lo que diga la API. */
  onHecho: () => Promise<unknown> | void
  /** El estudio ya está aprobado: verificarla la vincula al contrato (no «decide» el estudio con las dos personas). */
  estudioAprobado?: boolean
}) {
  const [dialogo, setDialogo] = useState<'resolver' | 'reintentar' | null>(null)
  const [nota, setNota] = useState('')
  const [actualizando, setActualizando] = useState(false)
  const tituloId = useId()
  const notaId = useId()
  const ayudaNotaId = useId()
  const { darPorVerificado, reintentar, enviando, ultimoError } = useVerificacionSegundoFirmante(estudioId, {
    seResuelveSolo: verificacion.se_resuelve_solo,
    estudioAprobado,
    alTerminar: onHecho,
  })
  // El sistema reintenta solo: se avisa antes de que el analista pida (y Cofianza pague) una consulta de más.
  // El texto lo redacta la API, y solo lo manda mientras queden intentos.
  const avisoAutomatico = verificacion.reintento_automatico?.texto?.trim() || null
  const notaValida = nota.trim().length >= MIN_NOTA

  const confirmar = async () => {
    const ok = dialogo === 'resolver' ? await darPorVerificado(nota.trim()) : await reintentar()
    if (ok) setNota('')
    setDialogo(null)
  }

  const actualizar = async () => {
    setActualizando(true)
    try {
      await onHecho()
    } finally {
      setActualizando(false)
    }
  }

  // «Actualizar» cuando no hay qué hacer o cuando se espera la respuesta de Auco.
  const conActualizar = (!verificacion.puede_dar_por_verificado && !verificacion.puede_reintentar) || !!verificacion.reintento_pedido_en
  const alLlegar = verificacion.se_resuelve_solo
    ? fraseResultadoLimpio(estudioAprobado)
    : 'Cuando llegue el resultado, apruebe el estudio con «Aprobar estudio» y deje constancia de cómo la verificó.'

  return (
    <section aria-labelledby={tituloId} className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <h3 id={tituloId} className="flex items-start gap-2 text-sm font-semibold text-amber-900">
        <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
        Segundo firmante en verificación
      </h3>
      <p className="text-sm text-amber-800">
        {verificacion.pendiente} {verificacion.efecto}
      </p>
      {verificacion.reintento_pedido_en && (
        <p role="status" className="text-sm font-medium text-amber-900">
          El {formatDateTime(verificacion.reintento_pedido_en)} se le pidió de nuevo la consulta a Auco. {alLlegar}
        </p>
      )}
      {verificacion.motivo && (
        <p role="status" className="text-sm font-medium text-amber-900">
          {verificacion.motivo}
        </p>
      )}
      {avisoAutomatico && (
        <p className="flex items-start gap-2 text-sm text-amber-900">
          <IconClock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{avisoAutomatico}</span>
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {verificacion.puede_dar_por_verificado && (
          <button
            type="button"
            onClick={() => setDialogo('resolver')}
            disabled={enviando !== null}
            className={`${BOTON} border-amber-700 bg-amber-700 text-white hover:bg-amber-800`}
          >
            {enviando === 'resolver' ? <IconLoader size={16} className="animate-spin" /> : <IconShieldCheck size={16} />}
            Dar por verificado
          </button>
        )}
        {verificacion.puede_reintentar && (
          <button
            type="button"
            onClick={() => setDialogo('reintentar')}
            disabled={enviando !== null}
            aria-busy={enviando === 'reintentar'}
            className={`${BOTON} border-amber-400 bg-white text-amber-900 hover:bg-amber-100`}
          >
            {enviando === 'reintentar' ? <IconLoader size={16} className="animate-spin" /> : <IconRefresh size={16} />}
            {enviando === 'reintentar' ? 'Pidiendo la consulta a Auco…' : 'Reintentar consulta'}
          </button>
        )}
        {conActualizar && (
          <button
            type="button"
            onClick={() => void actualizar()}
            disabled={actualizando}
            aria-busy={actualizando}
            className={`${BOTON} border-amber-400 bg-white text-amber-900 hover:bg-amber-100`}
          >
            {actualizando ? <IconLoader size={16} className="animate-spin" /> : <IconRefresh size={16} />}
            Actualizar
          </button>
        )}
      </div>
      {ultimoError && (
        <p role="alert" className="text-sm text-red-700">
          {ultimoError}
        </p>
      )}
      <ConfirmDialog
        isOpen={dialogo !== null}
        onClose={() => setDialogo(null)}
        onConfirm={confirmar}
        title={dialogo === 'resolver' ? 'Dar por verificado al segundo firmante' : 'Reintentar la consulta en Auco'}
        confirmLabel={dialogo === 'resolver' ? 'Dar por verificado' : 'Reintentar consulta'}
        isLoading={enviando !== null}
        confirmDisabled={dialogo === 'resolver' && !notaValida}
        message={
          dialogo === 'resolver' ? (
            <div className="space-y-2">
              <p>
                Quedó pendiente: <span className="font-medium">{verificacion.pendiente}</span>
              </p>
              <p>
                Úselo cuando ya verificó eso por su cuenta. Para las listas restrictivas, por ejemplo, en la búsqueda de
                sanciones de OFAC y en la lista consolidada de la ONU, por nombre y número de documento. Con la constancia,{' '}
                {efectoVerificacionSegundo(estudioAprobado)}.
              </p>
              <label htmlFor={notaId} className="block text-xs font-medium text-gray-700">
                Qué fuentes consultó y qué encontró (queda en el registro)
              </label>
              <textarea
                id={notaId}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                maxLength={1000}
                rows={3}
                aria-describedby={ayudaNotaId}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <p id={ayudaNotaId} className="text-xs text-gray-500">
                Mínimo {MIN_NOTA} caracteres.
              </p>
            </div>
          ) : (
            <ul className="list-disc space-y-1.5 pl-5">
              {avisoAutomatico && <li className="font-medium text-gray-900">{avisoAutomatico}</li>}
              <li>Se le pide otra vez a Auco la consulta de antecedentes y listas restrictivas de esta persona. Pedirla puede tardar unos segundos.</li>
              <li>La paga Cofianza: al cliente no se le cobra nada ni se gasta un cupo.</li>
              <li>
                El resultado suele llegar en unos minutos y mientras tanto no se puede pedir otro. {alLlegar} Si trae algo, queda aquí
                para revisarlo.
              </li>
            </ul>
          )
        }
      />
    </section>
  )
}
