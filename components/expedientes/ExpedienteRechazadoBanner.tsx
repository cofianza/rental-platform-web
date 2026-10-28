/**
 * ExpedienteRechazadoBanner — banner de cierre cuando expediente.estado='rechazado'.
 *
 * Sustituye visualmente al "stepper en curso" para comunicar que el flujo
 * terminó sin éxito y por qué. Lee `motivo_rechazo` del expediente, que el
 * orchestrator (titular) o el ponderador (coarrendatario) escriben al cerrar.
 *
 * DOS lecturas del mismo hecho, según quién mira (`esProspecto`):
 *
 *  - Gestor (admin, operador, inmobiliaria, propietario): el texto operativo de
 *    siempre, con el motivo que escribió el motor o, si rechazó un analista, el
 *    que escribió para el gestor (P34).
 *  - Prospecto (rol 'solicitante', que tiene panel propio: vitrina crea la
 *    cuenta auto-confirmada y puede abrir su expediente): flujo del módulo de
 *    estudios §13 — "Nunca usar la palabra 'rechazado' en ninguna pantalla
 *    dirigida al prospecto" — y §10 — "No aprobable por ahora. […] Nunca es un
 *    portazo". Esa regla es por AUDIENCIA, no por route group: esta pantalla la
 *    ve muchísima más gente que la página pública /verificar.
 *
 * El estado en la base sigue siendo 'rechazado'; aquí solo cambia lo que lee la
 * persona. `motivo_rechazo` no se muestra al prospecto porque lo escribe el
 * motor con el mismo vocabulario ("la evaluación crediticia del titular fue
 * rechazado. El estudio no procede.").
 */

'use client'

import { IconAlertTriangle, IconInfo } from '@/components/icons'
import { formatDate } from '@/lib/constants'
import { hoyBogota } from '@/hooks/useContratoV3'
import type { IEstudioHistorial } from '@/types/estudio'
import { ESTUDIO_NUEVO, MAX_REEVALUACIONES, plazoEfectivoApelacion } from './ReEvaluacionSection'

interface ExpedienteRechazadoBannerProps {
  motivo?: string | null
  /** true cuando quien mira es el propio solicitante (rol 'solicitante'). */
  esProspecto?: boolean
  /** Analista o administrador: abre la reevaluación (apelación, Política §11) del titular. */
  onReevaluar?: () => void
  /**
   * Historial de la última evaluación del titular: dice si la apelación sigue
   * abierta y hasta cuándo. undefined = todavía no se leyó; null = no se pudo leer.
   */
  apelacion?: IEstudioHistorial | null
}

// Neutro (P34): no culpa a la evaluación crediticia cuando pudo decidirlo un analista.
const MOTIVO_FALLBACK = 'El estudio no quedó aprobable y termina sin contrato.'

/**
 * Lo que tarda, de sobra, el gancho que saca del rechazo al estudio cuya
 * reevaluación se aprobó. ponytail: ventana por reloj; si el gancho falla, pasado
 * este rato se ve «no admite apelación». Que la API diga el porqué del rechazo si hace falta.
 */
const MOVIENDO_MS = 10 * 60_000

/**
 * Lo que la API admite hoy (F6): la reevaluación por decidir, la apelación
 * abierta con su último día real (Política §11 y §8), o cerrada y por qué.
 * La API solo calcula el plazo si el resultado se puede apelar: sin él es
 * 'no_admite', antes que el reporte vencido. Las listas confirmadas (Adenda 3
 * V2 §7) caen ahí sin nombrarse: la inmobiliaria no recibe ese dato.
 */
function leerApelacion(h: IEstudioHistorial) {
  const ultima = h.historial[h.historial.length - 1]
  const reporte = h.reporte_vence_el ?? null
  const reporteVencido = !!reporte && hoyBogota() > reporte
  if (ultima?.estudio_padre_id) {
    // Aprobada, el estudio sale del rechazo en segundo plano y esta lectura pudo
    // llegar antes. Pasado ese rato, el rechazo vino después (listas, por ejemplo).
    if (ultima.estado === 'completado' && ultima.resultado === 'aprobado' && Date.now() - Date.parse(ultima.updated_at) < MOVIENDO_MS) {
      return { estado: 'actualizando' } as const
    }
    if (ultima.estado === 'cancelado') return { estado: 'cancelada' } as const
    if (ultima.resultado === 'pendiente') {
      return { estado: reporteVencido ? 'por_decidir_sin_reporte' : 'por_decidir', fecha: reporte } as const
    }
  }
  if (h.puede_reevaluar) {
    const fecha = plazoEfectivoApelacion(h)
    // El reporte de la central vence antes que el plazo de la apelación: ese día
    // también se acaba el tiempo de Cofianza para decidirla (Política §8).
    const porReporte = !!fecha && fecha === reporte && (h.responder_hasta ?? h.apelar_hasta ?? '') > fecha
    return { estado: 'abierta', fecha, radicada: !!h.responder_hasta, porReporte } as const
  }
  if (h.total_en_cadena > MAX_REEVALUACIONES) return { estado: 'agotada' } as const
  if (!h.apelar_hasta) return { estado: 'no_admite' } as const
  if (reporteVencido) return { estado: 'sin_reporte', fecha: reporte } as const
  if (h.plazo_vencido) return { estado: 'plazo_vencido', fecha: h.apelar_hasta } as const
  return { estado: 'no_admite' } as const
}

/**
 * Política V4.1 §11: canal de apelación. Va en TODA pantalla del prospecto que
 * diga "No aprobable" — es lo que convierte el "por ahora" en algo accionable.
 * Sin constante de correo en lib/: el literal es el mismo de /privacidad.
 */
export function NotaApelacion({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-slate-600 ${className}`}>
      Puede presentar una apelación escribiendo a{' '}
      <a href="mailto:hola@cofianza.co" className="font-medium text-primary-700 underline">
        hola@cofianza.co
      </a>{' '}
      dentro de los 15 días hábiles siguientes a esta notificación. Cofianza responde en máximo
      10 días hábiles. La apelación no detiene el proceso de arrendamiento.
    </p>
  )
}

export function ExpedienteRechazadoBanner({ motivo, esProspecto, onReevaluar, apelacion }: ExpedienteRechazadoBannerProps) {
  if (esProspecto) {
    return (
      <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
            <IconInfo size={28} className="text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 mb-0.5">No aprobable por ahora</h3>
            <p className="text-sm text-slate-700">
              Con la información disponible hoy no podemos respaldar este estudio. No es una
              decisión definitiva sobre usted: su perfil puede cambiar.
            </p>
            <p className="text-xs text-slate-600 mt-2">
              Puede volver a intentarlo más adelante o escribirnos si desea entender qué pesó en
              la evaluación.
            </p>
            <NotaApelacion className="mt-2" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-white border border-red-200 flex items-center justify-center shrink-0">
          <IconAlertTriangle size={28} className="text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-red-900 mb-0.5">Estudio no aprobable</h3>
          <p className="text-sm text-red-800">{motivo || MOTIVO_FALLBACK}</p>
          {/* 27-oct: «El flujo termina aquí» escondía la apelación (Política §11). */}
          {apelacion !== undefined &&
            (onReevaluar ? (
              <ApelacionCofianza a={apelacion && leerApelacion(apelacion)} onReevaluar={onReevaluar} />
            ) : (
              <ApelacionGestor a={apelacion && leerApelacion(apelacion)} />
            ))}
        </div>
      </div>
    </div>
  )
}

type Apelacion = ReturnType<typeof leerApelacion>
const BOTON =
  'mt-2 inline-flex items-center rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100'
const RECARGUE = 'Recargue la página en unos segundos.'
const YA_NO_ADMITE = `Este resultado ya no admite apelación. ${ESTUDIO_NUEVO}`

/** Analista o administrador. Sin historial (no se pudo leer), la oferta de siempre: el detalle dice el plazo exacto. */
function ApelacionCofianza({ a, onReevaluar }: { a: Apelacion | null; onReevaluar: () => void }) {
  if (!a || a.estado === 'abierta' || a.estado === 'plazo_vencido') {
    const texto = a?.estado === 'plazo_vencido'
      ? `Venció el plazo para apelar${a.fecha ? ` (${formatDate(a.fecha)})` : ''}. ${ESTUDIO_NUEVO} Si el solicitante apeló a tiempo por correo u otro canal, registre la fecha en que lo hizo.`
      : `${a?.radicada ? 'La apelación se radicó a tiempo.' : '¿Llegaron documentos que cambian el resultado, por ejemplo el ingreso real del solicitante?'} ${
          a?.fecha
            ? `Se puede reevaluar con el reporte de la central de esta decisión hasta el ${formatDate(a.fecha)}.`
            : 'Se puede reevaluar dentro de los 15 días hábiles siguientes a esta decisión, mientras siga vigente el reporte de la central (30 días desde la consulta).'
        }`
    return (
      <div className="mt-3">
        <p className="text-xs text-red-800">{texto}</p>
        <button type="button" onClick={onReevaluar} className={BOTON}>
          {a?.estado === 'plazo_vencido' ? 'Registrar la fecha de la apelación' : 'Reevaluar con documentos'}
        </button>
      </div>
    )
  }
  const vencio = `El reporte de la central venció${a.fecha ? ` el ${formatDate(a.fecha)}` : ''} (30 días desde la consulta)`
  const texto = {
    actualizando: `La reevaluación se registró y el estudio se está actualizando. ${RECARGUE}`,
    cancelada: `La reevaluación se canceló: la apelación quedó cerrada sin cambiar el resultado. ${ESTUDIO_NUEVO}`,
    por_decidir: `La reevaluación está por decidir: regístrela con «Registrar resultado» en la pestaña Evaluación${a.fecha ? ` a más tardar el ${formatDate(a.fecha)}, cuando vence el reporte de la central` : ''}.`,
    por_decidir_sin_reporte: `${vencio} y la reevaluación por decidir ya no se puede registrar. Cancélela con «Cancelar evaluación» en la pestaña Evaluación para cerrar la apelación. ${ESTUDIO_NUEVO}`,
    sin_reporte: `${vencio}: la apelación ya no se puede decidir con él. ${ESTUDIO_NUEVO}`,
    agotada: `Ya se usaron las ${MAX_REEVALUACIONES} reevaluaciones que admite este resultado: no se puede apelar otra vez. ${ESTUDIO_NUEVO}`,
    no_admite: 'Este resultado no admite apelación.',
  }[a.estado]
  return <p className="text-xs text-red-800 mt-2">{texto}</p>
}

/** Inmobiliaria, propietario y Gerencia: la apelación va por correo a Cofianza. */
function ApelacionGestor({ a }: { a: Apelacion | null }) {
  if (!a || (a.estado === 'abierta' && !a.radicada)) {
    return (
      <p className="text-xs text-red-700 mt-2">
        ¿Tiene documentos que cambian el resultado, por ejemplo el ingreso real del
        solicitante? Puede apelar enviándolos a{' '}
        <a href="mailto:hola@cofianza.co" className="font-medium underline">
          hola@cofianza.co
        </a>{' '}
        {a?.fecha ? `a más tardar el ${formatDate(a.fecha)}` : 'dentro de los 15 días hábiles siguientes a esta decisión'}.{' '}
        {a?.porReporte ? 'Cofianza la decide a más tardar ese mismo día.' : 'Cofianza responde en máximo 10 días hábiles.'}
      </p>
    )
  }
  const hasta = (a.estado === 'abierta' || a.estado === 'por_decidir') && a.fecha ? ` a más tardar el ${formatDate(a.fecha)}` : ''
  const texto = {
    actualizando: `Cofianza ya respondió la apelación y el estudio se está actualizando. ${RECARGUE}`,
    cancelada: `La apelación se cerró sin cambiar el resultado. ${ESTUDIO_NUEVO}`,
    abierta: `Cofianza recibió la apelación y la responde${hasta || ' en máximo 10 días hábiles'}.`,
    por_decidir: `Cofianza está revisando la apelación con los documentos recibidos y la responde${hasta || ' en máximo 10 días hábiles'}.`,
    por_decidir_sin_reporte: YA_NO_ADMITE,
    sin_reporte: YA_NO_ADMITE,
    plazo_vencido: `Venció el plazo para apelar este resultado${a.estado === 'plazo_vencido' && a.fecha ? ` (${formatDate(a.fecha)})` : ''}. ${ESTUDIO_NUEVO}`,
    agotada: YA_NO_ADMITE,
    no_admite: 'Este resultado no admite apelación.',
  }[a.estado]
  return <p className="text-xs text-red-700 mt-2">{texto}</p>
}
