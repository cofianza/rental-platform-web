/**
 * Detector de caras para la revisión previa de las fotos (ver calidadFoto.ts).
 *
 * POR QUÉ MEDIAPIPE (FaceDetector, modelo BlazeFace de rango corto): en las
 * pruebas con renders sintéticos encontró 35 de 35 caras, incluidas de lado,
 * con gafas o con gorra, y la cara pequeña impresa en una cédula. pico.js
 * (JS puro, ~235 KB) encontró entre 18 y 27 de 35: le habría dicho «no
 * logramos ver su cara» a gente con una selfie buena. La API nativa
 * `FaceDetector` no está habilitada en Chrome ni Safari estables.
 *
 * EL PESO: ~4 MB comprimidos la primera vez (el wasm de MediaPipe, 3,9 MB
 * gzip, más el modelo de 0,2 MB), que luego quedan en la caché del navegador.
 * Por eso:
 *   - se descarga SOLO en el paso de la foto, cuando la persona toca
 *     «Empezar» (quien se niega a la foto no lo descarga nunca);
 *   - con «ahorro de datos» o una red 2G no se descarga;
 *   - si tarda o falla, la revisión sigue sin él (solo luz y nitidez), como
 *     funcionaba antes. Nunca deja la pantalla esperando.
 *
 * Se sirve desde el propio sitio (`public/mediapipe/`, lo copia
 * scripts/copiar-mediapipe.mjs en cada build): ni CDN de terceros ni
 * depender de que la CSP lo permita. La foto nunca sale del navegador.
 */

import type { CaraDetectada } from './calidadFoto'

const RUTA_WASM = '/mediapipe/wasm'
const RUTA_MODELO = '/mediapipe/blaze_face_short_range.tflite'

type FuenteImagen = HTMLCanvasElement | HTMLImageElement | HTMLVideoElement

export interface DetectorCaras {
  /** Caras en fracciones (0-1) del ancho y alto de la fuente. Lanza si el detector falla. */
  detectar(fuente: FuenteImagen): CaraDetectada[]
}

let promesa: Promise<DetectorCaras | null> | null = null

/** La persona pidió ahorrar datos o está en una red muy lenta: no se baja el detector. */
function ahorraDatos(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  return !!c && (c.saveData === true || c.effectiveType === 'slow-2g' || c.effectiveType === '2g')
}

function dimensiones(f: FuenteImagen): { w: number; h: number } {
  if (f instanceof HTMLVideoElement) return { w: f.videoWidth, h: f.videoHeight }
  if (f instanceof HTMLImageElement) return { w: f.naturalWidth, h: f.naturalHeight }
  return { w: f.width, h: f.height }
}

async function cargar(): Promise<DetectorCaras | null> {
  if (ahorraDatos() || typeof WebAssembly === 'undefined') return null
  try {
    const { FilesetResolver, FaceDetector } = await import('@mediapipe/tasks-vision')
    const fileset = await FilesetResolver.forVisionTasks(RUTA_WASM)
    const detector = await FaceDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: RUTA_MODELO, delegate: 'CPU' },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.5,
    })
    return {
      detectar(fuente) {
        const { w, h } = dimensiones(fuente)
        if (!w || !h) return []
        return detector.detect(fuente).detections.map((d) => {
          const b = d.boundingBox
          return {
            x: (b?.originX ?? 0) / w,
            y: (b?.originY ?? 0) / h,
            ancho: (b?.width ?? 0) / w,
            alto: (b?.height ?? 0) / h,
            score: d.categories[0]?.score ?? 0,
          }
        })
      },
    }
  } catch {
    // Sin red, sin memoria o un navegador viejo: la próxima vez se reintenta.
    promesa = null
    return null
  }
}

/** Empieza a bajar el detector (una sola vez). Resuelve null si no hay o no conviene. */
export function precargarDetectorCaras(): Promise<DetectorCaras | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (!promesa) promesa = cargar()
  return promesa
}

/** El detector, o null si no está listo en `ms` milisegundos: la revisión no espera más. */
export function detectorConPlazo(ms: number): Promise<DetectorCaras | null> {
  return Promise.race([
    precargarDetectorCaras(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}
