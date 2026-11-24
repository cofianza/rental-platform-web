/**
 * De quién es el turno del estudio, en palabras: las mismas en la lista, la cola de Cofianza, el inicio y la
 * franja «Qué sigue» del detalle (la pastilla que las pinta es components/expedientes/PastillaTurno). Pura.
 */

import type { Turno, VistaTurno } from './etapaEstudio'

export interface OpcionesTurno {
  revision?: boolean
  accion?: string
  /** Administrador u operador: deciden la revisión y pueden ejecutar la consulta. */
  analista?: boolean
  /** U2: autorizó y pagó, pero la consulta no arrancó sola. */
  sinEjecutar?: boolean
  /**
   * Revisión (o verificación del segundo firmante) que ya tomó OTRO analista (nombre): para quien mira no
   * es «Su turno», es el de esa persona. Solo aplica a lo que le toca a Cofianza.
   */
  tomadoPor?: string | null
  /**
   * Adenda 3 §6: aprobado con la condición de sumar un coarrendatario. Fuera de Cofianza
   * lo que se espera es el coarrendatario (lo agrega la persona o lo invita quien gestiona).
   */
  condicion?: boolean
  /**
   * Con `condicion`: ya hay un segundo firmante invitado que no ha respondido. A quien gestiona se le sugiere
   * reenviarle la invitación o invitar a otra persona. Solo lo sabe el detalle (la lista no trae la invitación).
   */
  invitado?: boolean
  /**
   * Con `condicion`: es la condición de coarrendatario de la Adenda 3 (no el «aprobado con segundo firmante»
   * de la Adenda 5). Allí a la persona se le llama coarrendatario, como en su invitación.
   */
  adenda3?: boolean
  /**
   * Cofianza verifica al segundo firmante ya evaluado: al analista le toca verificarlo (aunque el estudio ya
   * esté aprobado y quien gestiona pueda seguir sin él); a los demás, que lo hace Cofianza.
   */
  verificacion?: boolean
}

/** «Nombre Apellido» del analista asignado si no es quien mira; null si es él o no hay. */
export function analistaAjeno(
  analista: { id: string; nombre: string; apellido?: string | null } | null | undefined,
  yo: string | null | undefined,
): string | null {
  if (!analista || !yo || analista.id === yo) return null
  return `${analista.nombre} ${analista.apellido ?? ''}`.trim() || 'otro analista'
}

/** ¿Le toca actuar a quien mira? Coral, como «Su turno». */
export function turnoPropio(turno: Turno, vista: VistaTurno, o: OpcionesTurno = {}): boolean {
  const analista = vista === 'cofianza' && !!o.analista
  // Solo lectura («equipo») ve el turno de su equipo, pero no puede actuar: sin coral.
  if (turno === 'gestor') return vista === 'gestor' || (analista && (!!o.sinEjecutar || (!!o.verificacion && !o.tomadoPor)))
  return turno === 'cofianza' && analista && (!!o.revision || !!o.verificacion) && !o.tomadoPor
}

/** La verificación del segundo firmante, para quien mira: al analista le toca; a los demás, que la hace Cofianza. */
function textoVerificacion(vista: VistaTurno, o: OpcionesTurno): string {
  if (vista !== 'cofianza' || !o.analista) return 'Cofianza verifica al segundo firmante'
  if (o.tomadoPor) return `Lo verifica ${o.tomadoPor}`
  return 'Su turno: verificar al segundo firmante'
}

export function textoTurno(turno: Turno, vista: VistaTurno, o: OpcionesTurno = {}): string {
  switch (turno) {
    case 'gestor': {
      // U2: Cofianza también puede ejecutar la consulta que no arrancó.
      if (vista === 'cofianza' && o.analista && o.sinEjecutar) return 'Arranque fallido: ejecute la consulta'
      // Aprobado con el segundo firmante en verificación: quien gestiona decide si lo espera; al analista le toca verificarlo.
      if (vista === 'cofianza' && o.analista && o.verificacion) return textoVerificacion(vista, o)
      // A Cofianza «Su turno» le decía que actuara ella.
      const base = vista === 'gestor' ? 'Su turno' : vista === 'cofianza' ? 'Turno del gestor' : 'Turno de su equipo'
      return o.accion ? `${base}: ${o.accion}` : base
    }
    case 'prospecto':
      // Reporte de Gerencia (21-nov, punto 3): aprobado con segundo firmante; nunca «crear el contrato».
      // «Segundo firmante» en los estudios de la Adenda 5; «coarrendatario» en la condición de la Adenda 3.
      if (o.condicion && vista !== 'cofianza') {
        const quien = o.adenda3 ? 'coarrendatario' : 'segundo firmante'
        return o.invitado && vista === 'gestor'
          ? `Esperando al ${quien}: reenvíele la invitación o invite a otra persona`
          : `Esperando al ${quien}`
      }
      return 'Esperando al prospecto'
    case 'cofianza':
      // El segundo firmante ya evaluado está en verificación: no es una decisión del estudio.
      if (o.verificacion) return textoVerificacion(vista, o)
      // El condicionado lo decide un analista (Adenda 2 §5): no es una consulta en curso.
      // U1: al analista le toca decidir; a Gerencia, solo mirar.
      if (o.revision) {
        if (vista !== 'cofianza') return 'En revisión de Cofianza'
        if (!o.analista) return 'En revisión de un analista'
        if (o.tomadoPor) return `En revisión de ${o.tomadoPor}`
        return 'Su turno: decidir el estudio'
      }
      return 'Cofianza procesando'
    case 'firmas':
      return 'Esperando las firmas'
  }
}
