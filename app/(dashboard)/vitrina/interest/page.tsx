/**
 * Interest Processing Page — HP-368
 * Creates expediente + estudio automatically after register/login
 * Protected page (requires auth via dashboard layout)
 *
 * TODO(unificación de flujos): Esta pantalla crea expediente SIN cita tras
 * el flujo visitante→login→intent. En contraste, el flujo "solicitante ya
 * autenticado" desde <MeInteresaCTA> crea expediente + cita en un solo paso.
 * Esta divergencia existe por simplicidad: agregar modal de cita tras login
 * amplía scope. Considerar unificar cuando el equipo lo priorice.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { IconLoader, IconCheck, IconX, IconHome } from '@/components/icons'
import { apiClient } from '@/lib/api'

type Status = 'processing' | 'success' | 'error'

interface InterestResult {
  expediente: {
    id: string
    numero: string
    estado: 'borrador'
    estudio_habilitado: boolean
    source: 'vitrina_publica'
  }
  siguiente_paso: 'agendar_cita'
}

export default function InterestPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const propertyId = searchParams.get('property_id') || localStorage.getItem('cofianza_interested_property') || ''

  const [status, setStatus] = useState<Status>('processing')
  const [result, setResult] = useState<InterestResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    if (!propertyId) {
      setStatus('error')
      setErrorMsg('No se encontro el inmueble de interes. Regresa a la vitrina y selecciona un inmueble.')
      return
    }

    const createInterest = async () => {
      try {
        const res = await apiClient.post<InterestResult>('/vitrina/interest', {
          property_id: propertyId,
        })

        setResult(res.data)
        setStatus('success')
        localStorage.removeItem('cofianza_interested_property')
        toast.success('Expediente creado exitosamente')

        // Redirect to expediente detail after 2s
        setTimeout(() => {
          router.push(`/expedientes/${res.data.expediente.id}`)
        }, 2500)
      } catch (err: unknown) {
        setStatus('error')
        const msg = err instanceof Error ? err.message : 'Error al procesar tu solicitud'
        setErrorMsg(msg)
        toast.error(msg)
      }
    }

    createInterest()
  }, [propertyId, router])

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'processing' && (
          <>
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto">
              <IconLoader size={32} className="text-primary-600 animate-spin" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Procesando tu solicitud</h1>
              <p className="text-sm text-gray-500">
                Estamos creando tu expediente y preparando el siguiente paso...
              </p>
            </div>
          </>
        )}

        {status === 'success' && result && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <IconCheck size={32} className="text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Expediente creado</h1>
              <p className="text-sm text-gray-500 mb-4">
                Tu expediente <span className="font-semibold text-gray-700">{result.expediente.numero}</span> fue creado. El siguiente paso es agendar una cita con el propietario.
              </p>
              <p className="text-xs text-gray-400">Redirigiendo al detalle del expediente...</p>
            </div>
            <button
              onClick={() => router.push(`/expedientes/${result.expediente.id}`)}
              className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              Ir al expediente
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <IconX size={32} className="text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">No se pudo procesar</h1>
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {errorMsg}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Volver a la vitrina
              </button>
              <button
                onClick={() => { called.current = false; setStatus('processing'); window.location.reload() }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Reintentar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
