'use client'

/**
 * Enlace mágico (H44). Con #token_hash (el enlace del correo) muestra «Entrar»
 * y SOLO al tocarlo lo canjea: los antivirus de correo abren los enlaces y, si
 * se validara al cargar, gastarían el enlace de un solo uso. El token viaja en
 * el fragmento (#), que el navegador no manda a ningún servidor.
 * Sin token (o si el enlace ya no sirve), deja pedir uno nuevo.
 */

import { useEffect, useState, FormEvent } from 'react'
import Link from 'next/link'
import { IconArrowLeft, IconArrowRight, IconCheck, IconLoader, IconMail } from '@/components/icons'
import { cn, isValidEmail } from '@/lib/utils'
import { authService } from '@/services/authService'
import { ApiClientError } from '@/lib/api'
import { AUTH_ROUTES } from '@/lib/constants'
import { mensajeParaProspecto } from '@/lib/errorMessages'

type Vista = 'cargando' | 'entrar' | 'pedir' | 'enviado'

export default function ConfirmarEnlacePage() {
  const [vista, setVista] = useState<Vista>('cargando')
  const [tokenHash, setTokenHash] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token_hash') ?? ''
    setTokenHash(token)
    setVista(token ? 'entrar' : 'pedir')
  }, [])

  const entrar = async () => {
    setEntrando(true)
    setError(null)
    try {
      const destino = await authService.verificarEnlaceMagico(tokenHash)
      try {
        sessionStorage.removeItem('invitacion_token')
      } catch {
        // sin sessionStorage: nada que limpiar
      }
      window.location.href = destino
    } catch (err) {
      setEntrando(false)
      if (err instanceof ApiClientError && (err.statusCode === 401 || err.statusCode === 400)) {
        setError('Este enlace ya se usó o venció. Pide uno nuevo con tu correo.')
        setVista('pedir')
        return
      }
      setError(mensajeParaProspecto(err, 'No pudimos abrir tu sesión. Inténtalo de nuevo.'))
    }
  }

  const pedir = async (e: FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setError('Ingresa un correo electrónico válido')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      await authService.solicitarEnlaceMagico(email.trim())
      setVista('enviado')
    } catch (err) {
      setError(mensajeParaProspecto(err, 'Ocurrió un error. Por favor, intenta de nuevo más tarde.'))
    } finally {
      setEnviando(false)
    }
  }

  if (vista === 'cargando') {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (vista === 'enviado') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 w-full text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <IconCheck size={32} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Revisa tu correo</h2>
        <p className="text-gray-500 mb-6">
          Si tu correo tiene una invitación a un estudio, recibirás un enlace para entrar en los próximos minutos.
          Vence en una hora y sirve una sola vez.
        </p>
        <p className="text-sm text-gray-500">
          Revisa también tu carpeta de spam. Si es la primera vez que entras, abre el enlace de la invitación que te
          llegó y elige «Entrar con un enlace a mi correo».
        </p>
      </div>
    )
  }

  if (vista === 'entrar') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Entra a tu estudio</h2>
        <p className="text-gray-500 mb-6">Toca el botón para abrir tu sesión. No necesitas contraseña.</p>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <button
          type="button"
          onClick={entrar}
          disabled={entrando}
          className={cn(
            'w-full py-3.5 rounded-xl text-ink-900 font-bold text-[15px] flex items-center justify-center gap-2',
            'bg-coral-500 hover:bg-coral-400 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {entrando ? (
            <>
              <IconLoader size={18} className="animate-spin" />
              Entrando…
            </>
          ) : (
            <>
              Entrar
              <IconArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Entra sin contraseña</h2>
        <p className="text-gray-500 mt-1">
          Si te invitaron a un estudio, te enviamos un enlace a tu correo para entrar.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={pedir} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Correo electrónico
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IconMail size={18} className="text-gray-500" />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              disabled={enviando}
              autoComplete="email"
              className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 bg-white rounded-lg text-base focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="w-full py-2.5 px-4 rounded-lg text-white font-medium text-sm bg-primary-700 hover:bg-primary-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {enviando ? (
            <>
              <IconLoader size={18} className="animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviarme el enlace'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href={AUTH_ROUTES.LOGIN}
          className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline"
        >
          <IconArrowLeft size={16} />
          Entrar con contraseña
        </Link>
      </div>
    </div>
  )
}
