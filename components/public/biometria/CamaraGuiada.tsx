/**
 * Toma de una foto (cédula o selfie) con la cámara en vivo, una guía en
 * pantalla y una revisión ANTES de mandarla al cotejo. La revisión corre en el
 * celular: una foto que no sirve no gasta un intento ni un cobro.
 *
 * - Cédula: cámara trasera, marco rectangular. Selfie: cámara frontal, óvalo,
 *   y avisos en vivo («Acérquese un poco», «Busque más luz», «Centre su cara
 *   en el óvalo») cuando el detector de caras ya cargó.
 * - NADA bloquea: el botón de tomar la foto siempre funciona, y tras un aviso
 *   de la revisión queda «Usar esta foto de todas formas».
 * - Si la cámara en vivo no abre (sin permiso, sin cámara, un navegador viejo
 *   o un visor de WhatsApp raro), se ofrece la cámara del celular
 *   (`<input type="file" capture>`, lo de siempre). La pantalla nunca queda
 *   muerta.
 * - El video se apaga al tomar la foto, al cerrar y al desmontar. Las fotos
 *   viven solo en memoria.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { buttonClasses } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  IconAlertTriangle,
  IconCamera,
  IconLoader,
  IconRefresh,
  IconX,
} from '@/components/icons'
import {
  luz,
  nombreCortoDocumento,
  pistaDocumento,
  pistaSelfie,
  recortar,
  type AvisoFoto,
  type PistaEnVivo,
  type TipoFoto,
} from '@/lib/biometria/calidadFoto'
import { precargarDetectorCaras, type DetectorCaras } from '@/lib/biometria/detectorCaras'
import { LADO_MAXIMO, aCanvas, analizarFoto, canvasAJpeg, grisDe } from '@/lib/biometria/imagen'

/** Proporción de la cédula (ISO/IEC 7810 ID-1: 85,6 × 54 mm). */
const PROPORCION_CEDULA = 85.6 / 54
/** Alto/ancho del óvalo de la selfie y altura de su centro (fracción del visor). */
const PROPORCION_OVALO = 1.3
const CENTRO_OVALO_Y = 0.46
/** Cada cuánto se mira el video para los avisos en vivo. */
const INTERVALO_PISTA_MS = 400
/** Lado mayor del cuadro que se analiza en vivo (barato en un celular). */
const LADO_PISTA = 320

type Fase =
  | { fase: 'abriendo' }
  | { fase: 'camara' }
  | { fase: 'sin_camara'; motivo: string }
  | { fase: 'revisando'; foto: string }
  | { fase: 'aviso'; foto: string; aviso: AvisoFoto }

interface Rect {
  x: number
  y: number
  ancho: number
  alto: number
}

/** La guía (marco u óvalo) en píxeles del visor. */
function guiaEnVisor(tipo: TipoFoto, w: number, h: number): Rect {
  if (tipo === 'documento') {
    const ancho = Math.min(w * 0.9, h * 0.62 * PROPORCION_CEDULA)
    const alto = ancho / PROPORCION_CEDULA
    return { x: (w - ancho) / 2, y: (h - alto) / 2, ancho, alto }
  }
  const alto = Math.min(h * 0.66, w * 0.74 * PROPORCION_OVALO)
  const ancho = alto / PROPORCION_OVALO
  return { x: (w - ancho) / 2, y: h * CENTRO_OVALO_Y - alto / 2, ancho, alto }
}

/**
 * Pasa un rectángulo del visor a píxeles del video. El video llena el visor
 * con `object-fit: cover`: se escala y se centra, recortando lo que sobra.
 */
function visorAVideo(r: Rect, visor: { w: number; h: number }, video: { w: number; h: number }): Rect {
  const escala = Math.max(visor.w / video.w, visor.h / video.h)
  const offX = (visor.w - video.w * escala) / 2
  const offY = (visor.h - video.h * escala) / 2
  const x0 = Math.max(0, (r.x - offX) / escala)
  const y0 = Math.max(0, (r.y - offY) / escala)
  const x1 = Math.min(video.w, (r.x + r.ancho - offX) / escala)
  const y1 = Math.min(video.h, (r.y + r.alto - offY) / escala)
  return { x: x0, y: y0, ancho: Math.max(1, x1 - x0), alto: Math.max(1, y1 - y0) }
}

function motivoSinCamara(err: unknown): string {
  const nombre = err instanceof DOMException || err instanceof Error ? err.name : ''
  switch (nombre) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'No tenemos permiso para usar la cámara desde esta página.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No encontramos una cámara en este dispositivo.'
    case 'NotReadableError':
    case 'AbortError':
      return 'La cámara está ocupada por otra aplicación.'
    default:
      return 'No pudimos abrir la cámara desde esta página.'
  }
}

export interface CamaraGuiadaProps {
  tipo: TipoFoto
  /** «Foto de su cédula de ciudadanía», «Selfie». */
  titulo: string
  documentoNombre: string
  /** De dónde sale la foto: la cámara en vivo o la cámara/galería del celular. */
  origen: 'camara' | 'archivo'
  /** Con origen 'archivo': la foto ya elegida, para revisarla. */
  fotoArchivo?: string | null
  onAceptar: (dataUrl: string) => void
  onCerrar: () => void
  /** Abre la cámara del celular (`<input capture>`). La llama un clic: el gesto se conserva. */
  onUsarCamaraNativa: () => void
}

export function CamaraGuiada({
  tipo,
  titulo,
  documentoNombre,
  origen,
  fotoArchivo,
  onAceptar,
  onCerrar,
  onUsarCamaraNativa,
}: CamaraGuiadaProps) {
  const esSelfie = tipo === 'selfie'
  const doc = nombreCortoDocumento(documentoNombre)
  const lado = doc === 'pasaporte' ? 'en la página donde está su foto' : 'del lado donde está su foto'
  // En un computador `capture` no abre la cámara sino el selector de archivos.
  const [esCelular] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches,
  )
  const [estado, setEstado] = useState<Fase>(() =>
    origen === 'archivo' && fotoArchivo ? { fase: 'revisando', foto: fotoArchivo } : { fase: 'abriendo' },
  )
  const [pista, setPista] = useState<PistaEnVivo | null>(null)
  const [anunciada, setAnunciada] = useState('')
  const [visor, setVisor] = useState({ w: 0, h: 0 })

  const videoRef = useRef<HTMLVideoElement>(null)
  const visorRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<DetectorCaras | null>(null)
  const montadoRef = useRef(true)
  // Cada apertura de la cámara tiene un número: una apertura vieja que
  // termina tarde (modo estricto, «Tomar otra» rápido) apaga su video en vez
  // de dejar la cámara encendida sin nadie que la use.
  const generacionRef = useRef(0)
  const tomarOtraRef = useRef<HTMLButtonElement>(null)
  const disparadorRef = useRef<HTMLButtonElement>(null)
  const ultimaPistaRef = useRef({ texto: '', veces: 0, anunciadaEn: 0 })

  const apagarCamara = useCallback(() => {
    generacionRef.current++
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  /** Pide la cámara y la conecta al video. No cambia el estado hasta que responde. */
  const conectarCamara = useCallback(() => {
    apagarCamara()
    const generacion = generacionRef.current
    const vigente = () => montadoRef.current && generacion === generacionRef.current
    Promise.resolve()
      // Sin plazo a propósito: mientras el navegador pregunta por el permiso,
      // la persona decide; abajo tiene «Use la cámara del celular».
      .then(() =>
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: esSelfie
            ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }
            : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        }),
      )
      .then(async (stream) => {
        if (!vigente()) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) throw new Error('sin video')
        video.srcObject = stream
        await video.play()
        if (vigente()) setEstado({ fase: 'camara' })
      })
      .catch((err) => {
        if (!vigente()) return
        apagarCamara()
        setEstado({ fase: 'sin_camara', motivo: motivoSinCamara(err) })
      })
  }, [apagarCamara, esSelfie])

  const abrirCamara = useCallback(() => {
    setPista(null)
    setEstado({ fase: 'abriendo' })
    conectarCamara()
  }, [conectarCamara])

  /** Revisa la foto en el celular: sin aviso se acepta; con aviso se muestra. */
  const analizar = useCallback(
    (foto: string) => {
      // Si la foto vino del celular, la persona no vio el óvalo ni el marco: los avisos no los nombran.
      void analizarFoto(foto, tipo, documentoNombre, origen === 'camara').then((aviso) => {
        if (!montadoRef.current) return
        if (aviso) setEstado({ fase: 'aviso', foto, aviso })
        else onAceptar(foto)
      })
    },
    [documentoNombre, onAceptar, origen, tipo],
  )

  const revisar = useCallback(
    (foto: string) => {
      setEstado({ fase: 'revisando', foto })
      analizar(foto)
    },
    [analizar],
  )

  // Arranque: la cámara en vivo, o revisar la foto que llegó del celular.
  useEffect(() => {
    montadoRef.current = true
    // El estado inicial ya es 'revisando' o 'abriendo': aquí solo se arranca el trabajo.
    if (origen === 'archivo' && fotoArchivo) analizar(fotoArchivo)
    else conectarCamara()
    precargarDetectorCaras().then((d) => {
      detectorRef.current = d
    })
    return () => {
      montadoRef.current = false
      apagarCamara()
    }
    // Solo al montar: cada foto nueva del celular vuelve a montar el diálogo (key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tamaño del visor, para dibujar la guía y ubicarla en el video.
  useEffect(() => {
    const el = visorRef.current
    if (!el) return
    const medir = () => setVisor({ w: el.clientWidth, h: el.clientHeight })
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [estado.fase])

  // Al volver de otra app, iOS/Android pueden haber cortado la cámara.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const track = streamRef.current?.getVideoTracks()[0]
      if (estado.fase === 'camara' && (!track || track.readyState === 'ended')) abrirCamara()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [abrirCamara, estado.fase])

  // Avisos en vivo.
  useEffect(() => {
    if (estado.fase !== 'camara') return
    const lienzo = document.createElement('canvas')
    const id = window.setInterval(() => {
      const video = videoRef.current
      if (!video || !video.videoWidth || !visor.w) return
      const dimVideo = { w: video.videoWidth, h: video.videoHeight }
      const zona = esSelfie
        ? visorAVideo({ x: 0, y: 0, ancho: visor.w, alto: visor.h }, visor, dimVideo)
        : visorAVideo(guiaEnVisor('documento', visor.w, visor.h), visor, dimVideo)
      const escala = Math.min(1, LADO_PISTA / Math.max(zona.ancho, zona.alto))
      lienzo.width = Math.max(1, Math.round(zona.ancho * escala))
      lienzo.height = Math.max(1, Math.round(zona.alto * escala))
      const ctx = lienzo.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.drawImage(video, zona.x, zona.y, zona.ancho, zona.alto, 0, 0, lienzo.width, lienzo.height)
      const gris = grisDe(lienzo)
      if (!gris) return
      let nueva: PistaEnVivo
      if (esSelfie) {
        let caras = null
        try {
          caras = detectorRef.current ? detectorRef.current.detectar(lienzo) : null
        } catch {
          caras = null
        }
        nueva = pistaSelfie({ media: luz(gris).media, caras, centroY: CENTRO_OVALO_Y })
      } else {
        nueva = pistaDocumento(luz(recortar(gris, 0.1, 0.1, 0.8, 0.8)), documentoNombre)
      }
      setPista(nueva)
      // Al lector de pantalla solo le llega un aviso estable (dos lecturas
      // seguidas iguales) y no más de uno cada 2,5 s: si no, sería ruido.
      const u = ultimaPistaRef.current
      u.veces = u.texto === nueva.texto ? u.veces + 1 : 1
      u.texto = nueva.texto
      const ahora = Date.now()
      if (u.veces === 2 && ahora - u.anunciadaEn > 2500) {
        u.anunciadaEn = ahora
        setAnunciada(nueva.texto)
      }
    }, INTERVALO_PISTA_MS)
    return () => window.clearInterval(id)
  }, [documentoNombre, esSelfie, estado.fase, visor])

  // Con la cámara lista, el foco va al botón de tomar la foto (al abrir estaba
  // deshabilitado y el diálogo lo dejó en el enlace de respaldo). Con un aviso,
  // a «Tomar otra» (el aviso se anuncia con role=alert).
  useEffect(() => {
    if (estado.fase === 'camara') disparadorRef.current?.focus()
    if (estado.fase === 'aviso') tomarOtraRef.current?.focus()
  }, [estado.fase])

  function tomarFoto() {
    const video = videoRef.current
    if (estado.fase !== 'camara' || !video?.videoWidth) return
    const dimVideo = { w: video.videoWidth, h: video.videoHeight }
    let recorte: Rect | undefined
    if (!esSelfie && visor.w) {
      // La cédula se recorta al marco con margen: gana resolución para leer el
      // número y ver la cara impresa. A lo ancho se deja todo lo visible.
      const g = guiaEnVisor('documento', visor.w, visor.h)
      const mx = g.ancho * 0.15
      const my = g.alto * 0.25
      recorte = visorAVideo({ x: g.x - mx, y: g.y - my, ancho: g.ancho + 2 * mx, alto: g.alto + 2 * my }, visor, dimVideo)
    }
    // La selfie se guarda como la ve la cámara (sin el espejo de la vista previa).
    const foto = canvasAJpeg(aCanvas(video, dimVideo.w, dimVideo.h, LADO_MAXIMO, recorte))
    apagarCamara()
    revisar(foto)
  }

  function tomarOtra() {
    if (origen === 'archivo') {
      // Vino de la cámara del celular: se vuelve a ella (el clic conserva el gesto).
      onUsarCamaraNativa()
      return
    }
    abrirCamara()
  }

  function usarCamaraNativa() {
    apagarCamara()
    setEstado({ fase: 'sin_camara', motivo: '' })
    onUsarCamaraNativa()
  }

  function cerrar() {
    apagarCamara()
    onCerrar()
  }

  const enCamara = estado.fase === 'abriendo' || estado.fase === 'camara'
  const guia = visor.w ? guiaEnVisor(tipo, visor.w, visor.h) : null
  const lista = !!pista?.lista
  const colorGuia = lista ? '#34d399' : '#e5e7eb'
  const instruccion = esSelfie ? 'Ponga su cara dentro del óvalo' : `Ubique su ${doc} dentro del marco`
  const encabezado =
    estado.fase === 'aviso' || estado.fase === 'revisando' ? (esSelfie ? 'Revise su selfie' : 'Revise la foto') : titulo

  return (
    <Modal
      isOpen
      onClose={cerrar}
      bare
      ariaLabel={encabezado}
      className={cn(
        'flex h-[100dvh] w-full max-w-none flex-col overflow-hidden sm:h-[min(100dvh,52rem)] sm:max-w-md sm:rounded-2xl',
        enCamara ? 'bg-gray-950 text-white' : 'bg-white text-gray-900',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]',
          enCamara ? 'text-white' : 'border-b border-gray-100',
        )}
      >
        <h2 className="min-w-0 truncate text-base font-bold">{encabezado}</h2>
        <button
          type="button"
          data-modal-close
          onClick={cerrar}
          aria-label="Cerrar"
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
            enCamara ? 'text-white hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100',
          )}
        >
          <IconX size={22} />
        </button>
      </div>

      {/* ── Cámara en vivo ───────────────────────────────────── */}
      {enCamara && (
        <>
          <div ref={visorRef} className="relative min-h-0 flex-1 overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              aria-hidden="true"
              className={cn(
                'absolute inset-0 h-full w-full object-cover',
                esSelfie && '-scale-x-100',
                estado.fase !== 'camara' && 'opacity-0',
              )}
            />
            {guia && (
              <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                <defs>
                  <mask id={`guia-${tipo}`}>
                    <rect width="100%" height="100%" fill="white" />
                    {esSelfie ? (
                      <ellipse cx={guia.x + guia.ancho / 2} cy={guia.y + guia.alto / 2} rx={guia.ancho / 2} ry={guia.alto / 2} fill="black" />
                    ) : (
                      <rect x={guia.x} y={guia.y} width={guia.ancho} height={guia.alto} rx={14} fill="black" />
                    )}
                  </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask={`url(#guia-${tipo})`} />
                {esSelfie ? (
                  <ellipse
                    cx={guia.x + guia.ancho / 2}
                    cy={guia.y + guia.alto / 2}
                    rx={guia.ancho / 2}
                    ry={guia.alto / 2}
                    fill="none"
                    stroke={colorGuia}
                    strokeWidth={3}
                    strokeDasharray={lista ? undefined : '10 7'}
                  />
                ) : (
                  <rect
                    x={guia.x}
                    y={guia.y}
                    width={guia.ancho}
                    height={guia.alto}
                    rx={14}
                    fill="none"
                    stroke={colorGuia}
                    strokeWidth={3}
                    strokeDasharray={lista ? undefined : '10 7'}
                  />
                )}
              </svg>
            )}
            {estado.fase === 'abriendo' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-gray-200">
                <IconLoader size={28} className="animate-spin" />
                Abriendo la cámara…
              </div>
            )}
            {estado.fase === 'camara' && pista && (
              <p
                className={cn(
                  'absolute inset-x-3 top-3 rounded-xl px-3 py-2 text-center text-sm font-semibold text-white shadow',
                  pista.lista ? 'bg-primary-700/90' : 'bg-black/60',
                )}
              >
                {pista.texto}
              </p>
            )}
            <p className="sr-only" aria-live="polite">
              {anunciada}
            </p>
          </div>

          <div className="shrink-0 space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-center">
            {/* Sin repetir lo que ya dice el aviso de arriba. */}
            <p className="min-h-5 text-sm text-gray-300">{pista?.texto === instruccion ? '' : instruccion}</p>
            <button
              ref={disparadorRef}
              type="button"
              onClick={tomarFoto}
              disabled={estado.fase !== 'camara'}
              aria-label="Tomar la foto"
              className={cn(
                'mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-400 disabled:opacity-40',
                // En la cédula no hay detección en vivo: el botón se ve siempre listo.
                lista || !esSelfie ? 'bg-white text-gray-900' : 'bg-white/20 text-white',
              )}
            >
              <IconCamera size={28} />
            </button>
            <button
              type="button"
              onClick={usarCamaraNativa}
              className="mx-auto inline-flex min-h-11 items-center px-3 text-xs font-semibold text-gray-300 underline underline-offset-2 hover:text-white"
            >
              {esCelular ? '¿No funciona? Use la cámara del celular' : '¿No funciona? Elija una foto'}
            </button>
          </div>
        </>
      )}

      {/* ── Sin cámara en vivo: la del celular ───────────────── */}
      {estado.fase === 'sin_camara' && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-6 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
            <IconCamera size={28} />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold text-gray-900">
              {estado.motivo || (esCelular ? 'Tome la foto con la cámara de su celular' : 'Elija la foto')}
            </p>
            <p className="text-sm text-gray-600">
              {esSelfie
                ? `${esCelular ? 'Tómese la selfie con la cámara de su celular' : 'Elija una selfie'}: de frente, con buena luz y sin gafas ni gorra.`
                : `${esCelular ? `Tome la foto de su ${doc} con la cámara de su celular` : `Elija una foto de su ${doc}`}: completa, sin reflejos y ${lado}.`}
            </p>
          </div>
          <button type="button" onClick={onUsarCamaraNativa} className={buttonClasses('primary', 'lg', 'w-full')}>
            <IconCamera size={18} /> {esCelular ? 'Abrir la cámara del celular' : 'Elegir una foto'}
          </button>
          <button type="button" onClick={cerrar} className={buttonClasses('secondary', 'lg', 'w-full')}>
            Cancelar
          </button>
        </div>
      )}

      {/* ── Revisión previa ──────────────────────────────────── */}
      {(estado.fase === 'revisando' || estado.fase === 'aviso') && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <div className="flex justify-center rounded-xl bg-gray-900 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={estado.foto}
              alt={esSelfie ? 'Su selfie' : `Foto de su ${doc}`}
              className="max-h-[38dvh] w-auto rounded-lg object-contain"
            />
          </div>

          {estado.fase === 'revisando' ? (
            <p className="flex items-center justify-center gap-2 text-sm text-gray-600" role="status">
              <IconLoader size={18} className="animate-spin text-primary-600" /> Revisando la foto…
            </p>
          ) : (
            <>
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-900">
                  <span className="block font-bold">{estado.aviso.titulo}</span>
                  {estado.aviso.texto}
                </p>
              </div>
              <p className="self-start rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-800">
                Esta foto no se envió ni gastó un intento
              </p>
              <div className="mt-auto space-y-2">
                <button ref={tomarOtraRef} type="button" onClick={tomarOtra} className={buttonClasses('primary', 'lg', 'w-full')}>
                  <IconRefresh size={18} /> {esSelfie ? 'Tomar otra selfie' : 'Tomar otra foto'}
                </button>
                <button
                  type="button"
                  onClick={() => onAceptar(estado.foto)}
                  className="mx-auto flex min-h-11 items-center px-3 text-sm font-semibold text-gray-600 underline underline-offset-2 hover:text-gray-800"
                >
                  Usar esta foto de todas formas
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
