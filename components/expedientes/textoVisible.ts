/**
 * Limpieza al LEER de los textos que escribe la API (observaciones, motivo de
 * rechazo, condiciones, motivos del analista) antes de pintarlos.
 *
 * Regla del usuario (2026-09-30): ninguna persona —ni la inmobiliaria ni el
 * panel de Cofianza— ve referencias a documentos («Política §14», «Adenda 2
 * §3», «Anexo A», «(P33)», «Caso G»), nombres de flags ni fechas de decisiones
 * internas. La API es la que debe escribir el texto limpio; esto cubre las
 * filas ya guardadas con el texto viejo y cualquier texto que se escape.
 * Sin dependencias: se prueba con `node --experimental-strip-types`.
 */

/** Paréntesis que solo citan un documento: «(Política §14)», «(Adenda de precios §2.2 a)», «(P33)». */
const PARENTESIS_REFERENCIA =
  /\s*\([^()]*(?:§|Adenda|Pol[ií]tica|Anexo [A-Z]|Flujo|\bP\d{1,3}\b|\bCaso [A-Z]\b)[^()]*\)/g

/** Cita suelta al frente de una frase: «Adenda 1 §2.3: », «Política §14: ». */
const CITA_SUELTA =
  /\b(?:Adenda(?: de precios| \d)?|Pol[ií]tica(?: de Evaluaci[oó]n)?(?: V\d(?:\.\d)?)?|Flujo)\s*§\s*[\d.]*\d[a-z]?(?:\s*(?:\/|y|→)\s*(?:(?:Adenda(?: \d)?|Pol[ií]tica)\s*)?§\s*[\d.]*\d)*\s*:?\s*/g

const FLAGS: Record<string, string> = {
  fuentes_con_error: 'algunas fuentes de antecedentes no respondieron',
  registraduria_sin_informacion: 'la Registraduría no entregó información de la cédula',
  documento_no_vigente: 'el documento no aparece vigente',
  defuncion: 'hay un reporte de defunción',
}

/** Nombre de flag de antecedentes en lenguaje claro. */
export function describirFlag(flag: string): string {
  return FLAGS[flag] ?? flag.replace(/_/g, ' ')
}

// Frases con datos internos del modelo (puntaje intermedio, umbrales, bandas,
// notas al analista) o con el error crudo de una central: «no respondio (…)».
const MARCAS_INTERNAS =
  /Para el analista|puntaje \d|puntaje (?:menor|mayor)|entre \d+ y \d+|umbral|denominador|\bbanda\b|\bm[aá]x(?:imo)?\.? (?:de )?\d|\bm[ií]n(?:imo)?\.? (?:de )?\d|mayor a \d+ puntos|no respondi[oó] \(/i

function capitalizar(frase: string): string {
  return frase.charAt(0).toUpperCase() + frase.slice(1)
}

/**
 * Quita citas a documentos y jerga, cambia los nombres de flags por lenguaje
 * claro y elimina frases repetidas. `externo`: además quita las frases con
 * datos internos del modelo (puntaje intermedio, umbrales, notas al analista),
 * que la inmobiliaria, el propietario y el solicitante no deben ver.
 */
export function textoVisible(texto: string | null | undefined, opts: { externo?: boolean } = {}): string {
  if (!texto) return ''
  const limpio = texto
    .replace(PARENTESIS_REFERENCIA, '')
    .replace(/Decisi[oó]n de Gerencia\s*\(\d{4}-\d{2}-\d{2}\)\s*:?\s*/gi, '')
    .replace(CITA_SUELTA, '')
    .replace(/\bPol[ií]tica(?: de Evaluaci[oó]n)? V\d(?:\.\d)?/g, 'política de riesgo')
    // Versión del modelo («Fuente: transunion, modelo V4.1.») y rótulos de casos
    // de la matriz («Caso G: », «Caso R2: »).
    // «, versión del modelo v4.1-adenda3v2» entera: sola, la de abajo dejaba «versión del-adenda3v2».
    .replace(/,?\s*versi[oó]n del modelo\s+v[\w.-]*\w/gi, '')
    .replace(/,?\s*modelo\s+V\d(?:\.\d)?/gi, '')
    .replace(/\bCaso [A-Z]\d?\s*:\s*/g, '')
    .replace(/\bV1 = promedio\b/g, 'el score usado es el promedio')
    .replace(/\s?\bV\d\.\d\b/g, '')
    // Rótulo interno que repite los motivos que ya van en el texto.
    .replace(/Decisi[oó]n del modelo\s*:\s*/gi, '')
    .replace(/\s*§\s*[\d.]*\d/g, '')
    .replace(/\bdel Anexo A(?:\.\d)?\b/g, 'de la lista de documentos de ingreso')
    .replace(/\bAnexo A(?:\.\d)?\b/g, 'lista de documentos de ingreso')
    .replace(/\b(?:el )?background check(?: de Auco)?\b/gi, 'la verificación de antecedentes')
    .replace(/\bCascada\s*:/g, 'Centrales de riesgo:')
    .replace(/\bpor regla dura\b/gi, 'por una condición obligatoria')
    .replace(/\breglas duras\b/gi, 'condiciones obligatorias')
    .replace(/\bregla dura\b/gi, 'condición obligatoria')
    // Coma decimal (es-CO): «77.5» → «77,5»; «25.756» (miles) no cambia.
    .replace(/(\d)\.(\d{1,2})(?!\d)/g, '$1,$2')
    .replace(/(?<![\w@.])[a-z]+(?:_[a-z0-9]+)+(?![\w@])/g, (m) => FLAGS[m] ?? m.replace(/_/g, ' '))
    // «$ 25.756» → «$25.756»; y el resumen del buró llega sin punto final
    // pegado a la frase siguiente («… $ 25.756 Revisión manual…»).
    .replace(/\$\s+(?=\d)/g, '$')
    .replace(/(\d)\s+(?=[A-ZÁÉÍÓÚÑ][a-záéíóúñ])/g, '$1. ')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\.{2,}/g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()

  // Reunión con Gerencia 23-oct: a quien no es de Cofianza no se le dice en
  // qué central se consultó («reserva del sumario»).
  const sinCentral = opts.externo
    ? limpio
        .replace(/\b(?:DataCr[eé]dito|TransUnion|Experian|CIFIN|SIFIN)\b(?:\s+HDC\+?)?/gi, 'la central de riesgo')
        .replace(/la central de riesgo (y|o) la central de riesgo/g, 'las centrales de riesgo')
        // «DataCredito Experian», «… tampoco respondió. DataCrédito no está…»
        .replace(/(la central de riesgo)(\s+la central de riesgo)+/gi, '$1')
    : limpio

  const vistas = new Set<string>()
  const frases = sinCentral
    .split(/(?<=[.!?])\s+/)
    .map((f) => capitalizar(f.trim()))
    .filter((f) => {
      if (!f || /^[.:;,]$/.test(f) || vistas.has(f)) return false
      vistas.add(f)
      return !(opts.externo && MARCAS_INTERNAS.test(f))
    })
  return frases.join(' ')
}

/**
 * Por qué falló la consulta. Solo la falla técnica es «problema técnico»: que
 * la persona no aparezca en la central (Adenda de precios §2.2 a) o que el
 * apellido no coincida son respuestas de la central y se corrigen distinto.
 * Usa `desenlace_consulta` cuando la API lo manda; si no, el texto que la API
 * escribe en `observaciones` para esos dos casos (estudios.service).
 */
export function tipoFallo(e: { observaciones?: string | null; desenlace_consulta?: string | null }): 'no_existe' | 'apellido' | 'tecnico' {
  const obs = e.observaciones ?? ''
  if (/primer apellido/i.test(obs) && /no coincide/i.test(obs)) return 'apellido'
  if (e.desenlace_consulta === 'a_no_existe' || /^No encontramos antecedentes con este documento/i.test(obs)) return 'no_existe'
  return 'tecnico'
}

/** Roles de Cofianza: ven el detalle del caso (en lenguaje claro). */
export function esRolInterno(rol?: string | null): boolean {
  return rol === 'administrador' || rol === 'operador_analista' || rol === 'gerencia_consulta'
}

/**
 * La central se decide al consultar (cascada, DataCrédito primaria): antes de
 * eso `proveedor` es solo el valor por defecto y nombrarla engaña, también a
 * Cofianza.
 */
export function centralDefinida(e: { estado: string; proveedor?: string | null }): boolean {
  return ['en_proceso', 'completado', 'fallido'].includes(e.estado) || e.proveedor === 'manual'
}

/** «$1.250.000», como formatCurrency (aquí sin dependencias). */
const pesos = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n).replace(/\s/g, '')

/** Adenda 3 V2 §6.9: el texto literal de «Está cerca» (igual que en la API; no se cambia sin la Gerencia). */
export const MENSAJE_ESTA_CERCA =
  '¿Alguien más va a vivir con usted en el inmueble? Si esa persona tiene ingresos propios, agréguela como coarrendatario: volvemos a evaluar con los dos y le damos respuesta en segundos. Solo necesitamos su cédula y su autorización.'

/**
 * Adenda 4 V3 §8: con la condición obligatoria el literal de arriba no aplica
 * (no hay «respuesta en segundos»: decide un analista). Igual que
 * MENSAJE_COARRENDATARIO_OBLIGATORIO de la API (rutas-resultado.ts).
 */
export const MENSAJE_COARRENDATARIO_OBLIGATORIO =
  'Para continuar, su estudio necesita un coarrendatario: alguien que vaya a vivir con usted en el inmueble y tenga ingresos propios. Si califica, un analista de Cofianza decide su estudio con la información de los dos y le avisamos el resultado. Solo necesitamos su cédula y su autorización.'

/** La línea de la cifra del §6.7 con su advertencia, o null (como lineaIngresoAdicional de la API). */
export const lineaIngresoAdicional = (cifra: number | null | undefined): string | null =>
  cifra && cifra > 0
    ? `Para cumplir con el ingreso, entre los dos necesitan ${pesos(cifra)} de ingreso mensual adicional. ${ADVERTENCIA_INGRESO_ADICIONAL}`
    : null

/** Adenda 3 V2 §6.7: la advertencia que acompaña siempre a la cifra (igual que en la API). */
export const ADVERTENCIA_INGRESO_ADICIONAL =
  'La cifra supone que el coarrendatario no tiene deudas reportadas: si tiene cuotas, esas cuotas se suman a lo que se necesita.'

/**
 * ¿Sin un coarrendatario que la resuelva el estudio se cierra como no aprobado?
 * ponytail: espejo de vencidaSeRechaza (API, condicion-coarrendatario.ts:182)
 * mientras DESTINO_VENCIDA_SOLO_PUNTAJE siga en 'revision_manual'. Si la
 * Gerencia lo cambia a 'rechazo', debe devolver siempre true.
 */
export const seCierraSiVence = (c: { obligatoria?: boolean; reglas_ingreso?: string[] }): boolean =>
  !!c.obligatoria || (c.reglas_ingreso?.length ?? 0) > 0

/**
 * Adenda 3 V2 §6 (cuarto desenlace, «Está cerca»): el texto de la condición
 * para la inmobiliaria, el propietario y el prospecto (`prospecto`). Sin
 * puntaje objetivo (§6.8); con el ingreso incumplido, la cifra del §6.7 con su
 * advertencia. Con `obligatoria` (Adenda 4 V3 §8) no es una aprobación: con el
 * coarrendatario lo decide un analista.
 */
export function textoCondicionCoarrendatario(
  c: {
    vence_en: string
    vencida: boolean
    ingreso_adicional_requerido?: number | null
    reglas_ingreso?: string[]
    /** Adenda 4 V3 §8: titular bajo 70 por el endeudamiento; sin coarrendatario válido, rechazo. */
    obligatoria?: boolean
  },
  o: { prospecto?: boolean } = {},
): string {
  const fecha = fechaCondicion(c.vence_en)
  if (c.vencida) {
    // Solo espera a un coarrendatario cuya consulta sigue en curso.
    return seCierraSiVence(c)
      ? `Venció el plazo para presentar el coarrendatario (${fecha}). Sin un coarrendatario que cumpla el ingreso, el estudio se cerrará como no aprobado.`
      : `Venció el plazo para presentar el coarrendatario (${fecha}). El estudio pasa a revisión de un analista de Cofianza.`
  }
  const cifra = c.ingreso_adicional_requerido && c.ingreso_adicional_requerido > 0
    ? ` Para cumplir con el ingreso, entre los dos necesitan ${pesos(c.ingreso_adicional_requerido)} de ingreso mensual adicional. ${ADVERTENCIA_INGRESO_ADICIONAL}`
    : ''
  if (c.obligatoria) {
    return o.prospecto
      ? `Está cerca: para continuar, su estudio necesita un coarrendatario antes del ${fecha}.${cifra}`
      : // Sin el rótulo al frente: va debajo de la pastilla o del título «Requiere coarrendatario».
        `Sin un coarrendatario que califique antes del ${fecha}, el estudio se cierra como no aprobado. Si califica, lo decide un analista de Cofianza con los dos.${cifra}`
  }
  return `Está cerca: aprobado con condición de presentar un coarrendatario antes del ${fecha}.${cifra}`
}

/** DD/MM/AAAA en hora de Bogotá: el vencimiento de la condición, igual que en la API. */
export function fechaCondicion(venceEn: string): string {
  return new Date(venceEn).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Bogota',
  })
}
