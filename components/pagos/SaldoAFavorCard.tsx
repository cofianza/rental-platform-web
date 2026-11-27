/**
 * SaldoAFavorCard — el saldo a favor de la inmobiliaria o del propietario
 * (Adenda 6 §6 y 6.1 §6): lo pagado por anticipado que no se llegó a consultar.
 * Se descuenta solo del siguiente pago; al propietario (persona natural) se le
 * devuelve si lo pide; a la inmobiliaria nunca en dinero. Sin el interruptor de
 * la API, o sin saldo ni movimientos, no se muestra nada.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IconChevronDown, IconWallet } from '@/components/icons'
import { useSaldoAFavorPropio } from '@/hooks/useSaldoAFavor'
import { movimientoSuma } from '@/services/saldoAFavorService'
import { CONTACTO_COFIANZA, formatCurrency, formatDate } from '@/lib/constants'
import { cn, formatNumeroEstudio } from '@/lib/utils'

/** Movimientos visibles sin desplegar. */
const VISIBLES = 3

export function SaldoAFavorCard({ className }: { className?: string }) {
  const { saldo } = useSaldoAFavorPropio()
  const [verTodos, setVerTodos] = useState(false)

  if (!saldo?.habilitado || (saldo.saldo_cop <= 0 && saldo.movimientos.length === 0)) return null

  const movimientos = verTodos ? saldo.movimientos : saldo.movimientos.slice(0, VISIBLES)
  const whatsapp = `https://wa.me/${CONTACTO_COFIANZA.whatsapp}`

  return (
    <section aria-labelledby="saldo-a-favor-titulo" className={cn('rounded-lg border border-gray-200 bg-white p-4 sm:p-5', className)}>
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700" aria-hidden="true">
          <IconWallet size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="saldo-a-favor-titulo" className="text-sm font-semibold text-gray-900">
            Saldo a favor
          </h3>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-gray-900">{formatCurrency(saldo.saldo_cop)}</p>
          <p className="mt-1 text-xs text-gray-600">
            {saldo.puede_pedir_devolucion ? (
              <>
                Se descuenta automáticamente de su siguiente pago de un estudio o una consulta adicional. Si prefiere que se lo
                devolvamos, escríbanos a{' '}
                <a href={`mailto:${CONTACTO_COFIANZA.email}`} className="font-medium text-primary-700 hover:underline">
                  {CONTACTO_COFIANZA.email}
                </a>{' '}
                o por{' '}
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-700 hover:underline">
                  WhatsApp
                  <span className="sr-only"> (se abre en una pestaña nueva)</span>
                </a>
                : se lo devolvemos dentro de los 15 días hábiles siguientes a su solicitud.
              </>
            ) : (
              'Se descuenta automáticamente del siguiente cobro a nombre de su inmobiliaria, como una consulta adicional. No se devuelve en dinero.'
            )}
          </p>
        </div>
      </div>

      {saldo.movimientos.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500">Movimientos</h4>
          <ul className="mt-2 divide-y divide-gray-100">
            {movimientos.map((m) => {
              const suma = movimientoSuma(m.tipo)
              return (
                <li key={m.id} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 break-words">{m.descripcion}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDate(m.created_at)}
                      {m.expediente && (
                        <>
                          {' · '}
                          <Link href={`/expedientes/${m.expediente.id}`} className="font-mono text-primary-700 hover:underline">
                            {formatNumeroEstudio(m.expediente.numero)}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <span className={cn('shrink-0 text-sm font-semibold tabular-nums', suma ? 'text-primary-700' : 'text-gray-700')}>
                    {suma ? '+' : '−'}
                    {formatCurrency(m.monto_cop)}
                  </span>
                </li>
              )
            })}
          </ul>
          {saldo.movimientos.length > VISIBLES && (
            <button
              type="button"
              onClick={() => setVerTodos((v) => !v)}
              aria-expanded={verTodos}
              className="mt-1 inline-flex min-h-10 items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-800"
            >
              <IconChevronDown size={14} className={cn('transition-transform', verTodos && 'rotate-180')} aria-hidden="true" />
              {verTodos ? 'Ver menos' : `Ver los ${saldo.movimientos.length} movimientos`}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
