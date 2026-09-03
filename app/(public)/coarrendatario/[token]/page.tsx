'use client'

/**
 * /coarrendatario/[token] — vista pública del invitado.
 *
 * Mario (5-may-2026): el invitado abre el link que recibe por correo,
 * acepta T&C + política de tratamiento de datos, y ahí mismo se dispara
 * su estudio crediticio. NO necesita crear cuenta.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  coarrendatarioService,
  type ICoarrendatarioPublicView,
} from '@/services/coarrendatarioService'

type Phase = 'cargando' | 'lista' | 'aceptando' | 'aceptado' | 'rechazando' | 'rechazado' | 'error'

export default function CoarrendatarioPublicPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token as string | undefined

  const [view, setView] = useState<ICoarrendatarioPublicView | null>(null)
  const [phase, setPhase] = useState<Phase>('cargando')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Checkboxes T&C
  // §8.4: "la casilla de aceptación no puede venir marcada por defecto".
  // Estos `false` son normativos — no los cambies ni los derives de nada.
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptData, setAcceptData] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)

  const fetchView = useCallback(async () => {
    if (!token) return
    try {
      const data = await coarrendatarioService.getPublicByToken(token)
      setView(data)
      // Si ya respondió antes, saltamos a la pantalla correspondiente.
      if (data.estado === 'aceptado' || data.estado === 'estudio_completado') {
        setPhase('aceptado')
        setResultMsg('Ya habías aceptado esta invitación. Estamos procesando tu estudio.')
      } else if (data.estado === 'rechazado_invitacion') {
        setPhase('rechazado')
      } else {
        setPhase('lista')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo cargar la invitación.'
      setErrorMsg(msg)
      setPhase('error')
    }
  }, [token])

  useEffect(() => { fetchView() }, [fetchView])

  const handleAceptar = async () => {
    if (!token) return
    if (!acceptTerms || !acceptData) {
      setErrorMsg('Debes aceptar los términos y la política de tratamiento de datos.')
      return
    }
    setErrorMsg(null)
    setPhase('aceptando')
    try {
      const r = await coarrendatarioService.aceptar(token)
      setResultMsg(r.mensaje)
      setPhase('aceptado')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo registrar tu aceptación.'
      setErrorMsg(msg)
      setPhase('lista')
    }
  }

  const handleRechazar = async () => {
    if (!token) return
    setPhase('rechazando')
    try {
      await coarrendatarioService.rechazar(token)
      setPhase('rechazado')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No pudimos registrar tu respuesta. Intenta de nuevo.'
      setErrorMsg(msg)
      setPhase('lista')
    }
  }

  // ── Renders ──────────────────────────────────────────────────────

  if (phase === 'cargando') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8">
        <h1 className="text-xl font-bold text-red-700 mb-2">No pudimos abrir tu invitación</h1>
        <p className="text-sm text-gray-600">{errorMsg}</p>
        <p className="text-xs text-gray-400 mt-4">
          Si crees que es un error, escribe a <a href="mailto:hola@cofianza.co" className="text-primary-600 underline">hola@cofianza.co</a>.
        </p>
      </div>
    )
  }

  if (phase === 'rechazado') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Invitación declinada</h1>
        <p className="text-sm text-gray-600 mb-4">
          Le avisamos a {view?.expediente.titular_nombre} que no continuarás como co-arrendatario.
        </p>
        <p className="text-xs text-gray-400">Puedes cerrar esta página.</p>
      </div>
    )
  }

  if (phase === 'aceptado') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="h-7 w-7 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">¡Listo, {view?.nombre}!</h1>
        <p className="text-sm text-gray-700">
          {resultMsg || 'Aceptación registrada. Estamos procesando tu estudio.'}
        </p>
        <p className="text-xs text-gray-400 mt-4">
          Te enviaremos a {view?.email} el resultado del estudio cuando esté listo.
        </p>
      </div>
    )
  }

  // phase === 'lista' o 'aceptando' o 'rechazando'
  const titular = view?.expediente.titular_nombre || 'El solicitante'
  const inmueble = `${view?.expediente.inmueble_direccion}${view?.expediente.inmueble_ciudad ? `, ${view.expediente.inmueble_ciudad}` : ''}`
  const procesando = phase === 'aceptando' || phase === 'rechazando'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-br from-primary-700 to-primary-900 text-white p-6">
          <h1 className="text-xl font-bold mb-1">{titular} te invita a co-arrendar</h1>
          <p className="text-primary-100 text-sm">
            {inmueble}
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-2">Hola, {view?.nombre} {view?.apellido}</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              En Cofianza <strong>rentamos sin fiador</strong>. {titular} te invita a ser su co-arrendatario para que
              tomen el arriendo juntos: los dos firman como un solo arrendatario y nosotros los respaldamos.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900 leading-relaxed">
            <p className="font-semibold mb-1">¿Qué pasa si aceptas?</p>
            <ul className="list-disc pl-5 space-y-1 text-amber-800">
              <li>Realizaremos un estudio crediticio rápido a tu nombre.</li>
              <li>Tu información se trata conforme a la <Link href="/privacidad" target="_blank" className="underline">política de tratamiento de datos</Link>.</li>
              <li>Si juntos cumplen el perfil, los respaldamos como arrendatarios.</li>
              <li>No tienes que crear cuenta ni firmar nada extra ahora — solo aceptar.</li>
            </ul>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3">
              {errorMsg}
            </div>
          )}

          {/*
            Autorizacion de tratamiento de datos, INTEGRA y visible.
            Flujo del modulo de estudios §8.4: el texto debe estar visible en
            la pantalla, no oculto tras un enlace, y la casilla no puede venir
            marcada por defecto. El invitado es otro titular de datos: su
            consulta al buro exige SU propia autorizacion, y esta pantalla es
            donde se presenta. El backend congela este mismo texto y su version
            en autorizaciones_habeas_data al aceptar.
          */}
          {view?.texto_legal && (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Autorización de tratamiento de datos</h3>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  Este es el texto íntegro que estás aceptando. Versión {view.version_terminos}.
                </p>
              </div>
              <div className="whitespace-pre-wrap bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
                {view.texto_legal}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                disabled={procesando}
                className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                Acepto los <Link href="/terminos" target="_blank" className="text-primary-600 underline">términos y condiciones</Link> de Cofianza.
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptData}
                onChange={(e) => setAcceptData(e.target.checked)}
                disabled={procesando}
                className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                <strong>He leído, comprendido y acepto</strong> la autorización de tratamiento de datos que aparece arriba, y autorizo la consulta y el reporte en centrales de información (Ley 1266/2008 y Ley 1581/2012).
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleAceptar}
              disabled={procesando || !acceptTerms || !acceptData}
              className="flex-1 px-5 py-3 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {phase === 'aceptando' ? 'Procesando…' : 'Aceptar y autorizar estudio'}
            </button>
            <button
              onClick={handleRechazar}
              disabled={procesando}
              className="px-5 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {phase === 'rechazando' ? 'Procesando…' : 'Declinar'}
            </button>
          </div>
        </div>
      </div>
  )
}
