/**
 * Contadores de «Propiedades y vitrina» (reporte de la Oficina Virtual del 25-nov, punto 14). Antes: Total, En
 * vitrina, Disponibles y Pausadas, y «Disponibles» incluía a las pausadas (32 = 27 + 5, sin decirlo). Ahora: Total, En
 * vitrina, Pausadas y Arrendadas, y el Total dice cómo se suma. Pura.
 *
 * Las cifras salen del listado de inmuebles de la cartera (la API ya excluye los inactivos), cada una con su filtro:
 *   - en vitrina = publicado de verdad: visible_vitrina Y estado 'disponible';
 *   - pausadas = disponibles fuera de la vitrina (disponibles − en vitrina: visible_vitrina es NOT NULL);
 *   - arrendadas = estado 'ocupado' (con contrato vigente o en firma: «Arrendada» o «Reservada» en la lista);
 *   - otras = lo que queda del total (el estado 'en_estudio', que ya no se escribe: filas históricas).
 */

export interface TotalesVitrina {
  /** Inmuebles de la cartera, sin los inactivos. */
  total: number
  /** visible_vitrina y estado 'disponible'. */
  enVitrina: number
  /** estado 'disponible' (en la vitrina o fuera de ella). */
  disponibles: number
  /** estado 'ocupado'. */
  arrendadas: number
}

export interface ContadoresVitrina {
  total: number
  enVitrina: number
  pausadas: number
  arrendadas: number
  /** Del total, las que no están en ninguna de las otras tres (estado 'en_estudio' heredado). */
  otras: number
}

export function contadoresVitrina(t: TotalesVitrina): ContadoresVitrina {
  const pausadas = Math.max(0, t.disponibles - t.enVitrina)
  const otras = Math.max(0, t.total - t.enVitrina - pausadas - t.arrendadas)
  return { total: t.total, enVitrina: t.enVitrina, pausadas, arrendadas: t.arrendadas, otras }
}

/** Debajo del Total: cómo se suma («En vitrina + pausadas + arrendadas», y las otras si hay). */
export function notaTotalVitrina(c: Pick<ContadoresVitrina, 'otras'>): string {
  const base = 'En vitrina + pausadas + arrendadas'
  if (c.otras <= 0) return base
  return `${base} + ${c.otras.toLocaleString('es-CO')} en estudio`
}
