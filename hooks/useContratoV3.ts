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
import { contratoV3Service } from '@/services/contratoV3Service'
import type {
  Contacto,
  EstadoAsistente,
  GuardarPasoBody,
  Paso1,
  Paso2,
  Paso3,
  Paso5,
} from '@/types/contratoV3'

export type AccionContratoV3 = null | 'iniciar' | 'guardar' | 'generar'

export function useContratoV3(expedienteId: string) {
  // Por expediente: la página no se desmonta al pasar de un estudio a otro, y una
  // respuesta tardía del anterior no debe pisar ni mostrarse en el actual.
  const [cargas, setCargas] = useState<Record<string, EstadoAsistente>>({})
  const [error, setError] = useState<string | null>(null)
  const [accion, setAccion] = useState<AccionContratoV3>(null)
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
        if (err instanceof ApiClientError && [404, 409, 422].includes(err.statusCode)) {
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
    (body: GuardarPasoBody) => mutar('guardar', () => contratoV3Service.guardarPaso(expedienteId, body)),
    [mutar, expedienteId],
  )
  const generar = useCallback(
    () => mutar('generar', () => contratoV3Service.generar(expedienteId)),
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

function texto(v: string | null | undefined, max: number): string | null {
  const t = (v ?? '').trim()
  if (!t) return MSG_OBLIGATORIO
  if (t.length > max) return `Máximo ${max} caracteres`
  if (/\p{Cc}/u.test(t) || MARCADOR.test(t) || /coarrendatari/i.test(t)) return MSG_NO_IMPRIMIBLE
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
    ruta: d.ruta === 'A' ? null : 'La Ruta B todavía no está disponible',
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
