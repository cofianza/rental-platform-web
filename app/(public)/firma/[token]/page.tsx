/**
 * Pagina publica de firma de contrato
 * Accesible sin autenticacion via token unico
 * HP-341: Skeleton inicial — la logica de firma se implementara en HP futura
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { firmaService } from '@/services/firmaService'
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
        const msg = err instanceof Error ? err.message : 'Enlace inválido o expirado'
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
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Enlace no válido</h2>
        <p className="text-sm text-gray-500">{errorMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {data && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h1 className="text-xl font-bold text-gray-900">
            Firma de contrato de arrendamiento
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Firmante:</span>{' '}
              <span className="font-medium text-gray-900">{data.nombre_firmante}</span>
            </div>
            <div>
              <span className="text-gray-500">Email:</span>{' '}
              <span className="font-medium text-gray-900">{data.email_firmante}</span>
            </div>
            <div>
              <span className="text-gray-500">Expediente:</span>{' '}
              <span className="font-medium text-gray-900">{data.expediente_numero}</span>
            </div>
            <div>
              <span className="text-gray-500">Contrato:</span>{' '}
              <span className="font-medium text-gray-900">{data.contrato_nombre}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-gray-500">Inmueble:</span>{' '}
              <span className="font-medium text-gray-900">
                {data.inmueble_direccion}, {data.inmueble_ciudad}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-900">
          Proceso de firma en construcción
        </h2>
        <p className="text-sm text-gray-500">
          El proceso de firma electrónica se habilitará próximamente.
          Por favor, contacte al administrador si tiene preguntas.
        </p>
      </div>
    </div>
  )
}
