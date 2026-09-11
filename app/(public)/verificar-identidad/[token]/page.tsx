/**
 * Verificación de identidad antes de firmar el contrato — Adenda 2 §9.
 *
 * El arrendatario llega aquí por correo cuando le envían el contrato a firma.
 * §9.2: el texto de consentimiento se muestra COMPLETO en pantalla (no detrás
 * de un enlace). §9.3: dos casillas separadas y excluyentes, ninguna marcada.
 * La API registra la opción con fecha, hora, IP, dispositivo y versión del
 * texto.
 *
 * NUNCA BLOQUEA. "Prefiero que un analista…", un cotejo que no coincide o un
 * error de red terminan igual: el trámite sigue, al arrendatario le llega el
 * enlace de Auco por WhatsApp y un analista de Cofianza verifica por otro
 * medio.
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { firmaService } from '@/services/firmaService'
import { Ranura } from '@/components/public/CapturaBiometrica'
import type { IVerificacionIdentidadPublica } from '@/types/firma'
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconId,
  IconLoader,
  IconShieldCheck,
  IconUser,
} from '@/components/icons'

type Paso = 'cargando' | 'error' | 'consentimiento' | 'fotos' | 'listo'
type Opcion = 'autoriza' | 'analista'

export default function VerificarIdentidadPage() {
  const token = useParams().token as string

  const [paso, setPaso] = useState<Paso>('cargando')
  const [data, setData] = useState<IVerificacionIdentidadPublica | null>(null)
  const [error, setError] = useState('')
  const [opcion, setOpcion] = useState<Opcion | null>(null)
  const [documento, setDocumento] = useState<string | null>(null)
  const [selfie, setSelfie] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    firmaService
      .getVerificacionIdentidad(token)
      .then((d) => {
        setData(d)
        setPaso(d.completada ? 'listo' : 'consentimiento')
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Este enlace no es válido.')
        setPaso('error')
      })
  }, [token])

  // Otra pestaña ya terminó (409): no es un error para la persona.
  async function ejecutar(fn: () => Promise<void>) {
    setEnviando(true)
    setAviso('')
    try {
      await fn()
    } catch (e) {
      if ((e as { code?: string }).code === 'VERIFICACION_COMPLETADA') setPaso('listo')
      else setAviso(e instanceof Error ? e.message : 'Algo falló. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const confirmarOpcion = () =>
    ejecutar(async () => {
      if (!opcion) return
      const r = await firmaService.consentimientoIdentidad(token, opcion)
      setPaso(r.completada ? 'listo' : 'fotos')
    })

  const verificar = () =>
    ejecutar(async () => {
      if (!documento || !selfie) return
      const r = await firmaService.biometriaIdentidad(token, { documentImage: documento, photo: selfie })
      if (r.completada) setPaso('listo')
      else setAviso(r.motivo ?? '')
    })

  const continuar = () =>
    ejecutar(async () => {
      await firmaService.continuarIdentidad(token)
      setPaso('listo')
    })

  if (paso === 'cargando') {
    return (
      <div className="flex justify-center py-20">
        <IconLoader size={28} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (paso === 'error' || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900">No pudimos abrir este enlace</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">{error}</p>
      </div>
    )
  }

  if (paso === 'listo') {
    return (
      <div className="rounded-xl border border-primary-200 bg-white p-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <IconCheck size={28} />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Listo, {data.nombre.split(' ')[0]}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
          En unos minutos te llega por WhatsApp el enlace para firmar el contrato. Si hace falta confirmar tu
          identidad por otro medio, un analista de Cofianza se comunicará contigo; tu trámite sigue igual.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-8">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <IconShieldCheck size={28} />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
          {paso === 'consentimiento' ? 'Antes de firmar, confirmemos que eres tú' : 'Toma las dos fotos'}
        </h1>
        {data.inmueble && <p className="mt-1 text-sm text-gray-500">Contrato de arrendamiento · {data.inmueble}</p>}
      </div>

      {paso === 'consentimiento' ? (
        <>
          <div className="space-y-3 rounded-lg bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">
            {data.consentimiento.parrafos.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          {/* §9.3: dos casillas separadas y excluyentes; ninguna viene marcada. */}
          <fieldset className="space-y-2">
            <legend className="sr-only">Elige una opción</legend>
            {(['autoriza', 'analista'] as const).map((k) => (
              <label
                key={k}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  opcion === k ? 'border-primary-400 bg-primary-50/60' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={opcion === k}
                  onChange={(e) => setOpcion(e.target.checked ? k : null)}
                  disabled={enviando}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary-600"
                />
                <span className="text-sm font-medium text-gray-800">{data.consentimiento.opciones[k]}</span>
              </label>
            ))}
          </fieldset>

          {aviso && <Aviso texto={aviso} />}

          <button
            type="button"
            onClick={confirmarOpcion}
            disabled={!opcion || enviando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando ? <IconLoader size={20} className="animate-spin" /> : <IconArrowRight size={18} />}
            Continuar
          </button>
        </>
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

          {aviso && <Aviso texto={aviso} />}

          <button
            type="button"
            onClick={verificar}
            disabled={!documento || !selfie || enviando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando && <IconLoader size={20} className="animate-spin" />}
            {enviando ? 'Verificando…' : aviso ? 'Intentar de nuevo' : 'Verificar mi identidad'}
          </button>

          {/* Siempre visible: nadie queda atrapado por una cámara mala o un
              cotejo que no coincide (Adenda 2 §9: nunca se rechaza). */}
          <button
            type="button"
            onClick={continuar}
            disabled={enviando}
            className="w-full rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Continuar sin la verificación con foto
          </button>
          <p className="text-center text-xs text-gray-400">
            Si continúas sin la foto, un analista de Cofianza verificará tu identidad por otro medio. Tu trámite
            sigue igual.
          </p>
        </>
      )}
    </div>
  )
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
      <p className="text-sm text-amber-800">{texto}</p>
    </div>
  )
}
