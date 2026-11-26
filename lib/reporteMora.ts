/**
 * Textos y reglas de pantalla del reporte de mora (reporte de la Oficina Virtual,
 * punto 2; Adenda 6.1 §4). La API decide el estado del reporte, la fecha pactada
 * y el plazo de pago; aquí solo se dicen. Puro: sin React.
 */

export type ReporteEstadoMora = 'completo' | 'incompleto' | 'por_verificar' | 'no_paga'
export type ResultadoVerificacionMora = 'verificado' | 'no_corresponde' | 'fecha_fuera_de_rango'

/** Literal del reporte de la Oficina Virtual (punto 2): va antes del formulario. */
export const FRASE_VENTANA_REPORTE =
  'Reporte la mora entre el día 6 y el día 10. Cofianza le paga dentro de los 20 días calendario siguientes al reporte completo.'

/** Días desde el reporte en que cambia la fase (los mismos de la API: DIAS_FASE_2 y DIAS_FASE_3). */
export const DIAS_A_FASE_2 = 4
export const DIAS_A_FASE_3 = 10

/**
 * El único cronograma que ve la pantalla: el de las fases, contado desde el
 * reporte. Los WhatsApp tienen su propia regla (Ley 2300) y se explican aparte.
 */
export const CRONOGRAMA_MORA: ReadonlyArray<{ cuando: string; que: string }> = [
  { cuando: 'Al reportar', que: 'Fase 1 (Recordatorio).' },
  { cuando: `A los ${DIAS_A_FASE_2} días del reporte`, que: 'Fase 2 (Urgencia).' },
  { cuando: `A los ${DIAS_A_FASE_3} días del reporte`, que: 'Fase 3 (Legal): Cofianza toma el control del caso, si el reporte está completo.' },
]

export const NOTA_MENSAJES_MORA =
  'Al inquilino le enviamos un WhatsApp al reportar y con cada cambio de fase, dentro del horario de cobranza que permite la ley (lunes a viernes de 7 a. m. a 7 p. m. y sábados de 8 a. m. a 3 p. m.) y con al menos 7 días entre un mensaje y el siguiente. Por eso un mensaje puede salir unos días después del cambio de fase.'

/** «16 de diciembre de 2026» de un AAAA-MM-DD, sin correrse de día por la zona horaria. */
export function fechaDia(dia: string): string {
  return new Date(`${dia.slice(0, 10)}T12:00:00Z`).toLocaleDateString('es-CO', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** El día de Colombia de un instante, «26 de noviembre de 2026» (el mismo día con que la API cuenta el plazo). */
export function fechaDiaColombia(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Aviso del formulario cuando hoy (AAAA-MM-DD, Colombia) no está en la ventana del día 6 al 10. No bloquea: fuera de
 * ella Cofianza revisa la cobertura (el reporte extemporáneo excluye los cánones del período de silencio). null = en
 * la ventana.
 */
export function avisoFueraDeVentana(hoy: string): string | null {
  const dia = Number(hoy.slice(8, 10))
  if (dia >= 6 && dia <= 10) return null
  return `Hoy es día ${dia} y la ventana de reporte es del día 6 al día 10. Puede reportar igual: fuera de la ventana, Cofianza revisa si cubre esta mora.`
}

/** Sin el dato (mora anterior a la migración) el reporte es completo. */
export const estadoReporte = (m: { reporte_estado?: ReporteEstadoMora | null }): ReporteEstadoMora =>
  m.reporte_estado ?? 'completo'

export const fasesActivas = ['fase_1', 'fase_2', 'fase_3']

/**
 * Lo que dice el detalle sobre el reporte y el plazo de pago. La fecha solo se promete con la mora activa, reportada
 * dentro de la ventana del día 6 al 10 y con el plazo vigente; un plazo vencido solo lo ve Cofianza (la plataforma no
 * registra todavía el pago de Cofianza, así que a la inmobiliaria no se le dice «venció»).
 */
export function textoReporte(
  m: {
    estado: string
    reporte_estado?: ReporteEstadoMora | null
    plazo_pago_hasta?: string | null
    reporte_en_ventana?: boolean | null
    cofianza_pago_realizado?: boolean | null
    cofianza_pago_fecha?: string | null
  },
  opciones: { esInterno: boolean; hoy: string },
): string {
  switch (estadoReporte(m)) {
    case 'incompleto':
      return 'Incompleto: falta el contrato autenticado en notaría'
    case 'por_verificar':
      return 'Por verificar: si Cofianza confirma el documento, el reporte queda completo desde que se cargó'
    case 'no_paga':
      return 'Cofianza no paga esta mora'
    default: {
      if (m.cofianza_pago_realizado && m.cofianza_pago_fecha) return `Completo: Cofianza pagó el ${fechaDia(m.cofianza_pago_fecha)}`
      const plazo = m.plazo_pago_hasta
      if (!fasesActivas.includes(m.estado) || !plazo) return 'Completo'
      if (plazo < opciones.hoy) return opciones.esInterno ? `Completo: el plazo de pago de Cofianza venció el ${fechaDia(plazo)}` : 'Completo'
      if (m.reporte_en_ventana === false)
        return opciones.esInterno
          ? `Completo, reportada fuera de la ventana del día 6 al 10: plazo de pago hasta el ${fechaDia(plazo)} si Cofianza la cubre`
          : 'Completo, reportada fuera de la ventana del día 6 al 10: Cofianza revisa si cubre esta mora'
      return `Completo: Cofianza paga a más tardar el ${fechaDia(plazo)}`
    }
  }
}

/** La marca del reporte en la tabla (null si está completo: nada que avisar). */
export function chipReporte(estado: ReporteEstadoMora | null | undefined): { texto: string; tono: 'amber' | 'gray' | 'red' } | null {
  switch (estado) {
    case 'incompleto':
      return { texto: 'Reporte incompleto', tono: 'amber' }
    case 'por_verificar':
      return { texto: 'Por verificar', tono: 'gray' }
    case 'no_paga':
      return { texto: 'Cofianza no paga', tono: 'red' }
    default:
      return null
  }
}

/**
 * Cuántos días faltan para que la mora pase sola a la siguiente fase, o por qué
 * no pasa: la Fase 3 espera el reporte completo y con «Cofianza no paga» no se
 * escala. null = no escala (Fase 3, pagada, cancelada).
 */
export function escalaEn(
  m: { estado: string; reportado_at: string; reporte_estado?: ReporteEstadoMora | null },
  ahoraMs: number,
): number | 'espera_reporte' | null {
  const reporte = estadoReporte(m)
  if (reporte === 'no_paga') return null
  const dias = Math.floor((ahoraMs - new Date(m.reportado_at).getTime()) / 86_400_000)
  if (m.estado === 'fase_1') return DIAS_A_FASE_2 - dias
  if (m.estado === 'fase_2') return reporte === 'completo' ? DIAS_A_FASE_3 - dias : 'espera_reporte'
  return null
}

/**
 * Por qué Cofianza no paga (el mismo texto de la API). Fecha fuera de rango decidida por Cofianza = la del sello del
 * documento; la del sistema (`automatica`) = la fecha registrada.
 */
export function motivoNoPaga(
  resultado: ResultadoVerificacionMora | undefined,
  dias: number | null | undefined,
  automatica = false,
): string {
  if (resultado !== 'fecha_fuera_de_rango') return 'el documento cargado no corresponde al contrato'
  return `${automatica ? 'la fecha de autenticación registrada' : 'la fecha del sello notarial del documento'} no está dentro de los ${dias ?? 30} días siguientes al resultado del estudio`
}

/** El aviso del formulario cuando el contrato elegido es de notaría. */
export function avisoNotariaFormulario(n: { documento_cargado: boolean; fecha_en_rango: boolean | null }): {
  tono: 'amber' | 'gray' | 'red'
  texto: string
} {
  if (n.fecha_en_rango === false)
    return {
      tono: 'red',
      texto: 'Contrato con firma en notaría: la fecha de autenticación registrada no está dentro del rango, así que Cofianza no paga esta mora.',
    }
  if (n.documento_cargado)
    return {
      tono: 'gray',
      texto: 'Contrato con firma en notaría: el contrato autenticado ya está cargado. Cofianza verifica que corresponda al contrato y la fecha de autenticación; si lo confirma, el reporte queda completo desde hoy.',
    }
  return {
    tono: 'amber',
    texto: 'Contrato con firma en notaría: cargue el contrato autenticado (PDF) para que el reporte quede completo. Sin él, el reporte queda incompleto, no empieza a correr el plazo de pago y el caso no pasa a Fase 3. Si no lo presenta, Cofianza no paga.',
  }
}
