/**
 * Estado de una fila de estudios (lista e inicio): una sola etapa, calculada
 * igual que en el detalle, y de quién es el turno con lo que hay que hacer.
 * Reemplaza las hasta cuatro pastillas de antes (paso, estado formal,
 * resultado y turno), que usaban palabras distintas a las del detalle.
 */

import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import type { IExpediente } from '@/types/expediente'
import {
  ETAPA_LABEL,
  esEsperaDePersona,
  esEtapaDeTraba,
  etiquetaTraba,
  vigenciaResultado,
  type EtapaEstudio,
  type Turno,
  type VigenciaResultado,
  type VistaTurno,
} from '@/lib/etapaEstudio'
import { queSigue } from '@/lib/ayudaEstudio'
import { etapaDeFila, accionDeFila, esperaCargaNotaria, fraseCanonGestor, revisionDemorada, segundoEnVerificacion, TURNO_GESTOR_TRABA } from '@/lib/etapaFila'
import { IconClock } from '@/components/icons'
import { cn } from '@/lib/utils'
import { InfoTip } from '@/components/ui/InfoTip'
import { PastillaTurno, analistaAjeno, type OpcionesTurno } from './PastillaTurno'
import { fechaCondicion } from './textoVisible'

export const AYUDA_PUNTAJE =
  'Puntaje de la central de riesgo, de 0 a 999. Cofianza decide con ese puntaje y además con ingresos, deudas y el canon: por eso un puntaje alto puede no aprobarse.'

export type Tono = 'verde' | 'rojo' | 'ambar' | 'azul' | 'gris'

const TONO: Record<Tono, { wrap: string; dot: string }> = {
  verde: { wrap: 'bg-primary-50 text-primary-700', dot: 'bg-primary-600' },
  rojo: { wrap: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  ambar: { wrap: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  azul: { wrap: 'bg-blue-50 text-blue-700', dot: 'bg-blue-600 motion-safe:animate-pulse' },
  gris: { wrap: 'bg-gray-50 text-gray-600 border border-gray-200', dot: 'bg-gray-400' },
}

const TONO_ETAPA: Record<EtapaEstudio, Tono> = {
  contrato: 'verde',
  // Aprobado, pero algo impide el contrato: pendiente, no éxito.
  canon_excede: 'ambar',
  coarrendatario_pendiente: 'ambar',
  coarrendatario_en_evaluacion: 'ambar',
  coarrendatario_en_verificacion: 'ambar',
  solicitante_en_verificacion: 'ambar',
  vencido: 'gris',
  firma: 'verde',
  firma_incompleta: 'rojo',
  vigente: 'verde',
  finalizado: 'verde',
  no_aprobado: 'rojo',
  cancelado: 'rojo',
  enlace: 'ambar',
  fallida: 'ambar',
  sin_ejecutar: 'ambar',
  pago: 'ambar',
  decision: 'ambar',
  segundo_firmante: 'ambar',
  bloqueado: 'rojo',
  consulta: 'azul',
  visita: 'gris',
  habilitar: 'gris',
  no_habilitada: 'gris',
  autorizacion: 'gris',
  pago_prospecto: 'gris',
  espera_coarrendatario: 'gris',
  reapertura: 'gris',
}

const BOGOTA = 'America/Bogota'
const diaBogota = (d: Date) => Date.parse(d.toLocaleDateString('en-CA', { timeZone: BOGOTA }))

/** Plazo de la condición del coarrendatario, en días de calendario de Colombia. */
function plazo(venceEn: string): string {
  const vence = new Date(venceEn)
  const d = Math.round((diaBogota(vence) - diaBogota(new Date())) / 86_400_000)
  if (d <= 0) return 'vence hoy'
  if (d <= 3) return `vence en ${d} ${d === 1 ? 'día' : 'días'}`
  return `hasta el ${vence.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: BOGOTA })}`
}

function pastillaEtapa(e: IExpediente, etapa: EtapaEstudio, interno: boolean): { texto: string; tono: Tono } {
  const ev = e.estudio_vigente
  const tono = TONO_ETAPA[etapa]
  if (etapa === 'enlace') {
    if (ev?.estado_bloqueo === 'bloqueado_documento') return { texto: 'Bloqueado por documento', tono: 'rojo' }
    if (ev?.estado_bloqueo === 'identidad_rechazada') {
      return { texto: interno ? 'Identidad rechazada' : 'Identidad rechazada: comuníquese con Cofianza', tono: 'rojo' }
    }
    if (ev?.estado_bloqueo === 'pendiente_reenvio') return { texto: 'Pendiente de reenvío', tono }
  }
  if (etapa === 'fallida' && ev?.coarrendatario_fallido) return { texto: 'Falló la consulta del segundo firmante', tono }
  if (esEtapaDeTraba(etapa)) return { texto: etiquetaTraba(etapa, e.traba_contrato), tono }
  const c = ev?.condicion_coarrendatario
  // Etapas que salen del resultado que envía la API: su texto manda (la web no lo redacta).
  if (etapa === 'segundo_firmante' || etapa === 'bloqueado') {
    const base = ev?.desenlace_texto ?? ETAPA_LABEL[etapa]
    // Con el segundo firmante en verificación el plazo no vence (y empieza de nuevo al terminar): no se pinta una fecha que ya no rechaza.
    const conPlazo = etapa === 'segundo_firmante' && !!c && !segundoEnVerificacion(e)
    return { texto: conPlazo && c ? `${base} · ${plazo(c.vence_en)}` : base, tono }
  }
  if (etapa === 'decision' && c) {
    return { texto: `${c.obligatoria ? 'Requiere coarrendatario' : 'Aprobado con condición'} · ${plazo(c.vence_en)}`, tono }
  }
  if (etapa === 'espera_coarrendatario' && ev?.espera_coarrendatario_hasta) {
    const hasta = new Date(ev.espera_coarrendatario_hasta).toLocaleString('es-CO', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: BOGOTA,
    })
    return { texto: `${ETAPA_LABEL.espera_coarrendatario} · hasta el ${hasta}`, tono }
  }
  return { texto: ETAPA_LABEL[etapa], tono }
}

/**
 * Adenda de precios §8.2: el caso R2 entra a la cola del analista con
 * prioridad baja. Discreto y solo para Cofianza: es orden interno de la cola.
 */
const AYUDA_PRIORIDAD_BAJA = 'Puntaje de la central en la franja media: se revisa al final de la cola.'

/** Con `conAyuda`, la explicación va en una burbuja (como PastillaEtapa); sin ella, en el title. */
export function PrioridadBaja({ conAyuda = false }: { conAyuda?: boolean }) {
  const pastilla = (
    <span
      title={conAyuda ? undefined : AYUDA_PRIORIDAD_BAJA}
      className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500"
    >
      Prioridad baja
    </span>
  )
  if (!conAyuda) return pastilla
  // Anclada al inicio de la pastilla y abierta a la derecha: la pastilla va al inicio de su celda.
  return (
    <span className="relative inline-flex items-center gap-0.5">
      {pastilla}
      <InfoTip texto={AYUDA_PRIORIDAD_BAJA} etiqueta="Por qué tiene prioridad baja" lado="derecha" anclada />
    </span>
  )
}

export interface DatosEstadoFila {
  etapa: EtapaEstudio
  texto: string
  tono: Tono
  /** La frase «Qué sigue» del detalle, según quién mira (title de la etapa). */
  ayuda: string
  /** Puntaje de la central; 0 = no se muestra. */
  score: number
  /** Pastilla de turno; null = no se muestra. */
  turno: ({ turno: Turno } & OpcionesTurno) | null
  /**
   * Debajo del turno, lo que redacta la API cuando el turno solo no lo dice: en el aprobado con segundo
   * firmante, «Presente un segundo firmante antes del…» (con su plazo). null = nada.
   */
  detalleTurno: string | null
  demora: ReturnType<typeof revisionDemorada>
  /** Adenda de precios §8.2: solo Cofianza (orden interno de la cola). */
  prioridadBaja: boolean
  /** Hasta cuándo sirve el resultado (aprobado sin contrato); null = no se muestra. */
  vigencia: VigenciaResultado | null
}

/**
 * Lo que pinta una fila, separado del cómo: EstadoFila lo apila en una celda y
 * la cola de Cofianza (ExpedientesTablaCofianza) lo reparte en «Etapa» y «Qué sigue».
 */
export function datosEstadoFila(
  expediente: IExpediente,
  {
    interno,
    vista,
    analista = false,
    ahora,
    yo,
  }: {
    interno: boolean
    vista: VistaTurno
    analista?: boolean
    ahora: number
    /** Id de quien mira: si la revisión la tomó otro analista, «En revisión de X» en vez de «Su turno». */
    yo?: string | null
  },
): DatosEstadoFila {
  const etapa = etapaDeFila(expediente)
  const { texto, tono } = pastillaEtapa(expediente, etapa, interno)
  const ev = expediente.estudio_vigente
  // U4: en un estudio no aprobable o cancelado el puntaje ya no orienta nada.
  const conPuntaje = etapa !== 'no_aprobado' && etapa !== 'cancelado'
  const score = conPuntaje && ev?.resultado && ev.resultado !== 'pendiente' ? (ev.score ?? 0) : 0
  const c = ev?.condicion_coarrendatario
  // Cofianza verifica al segundo firmante ya evaluado (lo dice la API): el turno es suyo, no una decisión del estudio.
  const verificacion =
    etapa === 'coarrendatario_en_verificacion' || etapa === 'solicitante_en_verificacion' || (etapa === 'segundo_firmante' && segundoEnVerificacion(expediente))
  const revision = expediente.estado === 'condicionado' && expediente.depende_de === 'cofianza' && !verificacion
  // L4: solo Cofianza ve cuánto lleva la revisión (desde las 24 h).
  const demora = interno && etapa === 'decision' && !c ? revisionDemorada(expediente.en_revision_desde, ahora) : null
  // En firma el RPC dice 'prospecto', pero faltan todas las partes: la misma pastilla que la franja del detalle.
  // Adenda 6 §2: en notaría no se esperan firmas: cargar el contrato firmado le toca a quien gestiona.
  // Con el canon que excede o el segundo firmante en curso, decide quien gestiona (como turnoDeEtapa).
  // «Aprobado con segundo firmante» con el segundo en verificación: de Cofianza, diga lo que diga depende_de.
  const turno: Turno | null | undefined =
    etapa === 'firma' && esperaCargaNotaria(expediente)
      ? 'gestor'
      : etapa === 'firma' && expediente.depende_de === 'prospecto'
        ? 'firmas'
        : expediente.depende_de && TURNO_GESTOR_TRABA.includes(etapa)
          ? 'gestor'
          : verificacion && etapa === 'segundo_firmante'
            ? 'cofianza'
            : expediente.depende_de
  // Identidad rechazada: la pastilla ya dice qué hacer (comunicarse con Cofianza); «Su turno» sobra.
  // En la espera, la etapa ya dice a quién se espera: «Esperando al prospecto» la contradecía.
  // U8: fuera de Cofianza la etapa ya dice «En revisión de Cofianza»; la pastilla de turno lo repetía.
  const conTurno =
    !!turno &&
    (interno || ev?.estado_bloqueo !== 'identidad_rechazada') &&
    etapa !== 'espera_coarrendatario' &&
    // Reabierto por un reemplazo: la etapa ya dice a quién se espera (nunca «Cofianza procesando»).
    etapa !== 'reapertura' &&
    !(revision && vista !== 'cofianza')
  // La verificación la toma un analista, como la revisión.
  const deCofianza = revision || verificacion

  return {
    etapa,
    texto,
    tono,
    // La frase «Qué sigue» del detalle, según quién mira: AYUDA_ETAPA sola le hablaba al gestor y,
    // en la condición del coarrendatario, decía que lo decide un analista.
    ayuda: queSigue(etapa, {
      vista,
      analista,
      fechaCondicion: c ? fechaCondicion(c.vence_en) : null,
      esperaHasta: ev?.espera_coarrendatario_hasta ?? null,
      sinInmueble: !expediente.inmueble_id,
      enLista: true,
      textoApi: ev?.siguiente_accion_texto ?? null,
      textoTraba: expediente.traba_contrato?.texto ?? null,
      segundoEnVerificacion: verificacion ? 'api' : false,
      firmaNotaria: esperaCargaNotaria(expediente),
    }),
    score,
    turno:
      conTurno && turno
        ? {
            turno,
            revision,
            analista,
            sinEjecutar: etapa === 'sin_ejecutar',
            // El aprobado con segundo firmante siempre espera a otra persona; la decisión, solo con la condición.
            condicion: esEsperaDePersona(etapa, !!c),
            adenda3: etapa === 'decision' && !!c,
            verificacion,
            verificacionDe: etapa === 'solicitante_en_verificacion' ? ('solicitante' as const) : ('segundo' as const),
            tomadoPor: deCofianza && analista ? analistaAjeno(expediente.analista, yo) : null,
            accion: turno === 'gestor' ? accionDeFila(expediente, etapa) : undefined,
            // Oficina Virtual (punto 13): a quien gestiona, «Aprobado hasta $X. Elija un inmueble de ese valor o pida bajar el canon».
            fraseGestor: turno === 'gestor' && etapa === 'canon_excede' ? fraseCanonGestor(expediente.traba_contrato) : undefined,
          }
        : null,
    // Solo con el turno de quien gestiona: con el segundo firmante en curso (se le espera) o en verificación,
    // «Presente un segundo firmante antes del…» contradiría al turno.
    detalleTurno: conTurno && turno === 'gestor' && etapa === 'segundo_firmante' ? (ev?.siguiente_accion_texto ?? null) : null,
    demora,
    prioridadBaja: interno && expediente.estado === 'condicionado' && expediente.prioridad_revision === 'baja',
    vigencia: vigenciaResultado(etapa, {
      hasta: expediente.vigencia_hasta,
      firmarHasta: expediente.firmar_hasta,
      vencioEn: expediente.traba_contrato?.vencio_en,
      sinMargen: expediente.traba_contrato?.sin_margen,
      ahoraMs: ahora,
    }),
  }
}

const TONO_VIGENCIA: Record<VigenciaResultado['tono'], string> = {
  gris: 'text-gray-500',
  // -700/-800: legibles también sobre el fondo coral de «Su turno».
  ambar: 'text-amber-800',
  rojo: 'text-red-700',
}

const PASTILLA_VIGENCIA: Record<VigenciaResultado['tono'], string> = {
  gris: 'border-gray-200 bg-gray-50 text-gray-600',
  ambar: 'border-amber-300 bg-amber-50 text-amber-800',
  rojo: 'border-red-200 bg-red-50 text-red-700',
}

/**
 * «Vence en N días» / «Vence hoy» / «Vencido» del resultado: en línea debajo de la etapa (lista, cola e
 * inicio) o, con `pastilla`, junto al estado del encabezado del detalle.
 */
export function VigenciaFila({
  vigencia,
  pastilla = false,
  className,
}: {
  vigencia: VigenciaResultado
  pastilla?: boolean
  className?: string
}) {
  return (
    <span
      title={vigencia.titulo}
      className={cn(
        'inline-flex items-center gap-1 font-medium',
        // rounded-xl: en una línea se ve igual que rounded-full; «Vence en N días · envíe a firma antes del…» puede bajar a dos
        // líneas a 390 px, y ahí no queda una cápsula estirada.
        pastilla ? cn('rounded-xl border px-2.5 py-1 text-xs', PASTILLA_VIGENCIA[vigencia.tono]) : cn('text-[11px]', TONO_VIGENCIA[vigencia.tono]),
        className,
      )}
    >
      <IconClock size={pastilla ? 14 : 12} className="shrink-0" aria-hidden="true" />
      {vigencia.texto}
      <span className="sr-only">. {vigencia.titulo}</span>
    </span>
  )
}

/**
 * Pastilla de la etapa: la misma en la celda apilada y en la cola de Cofianza.
 * Con `conAyuda`, la frase «Qué sigue» va en una burbuja junto a la pastilla
 * (se abre con toque y teclado; el title solo se ve con mouse). Sin ella queda
 * el title: el widget del inicio la pinta dentro de un enlace, donde no cabe
 * un botón.
 */
export function PastillaEtapa({
  texto,
  tono,
  ayuda,
  conAyuda = false,
}: Pick<DatosEstadoFila, 'texto' | 'tono' | 'ayuda'> & { conAyuda?: boolean }) {
  const pastilla = (
    <span
      title={conAyuda ? undefined : ayuda}
      // rounded-xl: en una línea se ve igual que rounded-full; si el plazo la parte en dos, no queda una cápsula estirada.
      className={cn('inline-flex items-center gap-1.5 rounded-xl px-2.5 py-0.5 text-xs font-medium', TONO[tono].wrap)}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONO[tono].dot)} />
      {texto}
    </span>
  )
  if (!conAyuda || !ayuda) return pastilla
  // Anclada al inicio de la pastilla y abierta a la derecha: la pastilla va al inicio
  // de su celda o columna, y con una etapa larga el ícono queda cerca del borde (en
  // 390 px una burbuja que abriera desde el ícono se salía de la pantalla).
  return (
    <span className="relative inline-flex items-center gap-0.5">
      {pastilla}
      <InfoTip texto={ayuda} etiqueta={`Qué sigue en «${texto}»`} lado="derecha" anclada />
    </span>
  )
}

export function EstadoFila({
  expediente,
  interno,
  vista,
  analista = false,
  compacto = false,
}: {
  expediente: IExpediente
  interno: boolean
  vista: VistaTurno
  /** Administrador u operador: deciden la revisión y ejecutan la consulta que no arrancó. */
  analista?: boolean
  /** Inicio: las pastillas en fila, no apiladas. */
  compacto?: boolean
}) {
  // Hora fijada al montar: Date.now() en render es impuro (cambia en cada render).
  const [ahora] = useState(() => Date.now())
  const yo = useAuthStore((st) => st.user?.id)
  const d = datosEstadoFila(expediente, { interno, vista, analista, ahora, yo })

  return (
    <div className={cn('flex items-start gap-1', compacto ? 'flex-row flex-wrap items-center gap-1.5' : 'flex-col')}>
      <PastillaEtapa texto={d.texto} tono={d.tono} ayuda={d.ayuda} />
      {d.vigencia && <VigenciaFila vigencia={d.vigencia} />}
      {d.score > 0 && (
        <span title={AYUDA_PUNTAJE} className="text-[11px] text-gray-500">
          Puntaje de la central: {d.score} (no es el de Cofianza)
        </span>
      )}
      {d.turno && <PastillaTurno vista={vista} {...d.turno} />}
      {d.demora && (
        <span className={cn('text-[11px] font-medium', d.demora.tono === 'rojo' ? 'text-red-600' : 'text-amber-700')}>
          {d.demora.texto}
        </span>
      )}
      {d.prioridadBaja && <PrioridadBaja />}
    </div>
  )
}
