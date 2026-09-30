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

const MARCAS_INTERNAS = /Para el analista|puntaje \d|entre \d+ y \d+|umbral|denominador|\bm[aá]x(?:imo)?\.? (?:de )?\d/i

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

  const vistas = new Set<string>()
  const frases = limpio
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
