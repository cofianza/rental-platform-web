/**
 * BLQ §7: traza interna de la verificación de identidad. SOLO Cofianza: lleva
 * lo que digitó el prospecto en cada intento (la API niega la ruta a los
 * demás roles; el padre ni la monta). Se pide al desplegarla.
 */

'use client'

import { useState } from 'react'
import { IconLoader, IconShield } from '@/components/icons'
import { autorizacionService } from '@/services/autorizacionService'
import type { ITrazaAutorizacion } from '@/types/autorizacion'

const CIERRE: Record<string, string> = {
  intentos: 'Bloqueado por intentos',
  no_soy_yo: 'Cerrado por «no soy yo»',
  datos_incorrectos: 'Cerrado: «los datos están mal»',
  reemplazado: 'Reemplazado por un reenvío',
  correccion: 'Cerrado por corrección del documento',
  vencido: 'Vencido por tiempo',
}

const FUENTE: Record<string, string> = {
  documento_fisico: 'Documento físico',
  copia_documento: 'Copia del documento',
  confirmacion_telefonica: 'Confirmación telefónica',
}

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export function TrazaAutorizacion({ expedienteId }: { expedienteId: string }) {
  const [abierta, setAbierta] = useState(false)
  const [traza, setTraza] = useState<ITrazaAutorizacion | null>(null)
  const [error, setError] = useState(false)

  const cargar = () => {
    setError(false)
    autorizacionService.getTraza(expedienteId).then(setTraza).catch(() => setError(true))
  }

  const alternar = () => {
    const abrir = !abierta
    setAbierta(abrir)
    if (abrir) cargar()
  }

  return (
    <div className="mt-4 border border-gray-200 rounded-lg">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={abierta}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span className="flex items-center gap-2">
          <IconShield size={14} /> Traza de la verificación (solo Cofianza)
        </span>
        <span className="text-xs text-gray-500">{abierta ? 'Ocultar' : 'Ver'}</span>
      </button>
      {abierta && (
        <div className="space-y-4 px-4 pb-4 text-xs">
          {error ? (
            <p className="text-red-700">
              No pudimos cargar la traza.{' '}
              <button type="button" onClick={cargar} className="font-semibold underline">
                Reintentar
              </button>
            </p>
          ) : !traza ? (
            <p className="flex items-center gap-2 text-gray-500">
              <IconLoader size={14} className="animate-spin" /> Cargando…
            </p>
          ) : (
            <>
              <section>
                <p className="mb-1 font-semibold text-gray-700">Enlaces enviados</p>
                {traza.enlaces.length === 0 ? (
                  <p className="text-gray-500">Sin enlaces.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {traza.enlaces.map((e) => (
                      <li key={e.autorizacion_id} className="rounded border border-gray-100 p-2">
                        <p className="text-gray-800">
                          {fecha(e.creado_en)} · {e.es_reenvio ? 'Reenvío' : 'Primer envío'} · {e.estado}
                          {e.motivo_cierre && ` · ${CIERRE[e.motivo_cierre] ?? e.motivo_cierre} (${fecha(e.cerrado_en)})`}
                        </p>
                        {e.envios.map((c, i) => (
                          <p key={i} className="text-gray-500">
                            {c.canal}: {c.destino_enmascarado ?? '—'} · {c.estado}
                            {c.error && ` · ${c.error}`}
                          </p>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <p className="mb-1 font-semibold text-gray-700">Intentos del prospecto</p>
                {traza.intentos.length === 0 ? (
                  <p className="text-gray-500">Sin intentos.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                      <thead className="text-gray-500">
                        <tr>
                          <th className="pr-3 font-medium">Fecha</th>
                          <th className="pr-3 font-medium">Digitado</th>
                          <th className="pr-3 font-medium">Resultado</th>
                          <th className="pr-3 font-medium">Paso</th>
                          <th className="pr-3 font-medium">IP</th>
                          <th className="font-medium">Dispositivo</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-800">
                        {traza.intentos.map((t, i) => (
                          <tr key={i} className="align-top">
                            <td className="pr-3 whitespace-nowrap">{fecha(t.created_at)}</td>
                            <td className="pr-3 font-mono">{t.valor_digitado}</td>
                            <td className={t.coincide ? 'pr-3 text-green-700' : 'pr-3 text-red-700'}>
                              {t.coincide ? 'Coincide' : 'No coincide'}
                            </td>
                            <td className="pr-3">{t.origen === 'firma' ? 'Firma' : 'Confirmación'}</td>
                            <td className="pr-3 font-mono">{t.ip ?? '—'}</td>
                            <td className="max-w-[16rem] break-all text-gray-500">{t.user_agent ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
              <section>
                <p className="mb-1 font-semibold text-gray-700">Correcciones del documento</p>
                {traza.correcciones.length === 0 ? (
                  <p className="text-gray-500">Sin correcciones.</p>
                ) : (
                  <ul className="space-y-1">
                    {traza.correcciones.map((c, i) => (
                      <li key={i} className="text-gray-800">
                        {fecha(c.created_at)} · {(c.tipo_anterior ?? '').toUpperCase()} {c.numero_anterior ?? '—'} →{' '}
                        {c.tipo_nuevo.toUpperCase()} {c.numero_nuevo} · {FUENTE[c.fuente_verificacion] ?? c.fuente_verificacion}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <p className="mb-1 font-semibold text-gray-700">Cupo</p>
                {traza.cupo.length === 0 ? (
                  <p className="text-gray-500">Sin movimientos de cupo.</p>
                ) : (
                  <ul className="space-y-1">
                    {traza.cupo.map((m, i) => (
                      <li key={i} className="text-gray-800">
                        {fecha(m.created_at)} · {m.tipo}
                        {m.notas && ` · ${m.notas}`}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </div>
  )
}
