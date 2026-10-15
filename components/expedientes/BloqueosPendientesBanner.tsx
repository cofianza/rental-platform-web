/**
 * BLQ §2.1 y §2.6: alerta prioritaria de la oficina virtual, fuera de la
 * campanita. Lista los estudios bloqueados por documento que nadie ha atendido;
 * desaparece cuando el gestor corrige el documento o reenvía el enlace (la API
 * los deja fuera), no cuando lee la notificación.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconAlertTriangle, IconArrowRight } from '@/components/icons'
import { autorizacionService } from '@/services/autorizacionService'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { useNotificationStore } from '@/stores/notification.store'
import type { IBloqueoPendiente } from '@/types/autorizacion'

/** AutorizacionSection lo dispara al corregir o reenviar. */
export const EVENTO_BLOQUEOS = 'cofianza:bloqueos-documento'

const VISIBLES = 3

export function BloqueosPendientesBanner() {
  const pathname = usePathname()
  const puedeEditar = usePuedeEditar()
  const [bloqueos, setBloqueos] = useState<IBloqueoPendiente[]>([])
  // Llega una alerta nueva por realtime → se vuelve a preguntar.
  const ultimaAlerta = useNotificationStore(
    (s) => s.items.find((n) => n.tipo === 'autorizacion.bloqueo_documento')?.id,
  )

  const cargar = useCallback(() => {
    // Sin la API del bloque 2 (o sin red) simplemente no hay banner.
    autorizacionService.getBloqueosPendientes().then(setBloqueos).catch(() => setBloqueos([]))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar, pathname, ultimaAlerta])

  useEffect(() => {
    window.addEventListener(EVENTO_BLOQUEOS, cargar)
    return () => window.removeEventListener(EVENTO_BLOQUEOS, cargar)
  }, [cargar])

  // Dentro de un estudio bloqueado, su propia tarjeta ya lo explica: el banner
  // solo habla de los demás.
  const otros = bloqueos.filter((b) => pathname !== `/expedientes/${b.expediente_id}`)
  if (otros.length === 0) return null
  const resto = otros.length - VISIBLES
  const quePaso = otros.every((b) => b.motivo === 'intentos')
    ? 'El número de documento que escribió el prospecto no coincide con el registrado.'
    : otros.every((b) => b.motivo === 'datos_incorrectos')
      ? 'El prospecto indicó que sus datos registrados no son correctos.'
      : 'El prospecto no pudo confirmar sus datos: el documento no coincide o indicó que sus datos están mal.'
  const queHacer = puedeEditar
    ? 'Verifique el documento del prospecto, corrija el dato si hace falta y reenvíe el enlace.'
    : 'Avísele al responsable del estudio para que verifique el documento y reenvíe el enlace.'

  return (
    <div role="status" className="mb-4 rounded-xl border-2 border-red-300 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <IconAlertTriangle size={20} className="mt-0.5 shrink-0 text-red-600" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-bold text-red-800">
            {/* Mismo nombre que la tarjeta del estudio. */}
            {otros.length === 1 ? 'Estudio bloqueado por documento' : `${otros.length} estudios bloqueados por documento`}
          </p>
          <p className="text-xs text-red-700">
            {quePaso} {queHacer} Este bloqueo no consume cupo ni genera cobros adicionales.
          </p>
          <ul className="space-y-1">
            {otros.slice(0, VISIBLES).map((b) => (
              <li key={b.expediente_id}>
                <Link
                  href={`/expedientes/${b.expediente_id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-800 underline-offset-2 hover:underline"
                >
                  Estudio {b.numero}
                  {b.prospecto && <span className="font-normal">· {b.prospecto}</span>}
                  <IconArrowRight size={14} />
                </Link>
              </li>
            ))}
          </ul>
          {resto > 0 && (
            <Link href="/expedientes?estudio_filtro=requiere_accion" className="text-xs font-semibold text-red-700 hover:underline">
              y {resto} más en sus estudios
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
