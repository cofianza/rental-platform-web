/**
 * Adenda 6.1 §3: el cotejo de identidad AL FIRMAR el contrato. Textos y pasos puros (sin React) que comparten la página
 * pública /verificar-identidad/[token] y las pantallas de quien tramita (avance sin el resultado de nadie).
 */

export type PasoCotejo = 'consentimiento_4a' | 'fotos' | 'listo'

/** El paso en que abre la página: terminado, la casilla 4A (si no la marcó al autorizar) o las fotos. */
export function pasoInicialCotejo(d: { completada: boolean; cotejo?: { requiere_4a: boolean } | null }): PasoCotejo {
  if (d.completada) return 'listo'
  return d.cotejo?.requiere_4a ? 'consentimiento_4a' : 'fotos'
}

/** «Le queda 1 intento» / «Le quedan 3 intentos» (en usted). */
export function textoIntentosRestantes(n: number): string {
  const k = Math.max(0, Math.floor(n))
  return k === 1 ? 'Le queda 1 intento.' : `Le quedan ${k} intentos.`
}

/** El avance para quien tramita: «Cotejo de identidad: 1 de 2». Sin decir el resultado de nadie. */
export function textoAvanceCotejo(a: { total: number; aprobados: number }): string {
  return `Cotejo de identidad: ${a.aprobados} de ${a.total}`
}

/** Consejos del cotejo (6.1 §3: «con indicaciones de luz y sin reflejos»), en el orden de las fotos. */
export function consejosCotejo(documentoNombre: string): string[] {
  return [
    `En la foto de su ${documentoNombre}: el original, completo, sobre una superficie plana y sin reflejos del flash ni de la luz.`,
    'Que el número del documento se lea bien: sin dedos encima, sin sombras y sin moverse.',
    'Selfie de frente, con la cara completa y la luz de frente (no se ponga contra una ventana).',
    'Sin gafas, gorra ni tapabocas, y con el celular a la altura de los ojos.',
  ]
}

/** Lo que se le dice a la persona al terminar, según su propio resultado. */
export function textoResultadoCotejo(resultado: 'aprobado' | 'notaria' | null | undefined): { titulo: string; texto: string } {
  if (resultado === 'aprobado') {
    return {
      titulo: 'Cotejo aprobado',
      texto:
        'Cuando todas las personas arrendatarias terminen su cotejo, le llegará por WhatsApp el enlace para firmar el contrato digitalmente.',
    }
  }
  return {
    titulo: 'El contrato se firmará en notaría',
    texto:
      'No se completó el cotejo de identidad, así que el contrato se firmará con firma autenticada en notaría, a su costo. Quien tramita su arriendo le indicará cómo hacerlo.',
  }
}
