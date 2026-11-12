/**
 * Revisión de las fotos de la verificación de identidad ANTES de mandarlas al
 * cotejo. Corre en el celular, sobre píxeles en memoria: la foto no sale del
 * navegador para esto ni se guarda en ningún lado.
 *
 * Por qué existe: cada cotejo se cobra y el enlace tiene un tope de intentos.
 * El 12-nov-2026 un estudio gastó los 5 (el último sin cara que comparar) y
 * quedó en revisión manual. Una foto oscura, borrosa, con reflejo, sin cara o
 * con la cédula del revés se puede detectar aquí, gratis.
 *
 * REGLA DE ORO: un aviso nunca bloquea. Los umbrales son PRUDENTES (solo
 * marcan fotos claramente malas) y la pantalla siempre ofrece «Usar esta foto
 * de todas formas»: un detector que se equivoca no puede dejar a nadie
 * atrapado.
 *
 * Funciones PURAS sobre arreglos de grises: las cubre
 * scripts/check-calidad-foto.mjs sin navegador.
 */

export type TipoFoto = 'documento' | 'selfie'

/** Una cara detectada, en fracciones (0-1) del ancho y alto de la imagen. */
export interface CaraDetectada {
  x: number
  y: number
  ancho: number
  alto: number
  /** Confianza del detector, 0-1. */
  score: number
}

export type CodigoAviso =
  | 'sin_cara'
  | 'varias_caras'
  | 'oscura'
  | 'borrosa'
  | 'lejos'
  | 'cerca'
  | 'descentrada'
  | 'doc_sin_cara'
  | 'reflejo'

export interface AvisoFoto {
  codigo: CodigoAviso
  titulo: string
  texto: string
}

/**
 * Umbrales. Calibrados con imágenes sintéticas (renders y tarjetas dibujadas,
 * nunca fotos de personas reales) para marcar solo lo claramente malo.
 */
export const UMBRALES = {
  /**
   * Luminancia media (0-255) por debajo de la cual la foto está oscura. Baja a
   * propósito: una cara de piel oscura con luz normal ronda 90 y no puede
   * recibir un «busque más luz» que no le corresponde. Las fotos oscuras de
   * verdad (de noche, sin luz) quedan por debajo de 25.
   */
  luzMinima: 40,
  /** Lo mismo medido solo en la cara (contraluz: la ventana detrás). */
  luzMinimaCara: 40,
  /**
   * Varianza del laplaciano (ver `nitidez`) por debajo de la cual la foto está
   * borrosa. En la cara de una selfie nítida sintética da 23-37 (una foto real
   * da más: tiene textura y ruido); muy borrosa, menos de 9.
   */
  nitidezMinimaSelfie: 6,
  /** En la cédula entera (tiene texto): nítida 300+, ilegible menos de 12. */
  nitidezMinimaDocumento: 15,
  /** Fracción de píxeles quemados (>= 250) en el centro de la cédula que ya es un reflejo. */
  reflejoMaximo: 0.04,
  /** …siempre que el resto de la cédula no esté también quemado (mediana por debajo de esto). */
  reflejoMedianaMaxima: 230,
  /** Ancho de la cara / lado menor de la foto: por debajo, está muy lejos. */
  caraMinima: 0.18,
  /** Por encima, está tan cerca que se corta. */
  caraMaxima: 0.92,
  /** Distancia del centro de la cara al centro de la foto (fracción) que ya es «descentrada». */
  descentradaMaxima: 0.3,
  /** Confianza mínima para contar una cara. */
  scoreMinimo: 0.5,
  /** Una segunda cara cuenta si mide al menos esta fracción de la mayor (ignora caras lejanas al fondo). */
  segundaCaraRelativa: 0.5,
} as const

/** Imagen en grises, fila por fila. */
export interface Gris {
  pixeles: Uint8Array | Uint8ClampedArray
  ancho: number
  alto: number
}

/** RGBA (ImageData.data) a grises con la luminancia de Rec. 601. */
export function aGris(rgba: Uint8ClampedArray | Uint8Array, ancho: number, alto: number): Gris {
  const n = ancho * alto
  const pixeles = new Uint8Array(n)
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    pixeles[i] = (rgba[j] * 299 + rgba[j + 1] * 587 + rgba[j + 2] * 114) / 1000
  }
  return { pixeles, ancho, alto }
}

/** Recorte de una imagen en grises; el rectángulo va en fracciones (0-1) y se ajusta a los bordes. */
export function recortar(g: Gris, x: number, y: number, ancho: number, alto: number): Gris {
  const x0 = Math.max(0, Math.floor(x * g.ancho))
  const y0 = Math.max(0, Math.floor(y * g.alto))
  const x1 = Math.min(g.ancho, Math.ceil((x + ancho) * g.ancho))
  const y1 = Math.min(g.alto, Math.ceil((y + alto) * g.alto))
  const w = Math.max(0, x1 - x0)
  const h = Math.max(0, y1 - y0)
  const pixeles = new Uint8Array(w * h)
  for (let fila = 0; fila < h; fila++) {
    const desde = (y0 + fila) * g.ancho + x0
    pixeles.set(g.pixeles.subarray(desde, desde + w), fila * w)
  }
  return { pixeles, ancho: w, alto: h }
}

/** Luminancia media y mediana (0-255) y fracción de píxeles quemados (>= 250). */
export function luz(g: Gris): { media: number; mediana: number; quemados: number } {
  const n = g.pixeles.length
  if (n === 0) return { media: 0, mediana: 0, quemados: 0 }
  const histograma = new Uint32Array(256)
  let suma = 0
  for (let i = 0; i < n; i++) {
    const v = g.pixeles[i]
    suma += v
    histograma[v]++
  }
  let acumulado = 0
  let mediana = 0
  for (; mediana < 256; mediana++) {
    acumulado += histograma[mediana]
    if (acumulado * 2 >= n) break
  }
  let quemados = 0
  for (let v = 250; v < 256; v++) quemados += histograma[v]
  return { media: suma / n, mediana, quemados: quemados / n }
}

/**
 * Un reflejo es una mancha quemada sobre una cédula que NO está quemada: si
 * casi todo el documento está blanquísimo (mediana muy alta) es una cédula
 * clara o una foto sobreexpuesta, y decirle «reflejo» sería falso.
 */
export function hayReflejo(l: { mediana: number; quemados: number }): boolean {
  return l.quemados > UMBRALES.reflejoMaximo && l.mediana < UMBRALES.reflejoMedianaMaxima
}

/**
 * Nitidez: varianza del laplaciano (kernel de 4 vecinos). Una foto borrosa
 * tiene pocos bordes y la varianza cae. Depende de la escala: se mide siempre
 * sobre la imagen reducida a un tamaño fijo (ver `LADO_ANALISIS`).
 */
export function nitidez(g: Gris): number {
  const { pixeles: p, ancho: w, alto: h } = g
  if (w < 3 || h < 3) return 0
  let suma = 0
  let sumaCuadrados = 0
  let n = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const lap = p[i - w] + p[i + w] + p[i - 1] + p[i + 1] - 4 * p[i]
      suma += lap
      sumaCuadrados += lap * lap
      n++
    }
  }
  const media = suma / n
  return sumaCuadrados / n - media * media
}

/** Lado mayor (px) al que se reduce la foto para medir luz y nitidez. */
export const LADO_ANALISIS = 512

/** Las caras que cuentan: con confianza suficiente y no diminutas frente a la mayor. */
export function carasQueCuentan(caras: CaraDetectada[]): CaraDetectada[] {
  const fiables = caras.filter((c) => c.score >= UMBRALES.scoreMinimo)
  const mayor = Math.max(0, ...fiables.map((c) => c.ancho))
  return fiables
    .filter((c) => c.ancho >= mayor * UMBRALES.segundaCaraRelativa)
    .sort((a, b) => b.ancho - a.ancho)
}

/** Nombre corto para los avisos: «cédula» en vez de «cédula de ciudadanía». */
export function nombreCortoDocumento(nombre: string): string {
  return nombre === 'cédula de ciudadanía' ? 'cédula' : nombre
}

export interface EntradaRevision {
  tipo: TipoFoto
  /** La foto entera en grises, reducida a LADO_ANALISIS. */
  gris: Gris
  /**
   * Caras encontradas. `null` = no hubo detector (no cargó, tardó o el
   * celular ahorra datos): se revisa solo luz y nitidez, como respaldo.
   */
  caras: CaraDetectada[] | null
  /** Nombre del documento («cédula de ciudadanía», «pasaporte»…). */
  documentoNombre?: string
  /**
   * La foto salió de la cámara con guía (óvalo o marco). Si vino de la cámara
   * o la galería del celular, la persona nunca vio la guía: no se le nombra.
   */
  guia?: boolean
}

/**
 * El aviso más importante para esta foto, o null si se puede mandar. Uno solo
 * a la vez: dos avisos juntos se leen como un regaño y la persona no sabe por
 * cuál empezar.
 */
export function revisarFoto({ tipo, gris, caras, documentoNombre = 'documento', guia = true }: EntradaRevision): AvisoFoto | null {
  const { media } = luz(gris)
  const oscura = media < UMBRALES.luzMinima
  const enLaGuia = guia ? 'con la cara dentro del óvalo' : 'con toda su cara en la foto'

  if (tipo === 'selfie') {
    const cuentan = caras ? carasQueCuentan(caras) : null
    if (cuentan && cuentan.length === 0) {
      return {
        codigo: 'sin_cara',
        titulo: 'No logramos ver su cara',
        texto: oscura
          ? 'La foto está muy oscura. Tómela de frente y con más luz.'
          : `Tómela de frente, sin gafas ni gorra, ${enLaGuia}.`,
      }
    }
    if (cuentan && cuentan.length > 1) {
      return {
        codigo: 'varias_caras',
        titulo: 'Aparece más de una persona',
        texto: 'En la selfie debe salir solo usted, de frente.',
      }
    }
    const cara = cuentan?.[0] ?? null
    const luzCara = cara ? luz(recortar(gris, cara.x, cara.y, cara.ancho, cara.alto)).media : media
    if (oscura || (cara && luzCara < UMBRALES.luzMinimaCara)) {
      return {
        codigo: 'oscura',
        titulo: 'Su cara se ve muy oscura',
        texto: 'Busque más luz: póngase de frente a una ventana o a una lámpara, no de espaldas.',
      }
    }
    // La nitidez se mide en la cara cuando se sabe dónde está: un fondo liso
    // (una pared) baja la varianza de la foto entera sin que esté borrosa.
    const zona = cara ? recortar(gris, cara.x, cara.y, cara.ancho, cara.alto) : gris
    if (nitidez(zona) < UMBRALES.nitidezMinimaSelfie) {
      return {
        codigo: 'borrosa',
        titulo: 'La selfie salió borrosa',
        texto: 'Sostenga el celular firme y espere un momento a que enfoque antes de tomarla.',
      }
    }
    if (cara) {
      const ladoMenor = Math.min(gris.ancho, gris.alto)
      const anchoRelativo = (cara.ancho * gris.ancho) / ladoMenor
      if (anchoRelativo < UMBRALES.caraMinima) {
        return {
          codigo: 'lejos',
          titulo: 'Su cara se ve muy pequeña',
          texto: guia
            ? 'Acérquese un poco a la cámara: su cara debe llenar el óvalo.'
            : 'Acérquese un poco a la cámara: su cara debe ocupar buena parte de la foto.',
        }
      }
      if (anchoRelativo > UMBRALES.caraMaxima) {
        return {
          codigo: 'cerca',
          titulo: 'Su cara está muy cerca',
          texto: 'Aléjese un poco de la cámara para que se vea toda su cara.',
        }
      }
      const dx = cara.x + cara.ancho / 2 - 0.5
      const dy = cara.y + cara.alto / 2 - 0.5
      if (Math.abs(dx) > UMBRALES.descentradaMaxima || Math.abs(dy) > UMBRALES.descentradaMaxima) {
        return {
          codigo: 'descentrada',
          titulo: 'Su cara no está centrada',
          texto: guia ? 'Ponga su cara en el centro del óvalo, de frente.' : 'Ponga su cara en el centro de la foto, de frente.',
        }
      }
    }
    return null
  }

  // Documento
  const doc = nombreCortoDocumento(documentoNombre)
  const lado = doc === 'pasaporte' ? 'la página donde está su foto' : 'el lado donde está su foto'
  if (oscura) {
    return {
      codigo: 'oscura',
      titulo: `La foto de su ${doc} está muy oscura`,
      texto: 'Tómela con más luz, sobre una superficie plana.',
    }
  }
  if (caras && carasQueCuentan(caras).length === 0) {
    return {
      codigo: 'doc_sin_cara',
      titulo: `No vemos la foto de su cara en su ${doc}`,
      texto: guia ? `Tómela por ${lado}, completa y dentro del marco.` : `Tómela por ${lado}, completa.`,
    }
  }
  // El reflejo se busca en el centro: los bordes suelen ser la mesa o un fondo claro.
  const centro = recortar(gris, 0.15, 0.15, 0.7, 0.7)
  if (hayReflejo(luz(centro))) {
    return {
      codigo: 'reflejo',
      titulo: `Su ${doc} tiene un reflejo`,
      texto: 'Incline un poco el documento o aléjelo de la luz directa para que no brille.',
    }
  }
  if (nitidez(gris) < UMBRALES.nitidezMinimaDocumento) {
    return {
      codigo: 'borrosa',
      titulo: `La foto de su ${doc} salió borrosa`,
      texto: 'Sostenga el celular firme y espere un momento a que enfoque antes de tomarla.',
    }
  }
  return null
}

/**
 * Aviso en vivo mientras la cámara está abierta (selfie). Más exigente que la
 * revisión final porque solo orienta: nunca bloquea el botón de tomar la foto.
 * `cara` en fracciones de la parte VISIBLE del video.
 */
export type PistaEnVivo = { texto: string; lista: boolean }

export function pistaSelfie(entrada: {
  media: number
  caras: CaraDetectada[] | null
  /** Altura del centro del óvalo (fracción): la cara se centra en él, no en la foto. */
  centroY?: number
}): PistaEnVivo {
  const { media, caras, centroY = 0.5 } = entrada
  const cuentan = caras ? carasQueCuentan(caras) : null
  if (media < UMBRALES.luzMinima) return { texto: 'Busque más luz', lista: false }
  if (!cuentan) return { texto: 'Ponga su cara dentro del óvalo', lista: false }
  if (cuentan.length === 0) return { texto: 'Ponga su cara dentro del óvalo', lista: false }
  if (cuentan.length > 1) return { texto: 'Que aparezca solo usted', lista: false }
  const c = cuentan[0]
  if (c.ancho < 0.3) return { texto: 'Acérquese un poco', lista: false }
  if (c.ancho > 0.85) return { texto: 'Aléjese un poco', lista: false }
  const dx = c.x + c.ancho / 2 - 0.5
  const dy = c.y + c.alto / 2 - centroY
  if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) return { texto: 'Centre su cara en el óvalo', lista: false }
  return { texto: 'Así está bien. Tome la foto', lista: true }
}

export function pistaDocumento(
  entrada: { media: number; mediana: number; quemados: number },
  documentoNombre = 'documento',
): PistaEnVivo {
  const doc = nombreCortoDocumento(documentoNombre)
  if (entrada.media < UMBRALES.luzMinima) return { texto: 'Busque más luz', lista: false }
  if (hayReflejo(entrada)) return { texto: `Incline un poco su ${doc}: tiene un reflejo`, lista: false }
  // Nunca «lista» (verde): en vivo no se detecta la cédula, y el verde solo
  // puede significar «está bien».
  return { texto: `Ubique su ${doc} dentro del marco`, lista: false }
}
