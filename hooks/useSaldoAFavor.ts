'use client'

/**
 * Saldo a favor (Adenda 6 §6 y 6.1 §6). `useSaldoAFavorPropio`: el de la
 * inmobiliaria o el propietario que mira. `useSaldosAFavorAdmin`: la lista de
 * Cofianza y el registro de la solicitud de devolución de una persona natural.
 * La API decide todo (montos, a quién se devuelve, plazos); aquí solo se lee.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  saldoAFavorService,
  type IDevolucionSaldoInput,
  type IDevolucionSaldoResultado,
  type ISaldoAFavorPropio,
  type ISaldosAFavorAdmin,
} from '@/services/saldoAFavorService'

const mensaje = (err: unknown, reserva: string) => (err instanceof Error && err.message ? err.message : reserva)

export function useSaldoAFavorPropio(activo = true) {
  const [saldo, setSaldo] = useState<ISaldoAFavorPropio | null>(null)
  const [isLoading, setIsLoading] = useState(activo)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setIsLoading(true)
    try {
      setSaldo(await saldoAFavorService.getMio())
      setError(null)
    } catch (err) {
      setError(mensaje(err, 'No pudimos consultar su saldo a favor.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Primera carga: el estado se escribe en las respuestas, no en el cuerpo del efecto.
  useEffect(() => {
    if (!activo) return
    let vigente = true
    saldoAFavorService.getMio().then(
      (r) => {
        if (!vigente) return
        setSaldo(r)
        setError(null)
        setIsLoading(false)
      },
      (err) => {
        if (!vigente) return
        setError(mensaje(err, 'No pudimos consultar su saldo a favor.'))
        setIsLoading(false)
      },
    )
    return () => {
      vigente = false
    }
  }, [activo])

  return { saldo, isLoading, error, recargar: cargar }
}

export function useSaldosAFavorAdmin() {
  const [datos, setDatos] = useState<ISaldosAFavorAdmin | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registrando, setRegistrando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setIsLoading(true)
    try {
      setDatos(await saldoAFavorService.listAdmin())
      setError(null)
    } catch (err) {
      setError(mensaje(err, 'No pudimos cargar los saldos a favor.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let vigente = true
    saldoAFavorService.listAdmin().then(
      (r) => {
        if (!vigente) return
        setDatos(r)
        setError(null)
        setIsLoading(false)
      },
      (err) => {
        if (!vigente) return
        setError(mensaje(err, 'No pudimos cargar los saldos a favor.'))
        setIsLoading(false)
      },
    )
    return () => {
      vigente = false
    }
  }, [])

  /** Lanza el error de la API (el componente lo muestra); al terminar, recarga la lista. */
  const registrarDevolucion = useCallback(
    async (saldoId: string, input: IDevolucionSaldoInput): Promise<IDevolucionSaldoResultado> => {
      setRegistrando(saldoId)
      try {
        const r = await saldoAFavorService.registrarDevolucion(saldoId, input)
        await cargar()
        return r
      } finally {
        setRegistrando(null)
      }
    },
    [cargar],
  )

  return { datos, isLoading, error, recargar: cargar, registrarDevolucion, registrando }
}
