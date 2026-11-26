/**
 * Textos de las cifras de la Oficina Virtual (reporte del 25-nov, puntos 1, 7 y 13). Las cifras vienen de la API
 * (GET /oficina-virtual/conteos), cada una con su periodo; aquí solo se escriben, con el periodo junto a la cifra.
 * Pura.
 */

import type { IAccionesOficina, IAprobacionOficina, PeriodoOficina } from '@/types/oficinaVirtual'
import { tasaLegible } from '@/lib/conteosEstudios'

/** El periodo como se escribe junto a la cifra. */
export const TEXTO_PERIODO: Record<PeriodoOficina, string> = {
  desde_el_inicio: 'desde el inicio',
  este_mes: 'este mes',
  ultimos_30_dias: 'últimos 30 días',
  ahora: 'en este momento',
}

const miles = (n: number) => n.toLocaleString('es-CO')
const cuenta = (n: number, uno: string, varios: string) => `${miles(n)} ${n === 1 ? uno : varios}`

/**
 * Punto 13: «Aprobamos 6 de cada 10 estudios (últimos 30 días)»: la proporción de aprobados entre los decididos,
 * redondeada a décimos (`de_cada_10` de la API). En los bordes no se redondea a algo que no es: con alguno aprobado
 * nunca «0 de cada 10», y sin aprobarlos todos nunca «10 de cada 10». Sin aprobados pero con alguno aprobado con
 * segundo firmante (decidido, no aprobado: falta presentar a esa persona), no se dice «ninguno aprobado».
 * null sin la sección (no se muestra nada).
 */
export function textoAprobamos(a: IAprobacionOficina | null | undefined): string | null {
  if (!a) return null
  const periodo = `(${TEXTO_PERIODO.ultimos_30_dias})`
  if (a.decididos <= 0) return `Todavía no hay estudios decididos ${periodo}`
  if (a.aprobados <= 0) {
    if ((a.con_segundo_firmante ?? 0) > 0) {
      return a.decididos === 1
        ? `El único estudio decidido quedó aprobado con la condición de un segundo firmante ${periodo}`
        : `Ninguno de los ${miles(a.decididos)} estudios decididos quedó aprobado sin condiciones ${periodo}`
    }
    return a.decididos === 1
      ? `No aprobamos el único estudio decidido ${periodo}`
      : `No aprobamos ninguno de los ${miles(a.decididos)} estudios decididos ${periodo}`
  }
  if (a.aprobados >= a.decididos) {
    return a.decididos === 1 ? `Aprobamos el único estudio decidido ${periodo}` : `Aprobamos todos los estudios decididos ${periodo}`
  }
  const de = a.de_cada_10 ?? Math.round((a.aprobados * 10) / a.decididos)
  if (de <= 0) return `Aprobamos menos de 1 de cada 10 estudios ${periodo}`
  if (de >= 10) return `Aprobamos más de 9 de cada 10 estudios ${periodo}`
  return `Aprobamos ${de} de cada 10 estudios ${periodo}`
}

/** «a, b y c». */
const enumerar = (partes: string[]) => (partes.length < 2 ? partes.join('') : `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`)

/**
 * El detalle de la tasa, al pasar el cursor o tocar: «Últimos 30 días: 12 de 20 estudios decididos quedaron
 * aprobados (60 %); 1 con segundo firmante y 7 no aprobables.» Sin el desglose del segundo firmante (la API no pudo
 * clasificar), sin él; los bloqueados por listas, solo si hay alguno. null sin decisiones.
 */
export function detalleAprobacion(a: IAprobacionOficina | null | undefined): string | null {
  if (!a || a.decididos <= 0) return null
  const conDesglose = typeof a.con_segundo_firmante === 'number'
  const tasa = a.tasa !== null ? ` (${tasaLegible(a.tasa)})` : ''
  const resto = [
    ...(conDesglose ? [`${miles(a.con_segundo_firmante!)} con segundo firmante`] : []),
    cuenta(a.rechazados, 'no aprobado', 'no aprobados'),
    ...(conDesglose && (a.bloqueados ?? 0) > 0 ? [cuenta(a.bloqueados!, 'bloqueado por listas', 'bloqueados por listas')] : []),
  ]
  const aprobados = `${miles(a.aprobados)} de ${cuenta(a.decididos, 'estudio decidido', 'estudios decididos')} ${a.aprobados === 1 ? 'quedó aprobado' : 'quedaron aprobados'}`
  return `Últimos 30 días: ${aprobados}${tasa}; ${enumerar(resto)}. Lo que todavía revisa Cofianza no cuenta hasta que se decide.`
}

/**
 * Punto 1: el total de estudios con su periodo: «20 estudios desde el inicio, 3 nuevos este mes». null sin las cifras.
 */
export function textoEstudiosPeriodo(todos: number | null | undefined, esteMes: number | null | undefined): string | null {
  if (typeof todos !== 'number') return null
  const total = `${cuenta(todos, 'estudio', 'estudios')} ${TEXTO_PERIODO.desde_el_inicio}`
  if (typeof esteMes !== 'number') return total
  return `${total}, ${cuenta(esteMes, 'nuevo', 'nuevos')} ${TEXTO_PERIODO.este_mes}`
}

/** El total de cada grupo (el de su lista, sin recortes). null = la API no lo dio: se cuenta lo que se ve. */
export interface TotalesAcciones {
  porConfirmar: number
  porRealizar: number
  porHabilitar: number
  porGenerarContrato: number
  conTrabaContrato: number
  /** Punto 11: espera solo la firma de la autorización del titular. null si la API no lo sabe. */
  esperandoAutorizacion: number | null
}

/**
 * Inicio (puntos 1 y 11): el total de cada grupo de acción, de la API si los manda (sin recortes, los criterios de cada
 * lista); si no (una API anterior), las filas que se ven, como antes. Pura.
 */
export function totalesDeAcciones(a: IAccionesOficina | null | undefined, filas: Omit<TotalesAcciones, 'esperandoAutorizacion'>): TotalesAcciones {
  if (!a) return { ...filas, esperandoAutorizacion: null }
  return {
    porConfirmar: a.citas_por_confirmar,
    porRealizar: a.citas_por_realizar,
    porHabilitar: a.evaluaciones_por_habilitar,
    porGenerarContrato: a.contratos_por_generar,
    conTrabaContrato: a.aprobados_con_traba,
    esperandoAutorizacion: a.esperando_autorizacion,
  }
}
