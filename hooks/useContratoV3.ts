/**
 * useContratoV3 — estado del asistente de contratos V3 (Entrega 3).
 *
 * PORQUÉ sin store: el borrador es la fila `contratos` en borrador y el servidor
 * es su dueño (se retoma desde cualquier equipo). El hook solo guarda la última
 * respuesta. Los bloqueos y faltantes los decide el API; los validadores de abajo
 * solo dan aviso inmediato de campos obligatorios y formatos (espejo de §5.5).
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ApiClientError } from '@/lib/api'
import { contratoService } from '@/services/contratoService'
import { contratoV3Service, fallasDe, type EnviarBody, type FallaFirmante } from '@/services/contratoV3Service'
import { estudioService } from '@/services/estudioService'
import { hallazgosDe } from '@/services/clausulasService'
import type { EstadoContrato } from '@/types/contrato'
import type {
  Contacto,
  EstadoAsistente,
  GuardarPasoBody,
  Hallazgo,
  NumeroPaso,
  Paso1,
  Paso2,
  Paso3,
  Paso4Entrada,
  Paso5,
} from '@/types/contratoV3'

export type AccionContratoV3 =
  | null
  | 'iniciar'
  | 'guardar'
  | 'generar'
  | 'autorizar'
  // Entrega 5: Ruta B y firma
  | 'propio'
  | 'enviar'
  | 'reenviar'
  | 'reintentar'
  | 'actualizar'
  | 'cancelar'

// Con Auco de por medio, un 5xx puede dejar el contrato en otro estado (FIRMA_ENVIADA_SIN_REGISTRO
// sí salió; un reenvío fallido deja un proceso fallido a la vista): tras estos errores se recarga.
const RECARGA_TRAS_5XX: AccionContratoV3[] = ['enviar', 'reenviar', 'reintentar', 'actualizar', 'cancelar']

/**
 * Último 422 al guardar un paso. En el paso 4 trae los hallazgos de las reglas con
 * `indice` (fila de la lista) o, si una cláusula ya no está disponible, `indice` suelto.
 */
export interface ErrorPaso {
  paso: NumeroPaso
  codigo: string
  mensaje: string
  hallazgos: Hallazgo[]
  avisos: Hallazgo[]
  indice: number | null
}

export function useContratoV3(expedienteId: string) {
  // Por expediente: la página no se desmonta al pasar de un estudio a otro, y una
  // respuesta tardía del anterior no debe pisar ni mostrarse en el actual.
  const [cargas, setCargas] = useState<Record<string, EstadoAsistente>>({})
  const [error, setError] = useState<string | null>(null)
  const [accion, setAccion] = useState<AccionContratoV3>(null)
  const [errorPaso, setErrorPaso] = useState<(ErrorPaso & { expedienteId: string }) | null>(null)
  // Último 422 FIRMANTES_INVALIDOS al enviar: qué dato de qué firmante no acepta Auco.
  const [errorEnvio, setErrorEnvio] = useState<{ expedienteId: string; fallas: FallaFirmante[] } | null>(null)
  // Expedientes ya pintados: si un refresco posterior falla, se avisa con toast
  // en vez de cambiar el asistente por la tarjeta de error (y perder lo escrito).
  const pintados = useRef(new Set<string>())

  const estado = cargas[expedienteId] ?? null

  const aplicar = useCallback(
    (e: EstadoAsistente) => {
      pintados.current.add(expedienteId)
      setCargas((prev) => ({ ...prev, [expedienteId]: e }))
    },
    [expedienteId],
  )

  const recargar = useCallback(async () => {
    setError(null)
    try {
      aplicar(await contratoV3Service.obtener(expedienteId))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No pudimos cargar el contrato.'
      if (pintados.current.has(expedienteId)) toast.error(msg)
      else setError(msg)
    }
  }, [expedienteId, aplicar])

  useEffect(() => {
    recargar()
  }, [recargar])

  const mutar = useCallback(
    async (tipo: Exclude<AccionContratoV3, null>, llamada: () => Promise<EstadoAsistente>) => {
      setAccion(tipo)
      try {
        aplicar(await llamada())
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo completar la acción.')
        // 409 (bloqueo, borrador cambiado) y 422 (faltantes): se recarga para
        // pintar los bloqueos y faltantes vigentes. 404 (borrador cancelado en
        // otra sesión, asistente apagado): se recarga para salir del asistente
        // muerto a la vista de iniciar o al aviso de no disponible.
        if (
          err instanceof ApiClientError &&
          ([404, 409, 422].includes(err.statusCode) || (err.statusCode >= 500 && RECARGA_TRAS_5XX.includes(tipo)))
        ) {
          void recargar()
        }
        return false
      } finally {
        setAccion(null)
      }
    },
    [aplicar, recargar],
  )

  /** true si el servidor aceptó; "Guardar y continuar" solo avanza con true. */
  const iniciar = useCallback(
    () => mutar('iniciar', () => contratoV3Service.iniciar(expedienteId)),
    [mutar, expedienteId],
  )
  const guardarPaso = useCallback(
    (body: GuardarPasoBody) => {
      setErrorPaso(null)
      setErrorEnvio(null)
      return mutar('guardar', async () => {
        try {
          return await contratoV3Service.guardarPaso(expedienteId, body)
        } catch (err) {
          if (err instanceof ApiClientError && err.statusCode === 422) {
            setErrorPaso({ expedienteId, paso: body.paso, codigo: err.code ?? '', mensaje: err.message, ...hallazgosDe(err) })
          }
          throw err
        }
      })
    },
    [mutar, expedienteId],
  )
  const generar = useCallback(
    () => mutar('generar', () => contratoV3Service.generar(expedienteId)),
    [mutar, expedienteId],
  )
  /** Solo administrador: `huella` = la del paso 4 guardado (guardados[4].huella). */
  const autorizarExceso = useCallback(
    (huella: string) => mutar('autorizar', () => contratoV3Service.autorizarExceso(expedienteId, huella)),
    [mutar, expedienteId],
  )
  const limpiarErrorPaso = useCallback(() => setErrorPaso(null), [])

  // ── Entrega 5: Ruta B y firma ──

  const subirPropio = useCallback(
    (archivo: File) => mutar('propio', () => contratoV3Service.subirPropio(expedienteId, archivo)),
    [mutar, expedienteId],
  )
  /** URL firmada (1 h) del contrato de la inmobiliaria (Ruta B). */
  const propioUrl = useCallback(() => contratoV3Service.propioUrl(expedienteId), [expedienteId])
  /**
   * URL firmada del CRC: fuera de borrador, el que se envió a firma (congelado en el API);
   * en borrador, el del último estudio individual completado, el mismo que elegirá el API.
   */
  const crcUrl = useCallback(async () => {
    const enviado = await contratoV3Service.crcEnviadoUrl(expedienteId)
    if (enviado) return enviado
    const { data } = await estudioService.getEstudiosForExpediente(expedienteId, 1, 50)
    const estudio = data
      .filter((e) => e.tipo === 'individual' && e.estado === 'completado')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    if (!estudio) throw new Error('Este estudio no tiene un CRC emitido.')
    return (await estudioService.descargarCertificado(estudio.id)).url
  }, [expedienteId])
  const enviar = useCallback(
    (body: EnviarBody) => {
      setErrorEnvio(null)
      return mutar('enviar', async () => {
        try {
          return await contratoV3Service.enviar(expedienteId, body)
        } catch (err) {
          if (err instanceof ApiClientError && err.code === 'FIRMANTES_INVALIDOS') {
            setErrorEnvio({ expedienteId, fallas: fallasDe(err) })
          }
          throw err
        }
      })
    },
    [mutar, expedienteId],
  )
  const reenviar = useCallback(
    () => mutar('reenviar', () => contratoV3Service.reenviar(expedienteId)),
    [mutar, expedienteId],
  )
  const reintentar = useCallback(
    () => mutar('reintentar', () => contratoV3Service.reintentar(expedienteId)),
    [mutar, expedienteId],
  )
  const actualizarFirma = useCallback(
    () => mutar('actualizar', () => contratoV3Service.actualizarFirma(expedienteId)),
    [mutar, expedienteId],
  )
  /**
   * Cancelar el borrador o el contrato en firma (EN FIRMA / FIRMA INCOMPLETA). Va por la
   * transición de siempre; para un V3 en firma el API anula antes el proceso en Auco.
   * `visto` = el estado en pantalla: si otro miembro lo cambió (p. ej. lo envió a firma), 409 y recarga.
   */
  const cancelar = useCallback(
    (contratoId: string, motivo: string, visto: EstadoContrato) =>
      mutar('cancelar', async () => {
        await contratoService.transicionar(contratoId, {
          nuevo_estado: 'cancelado',
          comentario: motivo,
          motivo,
          estado_esperado: visto,
        })
        return contratoV3Service.obtener(expedienteId)
      }),
    [mutar, expedienteId],
  )

  return {
    estado,
    isLoading: estado === null && error === null,
    error,
    accion,
    recargar,
    iniciar,
    guardarPaso,
    generar,
    autorizarExceso,
    // Solo el del expediente actual (la página no se desmonta al cambiar de estudio).
    errorPaso: errorPaso?.expedienteId === expedienteId ? errorPaso : null,
    limpiarErrorPaso,
    subirPropio,
    propioUrl,
    crcUrl,
    enviar,
    reenviar,
    reintentar,
    actualizarFirma,
    cancelar,
    fallasEnvio: errorEnvio?.expedienteId === expedienteId ? errorEnvio.fallas : [],
  }
}

// ============================================
// Validadores por paso (espejo de §5.5 del diseño; el API sigue siendo la puerta)
// ============================================

/** Estado de formulario de un paso: todo opcional, también dentro de los objetos. */
export type Borrador<T> = {
  [K in keyof T]?: NonNullable<T[K]> extends string | number | boolean
    ? T[K]
    : Borrador<NonNullable<T[K]>> | Extract<T[K], null>
}

/** Errores por ruta de campo ('usos.carro', 'contactos.arrendador.email'…). Vacío = válido. */
export type ErroresPaso = Record<string, string>

// Mismo MARCADOR que motor.ts: lo que el render trataría como hueco sin llenar.
const MARCADOR = /[Xx]{3,}|_{3,}|▢|⟦|[{}]|NO APLICA|\b(undefined|null|NaN)\b/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FECHA = /^\d{4}-\d{2}-\d{2}$/
const MSG_OBLIGATORIO = 'Campo obligatorio'
const MSG_SI_NO = 'Elige Sí o No'
const MSG_NO_IMPRIMIBLE =
  'Este texto no se puede imprimir en el contrato: quita XXX, ___, llaves, «NO APLICA», «null» o la palabra «coarrendatario».'

/** Fecha de hoy en Bogotá (AAAA-MM-DD), mismo corrimiento de −5 h que fechaBogota del API. */
export function hoyBogota(): string {
  return new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10)
}

/** AAAA-MM-DD + n días, en calendario (sin horas ni zona). */
export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10)
}

function texto(v: string | null | undefined, max: number, conCoarrendatario = false): string | null {
  const t = (v ?? '').trim()
  if (!t) return MSG_OBLIGATORIO
  if (t.length > max) return `Máximo ${max} caracteres`
  if (/\p{Cc}/u.test(t) || MARCADOR.test(t) || (!conCoarrendatario && /coarrendatari/i.test(t))) return MSG_NO_IMPRIMIBLE
  return null
}

function entero(n: number | undefined, min: number, max: number): string | null {
  if (n === undefined || Number.isNaN(n)) return MSG_OBLIGATORIO
  if (!Number.isInteger(n) || n < min || n > max) {
    return `Debe ser un número entero entre ${min.toLocaleString('es-CO')} y ${max.toLocaleString('es-CO')}`
  }
  return null
}

function porcentaje(n: number | undefined): string | null {
  if (n === undefined || Number.isNaN(n)) return MSG_OBLIGATORIO
  if (n < 0 || n > 100) return 'Debe estar entre 0 y 100'
  if (Math.abs(n * 100 - Math.round(n * 100)) >= 1e-9) return 'Máximo dos decimales'
  return null
}

function fecha(v: string | undefined, hoy: string): string | null {
  if (!v) return MSG_OBLIGATORIO
  if (!FECHA.test(v)) return 'Fecha inválida'
  if (v < hoy || v > sumarDias(hoy, 365)) return 'La fecha debe estar entre hoy y dentro de un año.'
  return null
}

function contacto(c: Borrador<Contacto> | null | undefined, ruta: string, errores: ErroresPaso) {
  const poner = (campo: string, msg: string | null) => {
    if (msg) errores[`${ruta}.${campo}`] = msg
  }
  poner('direccion', texto(c?.direccion, 300))
  poner('municipio', texto(c?.municipio, 120))
  const email = (c?.email ?? '').trim()
  poner('email', !email ? MSG_OBLIGATORIO : email.length > 254 || !EMAIL.test(email) ? 'Correo inválido' : null)
  // PhoneInput vacío emite solo el indicativo ("+57 "): eso es sin responder.
  const tel = (c?.telefono ?? '').replace(/[\s()-]/g, '')
  poner(
    'telefono',
    !tel || /^\+\d{1,4}$/.test(tel) ? MSG_OBLIGATORIO : /^\+?\d{7,15}$/.test(tel) ? null : 'Celular inválido',
  )
}

function limpiar(errores: Record<string, string | null>): ErroresPaso {
  return Object.fromEntries(Object.entries(errores).filter(([, m]) => m)) as ErroresPaso
}

export function validarPaso1(d: Borrador<Paso1>): ErroresPaso {
  return limpiar({
    ruta: d.ruta === 'A' || d.ruta === 'B' ? null : 'Elige la ruta del contrato',
    modalidad: d.modalidad === 'trasladada' || d.modalidad === 'tradicional' ? null : 'Elige la modalidad de la fianza',
    canonCop: entero(d.canonCop, 1, 100_000_000),
  })
}

export function validarPaso2(d: Borrador<Paso2>): ErroresPaso {
  // En usos, null = No; un texto (aunque vacío) = Sí y exige número o identificación.
  const uso = (v: string | null | undefined) => (v === undefined ? MSG_SI_NO : v === null ? null : texto(v, 40))
  return limpiar({
    'usos.carro': uso(d.usos?.carro),
    'usos.moto': uso(d.usos?.moto),
    'usos.util': uso(d.usos?.util),
    amoblado: typeof d.amoblado === 'boolean' ? null : MSG_SI_NO,
    ocupantes: entero(d.ocupantes, 1, 30),
    propiedadHorizontal: typeof d.propiedadHorizontal === 'boolean' ? null : MSG_SI_NO,
    nombreCopropiedad: d.propiedadHorizontal ? texto(d.nombreCopropiedad, 150) : null,
  })
}

/** `propiedadHorizontal` = respuesta guardada del paso 2: con PH la administración es obligatoria. */
export function validarPaso3(
  d: Borrador<Paso3>,
  ctx: { propiedadHorizontal?: boolean; hoy?: string } = {},
): ErroresPaso {
  const hoy = ctx.hoy ?? hoyBogota()
  const a = d.administracion
  return limpiar({
    vigenciaMeses: entero(d.vigenciaMeses, 2, 120),
    fechaInicio: fecha(d.fechaInicio, hoy),
    fechaEntrega: fecha(d.fechaEntrega, hoy),
    comisionPct: porcentaje(d.comisionPct),
    administracion:
      ctx.propiedadHorizontal && !a
        ? 'Con propiedad horizontal completa la cuota de administración; sin ella, quítala.'
        : null,
    'administracion.aCargoDe':
      a && a.aCargoDe !== 'arrendador' && a.aCargoDe !== 'arrendatario' ? 'Elige quién la paga' : null,
    'administracion.valorCop': a ? entero(a.valorCop, 0, 100_000_000) : null,
    'administracion.incluidaEnCanon': a && typeof a.incluidaEnCanon !== 'boolean' ? MSG_SI_NO : null,
  })
}

/** `conCoarrendatario` = el estudio tiene coarrendatario vinculado (resumen.coarrendatario). */
export function validarPaso5(d: Borrador<Paso5>, ctx: { conCoarrendatario?: boolean } = {}): ErroresPaso {
  const errores = limpiar({ ciudadFirma: texto(d.ciudadFirma, 120) })
  contacto(d.contactos?.arrendador, 'contactos.arrendador', errores)
  contacto(d.contactos?.arrendatario, 'contactos.arrendatario', errores)
  if (ctx.conCoarrendatario || d.contactos?.coarrendatario) {
    contacto(d.contactos?.coarrendatario, 'contactos.coarrendatario', errores)
  }
  return errores
}

// ============================================
// Paso 4: cláusulas adicionales (Entrega 4)
// ============================================

/** Estado de formulario del paso 4 (la página lo inicia desde guardados[4]). */
export interface FormPaso4 {
  elegidas: { clausulaId: string; valores: Record<string, string> }[]
  acepto: boolean
}

/** Tope técnico del API: la numeración llega a QUINCUAGÉSIMA OCTAVA. El máximo sin revisión es adicionales.maximo. */
const MAX_ADICIONALES = 25

/**
 * Espejo de la validación del API para "Guardar y continuar". Lista vacía = válido
 * (se omite el paso). `campos[clausulaId]` = los [[campo]] de esa cláusula en el
 * catálogo; si no está, no se validan sus datos (el API lo hace).
 * Claves: 'elegidas', 'elegidas.{i}.{campo}', 'acepto'.
 */
export function validarPaso4(
  d: FormPaso4,
  ctx: { campos: Record<string, string[]>; conCoarrendatario?: boolean },
): ErroresPaso {
  if (d.elegidas.length === 0) return {}
  const ids = d.elegidas.map((e) => e.clausulaId)
  const errores = limpiar({
    elegidas:
      ids.length > MAX_ADICIONALES
        ? `Máximo ${MAX_ADICIONALES} cláusulas adicionales por contrato`
        : new Set(ids).size !== ids.length
          ? 'Hay una cláusula repetida en la lista'
          : null,
    acepto: d.acepto ? null : 'Acepta el aviso de responsabilidad para continuar',
  })
  d.elegidas.forEach((e, i) => {
    for (const campo of ctx.campos[e.clausulaId] ?? []) {
      const msg = texto(e.valores[campo], 200, ctx.conCoarrendatario)
      if (msg) errores[`elegidas.${i}.${campo}`] = msg
    }
  })
  return errores
}

/** Cuerpo del PUT del paso 4. Una cláusula sin [[campo]] (las propias) no lleva `valores`. */
export function entradaPaso4(d: FormPaso4, avisoVersion: string): Paso4Entrada {
  if (d.elegidas.length === 0) return { omitir: true }
  return {
    clausulas: d.elegidas.map(({ clausulaId, valores }) =>
      Object.keys(valores).length ? { clausulaId, valores } : { clausulaId },
    ),
    aceptoResponsabilidad: true,
    avisoVersion,
  }
}
