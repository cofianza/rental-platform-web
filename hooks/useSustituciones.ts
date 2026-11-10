'use client'

/**
 * Cambios de personas de un estudio y consulta adicional. La API decide qué se
 * puede hacer, cuánto cuesta y cuántos cambios quedan; aquí se pide, se envía
 * y se informa lo que responde.
 */

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ApiClientError } from '@/lib/api'
import { sustitucionesService } from '@/services/sustitucionesService'
import { coarrendatarioService, type IInvitarCoarrendatarioInput } from '@/services/coarrendatarioService'
import type {
  ICargarSolicitanteInput,
  IConsultaAdicionalCanon,
  ICotizacionSustitucion,
  IEstadoSustituciones,
  ISustitucionCreada,
  IValorConsultaAdicional,
  PersonaQueSale,
} from '@/types/sustitucion'

const mensajeDe = (err: unknown, respaldo: string) => (err instanceof Error && err.message ? err.message : respaldo)

/** El valor que la API cotiza en su respuesta, si lo trae. */
export function valorConsultaAdicional(err: unknown): IValorConsultaAdicional | null {
  if (!(err instanceof ApiClientError) || err.code !== 'REQUIERE_CONSULTA_ADICIONAL') return null
  const d = (err.details ?? {}) as unknown as { consultas?: unknown; total_cop?: unknown; puede_pagar?: unknown }
  const consultas = Number(d.consultas)
  const total = Number(d.total_cop)
  return d.puede_pagar === true && Number.isFinite(consultas) && consultas > 0 && Number.isFinite(total) && total > 0 ? { consultas, total_cop: total } : null
}

/**
 * Estado de los cambios de personas del estudio. `activo` = la API ya envió un
 * resultado para este estudio (si no, no se pide nada). `version` recarga.
 */
export function useSustituciones(estudioId: string, activo: boolean, version?: unknown, alCambiar?: () => void) {
  const [estado, setEstado] = useState<IEstadoSustituciones | null>(null)
  const [cargando, setCargando] = useState(activo)
  const [error, setError] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  // `recarga` vuelve a pedir el estado (tras un cambio o al reintentar).
  const [recarga, setRecarga] = useState(0)
  const cargar = useCallback(() => setRecarga((n) => n + 1), [])

  useEffect(() => {
    if (!activo) return
    let vigente = true
    sustitucionesService
      .estado(estudioId)
      .then(
        (e) => {
          if (!vigente) return
          setEstado(e)
          setError(false)
        },
        (err: unknown) => {
          if (!vigente) return
          // La API no lo ofrece para este estudio (o es una API anterior): no se muestra nada.
          const sinFuncion = err instanceof ApiClientError && (err.statusCode === 404 || err.statusCode === 403 || err.code === 'A5D_NO_VIGENTE' || err.code === 'ESTUDIO_NO_SUSTITUIBLE')
          setEstado(null)
          setError(!sinFuncion)
        },
      )
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [activo, estudioId, version, recarga])

  const terminar = useCallback(() => {
    cargar()
    alCambiar?.()
  }, [alCambiar, cargar])

  /** El aviso del valor antes de confirmar. null = la API no lo permite (ya informó por qué). */
  const cotizar = useCallback(async (persona: PersonaQueSale['persona'] = 'coarrendatario'): Promise<ICotizacionSustitucion | null> => {
    try {
      return await sustitucionesService.cotizar(estudioId, persona)
    } catch (err) {
      toast.error(mensajeDe(err, 'No se pudo consultar el valor. Inténtelo de nuevo.'))
      cargar()
      return null
    }
  }, [cargar, estudioId])

  const ejecutar = useCallback(
    async <T,>(accion: () => Promise<T>, hecho: string | ((r: T) => string), respaldo: string): Promise<T | null> => {
      setOcupado(true)
      try {
        const r = await accion()
        toast.success(typeof hecho === 'function' ? hecho(r) : hecho)
        terminar()
        return r
      } catch (err) {
        toast.error(mensajeDe(err, respaldo))
        cargar()
        return null
      } finally {
        setOcupado(false)
      }
    },
    [cargar, terminar],
  )

  /** Abre el cambio con el valor que la persona acaba de confirmar. */
  const crear = useCallback(
    (cotizacion: ICotizacionSustitucion): Promise<ISustitucionCreada | null> =>
      ejecutar(
        () =>
          sustitucionesService.crear(
            estudioId,
            cotizacion.sale.persona === 'solicitante' ? { persona: 'solicitante' } : { persona: 'coarrendatario', coarrendatario_id: cotizacion.sale.coarrendatario_id },
            cotizacion.total_a_pagar_cop,
          ),
        (r) => (r.pago ? 'Cambio abierto. Pague la consulta adicional para cargar a la persona nueva.' : 'Cambio abierto. Ya puede cargar a la persona nueva.'),
        'No se pudo abrir el cambio. Inténtelo de nuevo.',
      ),
    [ejecutar, estudioId],
  )

  const retirar = useCallback(
    (persona: PersonaQueSale) => ejecutar(() => sustitucionesService.retirar(estudioId, persona), 'La persona salió del estudio.', 'No se pudo retirar a la persona. Inténtelo de nuevo.'),
    [ejecutar, estudioId],
  )

  const cancelar = useCallback(
    (sustitucionId: string) =>
      ejecutar(
        () => sustitucionesService.cancelar(estudioId, sustitucionId),
        (r) => (r.estado === 'devuelta' ? 'Cancelado. Cofianza le devolverá el pago a quien pagó.' : 'Cancelado. No se le cobró nada.'),
        'No se pudo cancelar. Inténtelo de nuevo.',
      ),
    [ejecutar, estudioId],
  )

  /** Carga a la persona nueva dentro del cambio ya habilitado. Lanza el error de la API (el formulario lo muestra). */
  const cargarPersona = useCallback(
    async (expedienteId: string, sustitucionId: string, input: IInvitarCoarrendatarioInput) => {
      const r = await coarrendatarioService.invitar(expedienteId, input, sustitucionId)
      terminar()
      return r
    },
    [terminar],
  )

  /** Carga a la persona que entra como solicitante. Lanza el error de la API (el formulario lo muestra). */
  const cargarSolicitante = useCallback(
    async (sustitucionId: string, input: ICargarSolicitanteInput) => {
      const r = await sustitucionesService.cargarSolicitante(estudioId, sustitucionId, input)
      toast.success(r.enlace_enviado ? `${r.solicitante.nombre} quedó como solicitante. Se le envió su solicitud de autorización.` : `${r.solicitante.nombre} quedó como solicitante. Reenvíele la solicitud de autorización desde el estudio.`)
      terminar()
      return r
    },
    [estudioId, terminar],
  )

  return { estado, cargando, error, ocupado, recargar: cargar, cotizar, crear, retirar, cancelar, cargarPersona, cargarSolicitante }
}

/** Pide la consulta adicional que la API cotizó para evaluar el estudio con un canon mayor. */
export function useConsultaAdicionalCanon() {
  const [pidiendo, setPidiendo] = useState(false)

  /**
   * Devuelve la respuesta de la API; `valorNuevo` si la API cotizó otro valor (hay
   * que mostrarlo y confirmar de nuevo); null si falló (ya se informó).
   */
  const pedir = useCallback(async (estudioId: string, inmuebleId: string, valor: IValorConsultaAdicional): Promise<IConsultaAdicionalCanon | { valorNuevo: IValorConsultaAdicional } | null> => {
    setPidiendo(true)
    try {
      return await sustitucionesService.consultaAdicionalCanon(estudioId, inmuebleId, valor.total_cop)
    } catch (err) {
      toast.error(mensajeDe(err, 'No se pudo pedir la consulta adicional. Inténtelo de nuevo.'))
      if (err instanceof ApiClientError && err.code === 'VALOR_CAMBIO') {
        const d = (err.details ?? {}) as unknown as { consultas?: unknown; total_cop?: unknown }
        const consultas = Number(d.consultas)
        const total = Number(d.total_cop)
        if (Number.isFinite(consultas) && consultas > 0 && Number.isFinite(total) && total > 0) return { valorNuevo: { consultas, total_cop: total } }
      }
      return null
    } finally {
      setPidiendo(false)
    }
  }, [])

  return { pedir, pidiendo }
}
