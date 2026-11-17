/**
 * «Ver biometría» en la revisión manual.
 * - useResumenBiometria: si hay fotos que consultar (decide si se muestra el botón).
 * - useEvidenciaBiometria: las fotos, pedidas solo cuando el analista abre la
 *   ventana (y cada vez que la vuelve a abrir o pide «Volver a consultar»).
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { biometriaService } from '@/services/biometriaService'
import { useUltimaPeticion } from '@/hooks/useUltimaPeticion'
import { ApiClientError } from '@/lib/api'
import type { IEvidenciaBiometria } from '@/types/autorizacion'

export function useResumenBiometria(expedienteId: string | undefined, habilitado: boolean) {
  const [conEvidencia, setConEvidencia] = useState(false)

  useEffect(() => {
    if (!expedienteId || !habilitado) return
    let vivo = true
    biometriaService
      .getResumen(expedienteId)
      .then((r) => {
        if (vivo) setConEvidencia(r.con_evidencia)
      })
      // Si el resumen no cargó (red, 5xx), el botón se ofrece igual: la consulta dice si hay fotos.
      // Un 404 (estudio inexistente o una API sin la ruta) no lo ofrece.
      .catch((err) => {
        if (vivo) setConEvidencia(!(err instanceof ApiClientError && err.statusCode === 404))
      })
    return () => {
      vivo = false
    }
  }, [expedienteId, habilitado])

  return { conEvidencia: habilitado && conEvidencia }
}

const ERRORES_SIN_REINTENTO = ['BIOMETRIA_EVIDENCIA_NO_ENCONTRADA', 'BIOMETRIA_PROVEEDOR_RECHAZO']

export function useEvidenciaBiometria(expedienteId: string) {
  const [datos, setDatos] = useState<IEvidenciaBiometria | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Auco no encontró la evidencia o rechazó la llave: reintentar no lo arregla.
  const [reintentable, setReintentable] = useState(true)
  // Hora local en que llegaron las fotos: de ahí corren sus 5 minutos.
  const [recibidoEn, setRecibidoEn] = useState<number | null>(null)
  const [vencido, setVencido] = useState(false)
  const iniciar = useUltimaPeticion()

  // Pasados los 5 minutos los enlaces ya no abren: se avisa para volver a consultar.
  useEffect(() => {
    if (!datos?.vence_en_segundos) return
    const t = setTimeout(() => setVencido(true), datos.vence_en_segundos * 1000)
    return () => clearTimeout(t)
  }, [datos])

  const consultar = useCallback(async () => {
    const vigente = iniciar()
    setCargando(true)
    setError(null)
    setVencido(false)
    // Las URLs anteriores pudieron vencer: no se muestran mientras llegan las nuevas.
    setDatos(null)
    try {
      const r = await biometriaService.getEvidencia(expedienteId)
      if (!vigente()) return
      setRecibidoEn(Date.now())
      setDatos(r)
    } catch (err) {
      if (!vigente()) return
      setError(err instanceof Error && err.message ? err.message : 'No pudimos consultar la verificación biométrica.')
      setReintentable(!(err instanceof ApiClientError && ERRORES_SIN_REINTENTO.includes(err.code ?? '')))
    } finally {
      if (vigente()) setCargando(false)
    }
  }, [expedienteId, iniciar])

  /** Al cerrar se olvidan las URLs: al volver a abrir se piden de nuevo. */
  const limpiar = useCallback(() => {
    iniciar()
    setDatos(null)
    setError(null)
    setCargando(false)
    setVencido(false)
    setRecibidoEn(null)
  }, [iniciar])

  return { datos, cargando, error, reintentable, recibidoEn, vencido, consultar, limpiar }
}
