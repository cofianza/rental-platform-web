'use client'

/**
 * Adenda 5 §19: una mora no financiera quedó sin su saldo porque TransUnion no
 * respondió (o no se pudo consultar). Un analista de Cofianza reintenta la
 * consulta desde aquí. Solo administrador y operador analista: la API manda
 * `reintento_saldo_transunion` solo a ellos y solo cuando hay algo que
 * reintentar; con `aplica: false` se dice por qué todavía no.
 */

import { useId, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconAlertTriangle, IconLoader, IconRefresh } from '@/components/icons'
import { useReintentoSaldoTransUnion } from '@/hooks/useReintentoSaldoTransUnion'
import type { DestinoReintentoSaldo, IReintentoSaldoTransUnion } from '@/types/estudio'

/** Dónde faltó el saldo. */
const DONDE: Record<DestinoReintentoSaldo, string> = {
  decision: 'Al decidir esta evaluación',
  apelacion: 'En la consulta de esta apelación',
  reconsulta: 'En la consulta adicional por canon mayor',
}

/** Para qué queda el dato: el reintento no cambia el resultado del estudio. */
const PARA_QUE: Record<DestinoReintentoSaldo, string> = {
  decision:
    'No cambia el resultado del estudio: el dato queda guardado para la apelación, si la persona apela a tiempo, y para las evaluaciones que se hagan después con este reporte.',
  apelacion: 'No cambia el resultado del estudio: el dato queda guardado para responder esta apelación.',
  reconsulta: 'No cambia el resultado del estudio: el dato queda guardado para evaluar el canon mayor en los próximos cambios de inmueble.',
}

const BOTON =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto'

export function ReintentoSaldoTransUnion({
  estudioId,
  reintento,
  onHecho,
}: {
  estudioId: string
  reintento: IReintentoSaldoTransUnion
  /** Recarga el detalle (con o sin éxito): el botón refleja lo que diga la API. */
  onHecho: () => Promise<unknown> | void
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [actualizando, setActualizando] = useState(false)
  const tituloId = useId()
  const { reintentar, reintentando, ultimoError } = useReintentoSaldoTransUnion(estudioId, onHecho)

  const actualizar = async () => {
    setActualizando(true)
    try {
      await onHecho()
    } finally {
      setActualizando(false)
    }
  }

  return (
    <section aria-labelledby={tituloId} className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <h3 id={tituloId} className="flex items-start gap-2 text-sm font-semibold text-amber-900">
        <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
        Falta el saldo en mora de TransUnion
      </h3>
      <p className="text-sm text-amber-800">
        {DONDE[reintento.destino]}, una mora no financiera quedó sin su saldo porque TransUnion no respondió o no se pudo
        consultar.{reintento.aplica && ' Puede reintentar la consulta sin cobro al cliente.'}
      </p>
      {reintento.aplica ? (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          disabled={reintentando}
          aria-busy={reintentando}
          className={BOTON}
        >
          {reintentando ? <IconLoader size={16} className="animate-spin" /> : <IconRefresh size={16} />}
          {reintentando ? 'Consultando TransUnion…' : 'Reintentar consulta de TransUnion'}
        </button>
      ) : (
        <>
          {reintento.motivo && (
            <p role="status" className="text-sm font-medium text-amber-900">
              {reintento.motivo}
            </p>
          )}
          <button type="button" onClick={() => void actualizar()} disabled={actualizando} aria-busy={actualizando} className={BOTON}>
            {actualizando ? <IconLoader size={16} className="animate-spin" /> : <IconRefresh size={16} />}
            Actualizar
          </button>
        </>
      )}
      {ultimoError && (
        <p role="alert" className="text-sm text-red-700">
          {ultimoError}
        </p>
      )}
      <ConfirmDialog
        isOpen={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={reintentar}
        title="Reintentar la consulta de TransUnion"
        confirmLabel="Reintentar consulta"
        isLoading={reintentando}
        message={
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Se hace una consulta nueva a TransUnion, solo por el saldo en mora.</li>
            <li>La paga Cofianza: al cliente no se le cobra nada. Cada intento es una consulta.</li>
            <li>{PARA_QUE[reintento.destino]}</li>
          </ul>
        }
      />
    </section>
  )
}
