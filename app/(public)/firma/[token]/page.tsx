/**
 * Pagina publica de firma de contrato - HP-342
 * Accesible sin autenticacion via token unico
 * Wizard de 4 pasos: Resumen, OTP, Firma, Confirmacion
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { firmaService } from '@/services/firmaService'
import { FirmaWizard } from '@/components/firma'
import type { ISolicitudFirmaPublic } from '@/types/firma'

type PageState = 'loading' | 'ready' | 'error'

export default function FirmaPage() {
  const params = useParams()
  const token = params.token as string

  const [pageState, setPageState] = useState<PageState>('loading')
  const [data, setData] = useState<ISolicitudFirmaPublic | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const result = await firmaService.validarToken(token)
        setData(result)
        setPageState('ready')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Enlace invalido o expirado'
        setErrorMessage(msg)
        setPageState('error')
      }
    }
    load()
  }, [token])

  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Cargando contrato...</p>
        </div>
      </div>
    )
  }

  if (pageState === 'error') {
    const isExpired = errorMessage.toLowerCase().includes('expir')
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          {isExpired ? (
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          {isExpired ? 'El enlace de firma ha expirado' : 'Enlace no valido'}
        </h2>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">{errorMessage}</p>
        {isExpired && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left max-w-sm mx-auto">
            <p className="text-sm text-amber-800 font-medium mb-1">
              ¿Que puedes hacer?
            </p>
            <p className="text-sm text-amber-700">
              Contacta al administrador de tu expediente para que te envie un nuevo enlace de firma. El enlace anterior ha sido invalidado por seguridad.
            </p>
          </div>
        )}
      </div>
    )
  }

  // Render wizard when data is ready
  if (data) {
    return <FirmaWizard data={data} token={token} />
  }

  return null
}
