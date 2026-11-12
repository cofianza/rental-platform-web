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
 * DECISIONES QUE NO SON DE ESTILO
 *
 * 1. Cámara en vivo con guía (getUserMedia) CUANDO SE PUEDE, y el
 *    `<input type="file" capture>` de siempre cuando no. 12-nov-2026: un
 *    estudio gastó los 5 cotejos (el último sin cara que comparar) porque la
 *    foto se mandaba sin mirarla. Ahora hay un ejemplo antes de empezar, un
 *    marco/óvalo en la cámara y una revisión EN EL CELULAR antes de mandar
 *    (components/public/biometria/CamaraGuiada.tsx). Lo que llevó a usar
 *    solo el input sigue siendo cierto —Safari puede negar la cámara en un
 *    iframe, un visor de WhatsApp puede no tenerla, un escritorio no tiene
 *    cámara—, así que cualquier falla de la cámara en vivo cae al input sin
 *    dejar la pantalla muerta, y la revisión también corre sobre esas fotos.
 *
 * 2. NUNCA bloquea. Ni cuando no coincide, ni cuando Auco no responde, ni
 *    cuando el prospecto se niega, ni cuando la revisión previa ve un problema
 *    («Usar esta foto de todas formas»). La Política no le da a esta fuente
 *    ningún rechazo (§2: "nunca rechaza por fallo técnico") — lo que hace un
 *    fallo es mandar el estudio a revisión manual. Antes del cotejo hay dos
 *    salidas (verificar o negarse, que queda registrada); con un veredicto
 *    aparece "Continuar sin verificar". Un "Continuar" previo al cotejo
 *    saltaba el paso sin registrar la negativa.
 *
 * 3. "Prefiero no tomarme la foto" es un botón a la vista desde el inicio
 *    (también en el ejemplo), no escondido tras un fallo. La imagen del rostro
 *    es dato sensible (Ley 1581 art. 5) y el art. 6-a obliga a informar que no
 *    está obligado a autorizarlo. Un derecho que solo aparece cuando algo sale
 *    mal no es un derecho.
 *
 * 4. Cada cotejo se cobra en Auco. Un reintento exige cambiar la foto que
 *    falló (la API dice cuál: `repetir`; la misma pareja de fotos daría el
 *    mismo resultado) y el veredicto sube a la página (`onResultado`) para que
 *    volver atrás no pida la foto otra vez. Al prospecto se le dice qué falló
 *    y cuántos intentos le quedan, nunca el porcentaje (antifraude).
 *
 * 5. Las fotos solo viven en memoria: la revisión previa mira los píxeles en
 *    el navegador y no guarda nada.
 */

'use client'

import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { autorizacionPublicService } from '@/services/autorizacionService'
import { ApiClientError } from '@/lib/api'
import { mensajeParaProspecto } from '@/lib/errorMessages'
import type { EstadoBiometria, FotoBiometria, IBiometriaResponse } from '@/types/autorizacion'
import { buttonClasses } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { CamaraGuiada } from '@/components/public/biometria/CamaraGuiada'
import { EjemploFotos } from '@/components/public/biometria/EjemploFotos'
import { aJpegReescalado, camaraEnVivoDisponible } from '@/lib/biometria/imagen'
import { precargarDetectorCaras } from '@/lib/biometria/detectorCaras'
import { nombreCortoDocumento } from '@/lib/biometria/calidadFoto'
import {
  IconCamera,
  IconCheck,
  IconId,
  IconLoader,
  IconRefresh,
  IconShieldCheck,
  IconUser,
  IconAlertTriangle, IconArrowLeft, IconArrowRight } from '@/components/icons'

/** Una foto (cédula o selfie) reescalada. También la usa /verificar-identidad (Adenda 2 §9). */
const TIPO_DOCUMENTO_TEXTO: Record<string, string> = {
  cc: 'cédula de ciudadanía',
  ce: 'cédula de extranjería',
  ti: 'tarjeta de identidad',
  pasaporte: 'pasaporte',
  ppt: 'PPT',
  pep: 'PEP',
  nit: 'NIT',
}

/** Cómo se llama el documento para la persona («cédula de extranjería», «PPT»…). */
export function nombreDocumento(tipo: string | null | undefined, otro = 'documento'): string {
  return TIPO_DOCUMENTO_TEXTO[(tipo ?? '').toLowerCase()] ?? otro
}

/** Lo que una página puede pedirle a una Ranura: abrir su cámara (p. ej. «Tomar otra selfie»). */
export interface RanuraHandle {
  /** Llamarlo desde un clic: si no hay cámara en vivo abre el selector del celular, que exige el gesto. */
  abrir: () => void
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
  /** Nombre del documento para los avisos («cédula de ciudadanía», «pasaporte»…). */
  documentoNombre?: string
  /** Es la foto que hay que tomar de nuevo tras un cotejo fallido. */
  resaltada?: boolean
  ref?: React.Ref<RanuraHandle>
}

type Dialogo = null | { origen: 'camara' } | { origen: 'archivo'; foto: string; n: number }

export function Ranura({
  titulo,
  ayuda,
  icono,
  capture,
  valor,
  onChange,
  disabled,
  documentoNombre = 'documento',
  resaltada = false,
  ref,
}: RanuraProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const tipo = capture === 'user' ? 'selfie' : 'documento'
  const abierto = dialogo !== null

  // «Atrás» del celular con la cámara abierta (se ve como una app nativa)
  // cierra la cámara en vez de mover el paso de la página y perder las fotos:
  // abrir el diálogo suma una entrada al historial, y Atrás la quita. Se hace
  // en los manejadores y no en un efecto para no duplicarla en modo estricto.
  function abrirDialogo(d: Exclude<Dialogo, null>) {
    if (!abierto) window.history.pushState({ ...(window.history.state ?? {}), camaraBiometria: true }, '')
    setDialogo(d)
  }
  function cerrarDialogo() {
    setDialogo(null)
    if ((window.history.state as { camaraBiometria?: boolean } | null)?.camaraBiometria) window.history.back()
  }
  useEffect(() => {
    if (!abierto) return
    const onPop = () => setDialogo(null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [abierto])

  function abrir() {
    if (disabled || cargando) return
    setError('')
    // El detector de caras empieza a bajar ya (si conviene): la revisión lo necesita en segundos.
    void precargarDetectorCaras()
    if (camaraEnVivoDisponible()) abrirDialogo({ origen: 'camara' })
    else inputRef.current?.click()
  }

  useImperativeHandle(ref, () => ({ abrir }))

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Se limpia el value para que volver a elegir LA MISMA foto dispare el
    // change de nuevo (si no, el "Repetir" no hace nada la segunda vez).
    e.target.value = ''
    if (!file) return
    setError('')
    setCargando(true)
    try {
      // La foto del celular también pasa por la revisión previa (el diálogo se
      // monta de nuevo con cada foto: `key`).
      abrirDialogo({ origen: 'archivo', foto: await aJpegReescalado(file), n: Date.now() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos procesar la imagen')
      if (abierto) cerrarDialogo()
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
        onClick={abrir}
        disabled={disabled || cargando}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left transition-colors',
          valor
            ? 'border-primary-300 bg-primary-50/60'
            : resaltada
              ? 'border-amber-400 bg-amber-50/60 hover:bg-amber-50'
              : 'border-gray-200 bg-gray-50 hover:border-primary-300 hover:bg-primary-50/40',
          (disabled || cargando) && 'cursor-not-allowed opacity-60',
        )}
      >
        <span
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg',
            valor ? 'bg-white' : 'bg-white text-gray-500',
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
            {error ? (
              <span className="text-red-600">{error}</span>
            ) : valor ? (
              'Listo · toque para repetir'
            ) : resaltada ? (
              <span className="font-semibold text-amber-800">Tómela de nuevo</span>
            ) : (
              ayuda
            )}
          </span>
        </span>
        {valor && !cargando ? (
          <IconCheck size={18} className="shrink-0 text-primary-600" />
        ) : (
          <IconCamera size={18} className="shrink-0 text-gray-400" />
        )}
      </button>

      {dialogo && (
        <CamaraGuiada
          key={dialogo.origen === 'archivo' ? dialogo.n : 'camara'}
          tipo={tipo}
          titulo={titulo}
          documentoNombre={documentoNombre}
          origen={dialogo.origen}
          fotoArchivo={dialogo.origen === 'archivo' ? dialogo.foto : null}
          onAceptar={(foto) => {
            onChange(foto)
            cerrarDialogo()
          }}
          onCerrar={cerrarDialogo}
          onUsarCamaraNativa={() => inputRef.current?.click()}
        />
      )}
    </div>
  )
}

/** Lo que se le muestra a la persona tras un cotejo que no quedó limpio. */
interface Falla {
  /** null = API anterior a la clasificación: se muestra `motivo` tal cual. */
  titulo: string | null
  indicacion: string | null
  motivo: string
  intentosRestantes: number | null
  /** Repetir no cambia nada (sin intentos, o el documento no se puede cotejar). */
  sinReintento: boolean
}

function fallaDe(r: IBiometriaResponse): Falla {
  return {
    titulo: r.titulo ?? null,
    indicacion: r.indicacion ?? null,
    motivo: r.motivo ?? '',
    intentosRestantes: r.intentos_restantes ?? null,
    sinReintento: r.intentos_restantes === 0 || r.causa === 'no_aplica',
  }
}

interface Props {
  token: string
  /** Veredicto previo si el prospecto ya pasó por aquí y reabrió el enlace. */
  estadoPrevio?: EstadoBiometria | null
  /** Avanza al paso de firma. Se llama pase lo que pase con el cotejo. */
  onContinuar: () => void
  onVolver: () => void
  /** El veredicto sube a la página: al volver a este paso se muestra sin repetir (ni cobrar) el cotejo. */
  onResultado?: (estado: EstadoBiometria) => void
  /** Cómo se llama el documento del prospecto («cédula de ciudadanía», «pasaporte»…). */
  documentoNombre?: string
}

export function CapturaBiometrica({
  token,
  estadoPrevio,
  onContinuar,
  onVolver,
  onResultado,
  documentoNombre = 'documento',
}: Props) {
  const [documento, setDocumento] = useState<string | null>(null)
  const [selfie, setSelfie] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<EstadoBiometria | null>(
    // 'desactivada' no es un veredicto que valga la pena mostrar. B4: 'omitida'
    // tampoco: quien se negó y vuelve (con «Volver») ve el paso de cero, con
    // «Prefiero no tomarme la foto» a la vista, no «reintentar».
    estadoPrevio && estadoPrevio !== 'desactivada' && estadoPrevio !== 'omitida' ? estadoPrevio : null,
  )
  const [falla, setFalla] = useState<Falla | null>(null)
  // El ejemplo se muestra antes del primer intento; quien vuelve con un veredicto va directo a las fotos.
  const [fase, setFase] = useState<'ejemplo' | 'fotos'>(resultado ? 'fotos' : 'ejemplo')
  const documentoRef = useRef<RanuraHandle>(null)
  const selfieRef = useRef<RanuraHandle>(null)

  const listo = !!documento && !!selfie
  const verificada = resultado === 'verificada'
  const doc = nombreCortoDocumento(documentoNombre)

  async function verificar() {
    if (!listo || enviando) return
    setEnviando(true)
    setFalla(null)
    try {
      const r = await autorizacionPublicService.verificarBiometria(token, {
        documentImage: documento,
        photo: selfie,
      })
      setResultado(r.estado)
      onResultado?.(r.estado)
      if (r.estado === 'verificada') {
        onContinuar()
        return
      }
      if (r.estado === 'desactivada') return
      setFalla(fallaDe(r))
      // La foto que falló se pide de nuevo: la misma pareja daría el mismo
      // resultado (y otro cobro). Una API anterior no dice cuál: la selfie.
      const repetir: FotoBiometria[] = r.repetir ?? ['selfie']
      if (repetir.includes('selfie')) setSelfie(null)
      if (repetir.includes('documento')) setDocumento(null)
    } catch (e) {
      // Ni siquiera un error de red puede dejarlo atrapado: se marca como no
      // verificada (que es la verdad) y aparece «Continuar sin verificar».
      setResultado('no_verificada')
      onResultado?.('no_verificada')
      const status = e instanceof ApiClientError ? e.statusCode : 0
      if (status === 429) {
        // El freno de ráfagas cortó antes del cotejo: las mismas fotos sirven.
        setFalla({
          titulo: 'Hizo varios intentos seguidos',
          indicacion: 'Espere unos minutos e inténtelo de nuevo.',
          motivo: '',
          intentosRestantes: null,
          sinReintento: false,
        })
      } else if (status >= 400 && status < 500) {
        // Enlace vencido, ya usado…: reintentar no cambia nada; la API dice por qué.
        setFalla({
          titulo: 'No pudimos verificar su identidad con foto',
          indicacion: mensajeParaProspecto(e, 'Este enlace ya no permite la verificación con foto.'),
          motivo: '',
          intentosRestantes: null,
          sinReintento: true,
        })
      } else {
        // B3: sin veredicto no se sabe si Auco cobró el cotejo: reintentar exige otra selfie.
        setSelfie(null)
        setFalla({
          titulo: 'No pudimos completar la verificación',
          indicacion:
            status === 0
              ? 'Revise su conexión a internet e inténtelo de nuevo con una selfie nueva.'
              : 'Tuvimos un problema de nuestro lado. Inténtelo en unos minutos con una selfie nueva.',
          motivo: '',
          intentosRestantes: null,
          sinReintento: false,
        })
      }
    } finally {
      setEnviando(false)
    }
  }

  async function omitir() {
    setEnviando(true)
    try {
      await autorizacionPublicService.omitirBiometria(token)
      onResultado?.('omitida')
    } catch {
      // El registro del "no autorizo" es best-effort: si falla, la API lo
      // registra como "no verificada" al firmar (firmarAutorizacion) y el
      // estudio va a revisión manual.
    } finally {
      setEnviando(false)
      onContinuar()
    }
  }

  function empezar() {
    // Quien empieza ya va a tomar las fotos: el detector de caras baja ahora.
    void precargarDetectorCaras()
    setFase('fotos')
  }

  // Botón principal tras un cotejo fallido: pedir la foto que falta, o reenviar.
  // Con el interruptor apagado a mitad del flujo no hay nada que reintentar.
  const sinReintento = !!falla?.sinReintento || resultado === 'desactivada'
  const falta: 'documento' | 'selfie' | null = !documento ? 'documento' : !selfie ? 'selfie' : null

  // Si ya no se puede reintentar, el foco no se pierde con el botón que desaparece.
  const continuarRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (sinReintento && resultado) continuarRef.current?.focus()
  }, [sinReintento, resultado])

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <IconShieldCheck size={28} />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Confirmemos que es usted</h2>
        <p className="mt-1 text-sm text-gray-500">
          Tome una foto de su {documentoNombre} y una selfie. Comparamos las dos para proteger su identidad: así nadie
          puede solicitar una fianza a su nombre.
        </p>
      </div>

      {verificada ? (
        <div className="flex items-start gap-2 rounded-lg border border-primary-200 bg-primary-50 p-3">
          <IconCheck size={16} className="mt-0.5 shrink-0 text-primary-700" />
          <p className="text-sm font-semibold text-primary-900">
            Listo, confirmamos su identidad.
          </p>
        </div>
      ) : fase === 'ejemplo' ? (
        <>
          <EjemploFotos documentoNombre={documentoNombre} />
          <button type="button" onClick={empezar} className={buttonClasses('primary', 'lg', 'w-full')}>
            Empezar <IconArrowRight size={18} />
          </button>
        </>
      ) : (
        <>
          <div className="space-y-3">
            <Ranura
              ref={documentoRef}
              titulo={`Foto de su ${documentoNombre}`}
              ayuda={
                documentoNombre === 'pasaporte'
                  ? 'La página con su foto, sobre una superficie plana'
                  : 'El lado con su foto, sobre una superficie plana'
              }
              icono={<IconId size={22} />}
              capture="environment"
              valor={documento}
              onChange={setDocumento}
              disabled={enviando}
              documentoNombre={documentoNombre}
              resaltada={!!falla && !documento}
            />
            <Ranura
              ref={selfieRef}
              titulo="Selfie"
              ayuda="Buena luz, sin gafas ni gorra"
              icono={<IconUser size={22} />}
              capture="user"
              valor={selfie}
              onChange={setSelfie}
              disabled={enviando}
              documentoNombre={documentoNombre}
              resaltada={!!falla && !selfie}
            />
          </div>

          {falla && (
            <div className="space-y-2">
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
                {falla.titulo ? (
                  <p className="text-sm text-red-800">
                    <span className="block font-bold">{falla.titulo}</span>
                    {falla.indicacion}
                  </p>
                ) : (
                  <p className="text-sm text-red-800">{falla.motivo}</p>
                )}
              </div>
              {falla.titulo && (
                <p className="text-center text-xs text-gray-600">
                  {sinReintento
                    ? 'Puede continuar: alguien de nuestro equipo revisará su caso.'
                    : `${
                        falla.intentosRestantes != null && falla.intentosRestantes > 0
                          ? falla.intentosRestantes === 1
                            ? 'Le queda 1 intento. '
                            : `Le quedan ${falla.intentosRestantes} intentos. `
                          : ''
                      }Si prefiere, puede continuar y alguien de nuestro equipo revisará su caso.`}
                </p>
              )}
            </div>
          )}

          {!resultado ? (
            <button
              type="button"
              onClick={verificar}
              disabled={!listo || enviando}
              className={buttonClasses('primary', 'lg', 'w-full')}
            >
              {enviando && <IconLoader size={20} className="animate-spin" />}
              {enviando ? 'Verificando…' : 'Verificar mi identidad'}
            </button>
          ) : sinReintento ? null : falta && !enviando ? (
            <button
              type="button"
              onClick={() => (falta === 'documento' ? documentoRef : selfieRef).current?.abrir()}
              className={buttonClasses('primary', 'lg', 'w-full')}
            >
              <IconCamera size={18} />
              {falta === 'documento' ? `Tomar otra foto de su ${doc}` : 'Tomar otra selfie'}
            </button>
          ) : (
            <button
              type="button"
              onClick={verificar}
              disabled={!listo || enviando}
              className={buttonClasses('primary', 'lg', 'w-full')}
            >
              {enviando ? <IconLoader size={20} className="animate-spin" /> : <IconRefresh size={18} />}
              {enviando ? 'Verificando…' : 'Verificar de nuevo'}
            </button>
          )}
          {resultado && !falla && !sinReintento && falta && !enviando && (
            <p className="-mt-2 text-center text-xs text-gray-500">
              Para intentar de nuevo, tome {!documento && !selfie ? 'las dos fotos' : falta === 'documento' ? `otra foto de su ${doc}` : 'una selfie nueva'}.
            </p>
          )}
        </>
      )}

      {/* Con un veredicto: un fallo del cotejo no deja a nadie atrapado
          (§2 "nunca rechaza por fallo técnico"). */}
      {resultado && (
        <button
          ref={continuarRef}
          type="button"
          onClick={onContinuar}
          disabled={enviando}
          className={cn(
            'min-h-11 w-full rounded-lg px-6 py-3 text-sm font-bold transition-colors',
            verificada
              ? 'bg-primary-700 text-white hover:bg-primary-800'
              : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            {verificada ? 'Continuar' : 'Continuar sin verificar'} <IconArrowRight size={16} />
          </span>
        </button>
      )}

      {!resultado && (
        <button
          type="button"
          onClick={omitir}
          disabled={enviando}
          className={buttonClasses('secondary', 'lg', 'w-full')}
        >
          Prefiero no tomarme la foto
        </button>
      )}

      {!verificada && (
        <p className="text-center text-xs text-gray-500">
          Su foto solo se usa para confirmar su identidad. No se guarda en Cofianza ni se comparte con la
          inmobiliaria. No está obligado a tomarla: su estudio sigue y lo revisa una persona de nuestro equipo.
        </p>
      )}

      <button
        type="button"
        onClick={onVolver}
        disabled={enviando}
        className="mx-auto inline-flex min-h-11 items-center gap-1 px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-600"
      >
        <IconArrowLeft size={14} /> Volver
      </button>
    </div>
  )
}
