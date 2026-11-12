/**
 * Manejo de las fotos de la verificación de identidad en el navegador: leerlas,
 * reescalarlas y revisarlas. Todo en memoria; nada se guarda ni se sube aquí.
 */

import {
  aGris,
  carasQueCuentan,
  LADO_ANALISIS,
  revisarFoto,
  type AvisoFoto,
  type CaraDetectada,
  type TipoFoto,
} from './calidadFoto'
import { detectorConPlazo } from './detectorCaras'

/**
 * Lado más largo tras reescalar, y calidad JPEG.
 *
 * El backend corta cada imagen en 1.4 MB de base64 y `express.json` corta el
 * request entero en 2 MB — y aquí viajan DOS. Una foto de un celular moderno
 * ronda 4-8 MB en base64: sin este reescalado el prospecto recibiría un 413
 * sin mensaje útil. 1280 px sobra para un cotejo facial y para leer el número
 * de la cédula por OCR.
 */
export const LADO_MAXIMO = 1280
export const CALIDAD_JPEG = 0.82

/** Lado mayor (px) de la imagen que ve el detector de caras. */
const LADO_DETECCION = 640

/** Cuánto espera la revisión al detector antes de seguir sin él. */
export const ESPERA_DETECTOR_MS = 4000

/** Dibuja una fuente (o un recorte en píxeles de ella) en un canvas con el lado mayor <= `lado`. */
export function aCanvas(
  fuente: CanvasImageSource,
  anchoFuente: number,
  altoFuente: number,
  lado: number,
  recorte?: { x: number; y: number; ancho: number; alto: number },
): HTMLCanvasElement {
  const r = recorte ?? { x: 0, y: 0, ancho: anchoFuente, alto: altoFuente }
  const escala = Math.min(1, lado / Math.max(r.ancho, r.alto))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(r.ancho * escala))
  canvas.height = Math.max(1, Math.round(r.alto * escala))
  canvas.getContext('2d')?.drawImage(fuente, r.x, r.y, r.ancho, r.alto, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** JPEG (data URL) de un canvas. */
export function canvasAJpeg(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', CALIDAD_JPEG)
}

export function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('La imagen no se pudo abrir'))
    el.src = src
  })
}

/** Lee el archivo, lo reescala y devuelve un data URL JPEG. */
export async function aJpegReescalado(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No pudimos leer la imagen'))
    reader.readAsDataURL(file)
  })
  const img = await cargarImagen(dataUrl)
  const canvas = aCanvas(img, img.naturalWidth, img.naturalHeight, LADO_MAXIMO)
  // Sin canvas, se manda el original y que decida el backend.
  return canvas.getContext('2d') ? canvasAJpeg(canvas) : dataUrl
}

/** Grises de un canvas (o null si el navegador no deja leer los píxeles). */
export function grisDe(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return aGris(data, canvas.width, canvas.height)
}

/** Canvas girado 90° (sentido horario o antihorario): una cédula fotografiada de lado. */
function girado(c: HTMLCanvasElement, horario: boolean): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = c.height
  out.height = c.width
  const ctx = out.getContext('2d')
  if (ctx) {
    ctx.translate(out.width / 2, out.height / 2)
    ctx.rotate(((horario ? 1 : -1) * Math.PI) / 2)
    ctx.drawImage(c, -c.width / 2, -c.height / 2)
  }
  return out
}

/**
 * Caras de la foto. En la cédula la cara es pequeña: si no aparece en la foto
 * entera se busca en cada mitad (ampliada) y con la cédula girada, antes de
 * concluir que no está. Las coordenadas solo importan en la selfie.
 */
function detectarCaras(
  detectar: (c: HTMLCanvasElement) => CaraDetectada[],
  img: HTMLImageElement,
  tipo: TipoFoto,
): CaraDetectada[] {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const entera = aCanvas(img, w, h, LADO_DETECCION)
  const caras = detectar(entera)
  if (tipo === 'selfie' || carasQueCuentan(caras).length > 0) return caras
  const intentos = [
    () => aCanvas(img, w, h, LADO_DETECCION, { x: 0, y: 0, ancho: w * 0.6, alto: h }),
    () => aCanvas(img, w, h, LADO_DETECCION, { x: w * 0.4, y: 0, ancho: w * 0.6, alto: h }),
    () => girado(entera, true),
    () => girado(entera, false),
  ]
  for (const lienzo of intentos) {
    const otras = detectar(lienzo())
    if (carasQueCuentan(otras).length > 0) return otras
  }
  return caras
}

/**
 * Revisa una foto antes de mandarla al cotejo. Devuelve el aviso para la
 * persona o null si se puede mandar. NUNCA lanza: si algo falla, no hay aviso
 * (la foto sigue su camino como antes de esta revisión).
 */
export async function analizarFoto(
  dataUrl: string,
  tipo: TipoFoto,
  documentoNombre?: string,
  /** La foto salió de la cámara con guía (óvalo o marco). */
  guia = true,
  esperaDetectorMs = ESPERA_DETECTOR_MS,
): Promise<AvisoFoto | null> {
  try {
    const img = await cargarImagen(dataUrl)
    const gris = grisDe(aCanvas(img, img.naturalWidth, img.naturalHeight, LADO_ANALISIS))
    if (!gris) return null
    const detector = await detectorConPlazo(esperaDetectorMs)
    let caras: CaraDetectada[] | null = null
    if (detector) {
      try {
        caras = detectarCaras((c) => detector.detectar(c), img, tipo)
      } catch {
        caras = null
      }
    }
    return revisarFoto({ tipo, gris, caras, documentoNombre, guia })
  } catch {
    return null
  }
}

/** El navegador puede abrir la cámara dentro de la página (si no, se usa el selector del celular). */
export function camaraEnVivoDisponible(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext === true &&
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  )
}
