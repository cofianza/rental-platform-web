/**
 * «Ver biometría» en la revisión manual.
 * - useResumenBiometria: si hay algo que mostrar (decide si se muestra el botón).
 * - useEvidenciaBiometria: los intentos con fotos guardadas, pedidos solo cuando
 *   el analista abre la ventana.
 * - useFotoBiometria: cada imagen, descargada al mostrarse y olvidada al cerrar.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { biometriaService } from '@/services/biometriaService'
import { useUltimaPeticion } from '@/hooks/useUltimaPeticion'
import { ApiClientError } from '@/lib/api'
import type { CualFotoBiometria, IEvidenciaBiometria, IResumenBiometriaAnalista, PersonaCotejo } from '@/types/autorizacion'

export function useResumenBiometria(expedienteId: string | undefined, habilitado: boolean) {
  const [conEvidencia, setConEvidencia] = useState(false)
  // Lo guardado del cotejo en Cofianza: se muestra aunque no haya fotos.
  const [resumen, setResumen] = useState<IResumenBiometriaAnalista | null>(null)

  useEffect(() => {
    if (!expedienteId || !habilitado) return
    let vivo = true
    biometriaService
      .getResumen(expedienteId)
      .then((r) => {
        if (!vivo) return
        setConEvidencia(r.con_evidencia)
        setResumen(r.resumen)
      })
      // Solo si el resumen falló por red o por el servidor (5xx) se ofrece igual: la consulta dice
      // si hay fotos. Un 4xx (404 sin la ruta, 401, 403, 400) no lo ofrece.
      .catch((err) => {
        if (vivo) setConEvidencia(err instanceof ApiClientError && (err.statusCode === 0 || err.statusCode >= 500))
      })
    return () => {
      vivo = false
    }
  }, [expedienteId, habilitado])

  return { conEvidencia: habilitado && conEvidencia, resumen: habilitado ? resumen : null }
}

export function useEvidenciaBiometria(expedienteId: string) {
  const [datos, setDatos] = useState<IEvidenciaBiometria | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const iniciar = useUltimaPeticion()

  const consultar = useCallback(async () => {
    const vigente = iniciar()
    setCargando(true)
    setError(null)
    setDatos(null)
    try {
      const r = await biometriaService.getEvidencia(expedienteId)
      if (vigente()) setDatos(r)
    } catch (err) {
      if (!vigente()) return
      setError(err instanceof Error && err.message ? err.message : 'No pudimos consultar la verificación biométrica.')
    } finally {
      if (vigente()) setCargando(false)
    }
  }, [expedienteId, iniciar])

  /** Supresión anticipada (la persona la pidió). Lanza si falla; quien llama avisa. */
  const eliminarFotos = useCallback(async () => {
    const r = await biometriaService.eliminarFotos(expedienteId)
    await consultar()
    return r
  }, [expedienteId, consultar])

  /** Adenda 6 §2: marca (o quita) la denuncia o proceso de una persona. Lanza si falla; quien llama avisa. */
  const retencionPorProceso = useCallback(
    async (persona: PersonaCotejo, motivo: string | null) => {
      const r = await biometriaService.retencionPorProceso(expedienteId, persona, motivo)
      await consultar()
      return r
    },
    [expedienteId, consultar],
  )

  /** Al cerrar se olvida todo: al volver a abrir se pide de nuevo. */
  const limpiar = useCallback(() => {
    iniciar()
    setDatos(null)
    setError(null)
    setCargando(false)
  }, [iniciar])

  return { datos, cargando, error, consultar, limpiar, eliminarFotos, retencionPorProceso }
}

/**
 * Una imagen guardada como URL local (blob:) mientras el componente vive. Al
 * desmontarse (cerrar la ventana) la URL se revoca: la imagen no queda en la página.
 */
// La foto ya no está (se eliminó o el estudio se decidió): reintentar no la trae.
const FOTO_SIN_REINTENTO = ['BIOMETRIA_FOTO_NO_ENCONTRADA', 'BIOMETRIA_FOTOS_ELIMINADAS']

export function useFotoBiometria(expedienteId: string, fotoId: string, cual: CualFotoBiometria) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reintentable, setReintentable] = useState(true)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vivo = true
    let creada: string | null = null
    biometriaService
      .getFoto(expedienteId, fotoId, cual)
      .then((blob) => {
        if (!vivo) return
        creada = URL.createObjectURL(blob)
        setUrl(creada)
      })
      .catch((err) => {
        if (!vivo) return
        setError(err instanceof Error && err.message ? err.message : 'No pudimos abrir esta foto.')
        setReintentable(!(err instanceof ApiClientError && FOTO_SIN_REINTENTO.includes(err.code ?? '')))
      })
    return () => {
      vivo = false
      if (creada) URL.revokeObjectURL(creada)
    }
  }, [expedienteId, fotoId, cual, intento])

  const reintentar = useCallback(() => {
    setUrl(null)
    setError(null)
    setIntento((n) => n + 1)
  }, [])
  return { url, error, reintentable, cargando: !url && !error, reintentar }
}
