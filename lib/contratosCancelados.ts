/**
 * Reporte de la Oficina Virtual (25-nov), punto 7 (amplía la Adenda 6 §9): cuando hay contratos cancelados o
 * terminados, se indica junto a los contadores: «0 contratos activos (4 cancelados)». Lo mismo en la franja de Inicio
 * («Inquilinos en cartera»), en Contratos y en Analítica. Antes solo se decía cuando TODOS estaban cancelados, y
 * Contratos mostraba «4 contratos» con los contadores en 0.
 * null sin cancelados ni terminados, o si la API todavía no manda los cancelados. Sin el número de terminados (una API
 * anterior) se dicen solo los cancelados. `conPalabraContratos` para un contador que no cuenta contratos
 * («Inquilinos en cartera»): «(4 contratos cancelados)». Pura.
 */
export function notaContratosCerrados(
  c: { cancelados?: number | null; finalizados?: number | null } | null | undefined,
  { conPalabraContratos = false }: { conPalabraContratos?: boolean } = {},
): string | null {
  const valido = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0
  if (!c || !valido(c.cancelados)) return null
  const cancelados = c.cancelados
  const finalizados = valido(c.finalizados) ? c.finalizados : 0
  if (cancelados === 0 && finalizados === 0) return null
  const partes: string[] = []
  let primera = true
  const parte = (n: number, uno: string, varios: string) => {
    const sustantivo = conPalabraContratos && primera ? (n === 1 ? 'contrato ' : 'contratos ') : ''
    primera = false
    partes.push(`${n.toLocaleString('es-CO')} ${sustantivo}${n === 1 ? uno : varios}`)
  }
  if (cancelados > 0) parte(cancelados, 'cancelado', 'cancelados')
  if (finalizados > 0) parte(finalizados, 'terminado', 'terminados')
  return `(${partes.join(' y ')})`
}
