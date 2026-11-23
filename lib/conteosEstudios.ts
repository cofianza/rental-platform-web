/**
 * Chips y tasa de aprobación de la lista de estudios de quien gestiona (inmobiliaria y propietario).
 * Reporte de Gerencia (21-nov), punto 6: todos los contadores con la misma definición de cada estado,
 * y sin «Condicionados»: los resultados son aprobado, aprobado con segundo firmante y no aprobable
 * (Adenda 5 §4), más el bloqueo por listas y lo que revisa Cofianza.
 *
 * La API nueva cuenta además `segundo_firmante`, `revision_cofianza` y `bloqueado` en
 * GET /expedientes/conteos (y acepta esos filtros); `condicionado` sigue siendo la unión de los tres.
 * Con una API anterior (sin esas claves) los chips y la tasa quedan como antes. Pura.
 */

import type { EstudioFiltro } from '@/types/expediente'

export type ConteosEstudios = Partial<Record<EstudioFiltro, number>>

export interface ChipEstudio {
  id: EstudioFiltro
  label: string
  /** Qué abarca el chip cuando el nombre no basta (se lee debajo de los chips con el chip elegido). */
  ayuda?: string
}

/**
 * Lo que entra en «Requieren su acción»: las cláusulas del RPC de la lista que dan el turno a quien
 * gestiona (las mismas de ACCION_GESTOR en lib/etapaFila).
 */
export const AYUDA_REQUIERE_ACCION =
  'Todo lo que espera algo de usted: habilitar o pagar la evaluación, reenviar el enlace, reintentar o ejecutar la consulta, crear o terminar el contrato y su firma, cargar el acta de entrega, presentar al segundo firmante o retirar a una persona bloqueada por listas.'

/** La misma ayuda para quien no puede editar (solo lectura): lo hace alguien de su equipo. */
export const AYUDA_REQUIERE_ACCION_EQUIPO =
  'Todo lo que espera algo de su equipo: habilitar o pagar la evaluación, reenviar el enlace, reintentar o ejecutar la consulta, crear o terminar el contrato y su firma, cargar el acta de entrega, presentar al segundo firmante o retirar a una persona bloqueada por listas.'

/** Todos los chips posibles, en el orden del recorrido. Cuáles se ven lo decide chipsVisibles. */
export const CHIPS_ESTUDIO: readonly ChipEstudio[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'requiere_accion', label: 'Requieren su acción', ayuda: AYUDA_REQUIERE_ACCION },
  { id: 'sin_estudio', label: 'Antes de la evaluación', ayuda: 'Visita pendiente o evaluación sin habilitar.' },
  // U13: el mismo nombre que la pestaña de la lista de Cofianza.
  { id: 'en_proceso', label: 'Antes del resultado' },
  // La API cuenta aquí el condicionado sin «aprobado con segundo firmante» ni «bloqueado por listas»:
  // la revisión manual y las verificaciones abiertas (identidad, una coincidencia en listas).
  {
    id: 'revision_cofianza',
    label: 'En revisión de Cofianza',
    ayuda: 'Un analista de Cofianza revisa el estudio o verifica a una persona antes de dar el resultado.',
  },
  // Solo con una API anterior: la unión de los tres de abajo y la revisión de Cofianza.
  { id: 'condicionado', label: 'Condicionados' },
  { id: 'aprobado', label: 'Aprobados' },
  // También los aprobados con condición de coarrendatario de la Adenda 3 (la API los cuenta aquí).
  {
    id: 'segundo_firmante',
    label: 'Con segundo firmante',
    ayuda: 'Aprobados con la condición de presentar un segundo firmante (coarrendatario) válido.',
  },
  {
    id: 'bloqueado',
    label: 'Bloqueados por listas',
    ayuda: 'Una persona del estudio está en listas restrictivas: debe salir del estudio para continuar.',
  },
  { id: 'rechazado', label: 'No aprobables' },
]

/** Las claves que solo cuenta la API nueva. */
const CLAVES_ADENDA5: readonly EstudioFiltro[] = ['segundo_firmante', 'revision_cofianza', 'bloqueado']

/** La API cuenta los resultados de la Adenda 5 por separado (trae al menos una de sus claves con un número). */
export function tieneConteosAdenda5(conteos: ConteosEstudios | null | undefined): boolean {
  return !!conteos && CLAVES_ADENDA5.some((k) => typeof conteos[k] === 'number')
}

/** Los chips de siempre, con cualquier API. */
const COMUNES: readonly EstudioFiltro[] = ['todos', 'requiere_accion', 'sin_estudio', 'en_proceso', 'aprobado', 'rechazado']

/**
 * Qué chips se ven, en el orden de CHIPS_ESTUDIO:
 * - conteos undefined (todavía no llegan): solo los comunes, sin adivinar qué API responde;
 * - con los conteos de la Adenda 5: «En revisión de Cofianza», «Con segundo firmante» y «Bloqueados por
 *   listas» (este solo con alguno o elegido); sin ellos (API anterior, o null porque no se pudieron leer):
 *   «Condicionados», como antes.
 * El chip elegido siempre se ve (p. ej. «Condicionados» que quedó elegido de antes): así se sabe qué filtra.
 */
export function chipsVisibles(
  conteos: ConteosEstudios | null | undefined,
  activo: EstudioFiltro,
  /** Quien mira no puede editar (solo lectura): «Requieren acción del equipo», con su ayuda. */
  o: { equipo?: boolean } = {},
): ChipEstudio[] {
  const ids = new Set<EstudioFiltro>(COMUNES)
  if (conteos !== undefined) {
    if (tieneConteosAdenda5(conteos)) {
      ids.add('revision_cofianza')
      ids.add('segundo_firmante')
      if ((conteos?.bloqueado ?? 0) > 0) ids.add('bloqueado')
    } else {
      ids.add('condicionado')
    }
  }
  ids.add(activo)
  return CHIPS_ESTUDIO.filter((c) => ids.has(c.id)).map((c) =>
    o.equipo && c.id === 'requiere_accion' ? { ...c, label: 'Requieren acción del equipo', ayuda: AYUDA_REQUIERE_ACCION_EQUIPO } : c,
  )
}

export interface TasaAprobacion {
  /** Porcentaje con un decimal como máximo. */
  tasa: number
  aprobados: number
  decididos: number
  /** Aprobados con segundo firmante; null con una API anterior (no los cuenta aparte). */
  conSegundoFirmante: number | null
  noAprobables: number
  /** Bloqueados por listas (0 con una API anterior). */
  bloqueados: number
}

/**
 * Tasa de aprobación: aprobados / decididos. Decididos = aprobados + con segundo firmante + no
 * aprobables + bloqueados por listas; lo que revisa Cofianza todavía no está decidido. El aprobado con
 * segundo firmante cuenta en los decididos pero NO en los aprobados: sin el segundo firmante válido no
 * llega al contrato. Con una API anterior, aprobados / (aprobados + no aprobables), como antes. null sin
 * conteos o sin ningún decidido.
 */
export function tasaAprobacion(conteos: ConteosEstudios | null | undefined): TasaAprobacion | null {
  if (!conteos) return null
  const a5 = tieneConteosAdenda5(conteos)
  const aprobados = conteos.aprobado ?? 0
  const conSegundoFirmante = a5 ? (conteos.segundo_firmante ?? 0) : null
  const bloqueados = a5 ? (conteos.bloqueado ?? 0) : 0
  const noAprobables = conteos.rechazado ?? 0
  const decididos = aprobados + (conSegundoFirmante ?? 0) + noAprobables + bloqueados
  if (decididos <= 0) return null
  return { tasa: Math.round((aprobados / decididos) * 1000) / 10, aprobados, decididos, conSegundoFirmante, noAprobables, bloqueados }
}

const cuenta = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** «a, b y c». */
const enumerar = (partes: string[]) => (partes.length < 2 ? partes.join('') : `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`)

/**
 * «Tasa de aprobación: 37,5 % (de 32 estudios decididos: 12 aprobados, 7 con segundo firmante y 13 no
 * aprobables).» Los bloqueados por listas, al final y solo si hay alguno; con una API anterior, sin el
 * segundo firmante. null sin tasa.
 */
export function textoTasaAprobacion(conteos: ConteosEstudios | null | undefined): string | null {
  const t = tasaAprobacion(conteos)
  if (!t) return null
  const partes = [
    cuenta(t.aprobados, 'aprobado', 'aprobados'),
    ...(t.conSegundoFirmante !== null ? [`${t.conSegundoFirmante} con segundo firmante`] : []),
    cuenta(t.noAprobables, 'no aprobable', 'no aprobables'),
    ...(t.bloqueados > 0 ? [cuenta(t.bloqueados, 'bloqueado por listas', 'bloqueados por listas')] : []),
  ]
  const decididos = cuenta(t.decididos, 'estudio decidido', 'estudios decididos')
  return `Tasa de aprobación: ${t.tasa.toLocaleString('es-CO')} % (de ${decididos}: ${enumerar(partes)}).`
}
