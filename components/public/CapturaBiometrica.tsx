/**
 * Paso de verificación de identidad del prospecto — Política V4.1, Anexo A
 * ("Cédula de ciudadanía validada vía biometría AUCO o equivalente") y §14
 * ("no aprobar automáticamente sin validación de identidad").
 *
 * Cierra el riesgo que el Flujo §12 manda documentar: "Enlace reenviado a un
 * tercero. La confirmación de identidad y el registro del documento aceptante
 * son la defensa." Hoy esa defensa es teclear la cédula y recibir el OTP;
 * quien reenvíe el enlace con la cédula a la mano pasa. El cotejo cara-contra-
 * documento es lo único que lo cierra.
 *
 * TRES DECISIONES QUE NO SON DE ESTILO
 *
 * 1. `<input type="file" capture>` y NO getUserMedia. El input nativo abre la
 *    cámara del celular en iOS y Android sin diálogo de permisos propio, sin
 *    <video>, sin stream que cerrar y sin el caso —muy real— de que Safari
 *    niegue la cámara en un iframe o sin HTTPS y deje la pantalla muerta. En
 *    escritorio degrada solo a selector de archivo. Menos código y más
 *    dispositivos.
 *
 * 2. NUNCA bloquea. Ni cuando no coincide, ni cuando Auco no responde, ni
 *    cuando el prospecto se niega. La Política no le da a esta fuente ningún
 *    rechazo (§2: "nunca rechaza por fallo técnico") — lo que hace un fallo es
 *    mandar el estudio a revisión manual. Un botón "Continuar" que desaparece
 *    convertiría eso en un portazo que nadie autorizó.
 *
 * 3. "Prefiero no tomarme la foto" está SIEMPRE visible, no escondido tras un
 *    fallo. La imagen del rostro es dato sensible (Ley 1581 art. 5) y el
 *    art. 6-a obliga a informar que no está obligado a autorizarlo. Un derecho
 *    que solo aparece cuando algo sale mal no es un derecho.
 */

'use client'

import { useRef, useState } from 'react'
import { autorizacionPublicService } from '@/services/autorizacionService'
import type { EstadoBiometria } from '@/types/autorizacion'
import { cn } from '@/lib/utils'
import {
  IconCheck,
  IconId,
  IconLoader,
  IconRefresh,
  IconShieldCheck,
  IconUser,
  IconAlertTriangle, IconArrowLeft, IconArrowRight } from '@/components/icons'

/**
 * Lado más largo tras reescalar, y calidad JPEG.
 *
 * El backend corta cada imagen en 1.4 MB de base64 y `express.json` corta el
 * request entero en 2 MB — y aquí viajan DOS. Una foto de un celular moderno
 * ronda 4-8 MB en base64: sin este reescalado el prospecto recibiría un 413
 * sin mensaje útil. 1280 px sobra para un cotejo facial y para leer el número
 * de la cédula por OCR.
 */
const LADO_MAXIMO = 1280
const CALIDAD_JPEG = 0.82

/** Lee el archivo, lo reescala y devuelve un data URL JPEG. */
async function aJpegReescalado(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No pudimos leer la imagen'))
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('La imagen no se pudo abrir'))
    el.src = dataUrl
  })

  const escala = Math.min(1, LADO_MAXIMO / Math.max(img.width, img.height))
  const w = Math.round(img.width * escala)
  const h = Math.round(img.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl // sin canvas, se manda el original y que decida el backend
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', CALIDAD_JPEG)
}

interface RanuraProps {
  titulo: string
  ayuda: string
  icono: React.ReactNode
  /** 'environment' = cámara trasera (documento); 'user' = frontal (selfie). */
  capture: 'environment' | 'user'
  valor: string | null
  onChange: (dataUrl: string | null) => void
  disabled: boolean
}

/** Una foto (cédula o selfie) reescalada. También la usa /verificar-identidad (Adenda 2 §9). */
export function Ranura({ titulo, ayuda, icono, capture, valor, onChange, disabled }: RanuraProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Se limpia el value para que volver a elegir LA MISMA foto dispare el
    // change de nuevo (si no, el "Repetir" no hace nada la segunda vez).
    e.target.value = ''
    if (!file) return
    setError('')
    setCargando(true)
    try {
      onChange(await aJpegReescalado(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos procesar la imagen')
      onChange(null)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture}
        onChange={onFile}
        className="hidden"
        aria-label={titulo}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || cargando}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left transition-colors',
          valor
            ? 'border-primary-300 bg-primary-50/60'
            : 'border-gray-200 bg-gray-50 hover:border-primary-300 hover:bg-primary-50/40',
          (disabled || cargando) && 'cursor-not-allowed opacity-60',
        )}
      >
        <span
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg',
            valor ? 'bg-white' : 'bg-white text-gray-400',
          )}
        >
          {cargando ? (
            <IconLoader size={20} className="animate-spin text-primary-600" />
          ) : valor ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={valor} alt="" className="h-full w-full object-cover" />
          ) : (
            icono
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-gray-900">{titulo}</span>
          <span className="block text-xs text-gray-500">
            {error ? <span className="text-red-600">{error}</span> : valor ? 'Listo · toca para repetir' : ayuda}
          </span>
        </span>
        {valor && !cargando && <IconCheck size={18} className="shrink-0 text-primary-600" />}
      </button>
    </div>
  )
}

interface Props {
  token: string
  /** Veredicto previo si el prospecto ya pasó por aquí y reabrió el enlace. */
  estadoPrevio?: EstadoBiometria | null
  /** Avanza al paso de firma. Se llama pase lo que pase con el cotejo. */
  onContinuar: () => void
  onVolver: () => void
}

export function CapturaBiometrica({ token, estadoPrevio, onContinuar, onVolver }: Props) {
  const [documento, setDocumento] = useState<string | null>(null)
  const [selfie, setSelfie] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<EstadoBiometria | null>(
    // 'desactivada' no es un veredicto que valga la pena mostrar.
    estadoPrevio && estadoPrevio !== 'desactivada' ? estadoPrevio : null,
  )
  const [mensaje, setMensaje] = useState('')

  const listo = !!documento && !!selfie
  const verificada = resultado === 'verificada'

  async function verificar() {
    if (!listo || enviando) return
    setEnviando(true)
    setMensaje('')
    try {
      const r = await autorizacionPublicService.verificarBiometria(token, {
        documentImage: documento,
        photo: selfie,
      })
      setResultado(r.estado)
      setMensaje(r.motivo ?? '')
      if (r.estado === 'verificada') onContinuar()
    } catch {
      // Ni siquiera un error de red puede dejarlo atrapado: se marca como no
      // verificada (que es la verdad) y el botón de continuar sigue ahí.
      setResultado('no_verificada')
      setMensaje('No pudimos completar la verificación en este momento. Puedes continuar: alguien de nuestro equipo revisará tu caso.')
    } finally {
      setEnviando(false)
    }
  }

  async function omitir() {
    setEnviando(true)
    try {
      await autorizacionPublicService.omitirBiometria(token)
    } catch {
      // El registro del "no autorizo" es best-effort: si falla, el estudio
      // igual llega sin biometría y termina en revisión manual.
    } finally {
      setEnviando(false)
      onContinuar()
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <IconShieldCheck size={28} />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Confirmemos que eres tú</h2>
        <p className="mt-1 text-sm text-gray-500">
          Toma una foto de tu cédula y una selfie. Comparamos las dos para proteger tu identidad: así nadie
          puede solicitar una fianza en tu nombre.
        </p>
      </div>

      {verificada ? (
        <div className="flex items-start gap-2 rounded-lg border border-primary-200 bg-primary-50 p-3">
          <IconCheck size={16} className="mt-0.5 shrink-0 text-primary-700" />
          <p className="text-sm font-semibold text-primary-900">
            Listo, confirmamos tu identidad.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <Ranura
              titulo="Foto de tu cédula"
              ayuda="El lado con tu foto, sobre una superficie plana"
              icono={<IconId size={22} />}
              capture="environment"
              valor={documento}
              onChange={setDocumento}
              disabled={enviando}
            />
            <Ranura
              titulo="Selfie"
              ayuda="Buena luz, sin gorra ni gafas oscuras"
              icono={<IconUser size={22} />}
              capture="user"
              valor={selfie}
              onChange={setSelfie}
              disabled={enviando}
            />
          </div>

          {mensaje && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">{mensaje}</p>
            </div>
          )}

          <button
            type="button"
            onClick={verificar}
            disabled={!listo || enviando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando ? <IconLoader size={20} className="animate-spin" /> : resultado ? <IconRefresh size={18} /> : null}
            {enviando ? 'Verificando…' : resultado ? 'Intentar de nuevo' : 'Verificar mi identidad'}
          </button>
        </>
      )}

      {/* Siempre visible: un fallo del cotejo no puede dejar a nadie atrapado
          (§2 "nunca rechaza por fallo técnico"). */}
      <button
        type="button"
        onClick={onContinuar}
        disabled={enviando}
        className={cn(
          'w-full rounded-lg px-6 py-3 text-sm font-bold transition-colors',
          verificada
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
        )}
      >
        <span className="inline-flex items-center gap-1.5">Continuar <IconArrowRight size={16} /></span>
      </button>

      {!verificada && (
        <p className="text-center text-xs text-gray-400">
          Tu foto solo se usa para confirmar tu identidad. No se guarda en Cofianza ni se comparte con la
          inmobiliaria.{' '}
          <button
            type="button"
            onClick={omitir}
            disabled={enviando}
            className="font-semibold text-gray-500 underline hover:text-gray-700"
          >
            Prefiero no tomarme la foto
          </button>
          . No estás obligado: tu solicitud sigue y la revisa una persona de nuestro equipo.
        </p>
      )}

      <button
        type="button"
        onClick={onVolver}
        disabled={enviando}
        className="mx-auto inline-flex min-h-11 items-center gap-1 px-4 py-2 text-xs font-semibold text-gray-400 hover:text-gray-600"
      >
        <IconArrowLeft size={14} /> Volver
      </button>
    </div>
  )
}
