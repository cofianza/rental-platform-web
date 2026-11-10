/**
 * Lo que las tarjetas del coarrendatario dicen sobre la prima de vinculación.
 * La frase con la cifra la manda la API (`beneficio_prima`); aquí no se escribe
 * ninguna cifra ni regla:
 *   - objeto    → hay un beneficio que anunciar, con el texto de la API;
 *   - null      → la API dice que no lo hay: no se menciona la prima;
 *   - undefined → la API aún no respondió, falló o es anterior: no se inventa la
 *                 frase de la cifra; los textos que no llevan cifra quedan como
 *                 estaban (solo un `null` explícito de la API los cambia).
 * Puro, sin React.
 */
export interface IBeneficioPrima {
  completo: string
  corto: string
}
export type BeneficioPrima = IBeneficioPrima | null | undefined

/** El coarrendatario aceptó y se está evaluando, con el estudio ya aprobado. */
export function textoEvaluandoSobreAprobado(b: BeneficioPrima): string {
  return b
    ? `Estamos procesando su evaluación crediticia. Si queda vinculado, ${b.corto}; le avisamos por correo.`
    : 'Estamos procesando su evaluación crediticia. Le avisamos por correo si queda vinculado.'
}

/** La evaluación del coarrendatario terminó sobre un estudio aprobado. */
export function textoEvaluacionTerminadaSobreAprobado(b: BeneficioPrima): string {
  return b === null
    ? 'La evaluación de su coarrendatario terminó y su estudio sigue aprobado. Le contamos por correo si quedó vinculado.'
    : 'La evaluación de su coarrendatario terminó y su estudio sigue aprobado. Le contamos por correo si quedó vinculado y qué prima paga.'
}

/** Al gestor: el coarrendatario evaluado no entra al contrato. */
export function textoCoarrendatarioFuera(b: BeneficioPrima, noCalifica: boolean): string {
  const fuera = b === null ? 'No entra al contrato ni al certificado.' : 'No entra al contrato ni al certificado: la prima es la de firma sin coarrendatario.'
  return noCalifica
    ? `No aporta puntos ni ingreso, y el estudio sigue con el titular. ${fuera}`
    : b === null
      ? 'Con este resultado no entra al contrato ni al certificado.'
      : 'Con este resultado no entra al contrato ni al certificado: la prima es la de firma sin coarrendatario.'
}
