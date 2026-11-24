/**
 * Bloqueos y pendientes del asistente de contratos V3 (Entrega 3).
 *
 * Los decide el API (§5.2 del diseño): aquí se pintan como una lista de puntos
 * por resolver, en ámbar (pendiente, no error), cada uno con el enlace a donde
 * se corrige. Los que resuelve una misma evaluación nueva van en un solo punto.
 * Un bloqueo impide iniciar o generar; un aviso no.
 */

'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { IconAlertTriangle, IconArrowRight, IconBuilding2, IconInfo, IconLoader, IconRefresh } from '@/components/icons'
import { Button, buttonClasses } from '@/components/ui/Button'
import { EvaluarEnEstudioNuevo } from '@/components/expedientes/EvaluarEnEstudioNuevo'
import { ReasignarEstudioModal } from '@/components/expedientes/ReasignarEstudioModal'
import { SeguirSinCoarrendatario } from '@/components/expedientes/SeguirSinCoarrendatario'
import { formatCurrency } from '@/lib/constants'
import { PagarConsultaAdicional } from '@/components/expedientes/PagarConsultaAdicional'
import { CanalCofianza } from '@/components/expedientes/ContactoCofianzaInline'
import { estudioService } from '@/services/estudioService'
import { ApiClientError } from '@/lib/api'
import { useReevaluarCanon } from '@/hooks/useReevaluarCanon'
import { useUsuarioVista } from '@/components/expedientes/VerComo'
import { esRolInterno } from '@/components/expedientes/textoVisible'
import { miembroDebeCompletarPerfil } from '@/components/expedientes/PerfilPersonalIncompletoBanner'
import type { IValorConsultaAdicional } from '@/types/sustitucion'
import type { Bloqueo, NumeroPaso } from '@/types/contratoV3'
import type { ITrabaContrato } from '@/types/expediente'
import {
  COARRENDATARIO_EN_VERIFICACION,
  SEGUNDO_FIRMANTE_EN_CURSO,
  avisoPrimaDeTraba,
  bloqueoOfreceSeguirSinEl,
  trabaAdmiteSeguirSinEl,
} from '@/lib/frenosSegundoFirmante'

export { COARRENDATARIO_EN_VERIFICACION, SEGUNDO_FIRMANTE_EN_CURSO, avisoPrimaDeTraba, bloqueoOfreceSeguirSinEl, trabaAdmiteSeguirSinEl }

/**
 * Las dos salidas del canon que supera el aprobado (reporte de Gerencia, 21-nov, punto 1): pactar un canon
 * hasta el aprobado o reasignar el estudio a un inmueble de canon igual o inferior. Las arma el detalle del
 * estudio, que tiene la evaluación aprobada.
 */
export interface SalidasCanon {
  /** Hasta qué canon quedó aprobado el estudio; null = sin la cifra. */
  canonHabilitadoCop: number | null
  /** El contrato se crea con el asistente V3 (el canon se pacta en su paso 1); si no, el contrato toma el canon del inmueble. */
  asistenteV3: boolean
  inmuebleId?: string | null
  /**
   * traba_contrato.puede_reevaluar: canon mayor al evaluado, sin la leyenda «hasta un canon»; la API ofrece
   * evaluar de nuevo con el canon de la propiedad (necesita la evaluación y la propiedad).
   */
  puedeReevaluar?: boolean
  /** La evaluación aprobada, para reasignarla; null = aquí no se ofrece reasignar. */
  estudio?: {
    id: string
    canonEvaluado: number | string | null
    /** Como en la tarjeta de la evaluación: undefined = sin el dato de la API. */
    canonHabilitado?: number | null
    hastaCanon?: boolean
  } | null
  onReasignado?: () => void
}

interface Props {
  bloqueos: Bloqueo[]
  /** Faltantes del asistente ("Falta guardar este paso", fechas vencidas…). */
  faltantes?: { paso: NumeroPaso; mensaje: string }[]
  /** Lo que frenan (p. ej. "iniciar el contrato"): encabeza la lista con «Para …, resuelve estos N puntos:». */
  para?: string
  /** Sin él (solo faltantes) no se pintan los enlaces de acción. */
  expedienteId?: string
  inmuebleId?: string
  /** ¿Abre la ficha del inmueble? El asesor restringido, solo lo suyo o asignado; null mientras se consulta. */
  inmuebleAccesible?: boolean | null
  /** Titular de la inmobiliaria: el único que edita los Datos para contrato. */
  esTitular?: boolean
  /** Puede cancelar el estudio y crear uno nuevo (la salida de una evaluación que ya no sirve). */
  puedeEditar?: boolean
  /** Hay un borrador de contrato: al evaluar de nuevo también se cancela. */
  conBorrador?: boolean
  /** Si llega, los ítems con paso muestran "Ir al paso N". */
  onIrPaso?: (paso: NumeroPaso) => void
  /** Tras emitir o regenerar el CRC, o evaluar de nuevo el canon, aquí mismo: recarga el estado del asistente. */
  onCambio?: () => void
  /** Ya está en el detalle del estudio: «Ir al estudio» no llevaría a ningún lado. */
  enElEstudio?: boolean
  /** resumen.canon.evaluadoA5D: la reevaluación del canon solo se ofrece en un estudio evaluado con la Adenda 5. */
  evaluadoA5D?: boolean
  /** En el estudio: con el freno del canon se ofrecen sus dos salidas (pactar uno menor o reasignar). */
  salidasCanon?: SalidasCanon
  /** traba_contrato.aviso_prima (estudios anteriores a la Adenda 5): se muestra al confirmar «Seguir sin el segundo firmante». */
  avisoPrima?: string | null
}

const enlace = 'inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline'

/**
 * Del canon pactado (paso 1): se pacta uno menor o, con este, hace falta evaluar de nuevo sobre
 * un canon del inmueble actualizado. Sin enlace al estudio: allí no hay nada que hacer.
 */
const CANON_PIDE_EVALUACION = ['CANON_FUERA_DE_TOLERANCIA', 'CANON_INGRESO_EXCEDE']

/**
 * Sin estos, la única salida es una evaluación nueva (los del canon también se resuelven bajándolo).
 * CRC_SIN_MARGEN / CRC_VENCIDO: al certificado no le alcanza la vigencia para el proceso de firma.
 */
export const SOLO_NUEVA_EVALUACION = ['ESTUDIO_VENCIDO', 'CANON_SIN_EVALUADO', 'CRC_SIN_MARGEN', 'CRC_VENCIDO']

/** El error del API que solo se resuelve con una evaluación nueva (al generar o enviar a firma en el flujo anterior), como bloqueo; null si es otro. */
export function bloqueoDeEvaluacion(err: unknown): Bloqueo | null {
  return err instanceof ApiClientError && SOLO_NUEVA_EVALUACION.includes(err.code ?? '')
    ? { codigo: err.code!, mensaje: err.message }
    : null
}

/** Del certificado de la evaluación actual: la nueva emite el suyo sola, así que no son un punto aparte. */
export const DEL_CRC = ['CRC_NO_EMITIDO', 'CRC_DESACTUALIZADO']

/** Del segundo firmante y del titular de la decisión: frenan el contrato hasta que se resuelvan en el estudio. */
export const DE_LAS_PARTES = ['COARRENDATARIO_PENDIENTE', ...SEGUNDO_FIRMANTE_EN_CURSO, 'TITULAR_NO_DISPONIBLE']

/**
 * Código propio de la web (la API no lo envía): el freno del canon que se arma con traba_contrato, porque
 * antes de iniciar el contrato la API solo avisa del canon (lo bloquea al pactarlo en el paso 1).
 */
export const CANON_EXCEDE_APROBADO = 'CANON_EXCEDE_APROBADO'

/** Del canon: el pactado (o, antes del contrato, el del inmueble) supera el aprobado. */
export const DEL_CANON = ['CANON_REQUIERE_REEVALUACION', 'CANON_FUERA_DE_TOLERANCIA', 'CANON_INGRESO_EXCEDE', CANON_EXCEDE_APROBADO]

/**
 * Los frenos que dice traba_contrato y que la API no envió como bloqueo (antes de iniciar el contrato,
 * o en el flujo anterior, que no tiene asistente). Con el bloqueo de la API, manda el suyo.
 */
function frenosDeTraba(traba: ITrabaContrato | null | undefined, ya: Bloqueo[]): Bloqueo[] {
  if (!traba?.texto) return []
  if (traba.codigo === 'canon_excede' && !ya.some((b) => DEL_CANON.includes(b.codigo))) {
    return [{ codigo: CANON_EXCEDE_APROBADO, mensaje: traba.texto }]
  }
  if (traba.codigo === 'coarrendatario_pendiente' && !ya.some((b) => b.codigo === 'COARRENDATARIO_PENDIENTE')) {
    return [{ codigo: 'COARRENDATARIO_PENDIENTE', mensaje: traba.texto, accion: 'estudio', puede_seguir_sin_el: true }]
  }
  // Bloque 4: el segundo firmante ya aceptó (en evaluación, con la consulta fallida o en verificación). El texto
  // es siempre el de la API (el mismo código tiene más de uno). Con el bloqueo de la API, manda el suyo.
  if (trabaAdmiteSeguirSinEl(traba) && !ya.some((b) => SEGUNDO_FIRMANTE_EN_CURSO.includes(b.codigo))) {
    return [
      {
        codigo: traba.codigo === 'coarrendatario_en_verificacion' ? COARRENDATARIO_EN_VERIFICACION : 'COARRENDATARIO_SIN_EVALUAR',
        mensaje: traba.texto,
        accion: 'estudio',
        // La traba de la API viene con esa salida (su texto la ofrece): el freno la lleva como el bloqueo del asistente.
        puede_seguir_sin_el: true,
      },
    ]
  }
  // Adenda 6 §4: Cofianza termina la verificación de las listas del solicitante (no tiene salida aquí).
  if (traba.codigo === 'solicitante_en_verificacion' && !ya.some((b) => b.codigo === 'SOLICITANTE_EN_VERIFICACION')) {
    return [{ codigo: 'SOLICITANTE_EN_VERIFICACION', mensaje: traba.texto }]
  }
  // Resultado vencido: el mismo punto de «la evaluación ya no sirve», con su estudio nuevo.
  if (traba.codigo === 'vencido' && !ya.some((b) => SOLO_NUEVA_EVALUACION.includes(b.codigo))) {
    return [{ codigo: 'ESTUDIO_VENCIDO', mensaje: traba.texto }]
  }
  return []
}

/**
 * Lo que impide crear el contrato y se ve desde el estudio: del segundo firmante y del titular, el canon
 * por encima del aprobado, y la evaluación que ya no sirve (con su certificado). Con `traba`
 * (traba_contrato del estudio) también lo que dice la API aunque no llegue como bloqueo. Mientras haya
 * algo, no se ofrece «Crear contrato».
 */
export function frenosDelContrato(bloqueos: Bloqueo[], traba?: ITrabaContrato | null): Bloqueo[] {
  const pideEvaluacion = bloqueos.some((b) => SOLO_NUEVA_EVALUACION.includes(b.codigo))
  const frenos = bloqueos.filter(
    (b) =>
      DE_LAS_PARTES.includes(b.codigo) ||
      DEL_CANON.includes(b.codigo) ||
      (pideEvaluacion && (SOLO_NUEVA_EVALUACION.includes(b.codigo) || DEL_CRC.includes(b.codigo))),
  )
  return [...frenos, ...frenosDeTraba(traba, frenos)]
}

/** Los resuelve Cofianza: se dice el canal (su mensaje ya dice «Escríbanos»). */
const ESCRIBANOS = ['TITULAR_NO_DISPONIBLE', 'TARIFA_NO_SOPORTADA', 'COARRENDATARIO_RECHAZADO']

interface Punto {
  key: string
  texto: string
  razones?: string[]
  nota?: string
  /** El bloqueo que decide el enlace de acción. */
  bloqueo?: Bloqueo
  /** El punto de la evaluación nueva: su acción es crear un estudio nuevo. */
  nuevaEvaluacion?: boolean
  paso?: NumeroPaso
  /** Faltante del asistente: con onIrPaso se antepone "Paso N:". */
  esFaltante?: boolean
}

/** Adenda 5 §14: evaluar de nuevo con el canon del inmueble (I4: además, solo si el estudio se evaluó con ella). */
const ofreceReevaluar = (b: Bloqueo, evaluadoA5D: boolean | undefined) =>
  b.accion === 'reevaluar_canon' && !!b.puedeReevaluar && evaluadoA5D !== false

/** Los bloqueos que resuelve una misma evaluación nueva se juntan en el lugar del primero. */
function puntosDe(bloqueos: Bloqueo[], evaluadoA5D?: boolean): Punto[] {
  const evaluacion = bloqueos.filter((b) => SOLO_NUEVA_EVALUACION.includes(b.codigo))
  const juntos = evaluacion.length
    ? bloqueos.filter((b) => SOLO_NUEVA_EVALUACION.includes(b.codigo) || DEL_CRC.includes(b.codigo))
    : []
  const out: Punto[] = []
  bloqueos.forEach((b, i) => {
    if (!juntos.includes(b)) {
      out.push({
        key: `${b.codigo}-${i}`,
        texto: b.mensaje,
        razones: b.detalle,
        // Bajar el canon se hace en el paso 1; conservarlo pide evaluar de nuevo sobre el canon nuevo del inmueble.
        nota: CANON_PIDE_EVALUACION.includes(b.codigo)
          ? 'Si necesita este canon, primero actualice el canon del inmueble y luego cree el estudio nuevo.'
          : ofreceReevaluar(b, evaluadoA5D)
            ? b.reevaluacionConCosto
              ? 'Si necesita este canon, primero actualice el canon del inmueble y luego evalúe de nuevo el estudio: como el reporte ya venció, es una consulta adicional.'
              : b.reevaluacionConCosto === false
                ? 'Si necesita este canon, primero actualice el canon del inmueble y luego evalúe de nuevo el estudio, sin costo.'
                : 'Si necesita este canon, primero actualice el canon del inmueble y luego evalúe de nuevo el estudio.'
            : undefined,
        bloqueo: b,
        paso: b.paso,
      })
    } else if (b === juntos[0]) {
      out.push({
        key: 'nueva-evaluacion',
        texto: 'La evaluación crediticia actual ya no sirve para el contrato:',
        // El «Se requiere nueva evaluación.» de cada motivo sobra bajo este encabezado.
        razones: evaluacion.map((e) =>
          e.mensaje.replace(/\s*(Se requiere (una )?nueva evaluación|Hay que renovar la evaluación)\.$/, ''),
        ),
        nota:
          'La evaluación nueva se hace en un estudio nuevo, con su cobro' +
          (juntos.length > evaluacion.length ? '; al aprobarse emite sola su certificado de riesgo (CRC).' : '.'),
        nuevaEvaluacion: true,
      })
    }
  })
  return out
}

export function BloqueosContrato({
  bloqueos,
  faltantes = [],
  para,
  expedienteId,
  inmuebleId,
  inmuebleAccesible = true,
  esTitular,
  puedeEditar,
  conBorrador,
  onIrPaso,
  onCambio,
  enElEstudio = false,
  evaluadoA5D,
  salidasCanon,
  avisoPrima,
}: Props) {
  const user = useUsuarioVista()
  const rol = user?.rol
  const puntos: Punto[] = [
    ...puntosDe(bloqueos, evaluadoA5D),
    ...faltantes.map((f, i) => ({ key: `falta-${f.paso}-${i}`, texto: f.mensaje, paso: f.paso, esFaltante: true })),
  ]
  if (puntos.length === 0) return null
  // En el asistente de un estudio que no está aprobado, seguir sin el coarrendatario no lleva a un contrato.
  const noAprobado = bloqueos.some((b) => b.codigo === 'EXPEDIENTE_NO_APROBADO')

  const accion = (b: Bloqueo): ReactNode => {
    if (!expedienteId) return null
    // Reporte de Gerencia (21-nov, punto 1): en el estudio, el canon por encima del aprobado tiene dos salidas.
    if (salidasCanon && DEL_CANON.includes(b.codigo)) {
      return (
        <>
          {puedeEditar && (
            <SalidasCanonEnEstudio
              expedienteId={expedienteId}
              salidas={salidasCanon}
              inmuebleAccesible={inmuebleAccesible}
              // El freno armado con traba_contrato no trae la acción de la API: «Evaluar de nuevo» va aquí.
              conReevaluar={b.codigo === CANON_EXCEDE_APROBADO}
              onCambio={onCambio}
            />
          )}
          {/* El bloqueo de la API conserva su acción (evaluar de nuevo, editar el canon, estudio nuevo). */}
          {b.codigo !== CANON_EXCEDE_APROBADO && accionBase(b, expedienteId)}
        </>
      )
    }
    // Punto 3 (Adenda 5 §12): con el titular aprobado, el coarrendatario que no responde no frena el contrato.
    // El texto del punto ya dice que puede esperarlo: aquí solo la otra salida.
    if (b.codigo === 'COARRENDATARIO_PENDIENTE' && puedeEditar && !noAprobado) {
      return (
        <>
          <SeguirSinCoarrendatario expedienteId={expedienteId} avisoPrima={avisoPrima} onCambio={onCambio} />
          {!enElEstudio && (
            <Link href={`/expedientes/${expedienteId}`} className={enlace}>
              Ir al estudio <IconArrowRight size={12} />
            </Link>
          )}
        </>
      )
    }
    // Bloque 4: el segundo firmante ya aceptó y su evaluación sigue en curso, o Cofianza lo verifica. El texto del
    // punto dice que puede esperar el resultado: aquí, la otra salida («Seguir sin el segundo firmante» lo saca del estudio).
    if (bloqueoOfreceSeguirSinEl(b) && puedeEditar && !noAprobado) {
      return (
        <>
          <SeguirSinCoarrendatario expedienteId={expedienteId} caso="en_curso" avisoPrima={avisoPrima} onCambio={onCambio} />
          {!enElEstudio && (
            <Link href={`/expedientes/${expedienteId}`} className={enlace}>
              Ir al estudio <IconArrowRight size={12} />
            </Link>
          )}
        </>
      )
    }
    return accionBase(b, expedienteId)
  }

  const accionBase = (b: Bloqueo, expedienteId: string): ReactNode => {
    const volverAqui = encodeURIComponent(`/expedientes/${expedienteId}/contrato`)
    switch (b.accion) {
      case 'datos_contrato': {
        if (!esTitular) {
          return (
            <p className="text-xs text-gray-600">Pídale al titular de la inmobiliaria que complete los Datos para contrato.</p>
          )
        }
        return (
          <Link href={`/configuracion/datos-contrato?returnTo=${volverAqui}`} className={enlace}>
            Completar Datos para contrato <IconArrowRight size={12} />
          </Link>
        )
      }
      case 'reevaluar_canon': {
        // Adenda 5 §14: el canon pactado supera el aprobado. Se pacta uno menor en el paso 1 o, si la API lo
        // ofrece (puedeReevaluar), se actualiza el canon del inmueble y se evalúa de nuevo: sin costo, o con
        // una consulta adicional si el reporte venció (reevaluacionConCosto). Sin esa salida, editar el canon
        // del inmueble no sirve de nada aquí: solo queda pactar uno menor.
        const inmueble = b.inmuebleId ?? inmuebleId
        if (!ofreceReevaluar(b, evaluadoA5D) || !puedeEditar || !inmueble) return null
        return (
          <>
            {inmuebleAccesible && (
              <Link href={`/inmuebles/${inmueble}/editar?returnTo=${volverAqui}`} className={enlace}>
                Editar el canon del inmueble <IconArrowRight size={12} />
              </Link>
            )}
            {b.estudioId && (
              <ReevaluarCanon
                estudioId={b.estudioId}
                inmuebleId={inmueble}
                conCosto={b.reevaluacionConCosto}
                onCambio={onCambio}
              />
            )}
          </>
        )
      }
      case 'estudio':
        if (CANON_PIDE_EVALUACION.includes(b.codigo)) {
          return (
            <>
              {puedeEditar && inmuebleId && inmuebleAccesible && (
                <Link href={`/inmuebles/${inmuebleId}/editar?returnTo=${volverAqui}`} className={enlace}>
                  Editar el canon del inmueble <IconArrowRight size={12} />
                </Link>
              )}
              {puedeEditar && <EvaluarEnEstudioNuevo expedienteId={expedienteId} conBorrador={conBorrador} />}
            </>
          )
        }
        // La evaluación sigue vigente y el API deja emitir el CRC desde aquí (la ficha del estudio no lo ofrece).
        if (DEL_CRC.includes(b.codigo) && b.estudioId && puedeEditar && onCambio) {
          return <EmitirCertificado estudioId={b.estudioId} regenerar={b.codigo === 'CRC_DESACTUALIZADO'} onCambio={onCambio} />
        }
        // Sin permiso (o sin la evaluación a mano) «Ir al estudio» no llevaba a ningún botón: se dice quién lo emite.
        // B12: con el canal concreto, y al miembro frenado solo por su perfil se le dice eso.
        if (DEL_CRC.includes(b.codigo)) {
          if (miembroDebeCompletarPerfil(user)) {
            return (
              <Link href={`/configuracion/cuenta?returnTo=${volverAqui}`} className={enlace}>
                Complete su perfil para emitirlo <IconArrowRight size={12} />
              </Link>
            )
          }
          if (puedeEditar) {
            return (
              <p className="text-xs text-gray-600">
                Escríbanos para emitir el certificado de esta evaluación: <CanalCofianza />.
              </p>
            )
          }
          return <p className="text-xs text-gray-600">Lo emite quien administra este estudio.</p>
        }
        // Lo del segundo firmante se sigue en su tarjeta, en el resumen del estudio.
        if (enElEstudio) {
          return DE_LAS_PARTES.includes(b.codigo) ? (
            <p className="text-xs text-gray-600">Su avance se ve en la tarjeta del coarrendatario de este estudio.</p>
          ) : null
        }
        return (
          <Link href={`/expedientes/${expedienteId}`} className={enlace}>
            Ir al estudio <IconArrowRight size={12} />
          </Link>
        )
      case 'inmueble':
        // Hoy solo INMUEBLE_INACTIVO: reactivarlo es del administrador de Cofianza, en el detalle del
        // inmueble (el formulario de edición no tiene el estado).
        if (rol === 'administrador' && inmuebleId) {
          return (
            <Link href={`/inmuebles/${inmuebleId}`} className={enlace}>
              Ir al inmueble para reactivarlo <IconArrowRight size={12} />
            </Link>
          )
        }
        return (
          <p className="text-xs text-gray-600">
            {rol === 'operador_analista'
              ? 'Pídale a un administrador que reactive el inmueble.'
              : 'Pídale a Cofianza que reactive el inmueble.'}
          </p>
        )
      default:
        if (ESCRIBANOS.includes(b.codigo)) {
          // TITULAR_NO_DISPONIBLE por otro contrato del estudio: se cancela en su pestaña Contratos.
          if (!/Escr[ií]banos/i.test(b.mensaje)) {
            return enElEstudio ? null : (
              <Link href={`/expedientes/${expedienteId}`} className={enlace}>
                Ir al estudio <IconArrowRight size={12} />
              </Link>
            )
          }
          // A Cofianza no se le dice «Escríbanos» (lo resuelve ella).
          if (esRolInterno(rol)) return null
          return (
            <p className="text-xs text-gray-600">
              Escríbanos <CanalCofianza /> y le indicamos cómo continuar.
            </p>
          )
        }
        return null
    }
  }

  const irPaso = (paso?: NumeroPaso) =>
    paso && onIrPaso ? (
      <button type="button" onClick={() => onIrPaso(paso)} className={enlace}>
        Ir al paso {paso} <IconArrowRight size={12} />
      </button>
    ) : null

  const numerados = puntos.length > 1
  return (
    <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      {para && (
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
          <IconAlertTriangle size={18} className="shrink-0 text-amber-600" />
          Para {para}, resuelva {numerados ? `estos ${puntos.length} puntos` : 'este punto'}:
        </p>
      )}
      <ol className="space-y-3">
        {puntos.map((p, i) => {
          const hacer = p.nuevaEvaluacion ? (
            expedienteId && puedeEditar ? <EvaluarEnEstudioNuevo expedienteId={expedienteId} conBorrador={conBorrador} /> : null
          ) : p.bloqueo ? (
            accion(p.bloqueo)
          ) : null
          const ir = irPaso(p.paso)
          return (
            <li key={p.key} className="flex items-start gap-3">
              {numerados ? (
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-amber-800 ring-1 ring-amber-300"
                >
                  {i + 1}
                </span>
              ) : (
                !para && <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              )}
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-sm font-medium text-gray-900">
                  {p.esFaltante && onIrPaso && <span className="font-semibold">Paso {p.paso}: </span>}
                  {p.texto}
                </p>
                {p.razones && p.razones.length > 0 && (
                  <ul className="list-disc space-y-0.5 pl-5 text-sm text-gray-700">
                    {p.razones.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
                {p.nota && <p className="text-xs text-gray-600">{p.nota}</p>}
                {(hacer || ir) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {hacer}
                    {ir}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/**
 * Las dos salidas del canon que supera el aprobado, desde el estudio: crear el contrato con un canon hasta el
 * aprobado (en el asistente se pacta en el paso 1; en el flujo anterior el contrato toma el canon del
 * inmueble) o reasignar la evaluación a otro inmueble. La API valida las dos.
 */
function SalidasCanonEnEstudio({
  expedienteId,
  salidas,
  inmuebleAccesible,
  conReevaluar,
  onCambio,
}: {
  expedienteId: string
  salidas: SalidasCanon
  inmuebleAccesible: boolean | null
  /** Con salidas.puedeReevaluar: también «Evaluar de nuevo» con el canon de la propiedad. */
  conReevaluar: boolean
  onCambio?: () => void
}) {
  const [reasignar, setReasignar] = useState(false)
  const hasta = salidas.canonHabilitadoCop ? formatCurrency(salidas.canonHabilitadoCop) : null
  const volver = encodeURIComponent(`/expedientes/${expedienteId}`)
  return (
    <>
      {salidas.asistenteV3 ? (
        <Link href={`/expedientes/${expedienteId}/contrato`} className={buttonClasses('primary', 'sm', 'min-h-10')}>
          {hasta ? `Crear el contrato con un canon de hasta ${hasta}` : 'Crear el contrato con un canon menor'}
          <IconArrowRight size={14} />
        </Link>
      ) : (
        salidas.inmuebleId &&
        inmuebleAccesible && (
          <Link href={`/inmuebles/${salidas.inmuebleId}/editar?returnTo=${volver}`} className={buttonClasses('primary', 'sm', 'min-h-10')}>
            {hasta ? `Ajustar el canon de la propiedad a ${hasta} o menos` : 'Ajustar el canon de la propiedad'}
            <IconArrowRight size={14} />
          </Link>
        )
      )}
      {salidas.estudio && (
        <>
          <Button tamano="sm" variante="secondary" className="min-h-10" onClick={() => setReasignar(true)}>
            <IconBuilding2 size={14} />
            Reasignar a otra propiedad
          </Button>
          <ReasignarEstudioModal
            isOpen={reasignar}
            onClose={() => setReasignar(false)}
            estudioId={salidas.estudio.id}
            inmuebleActualId={salidas.inmuebleId}
            canonEvaluado={salidas.estudio.canonEvaluado}
            canonHabilitado={salidas.estudio.canonHabilitado}
            sinReevaluacion={salidas.estudio.hastaCanon}
            expedienteId={expedienteId}
            onReasignado={salidas.onReasignado}
          />
        </>
      )}
      {conReevaluar && salidas.puedeReevaluar && salidas.estudio && salidas.inmuebleId && (
        <>
          <ReevaluarCanon estudioId={salidas.estudio.id} inmuebleId={salidas.inmuebleId} onCambio={onCambio} />
          <p className="w-full text-xs text-gray-600">
            «Evaluar de nuevo» usa el canon actual de la propiedad. Si requiere una consulta adicional, verá su valor antes
            de pagarla.
          </p>
        </>
      )}
    </>
  )
}

/** Emite (o regenera) el CRC de la evaluación vigente sin salir del contrato. */
function EmitirCertificado({ estudioId, regenerar, onCambio }: { estudioId: string; regenerar: boolean; onCambio: () => void }) {
  const [emitiendo, setEmitiendo] = useState(false)
  const emitir = async () => {
    setEmitiendo(true)
    try {
      await estudioService.generarCertificado(estudioId)
      toast.success(regenerar ? 'Certificado regenerado' : 'Certificado emitido')
      onCambio()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo emitir el certificado.')
    } finally {
      setEmitiendo(false)
    }
  }
  return (
    <Button tamano="sm" onClick={emitir} disabled={emitiendo}>
      {emitiendo && <IconLoader size={14} className="animate-spin" />}
      {regenerar ? 'Regenerar certificado' : 'Emitir certificado'}
    </Button>
  )
}

const TONO_AVISO = {
  // No bloquea (p. ej. el canon del registro antes de pactar el del contrato).
  info: { caja: 'border-blue-200 bg-blue-50 text-blue-800', Icono: IconInfo, icono: 'text-blue-600' },
  // Bloquea el envío a firma (textos pendientes de aprobación).
  aviso: { caja: 'border-amber-200 bg-amber-50 text-amber-900', Icono: IconAlertTriangle, icono: 'text-amber-600' },
}

/** Avisos en lista: en azul los que no bloquean; en ámbar los que impiden enviar a firma. */
export function AvisosContrato({ avisos, tono = 'info' }: { avisos: string[]; tono?: keyof typeof TONO_AVISO }) {
  if (avisos.length === 0) return null
  const t = TONO_AVISO[tono]
  return (
    <ul className="space-y-2">
      {avisos.map((a) => (
        <li key={a} className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${t.caja}`}>
          <t.Icono size={18} className={`mt-0.5 shrink-0 ${t.icono}`} />
          <span>{a}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Adenda 5 §14: evalúa de nuevo el estudio con el canon actual del inmueble (lo decide la API). Sin costo, o
 * con una consulta adicional (`conCosto`): la API responde 402 con el valor y se ofrece pagarla aquí mismo.
 * Sin saber el costo (`conCosto` ausente, el freno armado con traba_contrato) dice solo «Evaluar de nuevo».
 * Si la API responde que no, su mensaje queda a la vista.
 */
function ReevaluarCanon({
  estudioId,
  inmuebleId,
  conCosto,
  onCambio,
}: {
  estudioId: string
  inmuebleId: string
  conCosto?: boolean
  onCambio?: () => void
}) {
  const { reevaluar, evaluando } = useReevaluarCanon(onCambio)
  const [respuesta, setRespuesta] = useState<{
    mensaje: string
    reintentar: boolean
    consultaAdicional: IValorConsultaAdicional | null
  } | null>(null)
  const evaluar = async () => setRespuesta(await reevaluar(estudioId, inmuebleId))
  return (
    <div className="w-full space-y-2">
      {(!respuesta || respuesta.reintentar) && (
        <Button
          variante="secondary"
          className="min-h-10"
          onClick={() => void evaluar()}
          disabled={evaluando}
          aria-busy={evaluando || undefined}
        >
          {evaluando ? <IconLoader size={16} className="animate-spin" /> : <IconRefresh size={16} />}
          {evaluando
            ? 'Evaluando…'
            : conCosto
              ? 'Evaluar de nuevo (consulta adicional)'
              : conCosto === false
                ? 'Evaluar de nuevo sin costo'
                : 'Evaluar de nuevo'}
        </Button>
      )}
      {respuesta && (
        <p role="alert" className="text-xs text-amber-900">
          {respuesta.mensaje}
        </p>
      )}
      {respuesta?.consultaAdicional && (
        <PagarConsultaAdicional
          estudioId={estudioId}
          inmuebleId={inmuebleId}
          valor={respuesta.consultaAdicional}
          onSinCobro={() => {
            setRespuesta(null)
            onCambio?.()
          }}
        />
      )}
    </div>
  )
}
