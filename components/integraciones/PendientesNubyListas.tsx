/**
 * Integración nuby: lo que la copia dejó pendiente. Tres listas, cada una solo
 * si tiene elementos: códigos repetidos (el titular elige cuál inmueble es el
 * de nuby), inmuebles que no se trajeron (con el motivo) e inmuebles con
 * estudio o contrato donde nuby dice otra cosa. Las listas pueden llegar
 * recortadas: el total real viene aparte y se dice «y N más».
 */

'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { IconChevronRight, IconExternalLink } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  cuantosMas,
  etiquetaCampoDiferencia,
  etiquetaEstadoCandidato,
  textoMotivoNoTraido,
  textoYMas,
  valorDiferencia,
} from '@/lib/integracionNuby'
import type { CandidatoCodigoNuby, PendientesNuby, TotalesNuby } from '@/types/integracionNuby'

interface Props {
  pendientes: PendientesNuby
  totales: TotalesNuby
  /** Hay una acción o una copia en curso: no se ofrece vincular (la API responde 409 durante la copia). */
  ocupado: boolean
  onVincular: (codigo: string, candidato: CandidatoCodigoNuby) => Promise<void>
}

function Lista({
  titulo,
  total,
  descripcion,
  faltan,
  children,
}: {
  titulo: string
  total: number
  descripcion: string
  /** Elementos que la API no envió (lista recortada). */
  faltan: number
  children: React.ReactNode
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
        <h2 id={id} className="text-sm font-semibold text-gray-900">
          {titulo} <span className="font-normal text-gray-500">({total.toLocaleString('es-CO')})</span>
        </h2>
        <p className="mt-1 text-sm text-gray-600">{descripcion}</p>
      </div>
      <ul className="divide-y divide-gray-100">{children}</ul>
      {faltan > 0 && <p className="border-t border-gray-100 px-4 py-3 text-sm text-gray-500 sm:px-6">{textoYMas(faltan)}</p>}
    </section>
  )
}

export function PendientesNubyListas({ pendientes, totales, ocupado, onVincular }: Props) {
  const [eleccion, setEleccion] = useState<{ codigo: string; candidato: CandidatoCodigoNuby } | null>(null)
  const { codigo_repetido: repetidos, no_traidos: noTraidos, con_diferencias: conDiferencias } = pendientes

  if (repetidos.length === 0 && noTraidos.length === 0 && conDiferencias.length === 0) return null

  return (
    <>
      {repetidos.length > 0 && (
        <Lista
          titulo="Códigos repetidos"
          total={Math.max(totales.codigo_repetido, repetidos.length)}
          descripcion="El mismo código está en más de un inmueble de Cofianza. Indique cuál es el de nuby; mientras tanto, ese inmueble queda sin vincular."
          faltan={cuantosMas(totales.codigo_repetido, repetidos.length)}
        >
          {repetidos.map((item) => (
            <li key={item.codigo} className="px-4 py-4 sm:px-6">
              <p className="text-sm font-medium text-gray-900">
                Código <span className="break-all font-mono">{item.codigo}</span>
              </p>
              {(item.titulo || item.direccion) && (
                <p className="mt-0.5 break-words text-xs text-gray-500">
                  En nuby: {[item.titulo, item.direccion].filter(Boolean).join(' · ')}
                </p>
              )}
              {item.candidatos.length === 0 ? (
                <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  No quedan inmuebles sin vincular con este código. Revíselo con Cofianza.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {item.candidatos.map((candidato) => (
                    <li
                      key={candidato.inmueble_id}
                      className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <div className="min-w-0">
                        <p className="break-words text-sm text-gray-900">{candidato.direccion}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span>{candidato.ciudad}</span>
                          <Badge estado={candidato.estado} label={etiquetaEstadoCandidato(candidato.estado)} />
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        {/* En otra pestaña: se revisa el inmueble sin perder la lista. */}
                        <Link
                          href={`/inmuebles/${candidato.inmueble_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 items-center gap-1 self-start rounded text-sm font-medium text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:self-auto"
                        >
                          Ver inmueble
                          <span className="sr-only">
                            : {candidato.direccion}, {candidato.ciudad} (se abre en otra pestaña)
                          </span>
                          <IconExternalLink size={14} />
                        </Link>
                        <Button
                          variante="secondary"
                          disabled={ocupado}
                          onClick={() => setEleccion({ codigo: item.codigo, candidato })}
                          className="min-h-11 w-full sm:min-h-10 sm:w-auto"
                        >
                          Es este
                          <span className="sr-only">
                            : {candidato.direccion}, {candidato.ciudad}
                          </span>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </Lista>
      )}

      {noTraidos.length > 0 && (
        <Lista
          titulo="No se trajeron"
          total={Math.max(totales.no_traidos, noTraidos.length)}
          descripcion="Están en arriendo y «Activa» en nuby, pero no pudieron entrar a Cofianza. Cuando se corrija en nuby, el inmueble entra en una copia siguiente."
          faltan={cuantosMas(totales.no_traidos, noTraidos.length)}
        >
          {noTraidos.map((item, i) => (
            <li key={`${item.codigo}-${i}`} className="px-4 py-3 sm:px-6">
              <p className="break-words text-sm font-medium text-gray-900">
                <span className="break-all font-mono">{item.codigo || 'Sin código'}</span>
                {item.titulo && <span className="font-normal text-gray-700"> · {item.titulo}</span>}
              </p>
              <p className="mt-0.5 break-words text-sm text-gray-600">{textoMotivoNoTraido(item.motivo, item.detalle)}</p>
            </li>
          ))}
        </Lista>
      )}

      {conDiferencias.length > 0 && (
        <Lista
          titulo="Con diferencias"
          total={Math.max(totales.con_diferencias, conDiferencias.length)}
          descripcion="Tienen un estudio en curso o un contrato en Cofianza, así que la copia no los toca. En nuby figuran con otros datos."
          faltan={cuantosMas(totales.con_diferencias, conDiferencias.length)}
        >
          {conDiferencias.map((item) => (
            <li key={item.inmueble_id} className="px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <p className="min-w-0 break-words text-sm font-medium text-gray-900">
                  <span className="break-all font-mono">{item.codigo}</span>
                  {item.direccion && <span className="font-normal text-gray-700"> · {item.direccion}</span>}
                </p>
                <Link
                  href={`/inmuebles/${item.inmueble_id}`}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1 self-start rounded text-sm font-medium text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  Ver inmueble
                  <span className="sr-only"> {item.codigo}</span>
                  <IconChevronRight size={14} />
                </Link>
              </div>
              <dl className="mt-2 space-y-2">
                {item.diferencias.map((d) => (
                  <div key={d.campo} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <dt className="font-medium text-gray-900">{etiquetaCampoDiferencia(d.campo)}</dt>
                    <dd className="mt-0.5 grid grid-cols-1 gap-x-6 gap-y-0.5 text-gray-700 sm:grid-cols-2">
                      <span className="break-words">
                        En nuby: <span className="font-medium text-gray-900">{valorDiferencia(d.campo, d.en_nuby)}</span>
                      </span>
                      <span className="break-words">
                        En Cofianza: <span className="font-medium text-gray-900">{valorDiferencia(d.campo, d.en_cofianza)}</span>
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </Lista>
      )}

      <ConfirmDialog
        isOpen={!!eleccion}
        onClose={() => setEleccion(null)}
        onConfirm={async () => {
          if (eleccion) await onVincular(eleccion.codigo, eleccion.candidato)
        }}
        title="Vincular con nuby"
        message={
          eleccion ? (
            <div className="space-y-2">
              <p>
                El inmueble de <strong>{eleccion.candidato.direccion}</strong> ({eleccion.candidato.ciudad}) quedará
                vinculado con el código <strong className="break-all">{eleccion.codigo}</strong> de nuby.
              </p>
              <p>
                Desde la siguiente copia, sus datos y su estado se actualizarán con lo que diga nuby. Los demás
                inmuebles con ese código quedan sin vincular.
              </p>
              <p>Esta elección no se puede deshacer desde aquí.</p>
            </div>
          ) : (
            ''
          )
        }
        confirmLabel="Sí, es este"
      />
    </>
  )
}
