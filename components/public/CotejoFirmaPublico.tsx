/**
 * Adenda 6.1 §3: el cotejo de identidad AL FIRMAR el contrato, en la página /verificar-identidad/[token] (la misma de la
 * verificación de la Adenda 2 §9, que la 6.1 elimina). Lo hace cada persona arrendataria, una sola vez.
 *
 *   1. Casilla 4A (caso 7): si no la marcó al autorizar, se le muestra el numeral 4A literal de la autorización V3.1 y
 *      la casilla. La API la registra con fecha, hora, IP, dispositivo y versión. Si no la marca, firma en notaría.
 *   2. Fotos: documento y selfie, con indicaciones de luz y sin reflejos; hasta los intentos del panel. Sin cifras.
 *   3. Resultado de ESA persona: aprobado (le llega el enlace de firma por WhatsApp cuando todas terminen) o notaría.
 *
 * Nunca hay revisión de un analista: sin cotejo aprobado, el contrato se firma en notaría.
 */

'use client'

import { useState } from 'react'
import { firmaService } from '@/services/firmaService'
import { Ranura, nombreDocumento } from '@/components/public/CapturaBiometrica'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { mensajeParaProspecto } from '@/lib/errorMessages'
import { consejosCotejo, pasoInicialCotejo, textoIntentosRestantes, textoResultadoCotejo, type PasoCotejo } from '@/lib/cotejoFirma'
import type { IVerificacionIdentidadPublica } from '@/types/firma'
import { IconAlertTriangle, IconArrowRight, IconCheck, IconFileText, IconId, IconLoader, IconShieldCheck, IconUser } from '@/components/icons'

interface Props {
  token: string
  data: IVerificacionIdentidadPublica
  /** Vuelve a leer el enlace (otra pestaña terminó, o el contrato cambió). */
  recargar: () => void
  /** El enlace dejó de servir mientras la persona estaba en la página (410). */
  onError: (mensaje: string) => void
}

/** Separa el texto del numeral 4A de su casilla («☐ Autorizo…»): la casilla se dibuja como casilla. */
function partes4A(texto: string): { cuerpo: string; casilla: string } {
  const lineas = texto.split('\n')
  const i = lineas.findIndex((l) => l.trim().startsWith('☐'))
  if (i < 0) return { cuerpo: texto, casilla: 'Autorizo el tratamiento de mis datos biométricos para el cotejo de identidad descrito en este numeral.' }
  return { cuerpo: lineas.filter((_, j) => j !== i).join('\n'), casilla: lineas[i].replace(/^\s*☐\s*/, '') }
}

export function CotejoFirmaPublico({ token, data, recargar, onError }: Props) {
  const cotejo = data.cotejo
  const [paso, setPaso] = useState<PasoCotejo>(pasoInicialCotejo(data))
  const [resultado, setResultado] = useState<'aprobado' | 'notaria' | null>(cotejo?.resultado ?? null)
  const [marcada, setMarcada] = useState(false)
  const [documento, setDocumento] = useState<string | null>(null)
  const [selfie, setSelfie] = useState<string | null>(null)
  const [restantes, setRestantes] = useState(cotejo?.intentos_restantes ?? 0)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [confirmandoNotaria, setConfirmandoNotaria] = useState(false)

  const docNombre = nombreDocumento(data.tipo_documento, 'documento de identidad')
  const texto4A = partes4A(cotejo?.texto_4a ?? '')

  async function ejecutar(fn: () => Promise<void>) {
    setEnviando(true)
    setAviso('')
    try {
      await fn()
    } catch (e) {
      const err = e as { code?: string; statusCode?: number }
      if (err.code === 'VERIFICACION_COMPLETADA') recargar()
      else if (err.statusCode === 410) onError(mensajeParaProspecto(e, 'Este enlace ya no está vigente.'))
      else setAviso(mensajeParaProspecto(e, 'Algo falló. Intente de nuevo.'))
    } finally {
      setEnviando(false)
    }
  }

  const autorizar = () =>
    ejecutar(async () => {
      await firmaService.consentimientoIdentidad(token, 'autoriza')
      setPaso('fotos')
    })

  const firmarEnNotaria = () =>
    ejecutar(async () => {
      await firmaService.consentimientoIdentidad(token, 'no_autoriza')
      setConfirmandoNotaria(false)
      setResultado('notaria')
      setPaso('listo')
    })

  // Cada cotejo se paga al proveedor y las mismas fotos dan el mismo resultado: para reintentar se piden nuevas.
  const cotejar = () =>
    ejecutar(async () => {
      if (!documento || !selfie) return
      try {
        const r = await firmaService.biometriaIdentidad(token, { documentImage: documento, photo: selfie })
        if (typeof r.intentos_restantes === 'number') setRestantes(r.intentos_restantes)
        if (r.completada) {
          setResultado(r.aprobado ? 'aprobado' : 'notaria')
          setPaso('listo')
          return
        }
        setDocumento(null)
        setSelfie(null)
        setAviso(r.motivo || 'No pudimos confirmar su identidad con estas fotos.')
      } catch (e) {
        setSelfie(null)
        throw e
      }
    })

  if (paso === 'listo') {
    const r = textoResultadoCotejo(resultado)
    const ok = resultado === 'aprobado'
    return (
      <div className={`rounded-xl border bg-white p-5 text-center sm:p-8 ${ok ? 'border-primary-200' : 'border-amber-200'}`}>
        <div
          className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${ok ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700'}`}
        >
          {ok ? <IconCheck size={28} /> : <IconFileText size={28} />}
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900">{r.titulo}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">{r.texto}</p>
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
          {paso === 'consentimiento_4a' ? 'Antes de firmar: cotejo de identidad' : 'Tome las dos fotos'}
        </h1>
        {data.inmueble && <p className="mt-1 break-words text-sm text-gray-500">Contrato de arrendamiento · {data.inmueble}</p>}
      </div>

      {paso === 'consentimiento_4a' ? (
        <>
          <p className="text-sm leading-relaxed text-gray-700">
            Para firmar su contrato digitalmente comparamos una foto suya con la de su documento. Es opcional: si no lo
            autoriza, el contrato se firma con firma autenticada en notaría, a su costo. Lea la autorización:
          </p>
          <div
            className="max-h-72 overflow-y-auto whitespace-pre-line rounded-lg bg-gray-50 p-4 text-sm leading-relaxed text-gray-700"
            tabIndex={0}
            aria-label="Numeral 4A de la autorización de datos"
          >
            {texto4A.cuerpo}
          </div>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
              marcada ? 'border-primary-400 bg-primary-50/60' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="checkbox"
              checked={marcada}
              onChange={(e) => setMarcada(e.target.checked)}
              disabled={enviando}
              className="mt-0.5 h-5 w-5 shrink-0 accent-primary-600"
            />
            <span className="text-sm font-medium text-gray-800">{texto4A.casilla}</span>
          </label>

          {aviso && <Aviso texto={aviso} />}

          <button
            type="button"
            onClick={autorizar}
            disabled={!marcada || enviando}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando ? <IconLoader size={20} className="animate-spin" /> : <IconArrowRight size={18} />}
            Continuar al cotejo
          </button>
          <button
            type="button"
            onClick={() => setConfirmandoNotaria(true)}
            disabled={enviando}
            className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            No autorizo: firmaré en notaría
          </button>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-sm font-semibold text-gray-900">Para que sus fotos pasen a la primera</p>
            <ul className="mt-2 space-y-1.5">
              {consejosCotejo(docNombre).map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm text-gray-600">
                  <IconCheck size={14} className="mt-0.5 shrink-0 text-primary-700" aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {cotejo && !cotejo.disponible && (
            <Aviso texto="El cotejo con foto no está disponible en este momento. Intente de nuevo más tarde: no se gasta ningún intento." />
          )}

          <div className="space-y-3">
            <Ranura
              titulo={`Foto de su ${docNombre}`}
              ayuda="El lado con su foto, completo y sin reflejos"
              icono={<IconId size={22} />}
              capture="environment"
              valor={documento}
              onChange={setDocumento}
              disabled={enviando}
            />
            <Ranura
              titulo="Selfie"
              ayuda="De frente, con buena luz, sin gorra ni gafas"
              icono={<IconUser size={22} />}
              capture="user"
              valor={selfie}
              onChange={setSelfie}
              disabled={enviando}
            />
          </div>

          {aviso && <Aviso texto={aviso} />}
          <p className="text-center text-xs text-gray-500">{textoIntentosRestantes(restantes)}</p>

          <button
            type="button"
            onClick={cotejar}
            disabled={!documento || !selfie || enviando || cotejo?.disponible === false}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando && <IconLoader size={20} className="animate-spin" />}
            {enviando ? 'Haciendo el cotejo…' : 'Hacer el cotejo'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmandoNotaria(true)}
            disabled={enviando}
            className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            No deseo hacer el cotejo: firmaré en notaría
          </button>
        </>
      )}

      <ConfirmDialog
        isOpen={confirmandoNotaria}
        onClose={() => setConfirmandoNotaria(false)}
        onConfirm={firmarEnNotaria}
        title="¿Firmar el contrato en notaría?"
        message="Sin el cotejo de identidad, el contrato se firma con firma autenticada en notaría, a su costo, en lugar de la firma digital. Después no podrá volver a este paso con este contrato."
        confirmLabel="Sí, firmaré en notaría"
        cancelLabel="Volver"
        isLoading={enviando}
        focoEnCancelar
      />
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
