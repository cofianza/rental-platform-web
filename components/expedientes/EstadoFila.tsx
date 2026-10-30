/**
 * Estado de una fila de estudios (lista e inicio): una sola etapa, calculada
 * igual que en el detalle, y de quién es el turno con lo que hay que hacer.
 * Reemplaza las hasta cuatro pastillas de antes (paso, estado formal,
 * resultado y turno), que usaban palabras distintas a las del detalle.
 */

import { useState } from 'react'
import type { IExpediente } from '@/types/expediente'
import { ETAPA_LABEL, type EtapaEstudio, type VistaTurno } from '@/lib/etapaEstudio'
import { queSigue } from '@/lib/ayudaEstudio'
import { etapaDeFila, accionDeFila, revisionDemorada } from '@/lib/etapaFila'
import { cn } from '@/lib/utils'
import { PastillaTurno } from './PastillaTurno'
import { fechaCondicion } from './textoVisible'

type Tono = 'verde' | 'rojo' | 'ambar' | 'azul' | 'gris'

const TONO: Record<Tono, { wrap: string; dot: string }> = {
  verde: { wrap: 'bg-primary-50 text-primary-700', dot: 'bg-primary-600' },
  rojo: { wrap: 'bg-red-50 text-red-600', dot: 'bg-red-500' },
  ambar: { wrap: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  azul: { wrap: 'bg-blue-50 text-blue-600', dot: 'bg-blue-600 animate-pulse' },
  gris: { wrap: 'bg-gray-50 text-gray-600 border border-gray-200', dot: 'bg-gray-400' },
}

const TONO_ETAPA: Record<EtapaEstudio, Tono> = {
  contrato: 'verde',
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
  consulta: 'azul',
  visita: 'gris',
  habilitar: 'gris',
  no_habilitada: 'gris',
  autorizacion: 'gris',
  pago_prospecto: 'gris',
  espera_coarrendatario: 'gris',
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
  if (etapa === 'fallida' && ev?.coarrendatario_fallido) return { texto: 'Falló la consulta del coarrendatario', tono }
  const c = ev?.condicion_coarrendatario
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
function PrioridadBaja({ expediente }: { expediente: IExpediente }) {
  if (expediente.estado !== 'condicionado' || expediente.prioridad_revision !== 'baja') return null
  return (
    <span
      title="Puntaje de la central en la franja media: se revisa al final de la cola"
      className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500"
    >
      Prioridad baja
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
  const etapa = etapaDeFila(expediente)
  const { texto, tono } = pastillaEtapa(expediente, etapa, interno)
  const ev = expediente.estudio_vigente
  // U4: en un estudio no aprobable o cancelado el puntaje ya no orienta nada.
  const conPuntaje = etapa !== 'no_aprobado' && etapa !== 'cancelado'
  const score = conPuntaje && ev?.resultado && ev.resultado !== 'pendiente' ? (ev.score ?? 0) : 0
  const c = ev?.condicion_coarrendatario
  const revision = expediente.estado === 'condicionado' && expediente.depende_de === 'cofianza'
  // L4: solo Cofianza ve cuánto lleva la revisión (desde las 24 h).
  const demora = interno && etapa === 'decision' && !c ? revisionDemorada(expediente.en_revision_desde, ahora) : null
  // En firma el RPC dice 'prospecto', pero faltan todas las partes: la misma pastilla que la franja del detalle.
  const turno = etapa === 'firma' && expediente.depende_de === 'prospecto' ? 'firmas' : expediente.depende_de
  // Identidad rechazada: la pastilla ya dice qué hacer (comunicarse con Cofianza); «Su turno» sobra.
  // En la espera, la etapa ya dice a quién se espera: «Esperando al prospecto» la contradecía.
  // U8: fuera de Cofianza la etapa ya dice «En revisión de Cofianza»; la pastilla de turno lo repetía.
  const conTurno =
    !!turno &&
    (interno || ev?.estado_bloqueo !== 'identidad_rechazada') &&
    etapa !== 'espera_coarrendatario' &&
    !(revision && vista !== 'cofianza')

  return (
    <div className={cn('flex items-start gap-1', compacto ? 'flex-row flex-wrap items-center gap-1.5' : 'flex-col')}>
      <span
        // La frase «Qué sigue» del detalle, según quién mira: AYUDA_ETAPA sola le hablaba al gestor y,
        // en la condición del coarrendatario, decía que lo decide un analista.
        title={queSigue(etapa, {
          vista,
          analista,
          fechaCondicion: c ? fechaCondicion(c.vence_en) : null,
          esperaHasta: ev?.espera_coarrendatario_hasta ?? null,
          sinInmueble: !expediente.inmueble_id,
        })}
        // rounded-xl: en una línea se ve igual que rounded-full; si el plazo la parte en dos, no queda una cápsula estirada.
        className={cn('inline-flex items-center gap-1.5 rounded-xl px-2.5 py-0.5 text-xs font-medium', TONO[tono].wrap)}
      >
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONO[tono].dot)} />
        {texto}
      </span>
      {score > 0 && (
        <span
          title="Puntaje de la central de riesgo, de 0 a 999. Cofianza decide con ese puntaje y además con ingresos, deudas y el canon: por eso un puntaje alto puede no aprobarse."
          className="text-[11px] text-gray-500"
        >
          Puntaje de la central: {score} (no es el de Cofianza)
        </span>
      )}
      {conTurno && (
        <PastillaTurno
          turno={turno}
          vista={vista}
          revision={revision}
          analista={analista}
          sinEjecutar={etapa === 'sin_ejecutar'}
          accion={turno === 'gestor' ? accionDeFila(expediente, etapa) : undefined}
        />
      )}
      {demora && (
        <span className={cn('text-[11px] font-medium', demora.tono === 'rojo' ? 'text-red-600' : 'text-amber-700')}>
          {demora.texto}
        </span>
      )}
      {interno && <PrioridadBaja expediente={expediente} />}
    </div>
  )
}
