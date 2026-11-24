'use client'

/**
 * Integración nuby: estado de la conexión y sus acciones (conectar, probar,
 * sincronizar, desconectar, vincular) para el titular o para el administrador
 * de plataforma sobre una organización.
 *
 * - Las acciones no lanzan: devuelven `{ ok }` con el mensaje de la API, y la
 *   pantalla decide cómo mostrarlo.
 * - La copia corre en segundo plano: mientras la API diga `sincronizando`, se
 *   vuelve a pedir el estado cada 5 s, con tope de 5 min. Durante una copia la
 *   API rechaza con 409 pedir otra, vincular un código o cambiar las
 *   credenciales: ese 409 también pone a la pantalla a seguirla.
 * - Una respuesta vieja no pisa una nueva: cada lectura o acción invalida las
 *   lecturas anteriores, y el sondeo no lee mientras corre una acción.
 *
 * El modo no debe cambiar durante la vida del hook: el panel se monta con
 * `key` por organización, así no queda en pantalla nada de la anterior.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { integracionNubyService } from '@/services/integracionNubyService'
import { useUltimaPeticion } from '@/hooks/useUltimaPeticion'
import {
  CODIGO_YA_SINCRONIZANDO,
  estadoDesconectado,
  leerErrorNuby,
  marcarSincronizando,
  sigueSincronizando,
  type ErrorNuby,
} from '@/lib/integracionNuby'
import type {
  CredencialesNuby,
  EstadoIntegracionNuby,
  ModoIntegracionNuby,
  PruebaConexionNuby,
  VinculoNuby,
} from '@/types/integracionNuby'

const INTERVALO_SONDEO_MS = 5_000
const TOPE_SONDEO_MS = 5 * 60_000

export type AccionNuby = 'conectar' | 'probar' | 'sincronizar' | 'desconectar' | 'vincular'

export type ResultadoNuby<T = undefined> = { ok: true; datos: T } | ({ ok: false } & ErrorNuby)

/** inactivo: no hay copia corriendo · activo: se sigue su avance · agotado: pasó el tope y sigue corriendo. */
type Sondeo = 'inactivo' | 'activo' | 'agotado'

/**
 * ¿La conexión con nuby está encendida en la plataforma? Sirve para no
 * mostrarle al titular una entrada que todavía no puede usar. Es false
 * mientras carga y si la API no responde (o aún no tiene la función).
 */
export function useNubyDisponible(activo: boolean): boolean {
  const [disponible, setDisponible] = useState(false)

  useEffect(() => {
    if (!activo) return
    let vigente = true
    integracionNubyService
      .obtener({ tipo: 'titular' })
      .then((estado) => {
        if (vigente) setDisponible(estado.habilitada)
      })
      .catch(() => {
        if (vigente) setDisponible(false)
      })
    return () => {
      vigente = false
    }
  }, [activo])

  return activo && disponible
}

export function useIntegracionNuby(modo: ModoIntegracionNuby) {
  const orgId = modo.tipo === 'admin' ? modo.orgId : null
  // Quien llama suele pasar el modo en línea: se fija para que no cambie en cada render.
  const modoFijo = useMemo<ModoIntegracionNuby>(() => (orgId ? { tipo: 'admin', orgId } : { tipo: 'titular' }), [orgId])

  const [estado, setEstado] = useState<EstadoIntegracionNuby | null>(null)
  const [cargando, setCargando] = useState(true)
  // Un fallo de carga no es «sin conexión»: la pantalla lo dice y ofrece reintentar.
  const [error, setError] = useState<ErrorNuby | null>(null)
  const [accion, setAccion] = useState<AccionNuby | null>(null)
  const [sondeo, setSondeo] = useState<Sondeo>('inactivo')
  const iniciar = useUltimaPeticion()
  const enAccion = useRef(false)

  const aplicar = useCallback((nuevo: EstadoIntegracionNuby) => {
    setEstado(nuevo)
    setError(null)
    setSondeo(sigueSincronizando(nuevo) ? 'activo' : 'inactivo')
  }, [])

  // Primera carga (`cargando` nace en true).
  useEffect(() => {
    const vigente = iniciar()
    integracionNubyService.obtener(modoFijo).then(
      (nuevo) => {
        if (!vigente()) return
        aplicar(nuevo)
        setCargando(false)
      },
      (err: unknown) => {
        if (!vigente()) return
        setError(leerErrorNuby(err, 'No pudimos cargar la conexión con nuby.'))
        setCargando(false)
      },
    )
  }, [iniciar, modoFijo, aplicar])

  /** Vuelve a pedir el estado a la vista del usuario (reintentar, «Actualizar estado»). false = falló. */
  const recargar = useCallback(async (): Promise<boolean> => {
    const vigente = iniciar()
    setCargando(true)
    try {
      const nuevo = await integracionNubyService.obtener(modoFijo)
      if (vigente()) aplicar(nuevo)
      return true
    } catch (err) {
      if (vigente()) setError(leerErrorNuby(err, 'No pudimos cargar la conexión con nuby.'))
      return false
    } finally {
      setCargando(false)
    }
  }, [iniciar, modoFijo, aplicar])

  /** Refresco sin aviso: con datos en pantalla, un fallo no los borra (el siguiente lo corrige). */
  const refrescar = useCallback(async () => {
    const vigente = iniciar()
    try {
      const nuevo = await integracionNubyService.obtener(modoFijo)
      if (vigente()) aplicar(nuevo)
    } catch {
      // Se conserva lo que ya se ve.
    }
  }, [iniciar, modoFijo, aplicar])

  // Sondeo mientras haya una copia en curso.
  useEffect(() => {
    if (sondeo !== 'activo') return
    const inicio = Date.now()
    let cancelado = false
    let temporizador: ReturnType<typeof setTimeout> | undefined
    const revisar = async () => {
      if (cancelado) return
      if (Date.now() - inicio >= TOPE_SONDEO_MS) {
        setSondeo('agotado')
        return
      }
      // Con una acción en curso no se lee: su respuesta es la que vale.
      if (!enAccion.current) await refrescar()
      if (!cancelado) temporizador = setTimeout(revisar, INTERVALO_SONDEO_MS)
    }
    temporizador = setTimeout(revisar, INTERVALO_SONDEO_MS)
    return () => {
      cancelado = true
      clearTimeout(temporizador)
    }
  }, [sondeo, refrescar])

  /** Una acción a la vez. Al empezar se descartan las lecturas en vuelo: no deben pisar su resultado. */
  const ejecutar = useCallback(
    async <T,>(nombre: AccionNuby, tarea: (vigente: () => boolean) => Promise<T>, siFalla: string): Promise<ResultadoNuby<T>> => {
      if (enAccion.current) return { ok: false, mensaje: 'Espere a que termine la acción en curso.' }
      enAccion.current = true
      setAccion(nombre)
      const vigente = iniciar()
      try {
        return { ok: true, datos: await tarea(vigente) }
      } catch (err) {
        const fallo = leerErrorNuby(err, siFalla)
        // 409: hay una copia en curso que la pantalla no conocía. Se empieza a seguirla.
        if (fallo.code === CODIGO_YA_SINCRONIZANDO) {
          setEstado(marcarSincronizando)
          setSondeo('activo')
        }
        return { ok: false, ...fallo }
      } finally {
        enAccion.current = false
        setAccion(null)
      }
    },
    [iniciar],
  )

  /** Conecta o reemplaza las credenciales: la API prueba la conexión antes de guardar. */
  const conectar = useCallback(
    (credenciales: CredencialesNuby): Promise<ResultadoNuby> =>
      ejecutar(
        'conectar',
        async (vigente) => {
          const nuevo = await integracionNubyService.conectar(modoFijo, credenciales)
          if (vigente()) aplicar(nuevo)
          return undefined
        },
        'No pudimos conectar con nuby. Intente de nuevo.',
      ),
    [ejecutar, modoFijo, aplicar],
  )

  /** Prueba las credenciales guardadas. */
  const probar = useCallback(async (): Promise<ResultadoNuby<PruebaConexionNuby>> => {
    const r = await ejecutar('probar', () => integracionNubyService.probar(modoFijo), 'No pudimos probar la conexión con nuby.')
    // La prueba puede cambiar lo guardado (el estado o el último error).
    void refrescar()
    return r
  }, [ejecutar, modoFijo, refrescar])

  /** Lanza la copia y sigue su avance. Si ya había una en curso (409), `ejecutar` también la sigue. */
  const sincronizar = useCallback(async (): Promise<ResultadoNuby> => {
    const r = await ejecutar(
      'sincronizar',
      async () => {
        await integracionNubyService.sincronizar(modoFijo)
        return undefined
      },
      'No pudimos iniciar la copia. Intente de nuevo.',
    )
    if (r.ok) {
      setEstado(marcarSincronizando)
      setSondeo('activo')
    }
    return r
  }, [ejecutar, modoFijo])

  /** Los inmuebles se quedan en Cofianza y pasan a editarse ahí. */
  const desconectar = useCallback(async (): Promise<ResultadoNuby> => {
    const r = await ejecutar(
      'desconectar',
      async () => {
        await integracionNubyService.desconectar(modoFijo)
        return undefined
      },
      'No pudimos desconectar nuby. Intente de nuevo.',
    )
    if (r.ok) {
      setEstado((previo) => (previo ? estadoDesconectado(previo) : previo))
      setSondeo('inactivo')
      void refrescar()
    }
    return r
  }, [ejecutar, modoFijo, refrescar])

  /** Resuelve un código repetido: cuál inmueble de Cofianza es el de nuby. */
  const vincular = useCallback(
    (vinculo: VinculoNuby): Promise<ResultadoNuby> =>
      ejecutar(
        'vincular',
        async (vigente) => {
          const nuevo = await integracionNubyService.vincular(modoFijo, vinculo)
          if (vigente()) aplicar(nuevo)
          return undefined
        },
        'No pudimos vincular el inmueble. Intente de nuevo.',
      ),
    [ejecutar, modoFijo, aplicar],
  )

  return {
    estado,
    cargando,
    error,
    /** Acción en curso, o null. */
    accion,
    /** Hay una copia corriendo (la API lo dice o se acaba de lanzar). */
    sincronizando: sigueSincronizando(estado),
    /** Pasaron 5 min y la copia sigue: ya no se pregunta sola; se ofrece «Actualizar estado». */
    sondeoAgotado: sondeo === 'agotado',
    recargar,
    conectar,
    probar,
    sincronizar,
    desconectar,
    vincular,
  }
}
