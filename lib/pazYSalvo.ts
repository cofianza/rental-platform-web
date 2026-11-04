/**
 * Adenda 5: mora vigente de bajo monto y «aprobar sujeto a paz y salvo».
 * Textos y cálculos puros que comparten la decisión del analista, la lista,
 * el detalle y la página del candidato. Sin dependencias (se prueba con node:test).
 *
 * §10: el acreedor y el monto de la obligación solo los ve el evaluado (y
 * Cofianza). A la inmobiliaria y al propietario solo se les dice que hay un
 * requisito pendiente a cargo del candidato y hasta cuándo.
 */

import type { IMoraVigente, IObligacionExigida, IObligacionMoraA5, IPazYSalvo, TramoAdenda5 } from '../types/estudio'

const BOGOTA = 'America/Bogota'

/** «$180.000», sin el espacio duro de Intl. */
export const pesosA5 = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n).replace(/\s/g, '')

/** dd/mm en hora de Bogotá: el plazo corto de la pastilla («hasta 19/11»). */
export function diaMes(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', timeZone: BOGOTA })
}

/** Hay un paz y salvo exigido que todavía no se acredita. */
export function pazYSalvoPendiente(p: IPazYSalvo | null | undefined): p is IPazYSalvo {
  return !!p && !!p.vence_en && !p.acreditacion
}

/** Lo que ven la inmobiliaria y el propietario: sin acreedor ni monto (§10). */
export function textoRequisitoPendiente(venceEn: string): string {
  return `Requisito pendiente a cargo del candidato · hasta ${diaMes(venceEn)}`
}

/**
 * La razón de mora en %, con un decimal. Prefiere la que ya viene en %
 * (razon_mora_pct) y, si no, la fracción exacta (razon_mora = suma / canon).
 * null si no hay con qué calcularla.
 */
export function razonMoraPct(m: Partial<Pick<IMoraVigente, 'razon_mora_pct' | 'razon_mora'>> | null | undefined): number | null {
  if (!m) return null
  if (typeof m.razon_mora_pct === 'number' && Number.isFinite(m.razon_mora_pct)) return m.razon_mora_pct
  const fraccion = m.razon_mora
  if (typeof fraccion !== 'number' || !Number.isFinite(fraccion)) return null
  return Math.round(fraccion * 1000) / 10
}

/**
 * El paz y salvo PENDIENTE según GET mora-vigente, con la forma del estudio
 * (respaldo si la lista del estudio aún no lo trae). null si no hay uno pendiente.
 */
export function pazYSalvoDeMoraVigente(m: Pick<IMoraVigente, 'paz_y_salvo'> | null | undefined): IPazYSalvo | null {
  const p = m?.paz_y_salvo
  if (!p?.pendiente || !p.vence_en) return null
  return { vence_en: p.vence_en, exigido_en: p.exigido_en, exigido_por: p.exigido_por, obligaciones: p.obligaciones }
}

/** «13,8 %». */
export function textoPct(pct: number): string {
  return `${pct.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

/** Qué significa el tramo, dicho para el analista de Cofianza. */
export const TRAMO_A5: Record<TramoAdenda5, string> = {
  tolerada: 'Por debajo de la mora tolerada: no frenó el estudio',
  revision: 'Entre la mora tolerada y la de rechazo: decide un analista',
  rechazo: 'Por encima de la mora de rechazo',
  regla_dura: 'No cumple las condiciones de la escalera: la mora vigente rechaza',
}

/** Las referencias exigidas, venga la lista como refs o como obligaciones con detalle. */
export function refsExigidas(p: IPazYSalvo | null | undefined): string[] {
  return (p?.obligaciones ?? [])
    .map((o) => (typeof o === 'string' ? o : o?.ref))
    .filter((r): r is string => typeof r === 'string' && r.length > 0)
}

/**
 * Las obligaciones exigidas con su detalle: el de la escalera (GET mora-vigente)
 * si está; si no, lo que traiga la propia lista del paz y salvo.
 */
export function obligacionesExigidas(p: IPazYSalvo | null | undefined, enMora: IObligacionMoraA5[] = []): IObligacionMoraA5[] {
  const porRef = new Map(enMora.map((o) => [o.ref, o]))
  return (p?.obligaciones ?? [])
    .map((o): IObligacionExigida => (typeof o === 'string' ? (porRef.get(o) ?? { ref: o }) : o))
    .filter((o): o is IObligacionMoraA5 => !!o && typeof o.ref === 'string')
}

/** «Claro · celular» o la referencia, si la central no informó el acreedor. */
export function nombreObligacion(o: IObligacionMoraA5): string {
  const acreedor = o.acreedor?.trim()
  const tipo = o.tipo_cuenta?.trim()
  if (acreedor && tipo) return `${acreedor} · ${tipo}`
  return acreedor || tipo || `Obligación ${o.ref}`
}

/** economicSector de DataCrédito (el mismo mapa del motor). Otro valor se muestra tal cual. */
const SECTORES: Record<string, string> = { '1': 'financiero', '2': 'cooperativo', '3': 'real', '4': 'telecomunicaciones' }

/** «Sector real», «Sector telecomunicaciones»; null si no vino. */
export function nombreSector(sector: string | null | undefined): string | null {
  const s = sector?.trim()
  if (!s) return null
  return `Sector ${SECTORES[s] ?? s}`
}

/** «$56.000 en mora · 150 días», con lo que haya. */
export function detalleMora(o: IObligacionMoraA5): string {
  const partes: string[] = []
  if (typeof o.saldo_mora_cop === 'number') partes.push(`${pesosA5(o.saldo_mora_cop)} en mora`)
  if (typeof o.dias_mora === 'number' && o.dias_mora > 0) partes.push(`${o.dias_mora} días`)
  return partes.join(' · ')
}

/** Fecha de vencimiento si se exige hoy con `dias` días calendario (solo para mostrar: la fija la API). */
export function venceSiSeExigeHoy(dias: number, ahora: number): string {
  return new Date(ahora + dias * 86_400_000).toISOString()
}
